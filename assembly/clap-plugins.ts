import {fnPtr, modulePath} from "./common.ts"

export const MAX_CSTRING_LENGTH = 8192;
export const MAX_FEATURE_COUNT = 100;

export const PROCESS_ERROR = 0;
export const PROCESS_CONTINUE = 1;
export const PROCESS_CONTINUE_IF_NOT_QUIET = 2;
export const PROCESS_TAIL = 3;
export const PROCESS_SLEEP = 4;

// @property methods to translate a `string` into C-style UTF8 `char *`
type CString = string;
@inline function getCString(ptr: usize): string {
	return String.UTF8.decodeUnsafe(host.name, MAX_CSTRING_LENGTH, true);
}
@inline function setCString(str: string, ptr: usize): usize {
	if (ptr != 0) heap.free(ptr); // free previous string
	let bytes = String.UTF8.byteLength(str, true);
	ptr = heap.alloc(bytes);
	String.UTF8.encodeUnsafe(changetype<usize>(str), str.length, ptr, true);
	return ptr;
}
type CStringNullable = string | null;
@inline function getCStringNullable(ptr: usize): string | null {
	if (ptr == 0) return null;
	return String.UTF8.decodeUnsafe(host.name, MAX_CSTRING_LENGTH, true);
}
@inline function setCStringNullable(str: string | null, ptr: usize): usize {
	if (ptr != 0) heap.free(ptr); // free previous string
	if (str == null) return 0;
	return setCString(str as string, ptr);
}

type Renamed<T> = T;
@inline function getRenamed<T>(v: T): T {
	return v;
}
@inline function setRenamed<T>(v: T, prev: T): T {
	return v;
}

type NullablePtr<Obj> = Obj | null;
@inline function getNullablePtr<Obj>(ptr: usize): Obj | null {
	if (ptr == 0) return null;
	return changetype<Obj>(ptr);
}
@inline function setNullablePtr<Obj>(v: Obj | null, prev: usize): usize {
	if (v == null) return 0;
	return changetype<usize>(v);
}

@unmanaged @final
export class CNumArray<T> {
	@inline get(i: usize) : T {
		return load<T>(changetype<usize>(this) + sizeof<T>()*i);
	}
	@inline @operator("[]") _get(i: usize) : T {
		return load<T>(changetype<usize>(this) + sizeof<T>()*i);
	}
	@inline set(i: usize, v: T) : T {
		return store<T>(changetype<usize>(this) + sizeof<T>()*i, T);
	}
}
@inline function getCNumArray<T>(ptr : usize) : CNumArray<T> {
	return changetype<CNumArray<T>>(ptr);
}
@unmanaged @final
export class CObjArray<T> {
	@inline get(i: usize) : T {
		return changetype<T>(changetype<usize>(this) + offsetof<T>()*i);
	}
	@inline @operator("[]") _get(i: usize) : T {
		return changetype<T>(changetype<usize>(this) + offsetof<T>()*i);
	}
}
@inline function getCObjArray<T>(ptr : usize) : CObjArray<T> {
	return changetype<CObjArray<T>>(ptr);
}

@unmanaged
export class clap_version {
	_clap_version_major: u32 = 1;
	_clap_version_minor: u32 = 2;
	_clap_version_revision: u32 = 7;
}
@unmanaged @final
export class Version extends clap_version {
	@property major: Renamed<u32> = this._clap_version_major;
	@property minor: Renamed<u32> = this._clap_version_minor;
	@property revision: Renamed<u32> = this._clap_version_revision;
}

@unmanaged
export class clap_plugin_descriptor extends clap_version {
	_id: usize = 0;
	_name: usize = 0;
	_vendor: usize = 0;
	_url: usize = 0;
	_manual_url: usize = 0;
	_support_url: usize = 0;
	_version: usize = 0;
	_description: usize = 0;
	_features: usize = 0;
}
@unmanaged @final
export class PluginDescriptor extends clap_plugin_descriptor {
	get clapVersion(): Version {
		return changetype<Version>(this);
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

		for (let i: i32 = 0; i < list.length; ++i) {
			store<usize>(sizeof<usize>()*i, setCStringNullable(list[i], 0));
		}
		store<usize>(sizeof<usize>()*list.length, 0); // null-terminated list
		this._features = featureList;
	}
}

