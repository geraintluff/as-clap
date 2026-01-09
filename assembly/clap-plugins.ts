import {fnPtr, objPtr, gc, gcThen, modulePath} from "./common.ts"

export const MAX_CSTRING_LENGTH = 8192;
export const PROCESS_CONTINUE = 1;

// Adds a C-style UTF8 string, which is never collected
@inline function writeCString(str : string) : usize {
	let bytes = String.UTF8.byteLength(str, true);
	let ptr = heap.alloc(bytes);
	String.UTF8.encodeUnsafe(changetype<usize>(str), str.length, ptr, true);
	return ptr;
}
@inline function readCString(ptr : string) : string | null {
	if (ptr == 0) return null;
	return String.UTF8.decodeUnsafe(host.name, MAX_CSTRING_LENGTH, true);
}
@inline function freeCString(ptr : usize) : void {
	if (ptr == 0) return;
	heap.free(ptr);
}

@unmanaged
class clap_version {
	protected _clap_version_major : u32 = 1;
	protected _clap_version_minor : u32 = 2;
	protected _clap_version_revision : u32 = 7;
}
@unmanaged
class Version extends clap_version {
	get major() : u32 {
		return this._clap_version_major;
	}
	set major(v : u32) {
		return this._clap_version_major = v;
	}
	get minor() : u32 {
		return this._clap_version_minor;
	}
	set minor(v : u32) {
		return this._clap_version_minor = v;
	}
	get revision() : u32 {
		return this._clap_version_revision;
	}
	set revision(v : u32) {
		return this._clap_version_revision = v;
	}
}

@unmanaged
class clap_plugin_descriptor extends clap_version {
	protected _id : usize = 0;
	protected _name : usize = 0;
	protected _vendor : usize = 0;
	protected _url : usize = 0;
	protected _manual_url : usize = 0;
	protected _support_url : usize = 0;
	protected _version : usize = 0;
	protected _description : usize = 0;
	protected _features: usize = 0;
}
@unmanaged
class PluginDescriptor extends clap_plugin_descriptor {
	get version() : Version {
		return changetype<Version>(this);
	}
	get id() : string {
		return readCString(this._id);
	}
	set id(str : string) {
		freeCString(this._id);
		this._id = writeCString(str);
	}
	get name() : string {
		return readCString(this._name);
	}
	set name(str : string) {
		freeCString(this._name);
		this._name = writeCString(str);
	}
	get vendor() : string {
		return readCString(this._name);
	}
	set vendor(str : string) {
		freeCString(this._vendor);
		this._vendor = writeCString(str);
	}
	set features(list : StaticArray<string>) {
		let featureList = heap.alloc(sizeof<usize>()*list.length + 2);
		while (featureList%(1<<alignof<usize>())) ++featureList; // manually align memory

		for (let i : i32 = 0; i < list.length; ++i) {
			store<usize>(sizeof<usize>()*i, writeCString(list[i]));
		}
		store<usize>(sizeof<usize>()*list.length, 0); // null-terminated list
		this._features = featureList;
	}
}
@unmanaged @final
class clap_plugin {
	desc !: clap_plugin_descriptor;
	plugin_data : usize;
	init : usize;
	destroy : usize;
	activate : usize;
	deactivate : usize;
	start_processing : usize;
	stop_processing : usize;
	reset : usize;
	process : usize;
	get_extension : usize;
	on_main_thread : usize;
}
@unmanaged
class clap_event_transport {
}
@unmanaged
class clap_process {
	protected readonly _steady_time : i64;
	protected readonly _frames_count : u32;
	protected readonly _transport : usize;
}
@unmanaged
export class Process extends clap_process {
	get framesCount() : u32 {
		return this._frames_count;
	}
	get transport() : clap_event_transport | null {
		if (this._transport == 0) return null;
		return changetype<clap_event_transport>(this._transport);
	}
}
assert(offsetof<clap_process>() == offsetof<Process>(), "`Process` must have the exact same layout as `clap_process` (no extra fields)");

@unmanaged @final
class clap_host extends clap_version {
	readonly host_data : usize = 0;
	readonly name : usize = 0;
	readonly vendor : usize = 0;
	readonly url : usize = 0;
	readonly version : usize = 0;
	readonly get_extension: usize = 0;
	readonly request_restart : usize = 0;
	readonly request_process : usize = 0;
	readonly request_callback : usize = 0;
}

export class Host {
	private readonly host : clap_host;

	name : string;
	vendor: string | null;
	url: string | null;
	version: string | null;

	constructor(host : clap_host) {
		this.host = host;
		this.name = host.name ? String.UTF8.decodeUnsafe(host.name, 32, true) : "(unknown)";
		this.vendor = host.vendor ? String.UTF8.decodeUnsafe(host.vendor, 32, true) : null;
		this.url = host.url ? String.UTF8.decodeUnsafe(host.url, 32, true) : null;
		this.version = host.version ? String.UTF8.decodeUnsafe(host.version, 32, true) : null;
	}
}

export class Plugin {
	readonly host : Host;

	constructor(host : Host) {
		this.host = host;
	}

