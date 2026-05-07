"""
AFSIM Domain Config Generator
Converts extracted documentation JSON into a unified config for the VSCode extension.

Usage:
    python scripts/generate_config.py

Reads:
    scripts/output/script_classes.json
    scripts/output/commands.json

Writes:
    src/data/afsim-domain.json
"""

import json
import re
import sys
from pathlib import Path

# ---------------------------------------------------------------------------
# Supplementary data not available from extracted docs
# ---------------------------------------------------------------------------

PRIMITIVE_TYPES = ['int', 'double', 'float', 'bool', 'string', 'void', 'struct', 'auto']

PREDEFINED_TYPES = [
    'WSF_PLATFORM', 'WSF_AIR_MOVER', 'WSF_SURFACE_MOVER', 'WSF_STRAIGHT_LINE_MOVER',
    'WSF_FORMATION_FLYER', 'WSF_RADAR_SENSOR', 'WSF_COMM_TRANSCEIVER',
    'WSF_TRACK_PROCESSOR', 'WSF_PERCEPTION_PROCESSOR', 'WSF_THREAT_PROCESSOR',
    'WSF_TASK_PROCESSOR', 'WSF_SCRIPT_PROCESSOR', 'WSF_QUANTUM_TASKER_PROCESSOR',
    'WSF_PERFECT_TRACKER', 'WSF_AIR_TARGET_FUSE', 'WSF_GROUND_TARGET_FUSE',
    'WSF_EXPLICIT_WEAPON', 'WSF_GRADUATED_LETHALITY', 'WSF_KALMAN_FILTER'
]

