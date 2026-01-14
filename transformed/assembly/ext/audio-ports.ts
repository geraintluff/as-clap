import * as Core from "../clap-core";
import * as property from "../property";
import {
  Host,
  HostExt
} from "../host";
@unmanaged
@final
export class AudioPortInfo extends Core.clap_audio_port_info {
  @inline
  get id(): property.Renamed<clap_id> {
    return property.getRenamed<clap_id>(this._id);
  }
  @inline
  set id(v: property.Renamed<clap_id>) {
    this._id = property.setRenamed<clap_id>(v, this._id);
  }
  @inline
  get name(): property.CString256 {
    return property.getCString256(this._name);
  }
  @inline
  set name(v: property.CString256) {
    this._name = property.setCString256(v, this._name);
  }
  @inline
  get flags(): property.Renamed<u32> {
    return property.getRenamed<u32>(this._flags);
  }
  @inline
  set flags(v: property.Renamed<u32>) {
    this._flags = property.setRenamed<u32>(v, this._flags);
  }
  @inline
  get channelCount(): property.Renamed<u32> {
    return property.getRenamed<u32>(this._channel_count);
  }
  @inline
  set channelCount(v: property.Renamed<u32>) {
    this._channel_count = property.setRenamed<u32>(v, this._channel_count);
  }
  @inline
  get portType(): property.CString {
    return property.getCString(this._port_type);
  }
  @inline
  set portType(v: property.CString) {
    this._port_type = property.setCString(v, this._port_type);
  }
  @inline
  get inPlacePair(): property.Renamed<clap_id> {
    return property.getRenamed<clap_id>(this._in_place_pair);
  }
  @inline
  set inPlacePair(v: property.Renamed<clap_id>) {
    this._in_place_pair = property.setRenamed<clap_id>(v, this._in_place_pair);
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
