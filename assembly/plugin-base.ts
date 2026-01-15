import * as Core from "./clap-core"
import * as Clap from "./clap"

import {fnPtr, equalCStr} from "./clap"

import {setCStringN, getCString, CNumPtr, CObjPtr, CPtrPtr} from "./properties"

@unmanaged @final
export class CPtr<T> {
	value : T;
}

// Global variable filled out by `clap_entry.iniit()`
let modulePath = "";
export {modulePath};

// Because plugins are managed, we need a way to retain them while we return raw pointers
let activePlugins = new Map<usize, Plugin>();
export class Plugin {
	// These are unmanaged types which we own, so need to free them
	_plugin: Core.clap_plugin;

	// These are unmanaged types the host owns
	_host : Core.clap_host;
	_host_audio_ports : Core.clap_host_audio_ports | null;
	_host_note_ports : Core.clap_host_note_ports | null;
	_host_params : Core.clap_host_params | null;
	_host_state : Core.clap_host_state | null;

	constructor(host: Core.clap_host) {
		this._host = host;

		// Function pointers which forward to our methods below
		let corePlugin = this._plugin = new Core.clap_plugin();
		// corePlugin._desc is set by `createFn()` below
		corePlugin._plugin_data = changetype<usize>(this);
		corePlugin._init = fnPtr((ptr: Core.clap_plugin): bool => getPlugin(ptr).pluginInit());
		corePlugin._destroy = fnPtr((ptr: Core.clap_plugin): void => {
			getPlugin(ptr).pluginDestroy(); // releases all non-managed fields
			// this should get us GC'd, and we do it here instead of in `.pluginDestroy()` just in case it'd get collected during the function call
			activePlugins.delete(changetype<usize>(ptr));
		});
		corePlugin._activate = fnPtr((ptr: Core.clap_plugin, sampleRate: f64, minFrames: u32, maxFrames: u32): bool => getPlugin(ptr).pluginActivate(sampleRate, minFrames, maxFrames));
		corePlugin._deactivate = fnPtr((ptr: Core.clap_plugin): void => getPlugin(ptr).pluginDeactivate());
		corePlugin._start_processing = fnPtr((ptr: Core.clap_plugin): bool => getPlugin(ptr).pluginStartProcessing());
		corePlugin._stop_processing = fnPtr((ptr: Core.clap_plugin): void => getPlugin(ptr).pluginStopProcessing());
		corePlugin._reset = fnPtr((ptr: Core.clap_plugin): void => getPlugin(ptr).pluginReset());
		corePlugin._process = fnPtr((ptr: Core.clap_plugin, process: Clap.Process): i32 => getPlugin(ptr).pluginProcess(process));
		corePlugin._get_extension = fnPtr((ptr: Core.clap_plugin, extIdPtr: usize): usize => getPlugin(ptr).pluginGetExtensionUtf8(extIdPtr));
		corePlugin._on_main_thread = fnPtr((ptr: Core.clap_plugin): void => getPlugin(ptr).pluginOnMainThread());
	}

	//---- Host: don't override these ----//

	get hostClapVersion(): Version {
		return changetype(this._host._clap_version);
	}
	get hostName(): string {
		return getCString(this._host._name);
	}
	get hostVendor(): string | null {
		return getCStringNullable(this._host._vendor);
	}
	get hostUrl(): string | null {
		return getCStringNullable(this._host._url);
	}
	get hostVersion(): string | null {
		return getCStringNullable(this._host._version);
	}
	hostGetExtension<T>(extId : string) : T | null {
		let cString = String.UTF8.encode(extId, true);
		return this.hostGetExtensionUtf8<T>(changetype<usize>(cString));
	}
	hostGetExtensionUtf8<T>(cString : usize) : T | null {
		let ptr = call_indirect<usize>(u32(this._host._get_extension), this._host, cString);
		if (!ptr) return null;
		return changetype<T>(ptr);
	}
	hostRequestRestart(): void {
		call_indirect<usize>(u32(this._host._request_restart), this._host);
	}
	hostRequestProcess(): void {
		call_indirect<usize>(u32(this._host._request_process), this._host);
	}
	hostRequestCallback(): void {
		call_indirect<usize>(u32(this._host._request_callback), this._host);
	}

	//---- Plugin: everything below this can be overridden ----//