# Mapping: WSF_* predefined type name -> block keyword it belongs to
# This determines which block type's configItems are extended by this predefined type.
# WSF_IMAGE_PROCESSOR is a processor subtype, so its sub-commands extend processor's configItems.
WSF_BLOCK_MAPPING = {
    # processor subtypes
    'WSF_TRACK_PROCESSOR': 'processor', 'WSF_PERCEPTION_PROCESSOR': 'processor',
    'WSF_THREAT_PROCESSOR': 'processor', 'WSF_TASK_PROCESSOR': 'processor',
    'WSF_SCRIPT_PROCESSOR': 'processor', 'WSF_QUANTUM_TASKER_PROCESSOR': 'processor',
    'WSF_PERFECT_TRACKER': 'processor', 'WSF_AIR_TARGET_FUSE': 'processor',
    'WSF_GROUND_TARGET_FUSE': 'processor', 'WSF_IMAGE_PROCESSOR': 'processor',
    'WSF_INTERSECT_PROCESSOR': 'processor', 'WSF_DELAY_PROCESSOR': 'processor',
    'WSF_DIRECTION_FINDER_PROCESSOR': 'processor', 'WSF_EXCHANGE_PROCESSOR': 'processor',
    'WSF_FUSION_CENTER': 'processor', 'WSF_MESSAGE_PROCESSOR': 'processor',
    'WSF_BRAWLER_PROCESSOR': 'processor', 'WSF_COHERENT_SENSOR_PROCESSOR': 'processor',
    'WSF_DISSEMINATE_C2': 'processor', 'WSF_DUMP_MESSAGE_PROCESSOR': 'processor',
    'WSF_RIPR_PROCESSOR': 'processor', 'WSF_SA_PROCESSOR': 'processor',
    'WSF_STATE_MACHINE': 'processor', 'WSF_TRACK_STATE_CONTROLLER': 'processor',
    'WSF_TRIMSIM_PROCESSOR': 'processor', 'WSF_UPLINK_PROCESSOR': 'processor',
    'WSF_WEAPON_SERVER_PROCESSOR': 'processor', 'WSF_WEAPON_TRACK_PROCESSOR': 'processor',
    'WSF_BATTLE_MANAGER': 'processor', 'WSF_ASSET_MANAGER': 'processor',
    'WSF_ORBITAL_CONJUNCTION_PROCESSOR': 'processor',
    'WSF_SENSORS_MANAGER': 'processor', 'WSF_SENSORS_MANAGER_FOV': 'processor',
    'WSF_WEAPONS_MANAGER': 'processor', 'WSF_WEAPONS_MANAGER_AI': 'processor',
    # mover subtypes
    'WSF_AIR_MOVER': 'mover', 'WSF_SURFACE_MOVER': 'mover',
    'WSF_STRAIGHT_LINE_MOVER': 'mover', 'WSF_FORMATION_FLYER': 'mover',
    'WSF_GROUND_MOVER': 'mover', 'WSF_SUBSURFACE_MOVER': 'mover',
    'WSF_BRAWLER_MOVER': 'mover', 'WSF_ARGO8_MOVER': 'mover',
    'WSF_FIRES_MOVER': 'mover', 'WSF_GUIDED_MOVER': 'mover',
    'WSF_HYBRID_MOVER': 'mover', 'WSF_KINEMATIC_MOVER': 'mover',
    'WSF_OFFSET_MOVER': 'mover', 'WSF_PARABOLIC_MOVER': 'mover',
    'WSF_ROAD_MOVER': 'mover', 'WSF_ROTORCRAFT_MOVER': 'mover',
    'WSF_SPACE_MOVER': 'mover', 'WSF_TOWED_MOVER': 'mover',
    'WSF_TBM_MOVER': 'mover', 'WSF_TSPI_MOVER': 'mover',
    'WSF_P6DOF_MOVER': 'mover', 'WSF_SIX_DOF_MOVER': 'mover',
    'WSF_MATH_3D_MOVER': 'mover', 'WSF_NORAD_SPACE_MOVER': 'mover',
    'WSF_INTEGRATING_SPACE_MOVER': 'mover', 'WSF_OLD_GUIDED_MOVER': 'mover',
    'WSF_POINT_MASS_SIX_DOF_MOVER': 'mover', 'WSF_RIGID_BODY_SIX_DOF_MOVER': 'mover',
    # sensor subtypes
    'WSF_RADAR_SENSOR': 'sensor', 'WSF_ACOUSTIC_SENSOR': 'sensor',
    'WSF_EOIR_SENSOR': 'sensor', 'WSF_ESM_SENSOR': 'sensor',
    'WSF_IRST_SENSOR': 'sensor', 'WSF_LADAR_SENSOR': 'sensor',
    'WSF_OPTICAL_SENSOR': 'sensor', 'WSF_PASSIVE_SENSOR': 'sensor',
    'WSF_SAR_SENSOR': 'sensor', 'WSF_COMPOSITE_SENSOR': 'sensor',
    'WSF_GEOMETRIC_SENSOR': 'sensor', 'WSF_SURFACE_WAVE_RADAR_SENSOR': 'sensor',
    'WSF_OTH_RADAR_SENSOR': 'sensor', 'WSF_RF_JAMMER': 'sensor',
    # weapon subtypes
    'WSF_EXPLICIT_WEAPON': 'weapon', 'WSF_IMPLICIT_WEAPON': 'weapon',
    'WSF_CHAFF_WEAPON': 'weapon', 'WSF_LASER_WEAPON': 'weapon',
    'WSF_CUED_LASER_WEAPON': 'weapon', 'WSF_P6DOF_EXPLICIT_WEAPON': 'weapon',
    'WSF_SIX_DOF_EXPLICIT_WEAPON': 'weapon',
    # weapon_effects subtypes
    'WSF_GRADUATED_LETHALITY': 'weapon_effects', 'WSF_EXPLICIT_WEAPON_EFFECT': 'weapon_effects',
    'WSF_EXPLICIT_WEAPON_EFFECTS': 'weapon_effects', 'WSF_CARLTON_LETHALITY': 'weapon_effects',
    'WSF_EXOATMOSPHERIC_LETHALITY': 'weapon_effects', 'WSF_HEL_LETHALITY': 'weapon_effects',
    'WSF_MOBILITY_AND_FIREPOWER_LETHALITY': 'weapon_effects',
    'WSF_SPHERICAL_LETHALITY': 'weapon_effects', 'WSF_TABULATED_LETHALITY': 'weapon_effects',
    'WSF_ENGAGE_LAUNCH_PK_TABLE_LETHALITY': 'weapon_effects',
    # comm subtypes
    'WSF_COMM_TRANSCEIVER': 'comm', 'WSF_LASER_TRANSCEIVER': 'comm',
    'WSF_RADIO_TRANSCEIVER': 'comm', 'WSF_SUBSURFACE_RADIO_TRANSCEIVER': 'comm',
    'WSF_JTIDS_TERMINAL': 'comm',
    # filter subtypes
    'WSF_KALMAN_FILTER': 'filter', 'WSF_ALPHA_BETA_FILTER': 'filter',
    'WSF_ALPHA_BETA_GAMMA_FILTER': 'filter', 'WSF_KALMAN_FILTER_2D_RB': 'filter',
    'WSF_ORBIT_DETERMINATION_FILTER': 'filter',
    # signature subtypes
    'WSF_INFRARED_SIGNATURE': 'infrared_signature', 'WSF_OPTICAL_SIGNATURE': 'optical_signature',
    'WSF_COMPOSITE_OPTICAL_SIGNATURE': 'optical_signature',
    'WSF_SPACE_OPTICAL_SIGNATURE': 'optical_signature',
    'WSF_RADAR_SIGNATURE': 'radar_signature',
    # platform_type
    'WSF_PLATFORM': 'platform_type',
    # launch_computer subtypes
    'WSF_AIR_TO_AIR_LAUNCH_COMPUTER': 'launch_computer',
    'WSF_ATA_LAUNCH_COMPUTER': 'launch_computer',
    'WSF_ATG_LAUNCH_COMPUTER': 'launch_computer',
    'WSF_BALLISTIC_LAUNCH_COMPUTER': 'launch_computer',
    'WSF_BALLISTIC_MISSILE_LAUNCH_COMPUTER': 'launch_computer',
    'WSF_FIRES_LAUNCH_COMPUTER': 'launch_computer',
    'WSF_LAUNCH_COMPUTER': 'launch_computer',
    'WSF_ORBITAL_LAUNCH_COMPUTER': 'launch_computer',
    'WSF_SAM_LAUNCH_COMPUTER': 'launch_computer',
    # guidance_computer subtypes
    'WSF_GUIDANCE_COMPUTER': 'guidance_computer',
    'WSF_OLD_GUIDANCE_COMPUTER': 'guidance_computer',
    'WSF_P6DOF_GUIDANCE_COMPUTER': 'guidance_computer',
    'WSF_SIX_DOF_GUIDANCE_COMPUTER': 'guidance_computer',
    'WSF_LINK16_COMPUTER': 'guidance_computer',
    # fuel subtypes
    'WSF_FUEL': 'fuel', 'WSF_BRAWLER_FUEL': 'fuel',
    'WSF_P6DOF_FUEL': 'fuel', 'WSF_SIX_DOF_FUEL': 'fuel',
    'WSF_TABULAR_RATE_FUEL': 'fuel', 'WSF_TANKED_FUEL': 'fuel',
    'WSF_VARIABLE_RATE_FUEL': 'fuel',
    # effect subtypes (EW/jamming effects used inside sensor blocks)
    'WSF_AGILITY_EFFECT': 'effect', 'WSF_COMM_EFFECT': 'effect',
    'WSF_COVER_PULSE_EFFECT': 'effect', 'WSF_FALSE_TARGET_EFFECT': 'effect',
    'WSF_FT_EFFECT': 'effect', 'WSF_NX_SLB_EFFECT': 'effect',
    'WSF_POL_MOD_EFFECT': 'effect', 'WSF_POWER_EFFECT': 'effect',
    'WSF_PULSE_EFFECT': 'effect', 'WSF_PULSE_SUPPRESS_EFFECT': 'effect',
    'WSF_RADIUS_EFFECT': 'effect', 'WSF_REPEATER_EFFECT': 'effect',
    'WSF_RPJ_EFFECT': 'effect', 'WSF_SIMPLE_FT_EFFECT': 'effect',
    'WSF_SLC_DEGRADE_EFFECT': 'effect', 'WSF_SLC_EFFECT': 'effect',
    'WSF_SLB_EFFECT': 'effect', 'WSF_TRACK_EFFECT': 'effect',
    # ea_technique / ep_technique subtypes
    'WSF_EA_TECHNIQUE': 'ea_technique', 'WSF_EP_TECHNIQUE': 'ep_technique',
    # moe subtypes
    'WSF_ACCESS_DURATION_MOE': 'moe', 'WSF_COVERAGE_TIME_MOE': 'moe',
    'WSF_N_ASSET_COVERAGE_MOE': 'moe', 'WSF_NUMBER_OF_ACCESSES_MOE': 'moe',
    'WSF_NUMBER_OF_GAPS_MOE': 'moe', 'WSF_REVISIT_TIME_MOE': 'moe',
    'WSF_SIMPLE_COVERAGE_MOE': 'moe', 'WSF_TIME_AVERAGE_GAP_MOE': 'moe',
    # grid subtypes
    'WSF_COMPOSITE_GRID': 'grid', 'WSF_DISTANCE_STEPPED_GRID': 'grid',
    'WSF_EXISTING_PLATFORM_GRID': 'grid', 'WSF_LAT_LON_GRID': 'grid',
    'WSF_ZONE_BASED_GRID': 'grid',
    # propagator subtypes
    'WSF_INTEGRATING_PROPAGATOR': 'propagator',
    'WSF_J2_PERTURBATION_PROPAGATOR': 'propagator',
    'WSF_KEPLERIAN_PROPAGATOR': 'propagator', 'WSF_NORAD_PROPAGATOR': 'propagator',
    # atmosphere subtypes
    'WSF_JACCHIA_ROBERTS_ATMOSPHERE': 'atmosphere',
    'WSF_PIECEWISE_EXPONENTIAL_ATMOSPHERE': 'atmosphere',
    # comm_network subtypes
    'WSF_COMM_NETWORK_AD_HOC': 'comm_network',
    'WSF_COMM_NETWORK_DIRECTED_RING': 'comm_network',
    'WSF_COMM_NETWORK_GENERIC': 'comm_network',
    'WSF_COMM_NETWORK_MESH': 'comm_network',
    'WSF_COMM_NETWORK_MESH_LEGACY': 'comm_network',
    'WSF_COMM_NETWORK_P2P': 'comm_network',
    'WSF_COMM_NETWORK_RING': 'comm_network',
    'WSF_COMM_NETWORK_STAR': 'comm_network',
    # comm_medium subtypes
    'WSF_COMM_MEDIUM_GUIDED': 'comm_medium',
    'WSF_COMM_MEDIUM_UNGUIDED': 'comm_medium',
    # comm_protocol subtypes
    'WSF_COMM_PROTOCOL_IGMP': 'comm_protocol',
    # comm_router_protocol subtypes
    'WSF_COMM_ROUTER_PROTOCOL_AD_HOC': 'comm_router_protocol',
    'WSF_COMM_ROUTER_PROTOCOL_OSPF': 'comm_router_protocol',
    'WSF_COMM_ROUTER_PROTOCOL_RIPv2': 'comm_router_protocol',
    # cyber_trigger / cyber_effect subtypes
    'WSF_CYBER_COMPOSITE_TRIGGER': 'cyber_trigger',
    'WSF_CYBER_DETONATE_EFFECT': 'cyber_effect',
    'WSF_CYBER_MAN_IN_THE_MIDDLE_EFFECT': 'cyber_effect',
    'WSF_CYBER_SCRIPT_EFFECT': 'cyber_effect',
    'WSF_CYBER_SCRIPT_EFFECT_ENHANCED': 'cyber_effect',
    'WSF_CYBER_TOGGLE_COMMS_EFFECT': 'cyber_effect',
    'WSF_CYBER_TOGGLE_PROCESSORS_EFFECT': 'cyber_effect',
    'WSF_CYBER_TOGGLE_SENSORS_EFFECT': 'cyber_effect',
    'WSF_CYBER_TOGGLE_WEAPONS_EFFECT': 'cyber_effect',
    'WSF_CYBER_TRACK_MANAGER_EFFECT': 'cyber_effect',
    'WSF_CYBER_TRACK_PROCESSOR_EFFECT': 'cyber_effect',
    # attenuation subtypes
    'WSF_TABULAR_ATTENUATION': 'attenuation',
    'WSF_OPTICAL_ATTENUATION': 'optical_signature',
    # optical_signature subtypes
    'WSF_OPTICAL_REFLECTIVITY': 'optical_signature',
    # beam_director (sensor sub-component)
    'WSF_BEAM_DIRECTOR': 'sensor',
    # chaff_parcel (weapon sub-component)
    'WSF_CHAFF_PARCEL': 'weapon',
    # weapon_fuse (weapon sub-component)
    'WSF_WEAPON_FUSE': 'weapon',
    # sensor_coverage
    'WSF_SENSOR_COVERAGE': 'sensor_coverage',
    # unclass_bm (battle manager variant)
    'WSF_UNCLASS_BM': 'processor',
}

