import * as Core from "./clap-core";
import {
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
  CNumPtr,
  getCNumPtr,
  CObjPtr,
  getCObjPtr,
  CPtrPtr,
  getCPtrPtr
} from "./properties";
export function fnPtr<F>(fn: F): usize {
  assert(load<usize>(changetype<usize>(fn) + sizeof<usize>()) == 0, "_env of function must be zero if you're taking a pointer");
  return load<usize>(changetype<usize>(fn));
}
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
  get minor(): Renamed<u32> {
    return getRenamed<u32>(this._minor);
  }
  @inline
  get revision(): Renamed<u32> {
    return getRenamed<u32>(this._revision);
  }
}
@unmanaged
@final
export class AudioBuffer extends Core.clap_audio_buffer {
  @inline
  get data32(): CPtrPtr<CNumPtr<f32>> {
    return getCPtrPtr<CNumPtr<f32>>(this._data32);
  }
  @inline
  get data64(): CPtrPtr<CNumPtr<f64>> {
    return getCPtrPtr<CNumPtr<f64>>(this._data64);
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
  get audioInputs(): CObjPtr<AudioBuffer> {
    return getCObjPtr<AudioBuffer>(this._audio_inputs);
  }
  @inline
  get audioOutputs(): CObjPtr<AudioBuffer> {
    return getCObjPtr<AudioBuffer>(this._audio_outputs);
  }
  @inline
  get audioInputsCount(): Renamed<u32> {
    return getRenamed<u32>(this._audio_inputs_count);
  }
  @inline
  get audioOutputsCount(): Renamed<u32> {
    return getRenamed<u32>(this._audio_outputs_count);
  }
  get inEvents(): InputEvents {
    return changetype<InputEvents>(this._in_events);
  }
  get outEvents(): OutputEvents {
    return changetype<OutputEvents>(this._out_events);
  }
}
assert(offsetof<Core.clap_process>() == offsetof<Process>(), "`Process` must have the exact same layout as `clap_process` (no extra fields)");
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
export class AudioPortInfo extends Core.clap_audio_port_info {
  @inline
  get id(): Renamed<Core.clap_id> {
    return getRenamed<Core.clap_id>(this._id);
  }
  @inline
  set id(v: Renamed<Core.clap_id>) {
    this._id = setRenamed<Core.clap_id>(v, this._id);
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
  get inPlacePair(): Renamed<Core.clap_id> {
    return getRenamed<Core.clap_id>(this._in_place_pair);
  }
  @inline
  set inPlacePair(v: Renamed<Core.clap_id>) {
    this._in_place_pair = setRenamed<Core.clap_id>(v, this._in_place_pair);
  }
}
@unmanaged
@final
export class NotePortInfo extends Core.clap_note_port_info {
  @inline
  get id(): Renamed<Core.clap_id> {
    return getRenamed<Core.clap_id>(this._id);
  }
  @inline
  set id(v: Renamed<Core.clap_id>) {
    this._id = setRenamed<Core.clap_id>(v, this._id);
  }
  @inline
  get supportedDialects(): Renamed<u32> {
    return getRenamed<u32>(this._supported_dialects);
  }
  @inline
  set supportedDialects(v: Renamed<u32>) {
    this._supported_dialects = setRenamed<u32>(v, this._supported_dialects);
  }
  @inline
  get preferredDialect(): Renamed<u32> {
    return getRenamed<u32>(this._preferred_dialect);
  }
  @inline
  set preferredDialect(v: Renamed<u32>) {
    this._preferred_dialect = setRenamed<u32>(v, this._preferred_dialect);
  }
  @inline
  get name(): CString256 {
    return getCString256(this._name);
  }
  @inline
  set name(v: CString256) {
    this._name = setCString256(v, this._name);
  }
}
@unmanaged
@final
export class ParamInfo extends Core.clap_param_info {
  @inline
  get id(): Renamed<Core.clap_id> {
    return getRenamed<Core.clap_id>(this._id);
  }
  @inline
  set id(v: Renamed<Core.clap_id>) {
    this._id = setRenamed<Core.clap_id>(v, this._id);
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
  get cookie(): Renamed<usize> {
    return getRenamed<usize>(this._cookie);
  }
  @inline
  set cookie(v: Renamed<usize>) {
    this._cookie = setRenamed<usize>(v, this._cookie);
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
  get module(): CString1024 {
    return getCString1024(this._module);
  }
  @inline
  set module(v: CString1024) {
    this._module = setCString1024(v, this._module);
  }
  @inline
  get minValue(): Renamed<f64> {
    return getRenamed<f64>(this._min_value);
  }
  @inline
  set minValue(v: Renamed<f64>) {
    this._min_value = setRenamed<f64>(v, this._min_value);
  }
  @inline
  get maxValue(): Renamed<f64> {
    return getRenamed<f64>(this._max_value);
  }
  @inline
  set maxValue(v: Renamed<f64>) {
    this._max_value = setRenamed<f64>(v, this._max_value);
  }
  @inline
  get defaultValue(): Renamed<f64> {
    return getRenamed<f64>(this._default_value);
  }
  @inline
  set defaultValue(v: Renamed<f64>) {
    this._default_value = setRenamed<f64>(v, this._default_value);
  }
}
@unmanaged
@final
export class InputEvents extends Core.clap_input_events {
  @inline
  size(): u32 {
    return call_indirect<u32>(u32(this._size), this);
  }
  @inline
  @operator("[]")
  get(index: usize): Core.clap_event_header {
    let index32 = u32(index);
    let size = call_indirect<u32>(u32(this._size), this);
    if (index32 >= size) unreachable();
;
    return call_indirect<Core.clap_event_header>(u32(this._get), this, index32);
  }
}
@unmanaged
@final
export class OutputEvents extends Core.clap_output_events {
  @inline
  tryPush(event: Core.clap_event_header): bool {
    return call_indirect<bool>(u32(this._try_push), this, event);
  }
}
