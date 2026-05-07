"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CONFIG_VALUE_KEYWORDS = exports.SCRIPT_CONTROL_KEYWORDS = exports.TOP_LEVEL_BLOCK_KEYWORDS = exports.BLOCK_DEFINITIONS = exports.UNITS = exports.COMMANDS = exports.ALL_END_KEYWORDS = exports.ALL_BLOCK_KEYWORDS = exports.SCRIPT_END_KEYWORDS = exports.SCRIPT_BLOCK_KEYWORDS = void 0;
exports.getBlockDef = getBlockDef;
exports.isScriptBlock = isScriptBlock;
exports.isBlockKeyword = isBlockKeyword;
exports.SCRIPT_BLOCK_KEYWORDS = [
    'script', 'on_update', 'on_message', 'on_initialize',
    'execute', 'precondition'
];
exports.SCRIPT_END_KEYWORDS = {
    'script': 'end_script',
    'on_update': 'end_on_update',
    'on_message': 'end_on_message',
    'on_initialize': 'end_on_initialize',
    'execute': 'end_execute',
    'precondition': 'end_precondition'
};
exports.ALL_BLOCK_KEYWORDS = [
    'platform_type', 'platform', 'weapon', 'weapon_effects',
    'sensor', 'processor', 'comm', 'mover',
    'radar_signature', 'infrared_signature', 'optical_signature',
    'route', 'track_manager', 'filter', 'transmitter', 'receiver',
    'visual_elements', 'event_output', 'event_pipe',
    'behavior_tree', 'behavior', 'selector', 'parallel',
    'antenna_pattern', 'rectangular_pattern', 'inline_table',
    'poi', 'range_ring', 'state', 'next_state', 'band',
    'aux_data', 'script_variables',
    ...exports.SCRIPT_BLOCK_KEYWORDS
];
exports.ALL_END_KEYWORDS = exports.ALL_BLOCK_KEYWORDS.map(k => {
    if (exports.SCRIPT_END_KEYWORDS[k])
        return exports.SCRIPT_END_KEYWORDS[k];
    return `end_${k}`;
});
exports.COMMANDS = [
    { keyword: 'include_once', description: 'Include a file once', hasArg: true },
    { keyword: 'end_time', description: 'Set simulation end time', hasArg: true },
    { keyword: 'log_file', description: 'Set log file path', hasArg: true },
    { keyword: 'define_path_variable', description: 'Define a path variable', hasArg: true }
];
exports.UNITS = [
    'mbits/s', 'km/h', 'm/s', 'w/sr',
    'meters', 'degrees', 'm^2',
    'km', 'deg', 'kt', 'db', 'kw', 'ft', 'mhz', 'dbw', 'min', 'agl', 'm2',
    's', 'm', 'h', 'g', 'nmi', 'nm'
];
exports.BLOCK_DEFINITIONS = {
    'platform_type': {
        keyword: 'platform_type', endKeyword: 'end_platform_type',
        canDefineType: true, canInherit: true, topLevel: true,
        nestedBlocks: ['mover', 'sensor', 'comm', 'processor', 'weapon', 'track_manager',
            'route', 'radar_signature', 'infrared_signature', 'optical_signature', 'acoustic_signature',
            'script_variables', 'script', 'on_update', 'on_message', 'on_initialize',
            'edit', 'add', 'delete', 'aux_data', 'behavior_tree', 'behavior',
            'moe', 'grid', 'sensor_coverage'],
        configItems: ['icon', 'category', 'position', 'heading', 'altitude', 'side',
            'speed', 'command_chain', 'update_interval', 'minimum_altitude']
    },
    'platform': {
        keyword: 'platform', endKeyword: 'end_platform',
        canDefineType: true, canInherit: false, topLevel: true,
        nestedBlocks: ['mover', 'sensor', 'comm', 'processor', 'weapon', 'track_manager',
            'route', 'radar_signature', 'infrared_signature', 'optical_signature',
            'script_variables', 'script', 'on_update', 'on_message', 'on_initialize',
            'edit', 'add', 'delete', 'aux_data', 'visual_elements',
            'moe', 'grid', 'sensor_coverage'],
        configItems: ['icon', 'category', 'position', 'heading', 'altitude', 'side',
            'speed', 'command_chain', 'update_interval']
    },
    'weapon': {
        keyword: 'weapon', endKeyword: 'end_weapon',
        canDefineType: true, canInherit: true, topLevel: true,
        nestedBlocks: ['aux_data', 'script_variables', 'script', 'on_update',
            'weapon_effects', 'edit', 'add', 'delete', 'mover', 'processor',
            'tof_and_speed', 'launch_computer', 'guidance_computer', 'fuel'],
        configItems: ['quantity', 'launched_platform_type', 'weapon_effects',
            'guidance_mode', 'maximum_lateral_acceleration']
    },
    'weapon_effects': {
        keyword: 'weapon_effects', endKeyword: 'end_weapon_effects',
        canDefineType: true, canInherit: true, topLevel: true,
        nestedBlocks: [],
        configItems: ['radius_and_pk']
    },
    'sensor': {
        keyword: 'sensor', endKeyword: 'end_sensor',
        canDefineType: true, canInherit: true, topLevel: true,
        nestedBlocks: ['transmitter', 'receiver', 'antenna_pattern',
            'script_variables', 'script', 'on_update', 'edit', 'add', 'delete',
            'effect', 'ea_technique', 'ep_technique'],
        configItems: ['on', 'off', 'one_m2_detect_range', 'maximum_range', 'frame_time',
            'scan_mode', 'azimuth_scan_limits', 'elevation_scan_limits',
            'probability_of_false_alarm', 'required_pd', 'swerling_case',
            'hits_to_establish_track', 'hits_to_maintain_track', 'track_quality',
            'ignore_same_side', 'reports_location', 'reports_velocity',
            'reports_bearing', 'reports_side', 'reports_type', 'internal_link',
            'update_interval']
    },
    'processor': {
        keyword: 'processor', endKeyword: 'end_processor',
        canDefineType: true, canInherit: true, topLevel: true,
        nestedBlocks: ['script_variables', 'script', 'on_update', 'on_message',
            'on_initialize', 'state', 'next_state', 'behavior_tree', 'behavior',
            'selector', 'parallel', 'execute', 'precondition', 'edit', 'add',
            'delete', 'aux_data', 'cyber_trigger', 'cyber_effect'],
        configItems: ['script_debug_writes', 'update_interval', 'evaluation_interval',
            'asset_representation', 'generator', 'evaluator', 'allocator',
            'reallocation_strategy', 'asset_perception']
    },
    'comm': {
        keyword: 'comm', endKeyword: 'end_comm',
        canDefineType: true, canInherit: true, topLevel: true,
        nestedBlocks: ['script_variables', 'script', 'on_update', 'edit', 'add', 'delete',
            'comm_network', 'comm_medium', 'comm_protocol', 'comm_router_protocol'],
        configItems: ['transfer_rate', 'internal_link', 'update_interval', 'on', 'off']
    },
    'mover': {
        keyword: 'mover', endKeyword: 'end_mover',
        canDefineType: true, canInherit: true, topLevel: false,
        nestedBlocks: ['script_variables', 'script', 'on_update', 'edit', 'add', 'delete',
            'tof_and_speed', 'fuel'],
        configItems: ['update_interval', 'maximum_lateral_acceleration', 'guidance_mode',
            'minimum_altitude', 'maximum_radial_acceleration', 'maximum_climb_rate',
            'maximum_flight_path_angle', 'initialize_at_offset', 'maximum_speed',
            'minimum_speed', 'lead_aircraft', 'offset_forward_from_lead',
            'offset_right_from_lead', 'offset_down_from_lead']
    },
    'route': {
        keyword: 'route', endKeyword: 'end_route',
        canDefineType: false, canInherit: false, topLevel: false,
        nestedBlocks: [],
        configItems: ['position', 'speed', 'altitude', 'label', 'goto', 'heading']
    },
    'track_manager': {
        keyword: 'track_manager', endKeyword: 'end_track_manager',
        canDefineType: false, canInherit: false, topLevel: false,
        nestedBlocks: ['filter', 'script_variables', 'script', 'on_update'],
        configItems: ['update_interval']
    },
    'filter': {
        keyword: 'filter', endKeyword: 'end_filter',
        canDefineType: true, canInherit: true, topLevel: false,
        nestedBlocks: ['script_variables', 'script', 'on_update'],
        configItems: ['range_measurement_sigma', 'bearing_measurement_sigma',
            'elevation_measurement_sigma', 'process_noise_sigmas_XYZ']
    },
    'transmitter': {
        keyword: 'transmitter', endKeyword: 'end_transmitter',
        canDefineType: false, canInherit: false, topLevel: false,
        nestedBlocks: ['antenna_pattern', 'script_variables', 'script', 'on_update'],
        configItems: ['power', 'frequency', 'internal_loss', 'antenna_pattern']
    },
    'receiver': {
        keyword: 'receiver', endKeyword: 'end_receiver',
        canDefineType: false, canInherit: false, topLevel: false,
        nestedBlocks: ['antenna_pattern', 'script_variables', 'script', 'on_update'],
        configItems: ['bandwidth', 'noise_power', 'internal_loss', 'antenna_pattern']
    },
    'visual_elements': {
        keyword: 'visual_elements', endKeyword: 'end_visual_elements',
        canDefineType: false, canInherit: false, topLevel: true,
        nestedBlocks: ['poi', 'range_ring'],
        configItems: []
    },
    'event_output': {
        keyword: 'event_output', endKeyword: 'end_event_output',
        canDefineType: false, canInherit: false, topLevel: true,
        nestedBlocks: [],
        configItems: ['file', 'enable', 'disable']
    },
    'event_pipe': {
        keyword: 'event_pipe', endKeyword: 'end_event_pipe',
        canDefineType: false, canInherit: false, topLevel: true,
        nestedBlocks: [],
        configItems: ['file', 'use_preset']
    },
    'aux_data': {
        keyword: 'aux_data', endKeyword: 'end_aux_data',
        canDefineType: false, canInherit: false, topLevel: false,
        nestedBlocks: [],
        configItems: ['int', 'double', 'string', 'bool']
    },
    'behavior_tree': {
        keyword: 'behavior_tree', endKeyword: 'end_behavior_tree',
        canDefineType: false, canInherit: false, topLevel: false,
        nestedBlocks: ['selector', 'parallel'],
        configItems: ['behavior_node']
    },
    'behavior': {
        keyword: 'behavior', endKeyword: 'end_behavior',
        canDefineType: true, canInherit: false, topLevel: true,
        nestedBlocks: ['script_variables', 'precondition', 'execute', 'script'],
        configItems: []
    },
    'selector': {
        keyword: 'selector', endKeyword: 'end_selector',
        canDefineType: false, canInherit: false, topLevel: false,
        nestedBlocks: ['behavior_node', 'parallel', 'selector'],
        configItems: ['behavior_node']
    },
    'parallel': {
        keyword: 'parallel', endKeyword: 'end_parallel',
        canDefineType: false, canInherit: false, topLevel: false,
        nestedBlocks: ['behavior_node', 'parallel', 'selector'],
        configItems: ['behavior_node']
    },
    'antenna_pattern': {
        keyword: 'antenna_pattern', endKeyword: 'end_antenna_pattern',
        canDefineType: true, canInherit: false, topLevel: true,
        nestedBlocks: ['rectangular_pattern', 'inline_table', 'script_variables', 'script'],
        configItems: []
    },
    'rectangular_pattern': {
        keyword: 'rectangular_pattern', endKeyword: 'end_rectangular_pattern',
        canDefineType: false, canInherit: false, topLevel: false,
        nestedBlocks: [],
        configItems: ['peak_gain', 'minimum_gain', 'azimuth_beamwidth', 'elevation_beamwidth']
    },
    'inline_table': {
        keyword: 'inline_table', endKeyword: 'end_inline_table',
        canDefineType: false, canInherit: false, topLevel: false,
        nestedBlocks: [],
        configItems: []
    },
    'radar_signature': {
        keyword: 'radar_signature', endKeyword: 'end_radar_signature',
        canDefineType: true, canInherit: false, topLevel: true,
        nestedBlocks: ['inline_table'],
        configItems: ['constant']
    },
    'infrared_signature': {
        keyword: 'infrared_signature', endKeyword: 'end_infrared_signature',
        canDefineType: true, canInherit: false, topLevel: true,
        nestedBlocks: ['band', 'inline_table'],
        configItems: ['constant']
    },
    'optical_signature': {
        keyword: 'optical_signature', endKeyword: 'end_optical_signature',
        canDefineType: true, canInherit: false, topLevel: true,
        nestedBlocks: ['inline_table'],
        configItems: ['constant']
    },
    'acoustic_signature': {
        keyword: 'acoustic_signature', endKeyword: 'end_acoustic_signature',
        canDefineType: true, canInherit: false, topLevel: true,
        nestedBlocks: ['state'],
        configItems: ['data_reference_range', 'freq', 'noise_pressure']
    },
    'band': {
        keyword: 'band', endKeyword: 'end_band',
        canDefineType: true, canInherit: false, topLevel: false,
        nestedBlocks: ['constant', 'inline_table'],
        configItems: ['constant']
    },
    'poi': {
        keyword: 'poi', endKeyword: 'end_poi',
        canDefineType: true, canInherit: false, topLevel: false,
        nestedBlocks: [],
        configItems: ['position', 'bullseye']
    },
    'range_ring': {
        keyword: 'range_ring', endKeyword: 'end_range_ring',
        canDefineType: true, canInherit: false, topLevel: false,
        nestedBlocks: [],
        configItems: ['entity', 'ring_color', 'center_radius', 'ring_width']
    },
    'state': {
        keyword: 'state', endKeyword: 'end_state',
        canDefineType: true, canInherit: false, topLevel: false,
        nestedBlocks: ['next_state', 'script'],
        configItems: []
    },
    'next_state': {
        keyword: 'next_state', endKeyword: 'end_next_state',
        canDefineType: true, canInherit: false, topLevel: false,
        nestedBlocks: ['script'],
        configItems: []
    },
    'script_variables': {
        keyword: 'script_variables', endKeyword: 'end_script_variables',
        canDefineType: false, canInherit: false, topLevel: false,
        nestedBlocks: [],
        configItems: []
    },
    'on_message': {
        keyword: 'on_message', endKeyword: 'end_on_message',
        canDefineType: false, canInherit: false, topLevel: false,
        nestedBlocks: ['script'],
        configItems: ['type']
    },
    'tof_and_speed': {
        keyword: 'tof_and_speed', endKeyword: 'end_tof_and_speed',
        canDefineType: false, canInherit: false, topLevel: false,
        nestedBlocks: [],
        configItems: []
    },
    'launch_computer': {
        keyword: 'launch_computer', endKeyword: 'end_launch_computer',
        canDefineType: true, canInherit: true, topLevel: false,
        nestedBlocks: ['script_variables', 'script', 'edit', 'add', 'delete'],
        configItems: []
    },
    'guidance_computer': {
        keyword: 'guidance_computer', endKeyword: 'end_guidance_computer',
        canDefineType: true, canInherit: true, topLevel: false,
        nestedBlocks: ['script_variables', 'script', 'edit', 'add', 'delete'],
        configItems: []
    },
    'fuel': {
        keyword: 'fuel', endKeyword: 'end_fuel',
        canDefineType: true, canInherit: true, topLevel: false,
        nestedBlocks: ['script_variables', 'script', 'edit', 'add', 'delete'],
        configItems: []
    },
    'effect': {
        keyword: 'effect', endKeyword: 'end_effect',
        canDefineType: true, canInherit: true, topLevel: false,
        nestedBlocks: ['script_variables', 'script', 'edit', 'add', 'delete'],
        configItems: []
    },
    'ea_technique': {
        keyword: 'ea_technique', endKeyword: 'end_ea_technique',
        canDefineType: true, canInherit: true, topLevel: false,
        nestedBlocks: ['script_variables', 'script', 'edit', 'add', 'delete'],
        configItems: []
    },
    'ep_technique': {
        keyword: 'ep_technique', endKeyword: 'end_ep_technique',
        canDefineType: true, canInherit: true, topLevel: false,
        nestedBlocks: ['script_variables', 'script', 'edit', 'add', 'delete'],
        configItems: []
    },
    'moe': {
        keyword: 'moe', endKeyword: 'end_moe',
        canDefineType: true, canInherit: true, topLevel: true,
        nestedBlocks: ['script_variables', 'script', 'edit', 'add', 'delete'],
        configItems: []
    },
    'grid': {
        keyword: 'grid', endKeyword: 'end_grid',
        canDefineType: true, canInherit: true, topLevel: true,
        nestedBlocks: ['script_variables', 'script', 'edit', 'add', 'delete'],
        configItems: []
    },
    'propagator': {
        keyword: 'propagator', endKeyword: 'end_propagator',
        canDefineType: true, canInherit: true, topLevel: false,
        nestedBlocks: ['script_variables', 'script', 'edit', 'add', 'delete'],
        configItems: []
    },
    'atmosphere': {
        keyword: 'atmosphere', endKeyword: 'end_atmosphere',
        canDefineType: true, canInherit: true, topLevel: false,
        nestedBlocks: ['script_variables', 'script', 'edit', 'add', 'delete'],
        configItems: []
    },
    'comm_network': {
        keyword: 'comm_network', endKeyword: 'end_comm_network',
        canDefineType: true, canInherit: true, topLevel: false,
        nestedBlocks: ['script_variables', 'script', 'edit', 'add', 'delete'],
        configItems: []
    },
    'comm_medium': {
        keyword: 'comm_medium', endKeyword: 'end_comm_medium',
        canDefineType: true, canInherit: true, topLevel: false,
        nestedBlocks: ['script_variables', 'script', 'edit', 'add', 'delete'],
        configItems: []
    },
    'comm_protocol': {
        keyword: 'comm_protocol', endKeyword: 'end_comm_protocol',
        canDefineType: true, canInherit: true, topLevel: false,
        nestedBlocks: ['script_variables', 'script', 'edit', 'add', 'delete'],
        configItems: []
    },
    'comm_router_protocol': {
        keyword: 'comm_router_protocol', endKeyword: 'end_comm_router_protocol',
        canDefineType: true, canInherit: true, topLevel: false,
        nestedBlocks: ['script_variables', 'script', 'edit', 'add', 'delete'],
        configItems: []
    },
    'cyber_trigger': {
        keyword: 'cyber_trigger', endKeyword: 'end_cyber_trigger',
        canDefineType: true, canInherit: true, topLevel: false,
        nestedBlocks: ['script_variables', 'script', 'edit', 'add', 'delete'],
        configItems: []
    },
    'cyber_effect': {
        keyword: 'cyber_effect', endKeyword: 'end_cyber_effect',
        canDefineType: true, canInherit: true, topLevel: false,
        nestedBlocks: ['script_variables', 'script', 'edit', 'add', 'delete'],
        configItems: []
    },
    'attenuation': {
        keyword: 'attenuation', endKeyword: 'end_attenuation',
        canDefineType: true, canInherit: true, topLevel: false,
        nestedBlocks: ['script_variables', 'script', 'edit', 'add', 'delete'],
        configItems: []
    },
    'sensor_coverage': {
        keyword: 'sensor_coverage', endKeyword: 'end_sensor_coverage',
        canDefineType: true, canInherit: true, topLevel: false,
        nestedBlocks: ['script_variables', 'script', 'edit', 'add', 'delete'],
        configItems: []
    }
};
exports.TOP_LEVEL_BLOCK_KEYWORDS = Object.values(exports.BLOCK_DEFINITIONS)
    .filter(b => b.topLevel)
    .map(b => b.keyword);