GLOBAL_CONSTANTS = [
    {"name": "PLATFORM", "type": "WsfPlatform",
     "description": "`WsfPlatform` — Current platform"},
    {"name": "SELF", "type": "WsfPlatform",
     "description": "`WsfPlatform` — Self-reference platform"},
    {"name": "TRACK", "type": "WsfTrack",
     "description": "`WsfTrack` — Current track"},
    {"name": "MESSAGE", "type": "WsfMessage",
     "description": "`WsfMessage` — Current message"},
    {"name": "TIME_NOW", "type": "double",
     "description": "`double` — Current simulation time in seconds"},
    {"name": "RANDOM", "type": None,
     "description": "Random number generator (Uniform, Gaussian, Integer)"},
    {"name": "MATH", "type": "Math",
     "description": "Math utilities (Fabs, Sqrt, Sin, Cos, Min, Max)"},
]

BUILTIN_FUNCTIONS = [
    {
        "name": "writeln",
        "signatures": [
            {
                "returnType": "void",
                "params": [{"type": "string", "name": "msg", "description": "Message to write"}],
                "description": "Write a message to the output log"
            },
            {
                "returnType": "void",
                "params": [
                    {"type": "string", "name": "msg"},
                    {"type": "Object", "name": "obj", "description": "Additional objects to format into message"}
                ],
                "description": "Write a formatted message to the output log"
            }
        ]
    },
    {
        "name": "writeln_d",
        "signatures": [
            {
                "returnType": "void",
                "params": [{"type": "string", "name": "msg", "description": "Debug message to write"}],
                "description": "Write a debug message (only when script_debug_writes is on)"
            }
        ]
    },
    {"name": "abs", "signatures": [
        {"returnType": "double", "params": [{"type": "double", "name": "x"}], "description": "Absolute value"}]},
    {"name": "min", "signatures": [
        {"returnType": "double", "params": [{"type": "double", "name": "a"}, {"type": "double", "name": "b"}], "description": "Minimum of two values"}]},
    {"name": "max", "signatures": [
        {"returnType": "double", "params": [{"type": "double", "name": "a"}, {"type": "double", "name": "b"}], "description": "Maximum of two values"}]},
    {"name": "sqrt", "signatures": [
        {"returnType": "double", "params": [{"type": "double", "name": "x"}], "description": "Square root"}]},
    {"name": "pow", "signatures": [
        {"returnType": "double", "params": [{"type": "double", "name": "base"}, {"type": "double", "name": "exp"}], "description": "base raised to the power exp"}]},
    {"name": "sin", "signatures": [
        {"returnType": "double", "params": [{"type": "double", "name": "x", "description": "Angle in radians"}], "description": "Sine"}]},
    {"name": "cos", "signatures": [
        {"returnType": "double", "params": [{"type": "double", "name": "x", "description": "Angle in radians"}], "description": "Cosine"}]},
    {"name": "tan", "signatures": [
        {"returnType": "double", "params": [{"type": "double", "name": "x", "description": "Angle in radians"}], "description": "Tangent"}]},
    {"name": "atan2", "signatures": [
        {"returnType": "double", "params": [{"type": "double", "name": "y"}, {"type": "double", "name": "x"}], "description": "Arc tangent of y/x in radians"}]},
    {"name": "log", "signatures": [
        {"returnType": "double", "params": [{"type": "double", "name": "x"}], "description": "Natural logarithm"}]},
    {"name": "exp", "signatures": [
        {"returnType": "double", "params": [{"type": "double", "name": "x"}], "description": "e raised to the power x"}]},
    {"name": "floor", "signatures": [
        {"returnType": "double", "params": [{"type": "double", "name": "x"}], "description": "Round down to nearest integer"}]},
    {"name": "ceil", "signatures": [
        {"returnType": "double", "params": [{"type": "double", "name": "x"}], "description": "Round up to nearest integer"}]},
    {"name": "round", "signatures": [
        {"returnType": "double", "params": [{"type": "double", "name": "x"}], "description": "Round to nearest integer"}]},
    {
        "name": "ToString",
        "signatures": [
            {"returnType": "string", "params": [{"type": "double", "name": "x"}], "description": "Convert number to string"},
            {"returnType": "string", "params": [{"type": "int", "name": "x"}], "description": "Convert integer to string"}
        ]
    }
]


