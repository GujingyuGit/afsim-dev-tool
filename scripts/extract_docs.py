"""
AFSIM Documentation Extractor
Extracts structured data from AFSIM Sphinx HTML documentation.

Usage:
    pip install beautifulsoup4
    python extract_docs.py [--docs-dir DOC_HTML_DIR] [--output-dir OUTPUT_DIR]

Outputs:
    output/commands.json   — AFSIM configuration commands with sub-commands
    output/script_classes.json — Script class methods with signatures and overloads
"""

import argparse
import json
import os
import re
import sys
from pathlib import Path

try:
    from bs4 import BeautifulSoup, Tag
except ImportError:
    print("Please install beautifulsoup4: pip install beautifulsoup4", file=sys.stderr)
    sys.exit(1)


# ---------------------------------------------------------------------------
# Data structures
# ---------------------------------------------------------------------------

def make_param(name: str, ptype: str, description: str = "") -> dict:
    return {"name": name, "type": ptype, "description": description}


def make_signature(return_type: str, params: list, description: str = "") -> dict:
    return {"returnType": return_type, "params": params, "description": description}


def make_method(name: str, signatures: list, is_static: bool = False) -> dict:
    return {"name": name, "signatures": signatures, "isStatic": is_static}


def make_script_class(name: str, parent: str = "", methods: list = None) -> dict:
    return {"name": name, "parent": parent, "methods": methods or []}


def make_command(name: str, syntax: str = "", description: str = "",
                 sub_commands: list = None, block_keyword: str = "") -> dict:
    return {
        "name": name,
        "syntax": syntax,
        "description": description,
        "subCommands": sub_commands or [],
        "blockKeyword": block_keyword
    }


def make_sub_command(name: str, syntax: str = "", description: str = "") -> dict:
    return {"name": name, "syntax": syntax, "description": description}


# ---------------------------------------------------------------------------
# Utility
# ---------------------------------------------------------------------------

def clean_text(text: str) -> str:
    """Collapse whitespace, strip, and remove Sphinx permalink markers."""
    text = re.sub(r'\s+', ' ', text).strip()
    text = text.replace('¶', '')  # Sphinx permalink marker
    return text


def get_body(soup: BeautifulSoup) -> Tag | None:
    """Get the main content div, excluding nav/sidebar/footer."""
    body = soup.find("div", class_="body", role="main")
    if body:
        return body
    # Fallback: try section with id matching the title
    return soup.find("section")


def detect_page_type(filepath: str, soup: BeautifulSoup) -> str:
    """
    Returns one of: 'command', 'script_class', 'class', 'demo', 'unknown'
    """
    fname = os.path.basename(filepath).lower()
    rel_path = filepath.replace("\\", "/")

    # Script class pages are under docs/script/
    if "/script/" in rel_path or "\\script\\" in rel_path:
        return "script_class"

    body = get_body(soup)
    if not body:
        return "unknown"

    # Command pages have dl.command
    if body.find("dl", class_="command"):
        return "command"

    # Class pages have dl.class but not under script/
    if body.find("dl", class_="class"):
        return "class"

    # Demo pages are very short
    text = body.get_text(strip=True)
    if len(text) < 200:
        return "demo"

    return "unknown"


# ---------------------------------------------------------------------------
# Script class page extraction
# ---------------------------------------------------------------------------

