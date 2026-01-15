import * as Clap from "as-clap"
import {CNumPtr} from "as-clap"

class Note {
	active: bool = false;
	noteId: u32;

	attackMs: f32 = 1;
	decayMs: f32 = 200;
	sustain: f32 = 0.2;
	releaseMs: f32 = 10;

	amp: f32 = 0;
	attackEnv: f32 = 0;
	attackSlew: f32 = 1;
	decayAmp: f32 = 0.2;
	decayEnv: f32 = 0;
	decaySlew: f32 = 1;
	baseKey: i32 = 0;
	baseHz: f32 = 0;
	phase: f32 = 0;
	phaseStep: f32 = 0;

	match<T>(e: T): bool {
		if (this.noteId != -1 && e._note_id != -1) {
			return this.noteId == e._note_id;
		}
		if (this.baseKey != e._key) return false;
		return true;
	}

	reset(): void {
		this.active = false;
	}
	start(e: Clap.clap_event_note, sampleRate: f32): void {
		this.active = true;
		this.noteId = e._note_id;
		this.amp = f32(e._velocity)/4;
		this.attackEnv =  0;
		this.attackSlew = 1/f32(sampleRate*this.attackMs*0.001 + 1);
		this.decayEnv = 1;
		this.decayMs = 500*f32(e._velocity*e._velocity)
		this.decayAmp = 0;
		this.decaySlew = 1/f32(sampleRate*this.decayMs*0.001 + 1);
		this.baseKey = e._key;
		this.baseHz = 440*Mathf.pow(2, f32(e._key - 69)/12);
		this.phase = 0;
		this.phaseStep = this.baseHz/sampleRate;
	}
	step() : f32 {
		this.attackEnv += (this.amp - this.attackEnv)*this.attackSlew;
		this.decayEnv += (this.decayAmp - this.decayEnv)*this.decaySlew;
		if (this.decayEnv < f32(1e-8)) this.active = false;
		
		let amp = this.attackEnv*this.decayEnv;
		let phase = this.phase + this.phaseStep;
		this.phase = phase - Mathf.floor(phase);
		let osc = Mathf.sin(phase*2*Mathf.PI);
		return osc*amp;
	}
	stop(sampleRate: f32): void {
		this.decayAmp = 0;
		this.decaySlew = 1/f32(sampleRate*this.releaseMs*0.001 + 1);
	}
}

class Plugin extends Clap.Plugin {

	sampleRate: f32 = 1;

	notes: Note[];
	maxActiveNext: i32 = 0;

	constructor(host : Clap.clap_host) {
		super(host);
		this.notes = new Array<Note>(64);
		for (let i = 0; i < this.notes.length; ++i) {
			this.notes[i] = new Note();
		}
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
	pluginReset() : void {
		for (let n = 0; n < this.notes.length; ++n) {
			this.notes[n].reset();
		}
	}
	pluginProcessPart(process : Clap.Process, start: u32, end: u32) : void {
		if (start >= end) return;
		let audioOut = process.audioOutputs[0];

		let channel0 =  audioOut.data32[0];
		for (let i = start; i < end; ++i) {
			channel0[i] = 0;
		}

		let maxActive = 0;
		for (let n = 0; n < this.maxActiveNext; ++n) {
			let note = this.notes[n];
			if (!note.active) continue;
			maxActive = n;

			for (let i = start; i < end; ++i) {
				channel0[i] += note.step();
			}
		}
		this.maxActiveNext = maxActive + 1;

		for (let c: u32 = 1; c < audioOut.channelCount; ++c) {
			let channel =  audioOut.data32[c];
			for (let i = start; i < end; ++i) {
				channel[i] = channel0[i];
			}
		}
	}
	pluginProcess(process : Clap.Process) : i32 {
		let length = process.framesCount;

		let eventCount = process.inEvents.size();
		let eventIndex: u32 = 0;
		let sampleIndex: u32 = 0;
		while (1) {
			if (eventIndex >= eventCount) {
				// the remaining block
				this.pluginProcessPart(process, sampleIndex, length);
				break;
			}
			let event = process.inEvents[eventIndex++];
			// Process up to this event's time first
			if (event._time > sampleIndex) {
				this.pluginProcessPart(process, sampleIndex, event._time);
				sampleIndex = event._time;
			}
			// Then apply the event
			if (!this.handleEvent(event)) {
				process.outEvents.tryPush(event);
			}
		}
		return Clap.PROCESS_CONTINUE;
	}

	notePortsCount(isInput: bool) : u32 {
		return isInput ? 1 : 0;
	}
	notePortsGet(index: u32, isInput: bool, info: Clap.NotePortInfo) : bool {
		if (index >= this.notePortsCount(isInput)) return false;
		info.id = 0x12345;
		info.supportedDialects = Clap.NOTE_DIALECT_CLAP;
		info.preferredDialect = Clap.NOTE_DIALECT_CLAP;
		info.name = "notes";
		return true;
	}

	audioPortsCount(isInput: bool) : u32 {
		return isInput ? 0 : 1;
	}
	audioPortsGet(index: u32, isInput: bool, info: Clap.AudioPortInfo) : bool {
		if (index >= this.audioPortsCount(isInput)) return false;
		info.id = 0x12345;
		info.name = "main";
		info.channelCount = 2;
		info.portType = "stereo";
		return true;
	}

	handleEvent(event: Clap.clap_event_header) : bool {
		if (event._space_id != Clap.CORE_EVENT_SPACE_ID) return false;
		if (event._type == Clap.EVENT_NOTE_ON) {
			for (let n = 0; n < this.notes.length; ++n) {
				let note = this.notes[n];
				if (!note.active) {
					note.start(changetype<Clap.clap_event_note>(event), this.sampleRate);
					if (n >= this.maxActiveNext) this.maxActiveNext = n + 1;
					break;
				}
			}
			return true;
		} else if (event._type == Clap.EVENT_NOTE_OFF) {
			let noteEvent = changetype<Clap.clap_event_note>(event);
			for (let n = 0; n < this.notes.length; ++n) {
				let note = this.notes[n];
				if (!note.active) continue;
				if (note.match(noteEvent)) {
					note.stop(this.sampleRate);
					break;
				}
			}
			if (noteEvent._note_id >= 0) {
				event._type = u16(Clap.EVENT_NOTE_END);
				return false; // send it to the output
			}
			return true;
		} else {
			console.log(`unknown event._type = ${event._type}`);
		}
		return false;
	}
}

let pluginSpec = Clap.registerPlugin<Plugin>("Synth (AssemblyScript)", "com.example.clap.plugins.synth");
pluginSpec.vendor = "as-clap";
pluginSpec.features = ["instrument"];