# ---------------------------------------------------------------------------
# Processing
# ---------------------------------------------------------------------------

def process_script_classes(data: list) -> tuple[dict, list[str]]:
    """Process script_classes.json array into a map and collect type names."""
    classes_map = {}
    static_fixes = 0
    variadic_fixes = 0

    for cls in data:
        name = cls['name']
        parent = cls.get('parent', '')
        methods = []

        for method in cls.get('methods', []):
            m_name = method['name']
            is_static = method.get('isStatic', False)
            signatures = []

            for sig in method.get('signatures', []):
                rt = sig.get('returnType', '')

                # Fix "static bool" leaking into returnType
                if rt.startswith('static '):
                    rt = rt[len('static '):]
                    is_static = True
                    static_fixes += 1

                params = []
                for p in sig.get('params', []):
                    p_name = p.get('name', '')
                    p_type = p.get('type', '')
                    p_desc = p.get('description', '')

                    # Clean variadic param names like "[T… vals]"
                    if re.match(r'\[', p_name):
                        p_name = '...'
                        variadic_fixes += 1

                    params.append({
                        "name": p_name,
                        "type": p_type,
                        "description": p_desc
                    })

                signatures.append({
                    "returnType": rt,
                    "params": params,
                    "description": sig.get('description', '')
                })

            methods.append({
                "name": m_name,
                "isStatic": is_static,
                "signatures": signatures
            })

        classes_map[name] = {
            "parent": parent,
            "methods": methods
        }

    # Build scriptTypes list
    class_names = sorted(classes_map.keys())
    script_types = list(PRIMITIVE_TYPES) + ['Array'] + class_names

    print(f"  Script classes: {len(classes_map)}")
    print(f"  Static fixes: {static_fixes}")
    print(f"  Variadic fixes: {variadic_fixes}")

    return classes_map, script_types


