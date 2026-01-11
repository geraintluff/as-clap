import * as Clap from "../node_modules/as-clap/assembly/clap"

class MyPlugin extends Clap.Plugin {

	constructor(host : Clap.Host) {
		super(host);
	}

	pluginInit() : bool {
		console.log(`Plugin initialised!  Module path is ${Clap.modulePath}`);
		return true;
	}

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

	audioPortsCount(isInput: bool) : u32 {
		return 1;
	}
	audioPortsGet(index: u32, isInput: bool, info: Clap.AudioPortInfo) : bool {
		if (index > 0) return false;
		info.id = 0x12345;
		info.name = "main";
		info.channelCount = 2;
		info.portType = "stereo";
		return true;
	}
}

let pluginSpec = Clap.registerPlugin<MyPlugin>("The Pluginator", "com.example.clap.my-plugin");
pluginSpec.vendor = "Really Cool Plugins Ltd.";