@unmanaged
export class clap_event_header {
}

@unmanaged
export class clap_event_transport extends clap_event_header {
}

@unmanaged
export class clap_audio_buffer {
	readonly _data32 : usize;
	readonly _data64 : usize;
	readonly _channel_count : u32;
	_latency : u32;
	_constant_mask : u64;
}
@unmanaged
export class AudioBuffer {
	@property readonly data32 : CObjArray<CNumArray<f32>> = this._data32;
	@property readonly data64 : CObjArray<CNumArray<f64>> = this._data64;
	@property readonly channelCount : Renamed<u32> = this._channel_count;
	@property latency : Renamed<u32> = this._latency;
	@property constantMask : Renamed<u32> = this._constant_mask;
}

@unmanaged
export class clap_process {
	readonly _steady_time: i64;
	readonly _frames_count: u32;
	readonly _transport: usize;
	readonly _audio_inputs: usize;
	readonly _audio_outputs: usize;
	readonly _audio_inputs_count: u32;
	readonly _audio_outputs_count: u32;
	readonly _in_events: usize;
	readonly _out_events: usize;
}
@unmanaged @final
export class Process extends clap_process {
	@property readonly steadyTime : Renamed<u32> = this._steady_time;
	@property readonly framesCount : Renamed<u32> = this._frames_count;
	@property readonly transport : NullablePtr<clap_event_transport> = this._transport;
	@property readonly audioInputs : CObjArray<AudioBuffer> = this._audio_inputs;
	@property readonly audioOutputs : CObjArray<AudioBuffer> = this._audio_outputs;
	@property readonly audioInputsCount : Renamed<u32> = this._audio_inputs_count;
	@property readonly audioOutputsCount : Renamed<u32> = this._audio_outputs_count;
}
assert(offsetof<clap_process>() == offsetof<Process>(), "`Process` must have the exact same layout as `clap_process` (no extra fields)");

@unmanaged
export class clap_host extends clap_version {
	readonly _host_data: usize = 0;
	readonly _name: usize = 0;
	readonly _vendor: usize = 0;
	readonly _url: usize = 0;
	readonly _version: usize = 0;
	readonly _get_extension: usize = 0;
	readonly _request_restart: usize = 0;
	readonly _request_process: usize = 0;
	readonly _request_callback: usize = 0;
}
@unmanaged @final
export class Host extends clap_host {
	get clapVersion(): Version {
		return changetype<Version>(this);
	}
	@property readonly name: CString = this._name;
	@property readonly vendor: CStringNullable = this._vendor;
	@property readonly url: CStringNullable = this._url;
	@property readonly version: CStringNullable = this._version;
}

// Unlike all other classes, plugins aren't final - they get extended.
// This means they can't be `@unmanaged`, because they have things to destroy.
// We therefore also need a way to retain these managed plugins, while we return them as raw pointers
let activePlugins = new Map<usize, Plugin>();
class clap_plugin {
	_desc: usize;
	_plugin_data: usize = 0;
	_init: usize;
	_destroy: usize;
	_activate: usize;
	_deactivate: usize;
	_start_processing: usize;
	_stop_processing: usize;
	_reset: usize;
	_process: usize;
	_get_extension: usize;
	_on_main_thread: usize;
}
export class Plugin extends clap_plugin {
	readonly host: Host;

