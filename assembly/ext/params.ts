import * as Core from "../clap-core"
import * as property from "../property"

import {Host, HostExt} from "../host"

@unmanaged @final
export class ParamInfo extends Core.clap_param_info {
	@property id : Renamed<clap_id> = this._id;
	@property flags : Renamed<u32> = this._flags;
	@property cookie : Renamed<usize> = this._cookie;
	@property name : CString256 = this._name;
	@property module : CString1024 = this._module;
	@property minValue : Renamed<f64> = this._min_value;
	@property maxValue : Renamed<f64> = this._max_value;
	@property defaultValue : Renamed<f64> = this._default_value;
}

@final
export class HostParams extends HostExt {
	get _ext() : Core.clap_host_params {
		return changetype(this._extPtr);
	}
	rescan(flags: u32) : void {
		return call_indirect<void>(this._ext._rescan, this._host, flags);
	}
	clear(paramId: Core.clap_id, flags: u32) : void {
		return call_indirect<void>(this._ext._clear, this._host, paramId, flags);
	}
	requestFlush() : void {
		return call_indirect<void>(this._ext._request_flush, this._host);
	}
}