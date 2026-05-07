export interface BlockDef {
  keyword: string;
  endKeyword: string;
  canDefineType: boolean;
  canInherit: boolean;
  topLevel: boolean;
  nestedBlocks: string[];
  configItems: string[];
}

export const SCRIPT_BLOCK_KEYWORDS = [
  'script', 'on_update', 'on_message', 'on_initialize',
  'execute', 'precondition'
];

export const SCRIPT_END_KEYWORDS: Record<string, string> = {
  'script': 'end_script',
  'on_update': 'end_on_update',
  'on_message': 'end_on_message',
  'on_initialize': 'end_on_initialize',
  'execute': 'end_execute',
  'precondition': 'end_precondition'
};

export const ALL_BLOCK_KEYWORDS = [
  'platform_type', 'platform', 'weapon', 'weapon_effects',
  'sensor', 'processor', 'comm', 'mover',
  'radar_signature', 'infrared_signature', 'optical_signature',
  'route', 'track_manager', 'filter', 'transmitter', 'receiver',
  'visual_elements', 'event_output', 'event_pipe',
  'behavior_tree', 'behavior', 'selector', 'parallel',
  'antenna_pattern', 'rectangular_pattern', 'inline_table',
  'poi', 'range_ring', 'state', 'next_state', 'band',
  'aux_data', 'script_variables',
  ...SCRIPT_BLOCK_KEYWORDS
];

export const ALL_END_KEYWORDS = ALL_BLOCK_KEYWORDS.map(k => {
  if (SCRIPT_END_KEYWORDS[k]) return SCRIPT_END_KEYWORDS[k];
  return `end_${k}`;
});

export const COMMANDS = [
  { keyword: 'include_once', description: 'Include a file once', hasArg: true },
  { keyword: 'end_time', description: 'Set simulation end time', hasArg: true },
  { keyword: 'log_file', description: 'Set log file path', hasArg: true },
  { keyword: 'define_path_variable', description: 'Define a path variable', hasArg: true }
];

export const UNITS = [
  'mbits/s', 'km/h', 'm/s', 'w/sr',
  'meters', 'degrees', 'm^2',
  'km', 'deg', 'kt', 'db', 'kw', 'ft', 'mhz', 'dbw', 'min', 'agl', 'm2',
  's', 'm', 'h', 'g', 'nmi', 'nm'
];

export const BLOCK_DEFINITIONS: Record<string, BlockDef> = {
  'platform_type': {
    keyword: 'platform_type', endKeyword: 'end_platform_type',
    canDefineType: true, canInherit: true, topLevel: true,
    nestedBlocks: ['mover', 'sensor', 'comm', 'processor', 'weapon', 'track_manager',
      'route', 'radar_signature', 'infrared_signature', 'optical_signature',
      'script_variables', 'script', 'on_update', 'on_message', 'on_initialize',
      'edit', 'add', 'delete', 'aux_data', 'behavior_tree', 'behavior'],
    configItems: ['icon', 'category', 'position', 'heading', 'altitude', 'side',
      'speed', 'command_chain', 'update_interval', 'minimum_altitude']
  },
  'platform': {
    keyword: 'platform', endKeyword: 'end_platform',
    canDefineType: true, canInherit: false, topLevel: true,
    nestedBlocks: ['mover', 'sensor', 'comm', 'processor', 'weapon', 'track_manager',
      'route', 'radar_signature', 'infrared_signature', 'optical_signature',
      'script_variables', 'script', 'on_update', 'on_message', 'on_initialize',
      'edit', 'add', 'delete', 'aux_data', 'visual_elements'],
    configItems: ['icon', 'category', 'position', 'heading', 'altitude', 'side',
      'speed', 'command_chain', 'update_interval']
  },
  'weapon': {
    keyword: 'weapon', endKeyword: 'end_weapon',
    canDefineType: true, canInherit: true, topLevel: true,
    nestedBlocks: ['aux_data', 'script_variables', 'script', 'on_update',
      'weapon_effects', 'edit', 'add', 'delete', 'mover', 'processor',
      'tof_and_speed'],
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
      'script_variables', 'script', 'on_update', 'edit', 'add', 'delete'],
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
      'delete', 'aux_data'],
    configItems: ['script_debug_writes', 'update_interval', 'evaluation_interval',
      'asset_representation', 'generator', 'evaluator', 'allocator',
      'reallocation_strategy', 'asset_perception']
  },
  'comm': {
    keyword: 'comm', endKeyword: 'end_comm',
    canDefineType: true, canInherit: true, topLevel: true,
    nestedBlocks: ['script_variables', 'script', 'on_update', 'edit', 'add', 'delete'],
    configItems: ['transfer_rate', 'internal_link', 'update_interval', 'on', 'off']
  },
  'mover': {
    keyword: 'mover', endKeyword: 'end_mover',
    canDefineType: true, canInherit: true, topLevel: false,
    nestedBlocks: ['script_variables', 'script', 'on_update', 'edit', 'add', 'delete',
      'tof_and_speed'],
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
    nestedBlocks: ['inline_table', 'script_variables', 'script'],
    configItems: ['constant']
  },
  'infrared_signature': {
    keyword: 'infrared_signature', endKeyword: 'end_infrared_signature',
    canDefineType: true, canInherit: false, topLevel: true,
    nestedBlocks: ['band', 'inline_table', 'script_variables', 'script'],
    configItems: ['constant']
  },
  'optical_signature': {
    keyword: 'optical_signature', endKeyword: 'end_optical_signature',
    canDefineType: true, canInherit: false, topLevel: true,
    nestedBlocks: ['inline_table', 'script_variables', 'script'],
    configItems: ['constant']
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
  }
};