def parse_method_dt(dt: Tag) -> tuple[str, str, list[dict]]:
    """
    Parse a <dt> element from dl.method into (return_type, method_name, params).
    Handles formats like:
        double SlantRangeTo(WsfGeoPoint aLocation)
        WsfPlatform Commander()
        WsfPlatform Commander(string aName)
        void SetLocation(double aLat, double aLon, double aAlt)
    """
    # Get the full text of the dt
    full_text = clean_text(dt.get_text())

    # Try to match: returnType methodName(params)
    m = re.match(r'^([\w:<>\s]+?)\s+(\w+)\s*\(([^)]*)\)', full_text)
    if not m:
        # Could be a property without parens, e.g. "double Altitude"
        m2 = re.match(r'^([\w:<>\s]+?)\s+(\w+)$', full_text)
        if m2:
            return m2.group(1).strip(), m2.group(2).strip(), []
        return "", full_text, []

    return_type = m.group(1).strip()
    method_name = m.group(2).strip()
    params_str = m.group(3).strip()

    params = []
    if params_str:
        # Split on commas, respecting angle brackets
        segments = split_params(params_str)
        for seg in segments:
            seg = seg.strip()
            if not seg:
                continue
            # Match: Type name
            pm = re.match(r'^(Array<[^>]+>|[A-Za-z_]\w*)\s+(\w+)$', seg)
            if pm:
                params.append(make_param(pm.group(2), pm.group(1)))
            else:
                # Fallback: just store as-is
                params.append(make_param(seg, ""))

    return return_type, method_name, params


def split_params(params_str: str) -> list[str]:
    """Split parameter string on commas, respecting angle brackets."""
    segments = []
    depth = 0
    current = ""
    for ch in params_str:
        if ch == '<':
            depth += 1
        elif ch == '>':
            depth -= 1
        elif ch == ',' and depth == 0:
            segments.append(current.strip())
            current = ""
            continue
        current += ch
    if current.strip():
        segments.append(current.strip())
    return segments


def extract_script_class(filepath: str, soup: BeautifulSoup) -> dict | None:
    """Extract a script class definition from an HTML page."""
    body = get_body(soup)
    if not body:
        return None

    # Class name from h1
    h1 = body.find("h1")
    if not h1:
        return None
    class_name = clean_text(h1.get_text())

    # Parent class from dl.class
    parent = ""
    class_dl = body.find("dl", class_="class")
    if class_dl:
        dt = class_dl.find("dt")
        if dt:
            # The parent class is in an <a> tag after "inherits"
            # e.g., "WsfPlatform inherits <a>WsfObject</a>"
            parent_text = clean_text(dt.get_text())
            pm = re.search(r'inherits\s+(\w+)', parent_text)
            if pm:
                parent = pm.group(1)
            # Also try "Derives From:" paragraph
            if not parent:
                for p_tag in body.find_all("p"):
                    p_text = clean_text(p_tag.get_text())
                    dm = re.search(r'Derives From:\s*(.+)', p_text)
                    if dm:
                        parts = dm.group(1).split(',')
                        parent = parts[-1].strip().split()[-1].strip()
                        break

    # Methods from dl.method
    methods_map: dict[str, list[dict]] = {}  # name -> list of signatures
    method_descriptions: dict[str, str] = {}

    for method_dl in body.find_all("dl", class_="method"):
        dts = method_dl.find_all("dt", recursive=False)
        dd = method_dl.find("dd")

        # Get description from dd
        description = ""
        if dd:
            p = dd.find("p")
            if p:
                description = clean_text(p.get_text())

        for dt in dts:
            return_type, method_name, params = parse_method_dt(dt)
            if not method_name:
                continue

            sig = make_signature(return_type, params, description)

            if method_name not in methods_map:
                methods_map[method_name] = []
                method_descriptions[method_name] = description
            methods_map[method_name].append(sig)

    methods = []
    for name, sigs in methods_map.items():
        methods.append(make_method(name, sigs))

    return make_script_class(class_name, parent, methods)


# ---------------------------------------------------------------------------
# Command page extraction
# ---------------------------------------------------------------------------