def process_commands(data: list) -> tuple[dict, dict]:
    """Process commands.json into a commands map and a predefinedTypeConfig map.

    WSF_* entries are NOT stored as commands. Instead, their sub-commands are
    extracted as extended configItems for the corresponding block type, stored
    in predefinedTypeConfig keyed by the WSF_* name.
    """
    commands_map = {}
    predefined_type_config = {}  # WSF_* name -> { blockKeyword, configItems: [...] }
    total_subs = 0
    dups_removed = 0
    self_refs_removed = 0
    wsf_extracted = 0
    unmapped_wsf = 0

    for cmd in data:
        cmd_name = cmd['name']

        # WSF_* entries: extract as predefined type config, not as commands
        if cmd_name.startswith('WSF_'):
            # Prefer blockKeyword from extracted docs, fallback to WSF_BLOCK_MAPPING
            block_keyword = cmd.get('blockKeyword', '')
            if not block_keyword:
                block_keyword = WSF_BLOCK_MAPPING.get(cmd_name, '')

            if not block_keyword:
                # Unknown block — store as regular command
                syntax = cmd.get('syntax', '')
                key = syntax.split()[0] if syntax.split() else cmd_name
                key = key.lower()
                commands_map[key] = {
                    "syntax": syntax,
                    "description": cmd.get('description', ''),
                    "subCommands": []
                }
                unmapped_wsf += 1
                continue

            config_items = []
            seen = set()
            for sub in cmd.get('subCommands', []):
                sub_name = sub.get('name', '')
                if sub_name in seen:
                    dups_removed += 1
                    continue
                seen.add(sub_name)
                config_items.append({
                    "name": sub_name,
                    "syntax": sub.get('syntax', ''),
                    "description": sub.get('description', '')
                })
            predefined_type_config[cmd_name] = {
                "blockKeyword": block_keyword,
                "configItems": config_items
            }
            wsf_extracted += 1
            continue

        # Regular commands: derive key from syntax field's first word
        syntax = cmd.get('syntax', '')
        key = syntax.split()[0] if syntax.split() else cmd_name
        key = key.lower()

        # Deduplicate sub-commands
        seen = set()
        clean_subs = []
        for sub in cmd.get('subCommands', []):
            sub_name = sub.get('name', '')

            # Remove self-referencing sub-commands
            if sub_name == key:
                self_refs_removed += 1
                continue

            if sub_name in seen:
                dups_removed += 1
                continue
            seen.add(sub_name)

            clean_subs.append({
                "name": sub_name,
                "syntax": sub.get('syntax', ''),
                "description": sub.get('description', '')
            })

        commands_map[key] = {
            "syntax": syntax,
            "description": cmd.get('description', ''),
            "subCommands": clean_subs
        }
        total_subs += len(clean_subs)

    print(f"  Commands: {len(commands_map)}")
    print(f"  Sub-commands (total): {total_subs}")
    print(f"  WSF_* extracted to predefinedTypeConfig: {wsf_extracted}")
    print(f"  WSF_* unmapped (stored as commands): {unmapped_wsf}")
    print(f"  Duplicates removed: {dups_removed}")
    print(f"  Self-refs removed: {self_refs_removed}")

    return commands_map, predefined_type_config