	constructor(host: Host) {
		super();
		this.host = host;
		// Function pointers which forward to our methods below
		this._init = fnPtr((plugin: Plugin): bool => plugin.pluginInit());
		this._destroy = fnPtr((plugin: Plugin): void => {
			plugin.pluginDestroy();
			activePlugins.delete(changetype<usize>(plugin)); // this should get us GC'd
		});
		this._activate = fnPtr((plugin: Plugin, sampleRate: f64, minFrames: u32, maxFrames: u32): bool => plugin.pluginActivate(sampleRate, minFrames, maxFrames));
		this._deactivate = fnPtr((plugin: Plugin): void => plugin.pluginDeactivate());
		this._start_processing = fnPtr((plugin: Plugin): bool => plugin.pluginStartProcessing());
		this._stop_processing = fnPtr((plugin: Plugin): void => plugin.pluginStopProcessing());
		this._reset = fnPtr((plugin: Plugin): void => plugin.pluginReset());
		this._process = fnPtr((plugin: Plugin, process: Process): i32 => plugin.pluginProcess(process));
		this._get_extension = fnPtr((plugin: Plugin, extIdPtr: usize): usize => {
			let extId = String.UTF8.decodeUnsafe(extIdPtr, 32, true);
			return plugin.pluginGetExtension(extId);
		});
		this._on_main_thread = fnPtr((plugin: Plugin): void => plugin.pluginOnMainThread());
	}

	pluginInit(): bool {
		console.log("pluginInit()");
		return true;
	}
	pluginDestroy(): void {}
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
	pluginGetExtension(extId: string): usize {
		return 0;
	}
	pluginOnMainThread(): void {}
}

class RegisteredClapPlugin {
	constructor(public id: string, public desc : clap_plugin_descriptor, public create: (host: clap_host, desc: clap_plugin_descriptor) => clap_plugin) {
		// That's all
	}
}

let registeredPluginList = new Array<RegisteredClapPlugin>();

export function registerPlugin<PluginClass extends Plugin>(pluginName: string, pluginId: string): PluginDescriptor {
	let desc = new PluginDescriptor();
	desc.id = pluginId;
	desc.name = pluginName;
	desc.features = ["audio-effect"];

	let createFn = function (host: clap_host, desc: clap_plugin_descriptor): clap_plugin {
		let plugin = instantiate<PluginClass>(changetype<Host>(host));
		// retained - TODO: check thread-safety of this
		activePlugins.set(changetype<usize>(plugin), plugin);

		let clapPlugin = changetype<clap_plugin>(plugin);
		// Descriptor pointer is the first field, so we can set it directly
		store<usize>(changetype<usize>(clapPlugin), changetype<usize>(desc));
		return clapPlugin;
	};
	registeredPluginList.push(new RegisteredClapPlugin(pluginId, desc, createFn));

	return desc; // return the friendly interface so it can be filled out
}

//---- CLAP plugin factory API ----//

class clap_plugin_factory {
	get_plugin_count: usize;
	get_plugin_descriptor: usize;
	create_plugin: usize;
}
function pluginFactory_get_plugin_count(self: clap_plugin_factory): usize {
	return registeredPluginList.length;
}
function pluginFactory_get_plugin_descriptor(self: clap_plugin_factory, index: u32): usize {
	if (index >= changetype<u32>(registeredPluginList.length)) return 0;
	return changetype<usize>(registeredPluginList[index].desc);
}
function pluginFactory_create_plugin(self: clap_plugin_factory, host: clap_host, strPtr: usize): usize {
	let pluginId = String.UTF8.decodeUnsafe(strPtr, 8192, true);
	for (let i: i32 = 0; i < registeredPluginList.length; ++i) {
		let registered = registeredPluginList[i];
		if (registered.id == pluginId) {
			return changetype<usize>(registered.create(host, registered.desc));
		}
	}
	return 0;
}
let pluginFactory = new clap_plugin_factory();
pluginFactory.get_plugin_count = fnPtr(pluginFactory_get_plugin_count);
pluginFactory.get_plugin_descriptor = fnPtr(pluginFactory_get_plugin_descriptor);
pluginFactory.create_plugin = fnPtr(pluginFactory_create_plugin);

let pluginFactoryPtr = changetype<usize>(pluginFactory);
export {pluginFactoryPtr as clapPluginFactory};