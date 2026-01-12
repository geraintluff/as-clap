# CLAP written in AssemblyScript

This repo shows you can write an audio effect in AssemblyScript using the established CLAP plugin format.  The goal is to become a framework/library for AssemblyScript developers to make audio plugins for wide distribution and serious use.

There's an example plugin in [`example/`](example/).  You can copy this directory, run `npm install && npm run asbuild && npm run open` and go from there.

### How to use

First install this and the [wasi-shim](https://github.com/AssemblyScript/wasi-shim/blob/main/asconfig.json):

```
npm install --save geraintluff/as-clap @assemblyscript/wasi-shim
```

Then extend from WASI `asconfig.json`, and set appropriate options to get a WASI "reactor" module:

```json
{
  "extends": "./node_modules/@assemblyscript/wasi-shim/asconfig.json",
  "entries": [
    "./my-effect.ts",
    "./node_modules/as-clap/clap-entry.ts"
  ],
  "targets": {
    "debug": {"outFile": "build/debug.wclap.wasm"},
    "release": {"outFile": "build/release.wclap.wasm", "optimizeLevel": 3}
  },
  "options": {
    "exportStart": "_initialize",
    "importMemory": false,
    "sharedMemory": false,
    "exportTable": true,
    "enable": ["simd", "relaxed-simd"]
  }
}
```

From your code, re-export all the `clap-entry` symbols.  Also include the CLAP types, extend `Plugin` and register it:

```typescript
export * from "as-clap/clap-entry"

include * as Clap from "./node_modules/as-clap";

class MyPlugin extends Clap.Plugin {
	constructor(host : Clap.Host) {
		super(host);
	}
	//...
}

let pluginDesc = Clap.registerPlugin<MyPlugin>("The Pluginator", "com.example.clap.my-plugin");
// fill out the descriptor fields
pluginDesc.vendor = "Really Cool Plugins Ltd.";
pluginDesc.features = [Clap.PLUGIN_FEATURE_AUDIO_EFFECT];
```

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

### Transform

You may have noticed a few non-standard decorators there!  These are handled by a transform implemented in `transform.js`.  However, this is only needed for internal development - the transformed code is written out to `transformed/assembly`, and that's what the top-level `index.ts` and `clap-entry.ts` actually re-export.

The `@property` decorator is mapped to custom setters/getters, which provide type translation.  For example, where the core class's `_port_type` is a `usize`, when re-interpreted as an `AudioPortInfo` object, you can get/set `portType` using ordinary `string` values, and it gets translated behind the scenes.

As well as `@property`, the transform also handles the `@array` decorator (used in the core API, because AssemblyScript doesn't have fixed-size inline arrays).  The implementation is fairly kludgey, but the short version is that this field (e.g. `clap_audio_port_info:_name`) returns a `usize` pointer to the start of that array.

You can mix-and-match the nice `@property` accessors, and using the underlying core `_field` names.  For example, the `AudioPortInfo:name` is set using a `string` (which is UTF16/WTF16).  To save space, you could instead set `_name` to a null-terminated UTF-8 string constant specified as `memory.data<u8>([...])`.