	pluginInit(): bool {
		console.log(`pluginInit()`)
		this._host_audio_ports = this.hostGetExtensionUtf8<Core.clap_host_audio_ports>(Core.Utf8.EXT_AUDIO_PORTS);
		this._host_note_ports = this.hostGetExtensionUtf8<Core.clap_host_note_ports>(Core.Utf8.EXT_NOTE_PORTS);
		this._host_params = this.hostGetExtensionUtf8<Core.clap_host_params>(Core.Utf8.EXT_PARAMS);
		this._host_state = this.hostGetExtensionUtf8<Core.clap_host_state>(Core.Utf8.EXT_STATE);
		return true;
	}
	pluginDestroy(): void {
		heap.free(changetype<usize>(this._plugin));
	}
	pluginActivate(sampleRate: f64, minFrames: u32, maxFrames: u32): bool {
		return true;
	}
	pluginDeactivate(): void {}
	pluginStartProcessing(): bool {
		return true;
	}
	pluginStopProcessing(): void {}
	pluginReset(): void {}
	pluginProcess(process: Clap.Process): i32 {
		return 0;
	}
	pluginGetExtensionUtf8(extIdPtr : usize) : usize {
		if (equalCStr(extIdPtr, Core.Utf8.EXT_AUDIO_PORTS)) return changetype<usize>(coreAudioPorts);
		if (equalCStr(extIdPtr, Core.Utf8.EXT_NOTE_PORTS)) return changetype<usize>(coreNotePorts);
		if (equalCStr(extIdPtr, Core.Utf8.EXT_PARAMS)) return changetype<usize>(coreParams);
		if (equalCStr(extIdPtr, Core.Utf8.EXT_STATE)) return changetype<usize>(coreState);

		let extId = String.UTF8.decodeUnsafe(extIdPtr, 32, true);
		return this.pluginGetExtension(extId);
	}
	pluginGetExtension(extId: string): usize {
		console.log(`as-clap: unknown extId ${extId}`);
		return 0;
	}
	pluginOnMainThread(): void {
		console.log("pluginOnMainThread()");
	}

	//---- clap.audio-ports ----//

	audioPortsCount(isInput: bool) : u32 {
		return 0;
	}
	audioPortsGet(index: u32, isInput: bool, info: Clap.AudioPortInfo) : bool {
		return false;
	}
	protected get hostAudioPorts() : bool {
		return this._host_audio_ports != null;
	}
	protected hostAudioPortsIsRescanFlagSupported(flag: u32) : bool {
		assert(this._host_audio_ports);
		return call_indirect<bool>(u32(this._host_audio_ports._is_rescan_flag_supported), this._host, flag);
	}
	protected hostAudioPortsRescan(flags: u32) : void {
		assert(this._host_audio_ports);
		return call_indirect<void>(u32(this._host_audio_ports._rescan), this._host, flags);
	}

	//---- clap.note-ports ----//

	notePortsCount(isInput: bool) : u32 {
		return 0;
	}
	notePortsGet(index: u32, isInput: bool, info: Clap.NotePortInfo) : bool {
		return false;
	}
	protected get hostNotePorts() : bool {
		return this._host_note_ports != null;
	}
	protected hostNotePortsSupportedDialects() : u32 {
		assert(this._host_note_ports);
		return call_indirect<u32>(u32(this._host_note_ports._supported_dialects), this._host);
	}
	protected hostNotePortsRescan(flags: u32) : void {
		assert(this._host_note_ports);
		return call_indirect<void>(u32(this._host_note_ports._rescan), this._host, flags);
	}

	//---- clap.params ----//

	paramsCount() : u32 {
		return 0;
	}
	paramsGetInfo(index: u32, info: Clap.ParamInfo) : bool {
		return false;
	}
	paramsGetValue(paramId: Core.clap_id, value: CNumPtr<f64>) : bool {
		return false;
	}
	paramsValueToTextUtf8(paramId: Core.clap_id, value: f64, outBuffer: usize, outCapacity: u32) : bool {
		let textOrNull = this.paramsValueToText(paramId, value);
		if (textOrNull == null) return false;
		setCStringN(<string>textOrNull, outBuffer, outCapacity);
		return true;
	}
	paramsValueToText(paramId: Core.clap_id, value: f64) : string | null {
		return null;
	}
	paramsTextToValueUtf8(paramId: Core.clap_id, ptr: usize, value: CNumPtr<f64>) : bool {
		return this.paramsTextToValue(paramId, getCString(ptr), value);
	}
	paramsTextToValue(paramId: Core.clap_id, str: string, value: CNumPtr<f64>) : bool {
		return false;
	}
	paramsFlush(inEvents: Clap.InputEvents, outEvents: Clap.OutputEvents) : void {}
	protected get hostParams() : bool {
		return this._host_params != null;
	}

	//---- clap.state ----//

	stateSave(ostream: Clap.OStream) : bool {
		return false;
	}
	stateLoad(istream: Clap.IStream) : bool {
		return false;
	}
	protected get hostState() : bool {
		return this._host_state != null;
	}
	protected hostStateMarkDirty() : void {
		assert(this._host_state);
		call_indirect<void>(u32((this._host_state as Core.clap_host_state)._mark_dirty), this._host);
	}
}

@inline function getPlugin(ptr: Core.clap_plugin): Plugin {
	return changetype<Plugin>(ptr._plugin_data);
}