def validate(classes_map: dict, script_types: list[str]):
    """Validate cross-references and warn about issues."""
    warnings = 0

    # Check global constant types
    for gc in GLOBAL_CONSTANTS:
        if gc['type'] and gc['type'] not in classes_map:
            print(f"  [WARN] Global constant '{gc['name']}' type '{gc['type']}' not in scriptClasses")
            warnings += 1

    # Check method return types that look like class names
    checked = set()
    for cls_name, cls_data in classes_map.items():
        for method in cls_data['methods']:
            for sig in method['signatures']:
                rt = sig['returnType']
                if rt and rt[0].isupper() and rt not in classes_map and rt not in checked:
                    # Could be a generic like T, or a missing class
                    if not rt.startswith('Wsf') and rt not in ('Object', 'T', 'String', 'Boolean', 'Integer'):
                        checked.add(rt)
                        # Only warn for Wsf* types that are missing
                        pass  # Too many false positives for non-Wsf types

    print(f"  Validation warnings: {warnings}")


def main():
    project_dir = Path(__file__).parent.parent
    classes_file = project_dir / 'scripts' / 'output' / 'script_classes.json'
    commands_file = project_dir / 'scripts' / 'output' / 'commands.json'
    output_file = project_dir / 'src' / 'data' / 'afsim-domain.json'

    # Read input
    print("Reading script_classes.json...")
    with open(classes_file, 'r', encoding='utf-8') as f:
        classes_data = json.load(f)

    print("Reading commands.json...")
    with open(commands_file, 'r', encoding='utf-8') as f:
        commands_data = json.load(f)

    # Process
    print("\nProcessing script classes...")
    classes_map, script_types = process_script_classes(classes_data)

    print("\nProcessing commands...")
    commands_map, predefined_type_config = process_commands(commands_data)

    print("\nValidating...")
    validate(classes_map, script_types)

    # Build output
    output = {
        "scriptTypes": script_types,
        "predefinedTypes": PREDEFINED_TYPES,
        "globalConstants": GLOBAL_CONSTANTS,
        "builtinFunctions": BUILTIN_FUNCTIONS,
        "scriptClasses": classes_map,
        "commands": commands_map,
        "predefinedTypeConfig": predefined_type_config
    }

    # Write
    output_file.parent.mkdir(parents=True, exist_ok=True)
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(output, f, indent=2, ensure_ascii=False)

    size_kb = output_file.stat().st_size / 1024
    print(f"\nWrote {output_file} ({size_kb:.0f} KB)")


if __name__ == '__main__':
    main()
