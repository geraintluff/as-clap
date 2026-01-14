import * as property from "./property"
import {CNumArray, CPtrArray, CObjArray} from "./property"
import * as Core from "./clap-core"

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
	@property major: Renamed<u32> = this._major;
	@property minor: Renamed<u32> = this._minor;
	@property revision: Renamed<u32> = this._revision;
}

@unmanaged @final
export class AudioBuffer extends Core.clap_audio_buffer {
	@property readonly data32 : CPtrArray<CNumArray<f32>> = this._data32;
	@property readonly data64 : CPtrArray<CNumArray<f64>> = this._data64;
	@property readonly channelCount : Renamed<u32> = this._channel_count;
	@property latency : Renamed<u32> = this._latency;
	@property constantMask : Renamed<u32> = this._constant_mask;
}

@unmanaged @final
export class Process extends Core.clap_process {
	@property readonly steadyTime : Renamed<u32> = this._steady_time;
	@property readonly framesCount : Renamed<u32> = this._frames_count;
	@property readonly transport : NullablePtr<clap_event_transport> = this._transport;
	@property readonly audioInputs : CObjArray<AudioBuffer> = this._audio_inputs;
	@property readonly audioOutputs : CObjArray<AudioBuffer> = this._audio_outputs;
	@property readonly audioInputsCount : Renamed<u32> = this._audio_inputs_count;
	@property readonly audioOutputsCount : Renamed<u32> = this._audio_outputs_count;
}
assert(offsetof<Core.clap_process>() == offsetof<Process>(), "`Process` must have the exact same layout as `clap_process` (no extra fields)");
