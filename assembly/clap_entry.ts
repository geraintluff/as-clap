import {fnPtr, modulePath} from "./common.ts"
import {clapPluginFactory} from "./clap-plugins.ts"

//---- CLAP entry ----//

let initCounter = memory.data(4);

function clapEntry_init(strPtr : usize) : bool {
	let count = atomic.add<i32>(initCounter, 1);
	if (count > 1) return true;

	modulePath = String.UTF8.decodeUnsafe(strPtr, 8192, true);
	console.log(`clap_entry.init(${modulePath})`);
	return true;
}
function clapEntry_deinit() : void {
	let count = atomic.sub<i32>(initCounter, 1);
	if (count != 0) return;

	console.log(`clap_entry.deinit()`);
}
function clapEntry_get_factory(strPtr : usize) : usize {
	let factoryId = String.UTF8.decodeUnsafe(strPtr, 8192, true);
	if (factoryId == "clap.plugin-factory") {
		return clapPluginFactory;
	}
	console.log(`clap_entry.get_factory(${factoryId})`);
	return 0;
}

class clap_plugin_entry {
	version_major : u32 = 1;
	version_minor : u32 = 2;
	version_revision: u32 = 7;

	init : usize = fnPtr(clapEntry_init);
	deinit : usize = fnPtr(clapEntry_deinit);
	get_factory: usize = fnPtr(clapEntry_get_factory);
}
const clap_entry = changetype<usize>(new clap_plugin_entry());
export {clap_entry};

export function malloc(size : usize) : usize {
	return heap.alloc(size);
}
