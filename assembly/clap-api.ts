export const PROCESS_ERROR = 0;
export const PROCESS_CONTINUE = 1;
export const PROCESS_CONTINUE_IF_NOT_QUIET = 2;
export const PROCESS_TAIL = 3;
export const PROCESS_SLEEP = 4;

export type clap_id = u32;

@unmanaged
export class clap_version {
	_clap_version_major: u32 = 1;
	_clap_version_minor: u32 = 2;
	_clap_version_revision: u32 = 7;
}

@unmanaged
export class clap_plugin_entry extends clap_version {
	_init : usize;
	_deinit : usize;
	_get_factory: usize;
}

@unmanaged
export class clap_plugin_descriptor extends clap_version {
	_id: usize = 0;
	_name: usize = 0;
	_vendor: usize = 0;
	_url: usize = 0;
	_manual_url: usize = 0;
	_support_url: usize = 0;
	_version: usize = 0;
	_description: usize = 0;
	_features: usize = 0;
}

@unmanaged
export class clap_event_header {
}

@unmanaged
export class clap_event_transport extends clap_event_header {
}

@unmanaged
export class clap_audio_buffer {
	readonly _data32 : usize;
	readonly _data64 : usize;
	readonly _channel_count : u32;
	_latency : u32;
	_constant_mask : u64;
}

@unmanaged
export class clap_process {
	readonly _steady_time: i64;
	readonly _frames_count: u32;
	readonly _transport: usize;
	readonly _audio_inputs: usize;
	readonly _audio_outputs: usize;
	readonly _audio_inputs_count: u32;
	readonly _audio_outputs_count: u32;
	readonly _in_events: usize;
	readonly _out_events: usize;
}

@unmanaged
export class clap_host extends clap_version {
	readonly _host_data: usize = 0;
	readonly _name: usize = 0;
	readonly _vendor: usize = 0;
	readonly _url: usize = 0;
	readonly _version: usize = 0;
	readonly _get_extension: usize = 0;
	readonly _request_restart: usize = 0;
	readonly _request_process: usize = 0;
	readonly _request_callback: usize = 0;
}
const AUDIO_PORT_IS_MAIN = 1 << 0;
const AUDIO_PORT_SUPPORTS_64BITS = 1 << 1;
const AUDIO_PORT_PREFERS_64BITS = 1 << 2;
const AUDIO_PORT_REQUIRES_COMMON_SAMPLE_SIZE = 1 << 3;

const INVALID_ID = 0xFFFFFFFF;

@unmanaged
export class clap_audio_port_info {
	_id: clap_id = 0;
	@array(256) _name: u8 = 0;
	_flags: u32 = 0;
	_channel_count: u32 = 0;
	_port_type: usize = 0;
	_in_place_pair: clap_id = INVALID_ID
}

@unmanaged
export class clap_plugin_audio_ports {
	_count : usize;
	_get : usize;
}

@unmanaged
export class clap_plugin {
	_desc: usize;
	_plugin_data: usize = 0;
	_init: usize;
	_destroy: usize;
	_activate: usize;
	_deactivate: usize;
	_start_processing: usize;
	_stop_processing: usize;
	_reset: usize;
	_process: usize;
	_get_extension: usize;
	_on_main_thread: usize;
}

@unmanaged
export class clap_plugin_factory {
	_get_plugin_count: usize;
	_get_plugin_descriptor: usize;
	_create_plugin: usize;
}