def extract_command(filepath: str, soup: BeautifulSoup) -> dict | None:
    """Extract a command definition from an HTML page."""
    body = get_body(soup)
    if not body:
        return None

    # Command name from h1
    h1 = body.find("h1")
    if not h1:
        return None
    cmd_name = clean_text(h1.get_text())

    # Syntax from first dl.command
    syntax = ""
    description = ""
    first_cmd_dl = body.find("dl", class_="command")
    if first_cmd_dl:
        dt = first_cmd_dl.find("dt")
        if dt:
            syntax = clean_text(dt.get_text())
        dd = first_cmd_dl.find("dd")
        if dd:
            p = dd.find("p")
            if p:
                description = clean_text(p.get_text())

    # Sub-commands from sections
    sub_commands = []
    for section in body.find_all("section"):
        section_id = section.get("id", "")
        if section_id in (cmd_name, ""):
            continue

        # Look for dl.command inside this section
        for cmd_dl in section.find_all("dl", class_="command"):
            dt = cmd_dl.find("dt")
            dd = cmd_dl.find("dd")
            sub_name = ""
            sub_syntax = ""
            sub_desc = ""
            if dt:
                sub_text = clean_text(dt.get_text())
                # Extract just the keyword (first word)
                first_word = sub_text.split()[0] if sub_text.split() else sub_text
                sub_name = first_word
                sub_syntax = sub_text
            if dd:
                p = dd.find("p")
                if p:
                    sub_desc = clean_text(p.get_text())
            if sub_name:
                sub_commands.append(make_sub_command(sub_name, sub_syntax, sub_desc))

    return make_command(cmd_name, syntax, description, sub_commands)


# ---------------------------------------------------------------------------
# Main extraction
# ---------------------------------------------------------------------------

def extract_all(docs_dir: str, output_dir: str):
    docs_path = Path(docs_dir)
    if not docs_path.exists():
        print(f"Documentation directory not found: {docs_dir}", file=sys.stderr)
        sys.exit(1)

    os.makedirs(output_dir, exist_ok=True)

    commands = []
    script_classes = []
    stats = {"command": 0, "script_class": 0, "class": 0, "demo": 0, "unknown": 0, "error": 0}

    html_files = sorted(docs_path.rglob("*.html"))
    print(f"Found {len(html_files)} HTML files")

    for filepath in html_files:
        filepath_str = str(filepath)
        try:
            with open(filepath, "r", encoding="utf-8") as f:
                html = f.read()
        except Exception as e:
            print(f"  [ERROR] Cannot read {filepath_str}: {e}", file=sys.stderr)
            stats["error"] += 1
            continue

        soup = BeautifulSoup(html, "html.parser")
        page_type = detect_page_type(filepath_str, soup)
        stats[page_type] += 1

        if page_type == "command":
            cmd = extract_command(filepath_str, soup)
            if cmd:
                commands.append(cmd)
                print(f"  [CMD] {cmd['name']} ({len(cmd['subCommands'])} sub)")

        elif page_type == "script_class":
            cls = extract_script_class(filepath_str, soup)
            if cls:
                script_classes.append(cls)
                print(f"  [SCRIPT] {cls['name']} ({len(cls['methods'])} methods)")

        elif page_type == "class":
            # Could extract later; for now just count
            pass

    # Write output
    commands_file = os.path.join(output_dir, "commands.json")
    with open(commands_file, "w", encoding="utf-8") as f:
        json.dump(commands, f, indent=2, ensure_ascii=False)
    print(f"\nWrote {len(commands)} commands to {commands_file}")

    classes_file = os.path.join(output_dir, "script_classes.json")
    with open(classes_file, "w", encoding="utf-8") as f:
        json.dump(script_classes, f, indent=2, ensure_ascii=False)
    print(f"Wrote {len(script_classes)} script classes to {classes_file}")

    print(f"\nStats: {json.dumps(stats, indent=2)}")


def main():
    parser = argparse.ArgumentParser(description="Extract AFSIM documentation to JSON")
    parser.add_argument("--docs-dir", default=None,
                        help="Path to the documentation HTML directory")
    parser.add_argument("--output-dir", default=None,
                        help="Path to the output directory")
    args = parser.parse_args()

    # Resolve relative to project root (parent of scripts/)
    project_dir = Path(__file__).parent.parent
    docs_dir = Path(args.docs_dir) if args.docs_dir else project_dir / "documentation" / "html"
    output_dir = Path(args.output_dir) if args.output_dir else project_dir / "scripts" / "output"

    extract_all(str(docs_dir.resolve()), str(output_dir.resolve()))


if __name__ == "__main__":
    main()