export const TOP_LEVEL_BLOCK_KEYWORDS = Object.values(BLOCK_DEFINITIONS)
  .filter(b => b.topLevel)
  .map(b => b.keyword);

export const PREDEFINED_TYPES: string[] = [
  'WSF_PLATFORM', 'WSF_AIR_MOVER', 'WSF_SURFACE_MOVER', 'WSF_STRAIGHT_LINE_MOVER',
  'WSF_FORMATION_FLYER', 'WSF_RADAR_SENSOR', 'WSF_COMM_TRANSCEIVER',
  'WSF_TRACK_PROCESSOR', 'WSF_PERCEPTION_PROCESSOR', 'WSF_THREAT_PROCESSOR',
  'WSF_TASK_PROCESSOR', 'WSF_SCRIPT_PROCESSOR', 'WSF_QUANTUM_TASKER_PROCESSOR',
  'WSF_PERFECT_TRACKER', 'WSF_AIR_TARGET_FUSE', 'WSF_GROUND_TARGET_FUSE',
  'WSF_EXPLICIT_WEAPON', 'WSF_GRADUATED_LETHALITY', 'WSF_KALMAN_FILTER'
];

export const SCRIPT_TYPES = [
  'int', 'double', 'float', 'bool', 'string', 'void', 'struct', 'auto',
  'Array', 'WsfPlatform', 'WsfWeapon', 'WsfTrack', 'WsfGeoPoint',
  'WsfSimulation', 'WsfThreatProcessor', 'WsfTaskAssignMessage',
  'WsfLocalTrack', 'WsfTrackId', 'WsfLocalTrackList', 'WsfQuantumTask',
  'WsfAssetPerception', 'WsfTask', 'WsfMessage', 'WsfSensor', 'WsfComm',
  'WsfProcessor', 'WsfPlatformPart', 'WsfTrackProcessor',
  'WsfPerceptionProcessor', 'WsfScriptProcessor', 'WsfString'
];

export const SCRIPT_CONTROL_KEYWORDS = [
  'if', 'else', 'for', 'while', 'do', 'foreach', 'in',
  'return', 'break', 'continue', 'switch', 'case', 'default'
];

export const SCRIPT_GLOBAL_CONSTANTS = [
  'PLATFORM', 'TRACK', 'MESSAGE', 'TIME_NOW', 'RANDOM', 'MATH', 'SELF'
];

export interface BuiltinParam {
  type: string;
  name: string;
  description?: string;
}

export interface BuiltinSignature {
  returnType: string;
  params: BuiltinParam[];
  description?: string;
}

export interface BuiltinFunction {
  name: string;
  signatures: BuiltinSignature[];
}

