import {
  fnPtr,
  CString,
  getCString,
  setCString,
  CStringNullable,
  getCStringNullable,
  setCStringNullable,
  CString256,
  setCString256,
  getCString256,
  Renamed,
  getRenamed,
  setRenamed,
  NullablePtr,
  getNullablePtr,
  setNullablePtr,
  CNumArray,
  getCNumArray,
  CObjArray,
  getCObjArray,
  CPtrArray,
  getCPtrArray
} from "./type-helpers";
import * as Core from "./clap-core";
export * from "./clap-core";
let modulePath = "";
export {
  modulePath
};
export function equalCStr(a: usize, b: usize): bool {
  let memEnd = usize(memory.size() * 65536);
  while (a < memEnd && b < memEnd) {
    let ac = load<u8>(a++), bc = load<u8>(b++);
    if (ac != bc) return false;
;
    if (!ac) return true;
;
  }
  return false;
}
@unmanaged
@final
export class Version extends Core.clap_version {
  @inline
  get major(): Renamed<u32> {
    return getRenamed<u32>(this._major);
  }
  @inline
  set major(v: Renamed<u32>) {
    this._major = setRenamed<u32>(v, this._major);
  }
  @inline
  get minor(): Renamed<u32> {
    return getRenamed<u32>(this._minor);
  }
  @inline
  set minor(v: Renamed<u32>) {
    this._minor = setRenamed<u32>(v, this._minor);
  }
  @inline
  get revision(): Renamed<u32> {
    return getRenamed<u32>(this._revision);
  }
  @inline
  set revision(v: Renamed<u32>) {
    this._revision = setRenamed<u32>(v, this._revision);
  }
}
@unmanaged
@final
export class PluginDescriptor extends Core.clap_plugin_descriptor {
  get clapVersion(): Version {
    return changetype(this);
  }
  @inline
  get id(): CString {
    return getCString(this._id);
  }
  @inline
  set id(v: CString) {
    this._id = setCString(v, this._id);
  }
  @inline
  get name(): CString {
    return getCString(this._name);
  }
  @inline
  set name(v: CString) {
    this._name = setCString(v, this._name);
  }
  @inline
  get vendor(): CStringNullable {
    return getCStringNullable(this._vendor);
  }
  @inline
  set vendor(v: CStringNullable) {
    this._vendor = setCStringNullable(v, this._vendor);
  }
  @inline
  get url(): CStringNullable {
    return getCStringNullable(this._url);
  }
  @inline
  set url(v: CStringNullable) {
    this._url = setCStringNullable(v, this._url);
  }
  @inline
  get manualUrl(): CStringNullable {
    return getCStringNullable(this._manual_url);
  }
  @inline
  set manualUrl(v: CStringNullable) {
    this._manual_url = setCStringNullable(v, this._manual_url);
  }
  @inline
  get supportUrl(): CStringNullable {
    return getCStringNullable(this._support_url);
  }
  @inline
  set supportUrl(v: CStringNullable) {
    this._support_url = setCStringNullable(v, this._support_url);
  }
  @inline
  get version(): CStringNullable {
    return getCStringNullable(this._version);
  }
  @inline
  set version(v: CStringNullable) {
    this._version = setCStringNullable(v, this._version);
  }
  @inline
  get description(): CStringNullable {
    return getCStringNullable(this._description);
  }
  @inline
  set description(v: CStringNullable) {
    this._description = setCStringNullable(v, this._description);
  }
  get features(): Array<string> {
    let result = new Array<string>();
    let index: usize = 0;
    while (index < MAX_FEATURE_COUNT) {
      let ptr = load<usize>(this._features + sizeof<usize>() * index);
      if (!ptr) break;
;
      result.push(getCString(ptr));
      ++index;
    }
    return result;
  }
  set features(list: StaticArray<string>) {
    let featureList = heap.alloc(sizeof<usize>() * list.length + 2);
    while (featureList % (1 << alignof<usize>())) ++featureList;
    this._features = featureList;
    for (let i: i32 = 0; i < list.length; ++i) {
      let rawPtr = setCStringNullable(list[i], 0);
      store<usize>(featureList + sizeof<usize>() * i, rawPtr);
    }
    store<usize>(featureList + sizeof<usize>() * list.length, 0);
  }
}
@unmanaged
@final
export class AudioBuffer extends Core.clap_audio_buffer {
  @inline
  get data32(): CPtrArray<CNumArray<f32>> {
    return getCPtrArray<CNumArray<f32>>(this._data32);
  }
  @inline
  get data64(): CPtrArray<CNumArray<f64>> {
    return getCPtrArray<CNumArray<f64>>(this._data64);
  }
  @inline
  get channelCount(): Renamed<u32> {
    return getRenamed<u32>(this._channel_count);
  }
  @inline
  get latency(): Renamed<u32> {
    return getRenamed<u32>(this._latency);
  }
  @inline
  set latency(v: Renamed<u32>) {
    this._latency = setRenamed<u32>(v, this._latency);
  }
  @inline
  get constantMask(): Renamed<u32> {
    return getRenamed<u32>(this._constant_mask);
  }
  @inline
  set constantMask(v: Renamed<u32>) {
    this._constant_mask = setRenamed<u32>(v, this._constant_mask);
  }
}
@unmanaged
@final
export class Process extends Core.clap_process {
  @inline
  get steadyTime(): Renamed<u32> {
    return getRenamed<u32>(this._steady_time);
  }
  @inline
  get framesCount(): Renamed<u32> {
    return getRenamed<u32>(this._frames_count);
  }
  @inline
  get transport(): NullablePtr<clap_event_transport> {
    return getNullablePtr<clap_event_transport>(this._transport);
  }
  @inline
  get audioInputs(): CObjArray<AudioBuffer> {
    return getCObjArray<AudioBuffer>(this._audio_inputs);
  }
  @inline
  get audioOutputs(): CObjArray<AudioBuffer> {
    return getCObjArray<AudioBuffer>(this._audio_outputs);
  }
  @inline
  get audioInputsCount(): Renamed<u32> {
    return getRenamed<u32>(this._audio_inputs_count);
  }
  @inline
  get audioOutputsCount(): Renamed<u32> {
    return getRenamed<u32>(this._audio_outputs_count);
  }
}
assert(offsetof<clap_process>() == offsetof<Process>(), "`Process` must have the exact same layout as `clap_process` (no extra fields)");
@unmanaged
@final
export class Host extends Core.clap_host {
  get clapVersion(): Version {
    return changetype<Version>(this);
  }
  @inline
  get name(): CString {
    return getCString(this._name);
  }
  @inline
  get vendor(): CStringNullable {
    return getCStringNullable(this._vendor);
  }
  @inline
  get url(): CStringNullable {
    return getCStringNullable(this._url);
  }
  @inline
  get version(): CStringNullable {
    return getCStringNullable(this._version);
  }
  getExtension<T extends HostExt>(extId: string): T | null {
    let cString = String.UTF8.encode(extId, true);
    return this.getExtensionUtf8<T>(changetype<usize>(cString));
  }
  getExtensionUtf8<T extends HostExt>(cString: usize): T | null {
    let ptr = call_indirect<usize>(u32(this._get_extension), this, cString);
    if (!ptr) return null;
;
    return instantiate<T>(this, ptr);
  }
  requestRestart(): void {
    call_indirect(u32(this._request_restart), this);
  }
  requestProcess(): void {
    call_indirect(u32(this._request_process), this);
  }
  requestCallback(): void {
    call_indirect(u32(this._request_callback), this);
  }
}
export class HostExt {
  constructor(protected _host: Core.clap_host, protected _extPtr: usize) {}
}
@unmanaged
@final
export class AudioPortInfo extends Core.clap_audio_port_info {
  @inline
  get id(): Renamed<clap_id> {
    return getRenamed<clap_id>(this._id);
  }
  @inline
  set id(v: Renamed<clap_id>) {
    this._id = setRenamed<clap_id>(v, this._id);
  }
  @inline
  get name(): CString256 {
    return getCString256(this._name);
  }
  @inline
  set name(v: CString256) {
    this._name = setCString256(v, this._name);
  }
  @inline
  get flags(): Renamed<u32> {
    return getRenamed<u32>(this._flags);
  }
  @inline
  set flags(v: Renamed<u32>) {
    this._flags = setRenamed<u32>(v, this._flags);
  }
  @inline
  get channelCount(): Renamed<u32> {
    return getRenamed<u32>(this._channel_count);
  }
  @inline
  set channelCount(v: Renamed<u32>) {
    this._channel_count = setRenamed<u32>(v, this._channel_count);
  }
  @inline
  get portType(): CString {
    return getCString(this._port_type);
  }
  @inline
  set portType(v: CString) {
    this._port_type = setCString(v, this._port_type);
  }
  @inline
  get inPlacePair(): Renamed<clap_id> {
    return getRenamed<clap_id>(this._in_place_pair);
  }
  @inline
  set inPlacePair(v: Renamed<clap_id>) {
    this._in_place_pair = setRenamed<clap_id>(v, this._in_place_pair);
  }
}
@final
export class HostAudioPorts extends HostExt {
  get _ext(): Core.clap_host_audio_ports {
    return changetype(this._extPtr);
  }
  isRescanFlagSupported(flag: u32): bool {
    return call_indirect<bool>(this._ext.is_rescan_flag_supported, this._host, flag);
  }
  rescan(flags: u32): void {
    return call_indirect<void>(this._ext.rescan, this._host, flags);
  }
}
let activePlugins = new Map<usize, Plugin>();
export class Plugin {
  readonly host: Host;
  hostAudioPorts: HostAudioPorts | null = null;
  corePlugin: Core.clap_plugin;
  constructor(host: Host) {
    this.host = host;
    let corePlugin = this.corePlugin = new Core.clap_plugin();
    corePlugin._plugin_data = changetype<usize>(this);
    corePlugin._init = fnPtr((plugin: Core.clap_plugin): bool => changetype<Plugin>(plugin._plugin_data).pluginInit());
    corePlugin._destroy = fnPtr((corePlugin: Core.clap_plugin): void => {
      let plugin = changetype<Plugin>(corePlugin._plugin_data);
      plugin.pluginDestroy();
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
    console.log(`pluginInit()`);
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
  pluginGetExtensionUtf8(extIdPtr: usize): usize {
    if (equalCStr(extIdPtr, Core.Utf8.EXT_AUDIO_PORTS)) return changetype<usize>(coreAudioPorts);
;
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
  audioPortsCount(isInput: bool): u32 {
    return 0;
  }
  audioPortsGet(index: u32, isInput: bool, info: AudioPortInfo): bool {
    return false;
  }
}
let coreAudioPorts = new Core.clap_plugin_audio_ports();
coreAudioPorts._count = fnPtr((plugin: Core.clap_plugin, isInput: bool): u32 => changetype<Plugin>(plugin._plugin_data).audioPortsCount(isInput));
coreAudioPorts._get = fnPtr((plugin: Core.clap_plugin, index: u32, isInput: bool, info: AudioPortInfo): bool => changetype<Plugin>(plugin._plugin_data).audioPortsGet(index, isInput, info));
class RegisteredClapPlugin {
  constructor(public id: string, public desc: clap_plugin_descriptor, public create: (host: clap_host, desc: clap_plugin_descriptor) => clap_plugin) {}
}
let registeredPluginList = new Array<RegisteredClapPlugin>();
export function registerPlugin<PluginClass extends Plugin>(pluginName: string, pluginId: string): PluginDescriptor {
  let desc = new PluginDescriptor();
  desc.id = pluginId;
  desc.name = pluginName;
  desc.features = ["audio-effect"];
  let createFn = function(host: clap_host, desc: clap_plugin_descriptor): clap_plugin {
    let plugin = instantiate<PluginClass>(changetype<Host>(host));
    let corePlugin = plugin.corePlugin;
    activePlugins.set(changetype<usize>(corePlugin), plugin);
    corePlugin._desc = changetype<usize>(desc);
    return corePlugin;
  };
  registeredPluginList.push(new RegisteredClapPlugin(pluginId, desc, createFn));
  return desc;
}
function pluginFactory_get_plugin_count(self: clap_plugin_factory): usize {
  return registeredPluginList.length;
}
function pluginFactory_get_plugin_descriptor(self: clap_plugin_factory, index: u32): usize {
  if (index >= u32(registeredPluginList.length)) return 0;
;
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
