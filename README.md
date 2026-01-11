# CLAP written in AssemblyScript

This repo shows you can write an audio effect in AssemblyScript using the established CLAP plugin format.  The goal is to become a framework/library for AssemblyScript developers to make audio plugins for wide distribution and serious use.

There's an example effect is in `example/index.ts`.  It's extremely simple for now, just taking a stereo signal and returning the `abs()` of every sample.

### Why CLAP?

AssemblyScript compiles to WASM, so we need a [bridge plugin/library](https://github.com/WebCLAP/wclap-bridge) to run in a native DAW.  If it needs a bridge anyway, wouldn't any API work?

Re-using the CLAP standard (instead of inventing a new format) means the API is production-ready.  The set of extensions/events/etc. is already used by many (commercially-released) plugins, so we're very unlikely to suddenly hit a limitation which requires expanding the API (and therefore the bridge plugin, and this library, or any other tools).

It also gives puts us on a par with other toolchains: a CLAP written in AssemblyScript should behave identically to a C/C++/Rust CLAP compiled to WebAssembly.  This means AS developers can join a larger ecosystem of plugins which target browser DAWs and native DAWs simultaneously.

There's space for other (W)CLAP tools to be created - e.g. using `wasm2c` to recompile WASM into fully-native code.  Using CLAP for the API means such tools can be developed independently, without having to co-ordinate to keep a custom API in line.

## Code structure

The idea is that your plugin is an ordinary (managed) AssemblyScript class, where you add functionality by overriding methods.  The base-class handles all the awkward function-pointer stuff, and returns you objects with nice properties, _without_ any extra allocations on the audio path.

Here's the effect's process function for a stereo audio effect:

```typescript
class MyPlugin extends Clap.Plugin {
	//... setup, describing the stereo audio-ports, etc.
	
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
}
```

The underlying CLAP types are still there, and you may occasionally need to use them, but mostly for plain-data values (e.g. events).  However, you shouldn't need to directly deal with any CLAP types which contain pointers.  Here's how that's organised:

### Core API

The core CLAP API is translated in `assembly/clap-core.ts`, by a script (`dev/translate-clap-api.cjs`) which does string-matching on the CLAP header definitions.  Here's an example of that automatic translation:

```typescript
@unmanaged
export class clap_audio_port_info {
	_id : clap_id;
	@array(256) _name : i8;
	_flags : u32;
	_channel_count : u32;
	_port_type : usize; // const char *
	_in_place_pair : clap_id;
}
```

Any pointers or functions are mapped to `usize`.  We can re-interpret (`changetype`) the raw pointers as a more useful types (e.g. another of the `clap_...` classes) to access their fields.

### `Plugin` base class

The raw CLAP API isn't very AssemblyScript-y, so `assembly/clap.ts` provides a nicer API, including:

* a `Plugin` class which you can inherit from (similar to the C++ `clap-helpers`)
* `registerPlugin()` for adding your plugin classes to the module
* a string `modulePath` for the file-path at which the CLAP is loaded.  (Although AssemblyScript can't easily read/write files, if your CLAP is a bundle then you'll need this to assemble `file://` URLs for webview UIs)

The `Plugin` class retains itself while active (so it's not GC'd until destroyed), and fills out all the function pointers for the core API so that they forward to methods:

* The main `clap_plugin` functions forward to methods named `pluginInit()` - e.g. `clap_plugin.activate` becomes the method `.pluginActivate(sampleRate, minFrames, maxFrames)`.
* Extension functions are mapped to `extensionName...` - e.g. `clap_plugin_audio_ports.count` becomes `.audioPortsCount(isInput)`.

### Friendly classes

Aside from the `Plugin` class (and re-exporting all the `clap_...` core API stuff), `assembly/clap.ts` also provides enhanced versions of the core classes.  These don't actually add any fields, so you can cast core-API objects to these enhanced versions.

```typescript
@unmanaged @final
export class AudioPortInfo extends Core.clap_audio_port_info {
	@property id : Renamed<clap_id> = this._id;
	@property name : CString256 = this._name;
	@property flags : Renamed<u32> = this._flags;
	@property channelCount : Renamed<u32> = this._channel_count;
	@property portType : CString = this._port_type;
	@property inPlacePair : Renamed<clap_id> = this._in_place_pair;
}
```

The `@property` decorator is mapped (by a custom `Transform` in) to custom setters/getters.  For example, where the core class's `_port_type` is a `usize`, when re-interpreted as an `AudioPortInfo` object, you can get/set `portType` using ordinary `string` values, and it gets translated behind the scenes.

### Transform

The transform is implemented in `transform.js`.  As well as `@property`, it also handles the `@array` decorator in the core API, because AssemblyScript doesn't have fixed-size inline arrays.
