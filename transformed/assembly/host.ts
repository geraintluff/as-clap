import * as Core from "./clap-core";
import * as property from "./property";
@unmanaged
@final
export class Host extends Core.clap_host {
  get clapVersion(): Version {
    return changetype<Version>(this);
  }
  @inline
  get name(): property.CString {
    return property.getCString(this._name);
  }
  @inline
  get vendor(): property.CStringNullable {
    return property.getCStringNullable(this._vendor);
  }
  @inline
  get url(): property.CStringNullable {
    return property.getCStringNullable(this._url);
  }
  @inline
  get version(): property.CStringNullable {
    return property.getCStringNullable(this._version);
  }
  getExtension<T extends HostExt>(extId: string): T | null {
    let cString = String.UTF8.encode(extId, true);
    return this.getExtensionUtf8<T>(changetype<usize>(cString));
  }
  getExtensionUtf8<T extends HostExt>(cString: usize): T | null {
    let ptr = call_indirect<usize>(u32(this._get_extension), this, cString);
    if (!ptr) return null;
;
    return instantiate<T>(this, ptr);
  }
  requestRestart(): void {
    call_indirect(u32(this._request_restart), this);
  }
  requestProcess(): void {
    call_indirect(u32(this._request_process), this);
  }
  requestCallback(): void {
    call_indirect(u32(this._request_callback), this);
  }
}
export abstract class HostExt {
  constructor(protected _host: Core.clap_host, protected _extPtr: usize) {}
}
