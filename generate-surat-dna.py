import re
import json
import csv
from pathlib import Path

BASE = Path(__file__).parent
SM_PATH = BASE / "src" / "data" / "surat-master.ts"
LE_PATH = BASE / "src" / "lib" / "letter-engine.ts"

sm_raw = SM_PATH.read_text(encoding="utf-8")
le_raw = LE_PATH.read_text(encoding="utf-8")

# ── Step 1: Resolve COMMON_FIELDS_* presets ────────────────────────────────────

common_fields_map = {}
cf_pat = re.compile(r"const\s+(COMMON_FIELDS_[A-Z]+):\s*FieldDef\[\]\s*=\s*\[([\s\S]*?)\];", re.MULTILINE)
for m in cf_pat.finditer(sm_raw):
    keys = [k.group(1) for k in re.finditer(r'key:\s*"(\w+)"', m.group(2))]
    common_fields_map[m.group(1)] = keys

# ── Step 2: Parse DNA_CLAUSES_PRESETS ─────────────────────────────────────────

dna_presets = {}
dna_block_m = re.search(
    r"export\s+const\s+DNA_CLAUSES_PRESETS:\s*Record<string,\s*string\[\]>\s*=\s*\{([\s\S]*?)\n\};",
    le_raw
)
assert dna_block_m, "Could not find DNA_CLAUSES_PRESETS"
dna_entry_pat = re.compile(r"\n  ([A-Z_][A-Z0-9_]*):\s*\[([\s\S]*?)\n  \],?")
for m in dna_entry_pat.finditer(dna_block_m.group(1)):
    key = m.group(1)
    raw_arr = m.group(2)
    str_m = re.finditer(r'"((?:[^"\\]|\\.)*)"', raw_arr)
    dna_presets[key] = [s.group(1) for s in str_m]

# ── Step 3: Parse SURAT_MASTER — scan every entry block ───────────────────────
#
# Strategy: find each "  CODE: {" block, then scan for "fields:" within that
# block only (using depth-tracking). Works for both inline arrays and
# COMMON_FIELDS_ preset references.
#
# The "fields" value extracted is either:
#   - A variable name like COMMON_FIELDS_SHORT  →  resolve from common_fields_map
#   - Inline array content starting with "{"  →  regex extract key:"..." keys

sm_start = sm_raw.index("export const SURAT_MASTER")
sm_obj = sm_raw[sm_start:]

# Find all entry keys
entry_positions = [(m.start(), m.group(1)) for m in re.finditer(r"\n  ([A-Z][A-Z0-9_]*):\s*\{", sm_obj)]
entry_positions.sort()

