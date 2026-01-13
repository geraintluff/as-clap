import {fnPtr, CString, getCString, setCString, CStringNullable, getCStringNullable, setCStringNullable, CString256, setCString256, getCString256, Renamed, getRenamed, setRenamed, NullablePtr, getNullablePtr, setNullablePtr, CNumArray, getCNumArray, CObjArray, getCObjArray, CPtrArray, getCPtrArray} from "./type-helpers"

import * as Core from "./clap-core"
export * from "./clap-core"

let modulePath = "";
export {modulePath};

export function equalCStr(a : usize, b : usize) : bool {
	let memEnd = usize(memory.size()*65536);
	while (a < memEnd && b < memEnd) {
		let ac = load<u8>(a++), bc = load<u8>(b++);
		if (ac != bc) return false;
		if (!ac) return true; // end of string
	}
	return false;
}

@unmanaged @final
export class Version extends Core.clap_version {
	@property major: Renamed<u32> = this._major;
	@property minor: Renamed<u32> = this._minor;
	@property revision: Renamed<u32> = this._revision;
}

@unmanaged @final
export class PluginDescriptor extends Core.clap_plugin_descriptor {
	get clapVersion(): Version {
		return changetype(this);
	}
	@property id: CString = this._id;
	@property name: CString = this._name;
	@property vendor: CStringNullable = this._vendor;
	@property url: CStringNullable = this._url;
	@property manualUrl: CStringNullable = this._manual_url;
	@property supportUrl: CStringNullable = this._support_url;
	@property version: CStringNullable = this._version;
	@property description: CStringNullable = this._description;

	get features() : Array<string> {
		let result = new Array<string>();
		let index : usize = 0;
		while (index < MAX_FEATURE_COUNT) {
			let ptr = load<usize>(this._features + sizeof<usize>()*index);
			if (!ptr) break;
			result.push(getCString(ptr));
			++index;
		}
		return result;
	}
	set features(list: StaticArray<string>) {
		let featureList = heap.alloc(sizeof<usize>()*list.length + 2);
		while (featureList%(1<<alignof<usize>())) ++featureList; // manually align memory
		this._features = featureList;

		for (let i: i32 = 0; i < list.length; ++i) {
			let rawPtr = setCStringNullable(list[i], 0);
			store<usize>(featureList + sizeof<usize>()*i, rawPtr);
		}
		store<usize>(featureList + sizeof<usize>()*list.length, 0); // null-terminated list
	}
}

@unmanaged @final
export class AudioBuffer extends Core.clap_audio_buffer {
	@property readonly data32 : CPtrArray<CNumArray<f32>> = this._data32;
	@property readonly data64 : CPtrArray<CNumArray<f64>> = this._data64;
	@property readonly channelCount : Renamed<u32> = this._channel_count;
	@property latency : Renamed<u32> = this._latency;
	@property constantMask : Renamed<u32> = this._constant_mask;
}

@unmanaged @final
export class Process extends Core.clap_process {
	@property readonly steadyTime : Renamed<u32> = this._steady_time;
	@property readonly framesCount : Renamed<u32> = this._frames_count;
	@property readonly transport : NullablePtr<clap_event_transport> = this._transport;
	@property readonly audioInputs : CObjArray<AudioBuffer> = this._audio_inputs;
	@property readonly audioOutputs : CObjArray<AudioBuffer> = this._audio_outputs;
	@property readonly audioInputsCount : Renamed<u32> = this._audio_inputs_count;
	@property readonly audioOutputsCount : Renamed<u32> = this._audio_outputs_count;
}
assert(offsetof<clap_process>() == offsetof<Process>(), "`Process` must have the exact same layout as `clap_process` (no extra fields)");

@unmanaged @final
export class Host extends Core.clap_host {
	get clapVersion(): Version {
		return changetype<Version>(this);
	}
	@property readonly name: CString = this._name;
	@property readonly vendor: CStringNullable = this._vendor;
	@property readonly url: CStringNullable = this._url;
	@property readonly version: CStringNullable = this._version;
	getExtension<T extends HostExt>(extId : string) : T | null {
		let cString = String.UTF8.encode(extId, true);
		return this.getExtensionUtf8<T>(changetype<usize>(cString));
	}
	getExtensionUtf8<T extends HostExt>(cString : usize) : T | null {
		let ptr = call_indirect<usize>(u32(this._get_extension), this, cString);
		if (!ptr) return null;
		return instantiate<T>(this, ptr);
	}
	requestRestart() : void {
		call_indirect(u32(this._request_restart), this);
	}
	requestProcess() : void {
		call_indirect(u32(this._request_process), this);
	}
	requestCallback() : void {
		call_indirect(u32(this._request_callback), this);
	}
}
export class HostExt {
	constructor(protected _host : Core.clap_host, protected _extPtr : usize) {}
}

@unmanaged @final
export class AudioPortInfo extends Core.clap_audio_port_info {
	@property id : Renamed<clap_id> = this._id;
	@property name : CString256 = this._name;
	@property flags : Renamed<u32> = this._flags;
	@property channelCount : Renamed<u32> = this._channel_count;
	@property portType : CString = this._port_type;
	@property inPlacePair : Renamed<clap_id> = this._in_place_pair;
}
@final
export class HostAudioPorts extends HostExt {
	get _ext() : Core.clap_host_audio_ports {
		return changetype(this._extPtr);
	}
	isRescanFlagSupported(flag: u32) : bool {
		return call_indirect<bool>(this._ext.is_rescan_flag_supported, this._host, flag);
	}
	rescan(flags: u32) : void {
		return call_indirect<void>(this._ext.rescan, this._host, flags);
	}
}

