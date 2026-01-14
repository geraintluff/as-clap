import * as property from "./property";
import {
  CNumArray,
  CPtrArray,
  CObjArray
} from "./property";
import * as Core from "./clap-core";
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
  get major(): property.Renamed<u32> {
    return property.getRenamed<u32>(this._major);
  }
  @inline
  set major(v: property.Renamed<u32>) {
    this._major = property.setRenamed<u32>(v, this._major);
  }
  @inline
  get minor(): property.Renamed<u32> {
    return property.getRenamed<u32>(this._minor);
  }
  @inline
  set minor(v: property.Renamed<u32>) {
    this._minor = property.setRenamed<u32>(v, this._minor);
  }
  @inline
  get revision(): property.Renamed<u32> {
    return property.getRenamed<u32>(this._revision);
  }
  @inline
  set revision(v: property.Renamed<u32>) {
    this._revision = property.setRenamed<u32>(v, this._revision);
  }
}
@unmanaged
@final
export class AudioBuffer extends Core.clap_audio_buffer {
  @inline
  get data32(): property.CPtrArray<CNumArray<f32>> {
    return property.getCPtrArray<CNumArray<f32>>(this._data32);
  }
  @inline
  get data64(): property.CPtrArray<CNumArray<f64>> {
    return property.getCPtrArray<CNumArray<f64>>(this._data64);
  }
  @inline
  get channelCount(): property.Renamed<u32> {
    return property.getRenamed<u32>(this._channel_count);
  }
  @inline
  get latency(): property.Renamed<u32> {
    return property.getRenamed<u32>(this._latency);
  }
  @inline
  set latency(v: property.Renamed<u32>) {
    this._latency = property.setRenamed<u32>(v, this._latency);
  }
  @inline
  get constantMask(): property.Renamed<u32> {
    return property.getRenamed<u32>(this._constant_mask);
  }
  @inline
  set constantMask(v: property.Renamed<u32>) {
    this._constant_mask = property.setRenamed<u32>(v, this._constant_mask);
  }
}
@unmanaged
@final
export class Process extends Core.clap_process {
  @inline
  get steadyTime(): property.Renamed<u32> {
    return property.getRenamed<u32>(this._steady_time);
  }
  @inline
  get framesCount(): property.Renamed<u32> {
    return property.getRenamed<u32>(this._frames_count);
  }
  @inline
  get transport(): property.NullablePtr<clap_event_transport> {
    return property.getNullablePtr<clap_event_transport>(this._transport);
  }
  @inline
  get audioInputs(): property.CObjArray<AudioBuffer> {
    return property.getCObjArray<AudioBuffer>(this._audio_inputs);
  }
  @inline
  get audioOutputs(): property.CObjArray<AudioBuffer> {
    return property.getCObjArray<AudioBuffer>(this._audio_outputs);
  }
  @inline
  get audioInputsCount(): property.Renamed<u32> {
    return property.getRenamed<u32>(this._audio_inputs_count);
  }
  @inline
  get audioOutputsCount(): property.Renamed<u32> {
    return property.getRenamed<u32>(this._audio_outputs_count);
  }
}
assert(offsetof<Core.clap_process>() == offsetof<Process>(), "`Process` must have the exact same layout as `clap_process` (no extra fields)");
