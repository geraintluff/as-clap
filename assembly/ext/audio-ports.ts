import * as Core from "../clap-core"
import * as property from "../property"

import {Host, HostExt} from "../host"

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