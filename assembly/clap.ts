// The friendly API for implementing CLAP plugins

import * as Core from "./clap-core";

import * as property from "./property"
import {fnPtr, equalCStr, Version, AudioBuffer, Process} from "./common";
import {Host} from "./host";

import {HostAudioPorts} from "./ext/audio-ports";

// Global variable filled out by `clap_entry.iniit()`
let modulePath = "";
export {modulePath};

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
			let rawPtr = property.setCStringNullable(list[i], 0);
			store<usize>(featureList + sizeof<usize>()*i, rawPtr);
		}
		store<usize>(featureList + sizeof<usize>()*list.length, 0); // null-terminated list
	}
}

// Because plugins are managed, we need a way to retain them while we return raw pointers
let activePlugins = new Map<usize, Plugin>();
export class Plugin {
	readonly host: Host;
	hostAudioPorts : HostAudioPorts | null = null;

	// These are unmanaged types which we own, so need to free them
	private corePlugin: Core.clap_plugin;

	constructor(host: Host) {
		this.host = host;

		// Function pointers which forward to our methods below
		let corePlugin = this.corePlugin = new Core.clap_plugin();
		// corePlugin._desc is set by `createFn()` below
		corePlugin._plugin_data = changetype<usize>(this);
		corePlugin._init = fnPtr<(ptr: Core.clap_plugin)=>bool>((ptr: Core.clap_plugin): bool => getPlugin(ptr).pluginInit());
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
		corePlugin._process = fnPtr((ptr: Core.clap_plugin, process: Process): i32 => getPlugin(ptr).pluginProcess(process));
		corePlugin._get_extension = fnPtr((corePlugin: Core.clap_plugin, extIdPtr: usize): usize => changetype<Plugin>(corePlugin._plugin_data).pluginGetExtensionUtf8(extIdPtr));
		corePlugin._on_main_thread = fnPtr((ptr: Core.clap_plugin): void => getPlugin(ptr).pluginOnMainThread());
	}

	pluginInit(): bool {
		console.log(`pluginInit()`)
		let host = this.host;
		this.hostAudioPorts = host.getExtensionUtf8<HostAudioPorts>(Core.Utf8.EXT_AUDIO_PORTS);
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
		if (equalCStr(extIdPtr, Core.Utf8.EXT_AUDIO_PORTS)) return changetype<usize>(coreAudioPorts);

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

@inline function getPlugin(ptr: Core.clap_plugin): Plugin {
	return changetype<Plugin>(ptr._plugin_data);
}

let coreAudioPorts = new Core.clap_plugin_audio_ports();
// coreAudioPorts._count = fnPtr((ptr: Core.clap_plugin, isInput: bool) : u32 => getPlugin(ptr).audioPortsCount(isInput));
// coreAudioPorts._get = fnPtr((ptr: Core.clap_plugin, index: u32, isInput: bool, info: AudioPortInfo) : bool => getPlugin(ptr).audioPortsGet(index, isInput, info));

class RegisteredClapPlugin {
	constructor(
		public id: string,
		public desc : Core.clap_plugin_descriptor,
		public create: (host: Core.clap_host, desc: Core.clap_plugin_descriptor) => Core.clap_plugin
	) {} // just stores stuff
}

let registeredPluginList = new Array<RegisteredClapPlugin>();

export function registerPlugin<PluginClass extends Plugin>(pluginName: string, pluginId: string): PluginDescriptor {
	let desc = new PluginDescriptor(); // unmanaged, so never GC'd
	desc.id = pluginId;
	desc.name = pluginName;
	desc.features = ["audio-effect"];

	let createFn = function (host: Core.clap_host, desc: Core.clap_plugin_descriptor): Core.clap_plugin {
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