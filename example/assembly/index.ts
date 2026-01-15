export * from "as-clap/clap-entry"

import * as Clap from "as-clap"
import {CNumPtr} from "as-clap"

class MyPlugin extends Clap.Plugin {

	sampleRate: f32 = 1;

	gainParamValue: f32 = 1;
	gainParamValueSmoothed: f32 = 1;

	constructor(host : Clap.clap_host) {
		super(host);
	}

	pluginInit() : bool {
		if (!super.pluginInit()) return false;
		console.log(`Plugin initialised!  Module path is ${Clap.modulePath}`);
		return true;
	}
	pluginActivate(sampleRate: f64, minFrames: u32, maxFrames: u32) : bool {
		this.sampleRate = f32(sampleRate);
		return true;
	}
	pluginProcess(process : Clap.Process) : i32 {
		let audioIn = process.audioInputs[0];
		let audioOut = process.audioOutputs[0];
		let length = process.framesCount;

		// process events in the most basic way
		this.paramsFlush(process.inEvents, process.outEvents);

		let gain = this.gainParamValueSmoothed;
		let gainStart = gain;
		let gainTarget = this.gainParamValue;
		let gainSlew = f32(1)/(f32(0.01)*this.sampleRate);
		for (let c = 0; c < 2; ++c) {
			let bufferIn = audioIn.data32[c];
			let bufferOut = audioOut.data32[c];

			gain = gainStart;
			for (let i: u32 = 0; i < length; ++i) {
				gain += (gainTarget - gain)*gainSlew;
				bufferOut[i] = bufferIn[i]*gain;
			}
		}
		this.gainParamValueSmoothed = gain;

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

	paramsCount() : u32 {
		return 1;
	}
	paramsGetInfo(index: u32, info: Clap.ParamInfo) : bool {
		info.id = 0x1234;
		info.name = "Gain";
		info.flags = Clap.PARAM_IS_AUTOMATABLE;
		info.minValue = 0;
		info.maxValue = 2;
		info.defaultValue = 1;
		return true;
	}
	paramsGetValue(id: Clap.clap_id, value: CNumPtr<f64>) : bool {
		if (id != 0x1234) return false;
		value[0] = this.gainParamValue;
		return true;
	}
	paramsValueToText(id: Clap.clap_id, value: f64) : string | null {
		if (id != 0x1234) return null;
		if (value < 1e-6) return "off";
		let db = 20*Math.log10(value);
		db = Math.round(db*10)/10;
		return `${db} dB`;
	}
	paramsFlush(inputEvents: Clap.InputEvents, outputEvents: Clap.OutputEvents) : void {
		let count = inputEvents.size();
		for (let i: u32 = 0; i < count; ++i) {
			let event = inputEvents.get(i);
			if (!this.handleEvent(event)) {
				outputEvents.tryPush(event);
			}
		}
	}

	stateSave(ostream: Clap.OStream) : bool {
		let buffer = new ArrayBuffer(4);
		store<f32>(changetype<usize>(buffer), this.gainParamValue);
		let wrote = ostream.write(changetype<usize>(buffer), 4);
		return (wrote == 4);
	}
	stateLoad(istream: Clap.IStream) : bool {
		let buffer = new ArrayBuffer(4);
		let read = istream.read(changetype<usize>(buffer), 4);
		if (read != 4) return false;
		this.gainParamValue = load<f32>(changetype<usize>(buffer));
		return true;
	}

	handleEvent(event: Clap.clap_event_header) : bool {
		if (event._space_id != Clap.CORE_EVENT_SPACE_ID) return false;
		if (event._type == Clap.EVENT_PARAM_VALUE) {
			let valueEvent = changetype<Clap.clap_event_param_value>(event);
			if (valueEvent._param_id != 0x1234) return false; // unknown ID
			this.gainParamValue = f32(valueEvent._value);
			if (this.hostState) this.hostStateMarkDirty();
			return true;
		} else {
			console.log(`unknown event._type = ${event._type}`);
		}
		return false;
	}
}

let pluginSpec = Clap.registerPlugin<MyPlugin>("AssemblyScript Gain", "com.example.clap.my-plugin");
pluginSpec.vendor = "Example Dot Com";