export const BUILTIN_FUNCTIONS: BuiltinFunction[] = [
  {
    name: 'writeln',
    signatures: [
      {
        returnType: 'void',
        params: [
          { type: 'string', name: 'msg', description: 'Message to write' }
        ],
        description: 'Write a message to the output log'
      },
      {
        returnType: 'void',
        params: [
          { type: 'string', name: 'msg' },
          { type: 'Object', name: 'obj', description: 'Additional objects to format into message' }
        ],
        description: 'Write a formatted message to the output log'
      }
    ]
  },
  {
    name: 'writeln_d',
    signatures: [
      {
        returnType: 'void',
        params: [
          { type: 'string', name: 'msg', description: 'Debug message to write' }
        ],
        description: 'Write a debug message (only when script_debug_writes is on)'
      }
    ]
  },
  {
    name: 'abs',
    signatures: [
      {
        returnType: 'double',
        params: [
          { type: 'double', name: 'x' }
        ],
        description: 'Absolute value'
      }
    ]
  },
  {
    name: 'min',
    signatures: [
      {
        returnType: 'double',
        params: [
          { type: 'double', name: 'a' },
          { type: 'double', name: 'b' }
        ],
        description: 'Minimum of two values'
      }
    ]
  },
  {
    name: 'max',
    signatures: [
      {
        returnType: 'double',
        params: [
          { type: 'double', name: 'a' },
          { type: 'double', name: 'b' }
        ],
        description: 'Maximum of two values'
      }
    ]
  },
  {
    name: 'sqrt',
    signatures: [
      {
        returnType: 'double',
        params: [
          { type: 'double', name: 'x' }
        ],
        description: 'Square root'
      }
    ]
  },
  {
    name: 'pow',
    signatures: [
      {
        returnType: 'double',
        params: [
          { type: 'double', name: 'base' },
          { type: 'double', name: 'exp' }
        ],
        description: 'base raised to the power exp'
      }
    ]
  },
  {
    name: 'sin',
    signatures: [
      {
        returnType: 'double',
        params: [
          { type: 'double', name: 'x', description: 'Angle in radians' }
        ],
        description: 'Sine'
      }
    ]
  },
  {
    name: 'cos',
    signatures: [
      {
        returnType: 'double',
        params: [
          { type: 'double', name: 'x', description: 'Angle in radians' }
        ],
        description: 'Cosine'
      }
    ]
  },
  {
    name: 'tan',
    signatures: [
      {
        returnType: 'double',
        params: [
          { type: 'double', name: 'x', description: 'Angle in radians' }
        ],
        description: 'Tangent'
      }
    ]
  },
  {
    name: 'atan2',
    signatures: [
      {
        returnType: 'double',
        params: [
          { type: 'double', name: 'y' },
          { type: 'double', name: 'x' }
        ],
        description: 'Arc tangent of y/x in radians'
      }
    ]
  },
  {
    name: 'log',
    signatures: [
      {
        returnType: 'double',
        params: [
          { type: 'double', name: 'x' }
        ],
        description: 'Natural logarithm'
      }
    ]
  },
  {
    name: 'exp',
    signatures: [
      {
        returnType: 'double',
        params: [
          { type: 'double', name: 'x' }
        ],
        description: 'e raised to the power x'
      }
    ]
  },
  {
    name: 'floor',
    signatures: [
      {
        returnType: 'double',
        params: [
          { type: 'double', name: 'x' }
        ],
        description: 'Round down to nearest integer'
      }
    ]
  },
  {
    name: 'ceil',
    signatures: [
      {
        returnType: 'double',
        params: [
          { type: 'double', name: 'x' }
        ],
        description: 'Round up to nearest integer'
      }
    ]
  },
  {
    name: 'round',
    signatures: [
      {
        returnType: 'double',
        params: [
          { type: 'double', name: 'x' }
        ],
        description: 'Round to nearest integer'
      }
    ]
  },
  {
    name: 'ToString',
    signatures: [
      {
        returnType: 'string',
        params: [
          { type: 'double', name: 'x' }
        ],
        description: 'Convert number to string'
      },
      {
        returnType: 'string',
        params: [
          { type: 'int', name: 'x' }
        ],
        description: 'Convert integer to string'
      }
    ]
  }
];

export const SCRIPT_BUILTINS: string[] = BUILTIN_FUNCTIONS.map(f => f.name);

export const CONFIG_VALUE_KEYWORDS: Record<string, string[]> = {
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

export function getBlockDef(keyword: string): BlockDef | undefined {
  return BLOCK_DEFINITIONS[keyword];
}

export function isScriptBlock(keyword: string): boolean {
  return SCRIPT_BLOCK_KEYWORDS.includes(keyword);
}

export function isBlockKeyword(keyword: string): boolean {
  return ALL_BLOCK_KEYWORDS.includes(keyword) || keyword === 'edit' || keyword === 'add' || keyword === 'delete';
}