	pluginInit() : bool {
		console.log("pluginInit()");
		return true;
	}
	pluginDestroy() : void {}
	pluginActivate(sampleRate : f64, minFrames : u32, maxFrames : u32) : bool {
		return true;
	}
	pluginDeactivate() : void {}
	pluginStartProcessing() : bool {
		return true;
	}
	pluginStopProcessing() : void {}
	pluginReset() : void {}
	pluginProcess(process : Process) : i32 {
		return 0;
	}
	pluginGetExtension(extId : string) : usize {
		return 0;
	}
	pluginOnMainThread() : void {}
}

class RegisteredClapPlugin {
	id !: string;
	desc !: clap_plugin_descriptor;
	create !: (host: clap_host) => clap_plugin;
}

let registeredPluginList = new Array<RegisteredClapPlugin>();
// this is how plugins get retained
let activePlugins = new Map<clap_plugin, Plugin>();

export function registerPlugin<PluginClass extends Plugin>(pluginName : string, pluginId : string) : PluginDescriptor {
	let desc = new PluginDescriptor();
	desc.id = pluginId;
	desc.name = pluginName;
	desc.features = ["audio-effect"];

	let registered = new RegisteredClapPlugin();
	registered.id = pluginId;
	registered.desc = desc;
	registered.create = function (host : clap_host) : clap_plugin {
		let plugin = instantiate<PluginClass>(new Host(host));
		let clapPlugin = new clap_plugin();

		clapPlugin.plugin_data = objPtr(plugin);
		clapPlugin.init = fnPtr((obj : clap_plugin) : bool => {
			let plugin = changetype<PluginClass>(obj.plugin_data);
			return gcThen(plugin.pluginInit());
		});
		clapPlugin.destroy = fnPtr((obj : clap_plugin) : void => {
			changetype<PluginClass>(obj.plugin_data).pluginDestroy();
			activePlugins.delete(obj);
			gc();
		});
		clapPlugin.activate = fnPtr((obj : clap_plugin, sampleRate : f64, minFrames : u32, maxFrames : u32) : bool => {
			let plugin = changetype<PluginClass>(obj.plugin_data);
			return gcThen(plugin.pluginActivate(sampleRate, minFrames, maxFrames));
		});
		clapPlugin.deactivate = fnPtr((obj : clap_plugin) : void => {
			let plugin = changetype<PluginClass>(obj.plugin_data);
			plugin.pluginDeactivate();
			gc();
		});
		clapPlugin.start_processing = fnPtr((obj : clap_plugin) : bool => {
			let plugin = changetype<PluginClass>(obj.plugin_data);
			return gcThen(plugin.pluginStartProcessing());
		});
		clapPlugin.stop_processing = fnPtr((obj : clap_plugin) : void => {
			let plugin = changetype<PluginClass>(obj.plugin_data);
			plugin.pluginStopProcessing();
			gc();
		});
		clapPlugin.reset = fnPtr((obj : clap_plugin) : void => {
			let plugin = changetype<PluginClass>(obj.plugin_data);
			plugin.pluginReset(); // no GC here either
		});
		clapPlugin.process = fnPtr((obj : clap_plugin, process : clap_process) : i32 => {
			let plugin = changetype<PluginClass>(obj.plugin_data);
			return plugin.pluginProcess(changetype<Process>(process)); // no GC here
		});
		clapPlugin.get_extension = fnPtr((obj : clap_plugin, extIdPtr : usize) : usize => {
			let extId = String.UTF8.decodeUnsafe(extIdPtr, 32, true);
			let plugin = changetype<PluginClass>(obj.plugin_data);
			return gcThen(plugin.pluginGetExtension(extId));
		});
		clapPlugin.on_main_thread = fnPtr((obj : clap_plugin) : void => {
			let plugin = changetype<PluginClass>(obj.plugin_data);
			plugin.pluginOnMainThread();
			gc();
		});
		activePlugins.set(clapPlugin, plugin);
		return clapPlugin;
	};
	registeredPluginList.push(registered);

	return desc;
}

//---- CLAP plugin factory API ----//

class clap_plugin_factory {
	get_plugin_count : usize;
	get_plugin_descriptor : usize;
	create_plugin : usize;
}
function pluginFactory_get_plugin_count(self : clap_plugin_factory) : usize {
	return registeredPluginList.length;
}
function pluginFactory_get_plugin_descriptor(self : clap_plugin_factory, index : u32) : usize {
	if (index >= changetype<u32>(registeredPluginList.length)) return 0;
	return objPtr(registeredPluginList[index].desc);
}
function pluginFactory_create_plugin(self : clap_plugin_factory, host : clap_host, strPtr : usize) : usize {
	let pluginId = String.UTF8.decodeUnsafe(strPtr, 8192, true);
	for (let i : i32 = 0; i < registeredPluginList.length; ++i) {
		let registered = registeredPluginList[i];
		if (registered.id == pluginId) {
			let result = registered.create(host);
			result.desc = registered.desc;
			return objPtr(result);
		}
	}
	return 0;
}
let pluginFactory = new clap_plugin_factory();
pluginFactory.get_plugin_count = fnPtr(pluginFactory_get_plugin_count);
pluginFactory.get_plugin_descriptor = fnPtr(pluginFactory_get_plugin_descriptor);
pluginFactory.create_plugin = fnPtr(pluginFactory_create_plugin);

let pluginFactoryPtr = objPtr(pluginFactory);
export {pluginFactoryPtr as clapPluginFactory};