// Because plugins are managed, we need a way to retain them while we return raw pointers
let activePlugins = new Map<usize, Plugin>();
export class Plugin {
	readonly host: Host;
	hostAudioPorts : HostAudioPorts | null = null;

	// These are unmanaged types which we own, so need to free them
	corePlugin: Core.clap_plugin;

	constructor(host: Host) {
		this.host = host;

		// Function pointers which forward to our methods below
		let corePlugin = this.corePlugin = new Core.clap_plugin();
		// corePlugin._desc is set by `createFn()` below
		corePlugin._plugin_data = changetype<usize>(this);
		corePlugin._init = fnPtr((plugin: Core.clap_plugin): bool => changetype<Plugin>(plugin._plugin_data).pluginInit());
		corePlugin._destroy = fnPtr((corePlugin: Core.clap_plugin): void => {
			let plugin = changetype<Plugin>(corePlugin._plugin_data);
			plugin.pluginDestroy(); // releases all non-managed fields
			// this should get us GC'd, and we do it here instead of in `.pluginDestroy()` just in case it'd get collected during the function call
			activePlugins.delete(changetype<usize>(corePlugin));
		});
		corePlugin._activate = fnPtr((plugin: Core.clap_plugin, sampleRate: f64, minFrames: u32, maxFrames: u32): bool => changetype<Plugin>(plugin._plugin_data).pluginActivate(sampleRate, minFrames, maxFrames));
		corePlugin._deactivate = fnPtr((plugin: Core.clap_plugin): void => changetype<Plugin>(plugin._plugin_data).pluginDeactivate());
		corePlugin._start_processing = fnPtr((plugin: Core.clap_plugin): bool => changetype<Plugin>(plugin._plugin_data).pluginStartProcessing());
		corePlugin._stop_processing = fnPtr((plugin: Core.clap_plugin): void => changetype<Plugin>(plugin._plugin_data).pluginStopProcessing());
		corePlugin._reset = fnPtr((plugin: Core.clap_plugin): void => changetype<Plugin>(plugin._plugin_data).pluginReset());
		corePlugin._process = fnPtr((plugin: Core.clap_plugin, process: Process): i32 => changetype<Plugin>(plugin._plugin_data).pluginProcess(process));
		corePlugin._get_extension = fnPtr((corePlugin: Core.clap_plugin, extIdPtr: usize): usize => changetype<Plugin>(corePlugin._plugin_data).pluginGetExtensionUtf8(extIdPtr));
		corePlugin._on_main_thread = fnPtr((plugin: Core.clap_plugin): void => changetype<Plugin>(plugin._plugin_data).pluginOnMainThread());
	}

	pluginInit(): bool {
		console.log(`pluginInit()`)
		let host = this.host;
		this.hostAudioPorts = host.getExtensionUtf8<HostAudioPorts>(Core.EXT_AUDIO_PORTS);
		host.requestRestart();
		host.requestCallback();
		host.requestProcess();
		return true;
	}
	pluginDestroy(): void {
		heap.free(changetype<usize>(this.corePlugin));
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
	pluginProcess(process: Process): i32 {
		return 0;
	}
	pluginGetExtensionUtf8(extIdPtr : usize) : usize {
		if (equalCStr(extIdPtr, Core.EXT_AUDIO_PORTS)) return changetype<usize>(coreAudioPorts);

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

	audioPortsCount(isInput: bool) : u32 {
		return 0;
	}
	audioPortsGet(index: u32, isInput: bool, info: AudioPortInfo) : bool {
		return false;
	}
}

let coreAudioPorts = new Core.clap_plugin_audio_ports();
coreAudioPorts._count = fnPtr((plugin: Core.clap_plugin, isInput: bool) : u32 => changetype<Plugin>(plugin._plugin_data).audioPortsCount(isInput));
coreAudioPorts._get = fnPtr((plugin: Core.clap_plugin, index: u32, isInput: bool, info: AudioPortInfo) : bool => changetype<Plugin>(plugin._plugin_data).audioPortsGet(index, isInput, info));

class RegisteredClapPlugin {
	constructor(
		public id: string,
		public desc : clap_plugin_descriptor,
		public create: (host: clap_host, desc: clap_plugin_descriptor) => clap_plugin
	) {} // just stores stuff
}

let registeredPluginList = new Array<RegisteredClapPlugin>();

export function registerPlugin<PluginClass extends Plugin>(pluginName: string, pluginId: string): PluginDescriptor {
	let desc = new PluginDescriptor(); // unmanaged, so never GC'd
	desc.id = pluginId;
	desc.name = pluginName;
	desc.features = ["audio-effect"];

	let createFn = function (host: clap_host, desc: clap_plugin_descriptor): clap_plugin {
		let plugin = instantiate<PluginClass>(changetype<Host>(host));
		let corePlugin = plugin.corePlugin;
		activePlugins.set(changetype<usize>(corePlugin), plugin);

		corePlugin._desc = changetype<usize>(desc);
		return corePlugin;
	};
	registeredPluginList.push(new RegisteredClapPlugin(pluginId, desc, createFn));

	return desc; // return the friendly interface so it can be filled out
}

//---- CLAP plugin factory API ----//
function pluginFactory_get_plugin_count(self: clap_plugin_factory): usize {
	return registeredPluginList.length;
}
function pluginFactory_get_plugin_descriptor(self: clap_plugin_factory, index: u32): usize {
	if (index >= u32(registeredPluginList.length)) return 0;
	return changetype<usize>(registeredPluginList[index].desc);
}
function pluginFactory_create_plugin(self: clap_plugin_factory, host: clap_host, strPtr: usize): usize {
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