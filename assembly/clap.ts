// The friendly version of various structs

import * as Core from "./clap-core";

// type/get/set used for `@property` access
import {CString, getCString, setCString, CStringNullable, getCStringNullable, setCStringNullable, CString256, setCString256, getCString256, Renamed, getRenamed, setRenamed, NullablePtr, getNullablePtr, setNullablePtr, CNumPtr, getCNumPtr, CObjPtr, getCObjPtr, CPtrPtr, getCPtrPtr} from "./properties"

export function fnPtr<F>(fn : F) : usize {
	assert(load<usize>(changetype<usize>(fn) + sizeof<usize>()) == 0, "_env of function must be zero if you're taking a pointer");
	return load<usize>(changetype<usize>(fn));
}

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
	@property readonly major: Renamed<u32> = this._major;
	@property readonly minor: Renamed<u32> = this._minor;
	@property readonly revision: Renamed<u32> = this._revision;
}

@unmanaged @final
export class AudioBuffer extends Core.clap_audio_buffer {
	@property readonly data32 : CPtrPtr<CNumPtr<f32>> = this._data32;
	@property readonly data64 : CPtrPtr<CNumPtr<f64>> = this._data64;
	@property readonly channelCount : Renamed<u32> = this._channel_count;
	@property latency : Renamed<u32> = this._latency;
	@property constantMask : Renamed<u32> = this._constant_mask;
}

@unmanaged @final
export class Process extends Core.clap_process {
	@property readonly steadyTime : Renamed<u32> = this._steady_time;
	@property readonly framesCount : Renamed<u32> = this._frames_count;
	@property readonly transport : NullablePtr<clap_event_transport> = this._transport;
	@property readonly audioInputs : CObjPtr<AudioBuffer> = this._audio_inputs;
	@property readonly audioOutputs : CObjPtr<AudioBuffer> = this._audio_outputs;
	@property readonly audioInputsCount : Renamed<u32> = this._audio_inputs_count;
	@property readonly audioOutputsCount : Renamed<u32> = this._audio_outputs_count;
}
assert(offsetof<Core.clap_process>() == offsetof<Process>(), "`Process` must have the exact same layout as `clap_process` (no extra fields)");

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
export class AudioPortInfo extends Core.clap_audio_port_info {
	@property id : Renamed<Core.clap_id> = this._id;
	@property name : CString256 = this._name;
	@property flags : Renamed<u32> = this._flags;
	@property channelCount : Renamed<u32> = this._channel_count;
	@property portType : CString = this._port_type;
	@property inPlacePair : Renamed<Core.clap_id> = this._in_place_pair;
}

@unmanaged @final
export class ParamInfo extends Core.clap_param_info {
	@property id : Renamed<Core.clap_id> = this._id;
	@property flags : Renamed<u32> = this._flags;
	@property cookie : Renamed<usize> = this._cookie;
	@property name : CString256 = this._name;
	@property module : CString1024 = this._module;
	@property minValue : Renamed<f64> = this._min_value;
	@property maxValue : Renamed<f64> = this._max_value;
	@property defaultValue : Renamed<f64> = this._default_value;
}

@unmanaged @final
export class InputEvents extends Core.clap_input_events {
	@inline size() : u32 {
		return call_indirect<u32>(u32(this._size), this);
	}
	@inline @operator("[]") get(index: usize) : Core.clap_event_header {
		let index32 = u32(index);
		let size = call_indirect<u32>(u32(this._size), this);
		if (index32 >= size) unreachable();
		return call_indirect<Core.clap_event_header>(u32(this._get), this, index32);
	}
}
@unmanaged @final
export class OutputEvents extends Core.clap_output_events {
	@inline tryPush(event: Core.clap_event_header) : bool {
		return call_indirect<bool>(u32(this._try_push), this, event);
	}
}