entries = []
for idx, (pos, code) in enumerate(entry_positions):
    # Entry block: from this key's `{` to just before the next key
    block_start = pos + sm_obj[pos:].index("{") + 1  # skip past "KEY: {"
    if idx + 1 < len(entry_positions):
        block_end = entry_positions[idx + 1][0]
    else:
        # Last entry — find closing }; for SURAT_MASTER
        end_m = re.search(r"\n\};", sm_obj[block_start:])
        block_end = block_start + end_m.start() + 2 if end_m else len(sm_obj)
    block = sm_obj[block_start:block_end]

    # Extract metadata from block
    name = re.search(r'name\s*:\s*"([^"]*)"', block) or \
           re.search(r'code\s*:\s*"([^"]*)"', block)
    name = name.group(1) if name else code

    category = re.search(r'category\s*:\s*"([^"]*)"', block)
    category = category.group(1) if category else ""

    wewenang_m = re.search(r'wewenang\s*:\s*(\w+)', block)
    wewenang = wewenang_m.group(1) == "true" if wewenang_m else False

    eta_m = re.search(r'eta\s*:\s*"([^"]*)"', block)
    eta = eta_m.group(1) if eta_m else ""

    kode_m = re.search(r'kodeKlasifikasi\s*:\s*"([^"]*)"', block)
    kode_klasifikasi = kode_m.group(1) if kode_m else ""

    is_new_m = re.search(r'isNew\s*:\s*(\w+)', block)
    is_new = is_new_m.group(1) == "true" if is_new_m else False

    desc_m = re.search(r'description\s*:\s*(?:"([\s\S]*?)"|(\w+))', block)
    description = (desc_m.group(1) or desc_m.group(2) or "") if desc_m else ""

    # Find "fields:" in this block only
    fields_m = re.search(r'\bfields\s*:\s*', block)
    fields = []
    if fields_m:
        after = block[fields_m.end():]
        # Try preset variable reference first
        preset_m = re.match(r"([A-Z_][A-Z0-9_]*)\b", after.lstrip())
        if preset_m:
            fields = common_fields_map.get(preset_m.group(1), [])
        else:
            # Scan through block with depth tracking to find field key:"..." values
            # We walk through the block and track depth so we don't stop at nested arrays
            depth = 0
            scanning = False
            scan_start = 0
            for i, ch in enumerate(after):
                if ch == "[" or ch == "{":
                    if depth == 0:
                        scanning = True
                        scan_start = i
                    depth += 1
                elif ch == "]" or ch == "}":
                    depth -= 1
                    if depth == 0 and scanning:
                        # Extract keys from this segment
                        segment = after[scan_start:i + 1]
                        keys_in_seg = [k.group(1) for k in re.finditer(r'key:\s*"(\w+)"', segment)]
                        fields.extend(keys_in_seg)
                        scanning = False

    dna = dna_presets.get(code, [])
    placeholders = set()
    for clause in dna:
        for p in re.finditer(r"\{\{(\w+)\}\}", clause):
            placeholders.add(p.group(1))

    entries.append({
        "code": code,
        "name": name,
        "category": category,
        "wewenang": wewenang,
        "eta": eta,
        "kode_klasifikasi": kode_klasifikasi,
        "is_new": is_new,
        "description": description,
        "field_count": len(fields),
        "fields": fields,
        "dna_count": len(dna),
        "dna_clauses": dna,
        "placeholders": sorted(placeholders),
    })

print(f"Entries built: {len(entries)}")
non_zero = sum(1 for e in entries if e["field_count"] > 0)
print(f"With fields > 0: {non_zero}")
sample = next((e for e in entries if e["field_count"] > 0), None)
if sample:
    print(f"Sample: {sample['code']} fields={sample['fields']}")

# ── Write JSON ─────────────────────────────────────────────────────────────────

json_out = BASE / "docs" / "surat-dna-complete.json"
json_out.parent.mkdir(exist_ok=True)

total_fields = sum(e["field_count"] for e in entries)
total_dna = sum(e["dna_count"] for e in entries)
total_ph = sum(len(e["placeholders"]) for e in entries)

output = {
    "generated": __import__("datetime").datetime.now().isoformat(),
    "summary": {
        "total": len(entries),
        "total_form_fields": total_fields,
        "total_dna_clauses": total_dna,
        "total_placeholders": total_ph,
    },
    "entries": entries,
}

json_out.write_text(json.dumps(output, ensure_ascii=False, indent=2), encoding="utf-8")
print(f"Written: {json_out}")

# ── Write CSV ─────────────────────────────────────────────────────────────────

csv_out = BASE / "docs" / "surat-dna-complete.csv"
headers = ["code", "name", "category", "wewenang", "eta", "kode_klasifikasi",
          "is_new", "field_count", "fields", "dna_count", "dna_clauses", "placeholders"]

with csv_out.open("w", encoding="utf-8", newline="") as f:
    writer = csv.writer(f, quoting=csv.QUOTE_MINIMAL)
    writer.writerow(headers)
    for e in entries:
        writer.writerow([
            e["code"],
            e["name"],
            e["category"],
            e["wewenang"],
            e["eta"],
            e["kode_klasifikasi"],
            e["is_new"],
            e["field_count"],
            "|".join(e["fields"]),
            e["dna_count"],
            "||".join(e["dna_clauses"]),
            "|".join(e["placeholders"]),
        ])

print(f"Written: {csv_out}")
print(f"\nSummary:")
print(f"  Total surat        : {len(entries)}")
print(f"  Total form fields  : {total_fields} (avg {total_fields/len(entries):.1f}/surat)")
print(f"  Total DNA clauses  : {total_dna} (avg {total_dna/len(entries):.1f}/surat)")
print(f"  Total placeholders : {total_ph}")
by_cat = {}
for e in entries:
    by_cat[e["category"]] = by_cat.get(e["category"], 0) + 1
for cat, count in sorted(by_cat.items(), key=lambda x: -x[1]):
    print(f"  {count:2d}x {cat}")