# WCLAP written in AssemblyScript

This is extremely early-stage, but it's a fun proof-of-concept: you can write an audio effect in AssemblyScript using the CLAP plugin format, and then (using the [bridge plugin](https://github.com/WebCLAP/wclap-bridge)) use it in a native DAW.

The actual "effect" is in `assembly/index.ts`.  It's extremely simple for now, just taking a stereo signal and returns the `abs()` of every sample.  The only extension supported so far is `clap.audio-ports`.

The dream is for this to become an AssemblyScript framework/library which lets you implement the CLAP API without having to

## Code structure

The support code which provides the CLAP API is mostly in `assembly/clap-plugins.ts`.  This provides a `Plugin` class which you can inherit from (similar to the C++ `clap-helpers`).

Any CLAP structures which the plugin doesn't own are translated as `@unmanaged` classes (which means they exist on the heap exactly as described, with no extra GC counters, vtables etc.).  For example, here is `clap_audio_buffer`:

```typescript
@unmanaged
export class clap_audio_buffer {
	readonly _data32 : usize;
	readonly _data64 : usize;
	readonly _channel_count : u32;
	_latency : u32;
	_constant_mask : u64;
}
```

This is a very low-level translation of the CLAP structures, and we can re-interpret the raw `usize` pointers as objects of this class, to use the various fields on it.  It's still not very usable though, so help we also have:

* Classes and helpers (implemented in `assembly/common.ts`) which extend these low-level translations
* A `@property` decorator (implemented in `transform.js`) which expands into setters/getters which convert or re-interpret the raw values from the CLAP struct.

Armed with these, we extend the basic CLAP structure with a friendlier subclass.  This doesn't add any new fields (meaning their memory layout is the same, and we can just `changetype<>` the value/pointer), but they provide friendly zero-allocation access to the C-style structures:

```typescript
@unmanaged @final
export class AudioBuffer extends clap_audio_buffer {
	@property readonly data32 : CPtrArray<CNumArray<f32>> = this._data32;
	@property readonly data64 : CPtrArray<CNumArray<f64>> = this._data64;
	@property readonly channelCount : Renamed<u32> = this._channel_count;
	@property latency : Renamed<u32> = this._latency;
	@property constantMask : Renamed<u32> = this._constant_mask;
}
```

Here's the effect's process function, where `audioIn` and `audioOut` are `AudioBuffer` instances:

```typescript
pluginProcess(process : Clap.Process) : i32 {
	let audioIn = process.audioInputs[0];
	let audioOut = process.audioOutputs[0];
	let length = process.framesCount;
	for (let c = 0; c < 2; ++c) {
		let bufferIn = audioIn.data32[c];
		let bufferOut = audioOut.data32[c];
		for (let i: u32 = 0; i < length; ++i) {
			bufferOut[i] = abs(bufferIn[i]);
		}
	}
	return Clap.PROCESS_CONTINUE;
}
```