exports.SCRIPT_CONTROL_KEYWORDS = [
    'if', 'else', 'for', 'while', 'do', 'foreach', 'in',
    'return', 'break', 'continue', 'switch', 'case', 'default'
];
exports.CONFIG_VALUE_KEYWORDS = {
    'on': [],
    'off': [],
    'true': [],
    'false': [],
    'disable': [],
    'enable': [],
    'lead_pursuit': [],
    'azimuth_and_elevation': [],
    'full': [],
    'dynamic': [],
    'greedy_priority': [],
    'custom': [],
    'platform': [],
    'agl': [],
    'msl': [],
    'short': [],
    'medium': [],
    'long': [],
    'default': [],
    'surface': [],
    'air': [],
    'subsurface': [],
    'missile': [],
    'land': [],
    'status_messages': []
};
function getBlockDef(keyword) {
    return exports.BLOCK_DEFINITIONS[keyword];
}
function isScriptBlock(keyword) {
    return exports.SCRIPT_BLOCK_KEYWORDS.includes(keyword);
}
function isBlockKeyword(keyword) {
    return exports.ALL_BLOCK_KEYWORDS.includes(keyword) || keyword === 'edit' || keyword === 'add' || keyword === 'delete';
}
//# sourceMappingURL=afsimConfig.js.map