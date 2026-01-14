import * as Core from "./clap-core";
import {
  fnPtr
} from "./common";
import {
  pluginFactory,
  modulePath
} from "./clap";
let initCounter = memory.data(4);
function clapEntry_init(strPtr: usize): bool {
  let count: i32;
  if (ASC_FEATURE_THREADS) {
    count = atomic.add<i32>(initCounter, 1);
  } else {
    count = load<i32>(initCounter) + 1;
    store<i32>(initCounter, count);
  }
  if (count > 1) return true;
;
  modulePath = String.UTF8.decodeUnsafe(strPtr, 8192, true);
  console.log(`clap_entry.init(${modulePath})`);
  return true;
}
function clapEntry_deinit(): void {
  let count: i32;
  if (ASC_FEATURE_THREADS) {
    count = atomic.sub<i32>(initCounter, 1);
  } else {
    count = load<i32>(initCounter) - 1;
    store<i32>(initCounter, count);
  }
  if (count != 0) return;
;
  console.log(`clap_entry.deinit()`);
}
function clapEntry_get_factory(strPtr: usize): usize {
  let factoryId = String.UTF8.decodeUnsafe(strPtr, 8192, true);
  if (factoryId == "clap.plugin-factory") {
    return changetype<usize>(pluginFactory);
  }
  console.log(`clap_entry.get_factory(${factoryId})`);
  return 0;
}
const clapEntry = new Core.clap_plugin_entry();
clapEntry._init = fnPtr(clapEntry_init);
clapEntry._deinit = fnPtr(clapEntry_deinit);
clapEntry._get_factory = fnPtr(clapEntry_get_factory);
let clapEntryPtr = changetype<usize>(clapEntry);
export {
  clapEntryPtr as clap_entry
};
export function malloc(size: usize): usize {
  return heap.alloc(size);
}
