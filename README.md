# CLAP written in AssemblyScript

This repo shows you can write an audio effect in AssemblyScript using the established CLAP plugin format.  The goal is to become a framework/library for AssemblyScript developers to make audio plugins for wide distribution and serious use.

There's an example effect is in `example/index.ts`.  It's extremely simple for now, just taking a stereo signal and returning the `abs()` of every sample.

### Why CLAP?

AssemblyScript compiles to WASM, so we need a [bridge plugin/library](https://github.com/WebCLAP/wclap-bridge) to run in a native DAW.  If it needs a bridge anyway, wouldn't any API work?

Re-using the CLAP standard (instead of inventing a new format) means the API is production-ready.  The set of extensions/events/etc. is already used by many (commercially-released) plugins, so we're very unlikely to suddenly hit a limitation which requires expanding the API (and therefore the bridge plugin, and this library, or any other tools).

It also gives puts us on a par with other toolchains: a CLAP written in AssemblyScript should behave identically to a C/C++/Rust CLAP compiled to WebAssembly.  This means AS developers can join a larger ecosystem of plugins which target browser DAWs and native DAWs simultaneously.

There's space for other (W)CLAP tools to be created - e.g. using `wasm2c` to recompile WASM into fully-native code.  Using CLAP for the API means such tools can be developed independently, without having to co-ordinate to keep a custom API in line.

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