let coreAudioPorts = new Core.clap_plugin_audio_ports();
coreAudioPorts._count = fnPtr((ptr: Core.clap_plugin, isInput: bool) : u32 => getPlugin(ptr).audioPortsCount(isInput));
coreAudioPorts._get = fnPtr((ptr: Core.clap_plugin, index: u32, isInput: bool, info: Clap.AudioPortInfo) : bool => getPlugin(ptr).audioPortsGet(index, isInput, info));
let coreNotePorts = new Core.clap_plugin_note_ports();
coreNotePorts._count = fnPtr((ptr: Core.clap_plugin, isInput: bool) : u32 => getPlugin(ptr).notePortsCount(isInput));
coreNotePorts._get = fnPtr((ptr: Core.clap_plugin, index: u32, isInput: bool, info: Clap.NotePortInfo) : bool => getPlugin(ptr).notePortsGet(index, isInput, info));
let coreParams = new Core.clap_plugin_params();
coreParams._count = fnPtr((ptr: Core.clap_plugin) : u32 => getPlugin(ptr).paramsCount());
coreParams._get_info = fnPtr((ptr: Core.clap_plugin, index: u32, info: Clap.ParamInfo) : bool => getPlugin(ptr).paramsGetInfo(index, info));
coreParams._get_value = fnPtr((ptr: Core.clap_plugin, paramId: Core.clap_id, value: CNumPtr<f64>) : bool => getPlugin(ptr).paramsGetValue(paramId, value));
coreParams._value_to_text = fnPtr((ptr: Core.clap_plugin, paramId: Core.clap_id, value: f64, outBuffer: usize, outCapacity: u32) : bool => getPlugin(ptr).paramsValueToTextUtf8(paramId, value, outBuffer, outCapacity));
coreParams._text_to_value = fnPtr((ptr: Core.clap_plugin, paramId: Core.clap_id, cStr: usize, value: CNumPtr<f64>) : bool => getPlugin(ptr).paramsTextToValueUtf8(paramId, cStr, value));
coreParams._flush = fnPtr((ptr: Core.clap_plugin, inEvents: Clap.InputEvents, outEvents: Clap.OutputEvents) : void => getPlugin(ptr).paramsFlush(inEvents, outEvents));
let coreState = new Core.clap_plugin_state();
coreState._save = fnPtr((ptr: Core.clap_plugin, ostream: Clap.OStream) : bool => getPlugin(ptr).stateSave(ostream));
coreState._load = fnPtr((ptr: Core.clap_plugin, istream: Clap.IStream) : bool => getPlugin(ptr).stateLoad(istream));

class RegisteredClapPlugin {
	constructor(
		public id: string,
		public desc : Core.clap_plugin_descriptor,
		public create: (host: Core.clap_host, desc: Core.clap_plugin_descriptor) => Core.clap_plugin
	) {} // just stores stuff
}

let registeredPluginList = new Array<RegisteredClapPlugin>();

export function registerPlugin<PluginClass extends Plugin>(pluginName: string, pluginId: string): Clap.PluginDescriptor {
	let desc = new Clap.PluginDescriptor(); // unmanaged, so never GC'd
	desc.id = pluginId;
	desc.name = pluginName;
	desc.features = ["audio-effect"];

	let createFn = function (host: Core.clap_host, desc: Core.clap_plugin_descriptor): Core.clap_plugin {
		let plugin = instantiate<PluginClass>(host);
		let corePlugin = plugin._plugin;
		activePlugins.set(changetype<usize>(corePlugin), plugin);
		corePlugin._desc = changetype<usize>(desc);
		return corePlugin;
	};
	registeredPluginList.push(new RegisteredClapPlugin(pluginId, desc, createFn));

	return desc; // return the friendly interface so it can be filled out
}

//---- CLAP plugin factory API ----//
function pluginFactory_get_plugin_count(self: Core.clap_plugin_factory): usize {
	return registeredPluginList.length;
}
function pluginFactory_get_plugin_descriptor(self: Core.clap_plugin_factory, index: u32): usize {
	if (index >= u32(registeredPluginList.length)) return 0;
	return changetype<usize>(registeredPluginList[index].desc);
}
function pluginFactory_create_plugin(self: Core.clap_plugin_factory, host: Core.clap_host, strPtr: usize): usize {
	let pluginId = String.UTF8.decodeUnsafe(strPtr, 8192, true);
	for (let i = 0; i < registeredPluginList.length; ++i) {
		let registered = registeredPluginList[i];
		if (registered.id == pluginId) {
			let corePlugin = registered.create(host, registered.desc);
			return changetype<usize>(corePlugin);
		}
	}
	return 0;
}
export let pluginFactory = new Core.clap_plugin_factory();
pluginFactory._get_plugin_count = fnPtr(pluginFactory_get_plugin_count);
pluginFactory._get_plugin_descriptor = fnPtr(pluginFactory_get_plugin_descriptor);
pluginFactory._create_plugin = fnPtr(pluginFactory_create_plugin);