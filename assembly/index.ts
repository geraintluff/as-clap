import {gc, gcThen, modulePath} from "./common.ts"
import * as Clap from "./clap-plugins.ts"

class MyPlugin extends Clap.Plugin {
	constructor(host : Clap.Host) {
		super(host);
	}

	pluginProcess(process : Clap.Process) : i32 {
		console.log(`process.audioInputsCount = ${process.audioInputsCount}`);
		return Clap.PROCESS_CONTINUE;
	}
}

let pluginSpec = Clap.registerPlugin<MyPlugin>("The Pluginator", "com.example.clap.my-plugin");
pluginSpec.vendor = "Really Cool Plugins Ltd.";