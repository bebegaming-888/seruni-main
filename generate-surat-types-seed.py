#!/usr/bin/env python3
"""
generate-surat-types-seed.py
Membaca docs/surat-dna-complete.json → menghasilkan SQL INSERT statement
untuk supabase/migrations/015_surat_types.sql (bagian SEED START … SEED END).
"""
import json
import re
from pathlib import Path

BASE = Path(__file__).parent
JSON_PATH = BASE / "docs" / "surat-dna-complete.json"
MIGRATION_PATH = BASE / "supabase" / "migrations" / "015_surat_types.sql"

j = json.loads(JSON_PATH.read_text(encoding="utf-8"))


def pg_escape(val) -> str:
    """Escape a Python value for PostgreSQL literal."""
    if val is None:
        return "NULL"
    if isinstance(val, bool):
        return "true" if val else "false"
    if isinstance(val, (int, float)):
        return str(val)
    if isinstance(val, list):
        # Already JSON-encoded via jsonb, strip outer quotes if needed
        inner = json.dumps(val, ensure_ascii=False)
        return inner  # Return JSON literal
    if isinstance(val, dict):
        inner = json.dumps(val, ensure_ascii=False)
        return inner
    # String
    s = str(val)
    s = s.replace("\\", "\\\\")          # backslash
    s = s.replace("'", "''")            # single quote
    s = s.replace("\n", "\\n")          # newline
    s = s.replace("\r", "\\r")          # carriage return
    s = s.replace("\t", "\\t")          # tab
    return f"'{s}'"


def format_jsonb_array(arr) -> str:
    """Format a list as a PostgreSQL JSONB array literal."""
    if not arr:
        return "'[]'::jsonb"
    items = []
    for item in arr:
        if isinstance(item, str):
            escaped = (
                item.replace("\\", "\\\\")
                .replace("'", "\\'")
                .replace('"', '\\"')
                .replace("\n", "\\n")
                .replace("\r", "\\r")
                .replace("\t", "\\t")
            )
            items.append(f'"{escaped}"')
        elif isinstance(item, (dict, list)):
            items.append(json.dumps(item, ensure_ascii=False))
        else:
            items.append(json.dumps(item))
    return f"'[{','.join(items)}]'::jsonb"


def format_text_array(arr) -> str:
    """Format a list as a PostgreSQL TEXT[] literal."""
    if not arr:
        return "'{}'::text[]"
    items = []
    for item in arr:
        s = str(item).replace("\\", "\\\\").replace('"', '\\"').replace("'", "''")
        items.append(f'"{s}"')
    return f"'{{{','.join(items)}}}'::text[]"


# Build INSERT statements
inserts = []
for e in j["entries"]:
    code = pg_escape(e["code"])
    name = pg_escape(e["name"])
    category = pg_escape(e["category"])
    wewenang = "true" if e["wewenang"] else "false"
    description = pg_escape(e["description"])
    eta = pg_escape(e["eta"])
    kode_klasifikasi = pg_escape(e["kode_klasifikasi"])
    is_substitute = "true" if e["is_new"] else "false"
    note = pg_escape(e.get("note", "") or "")

    form_fields = format_jsonb_array(e["fields"])
    dna_clauses = format_jsonb_array(e["dna_clauses"])
    dna_placeholders = format_text_array(e["placeholders"])
    field_count = e["field_count"]
    dna_count = e["dna_count"]

    sql = f"""  (
    {code}, {name}, {category}, {wewenang}, {description},
    {eta}, {kode_klasifikasi}, {is_substitute}, {note},
    {form_fields}, {dna_clauses}, {dna_placeholders},
    {field_count}, {dna_count}
  )"""
    inserts.append(sql)

# Generate complete seed SQL
seed_sql = (
    "insert into public.surat_types\n"
    "  (code, name, category, wewenang, description,\n"
    "   eta, kode_klasifikasi, is_substitute, note,\n"
    "   form_fields, dna_clauses, dna_placeholders,\n"
    "   field_count, dna_count)\n"
    "values\n"
    + ",\n".join(inserts)
    + "\non conflict (code) do update set\n"
    "  name              = excluded.name,\n"
    "  category          = excluded.category,\n"
    "  wewenang          = excluded.wewenang,\n"
    "  description       = excluded.description,\n"
    "  eta               = excluded.eta,\n"
    "  kode_klasifikasi   = excluded.kode_klasifikasi,\n"
    "  is_substitute     = excluded.is_substitute,\n"
    "  note              = excluded.note,\n"
    "  form_fields       = excluded.form_fields,\n"
    "  dna_clauses       = excluded.dna_clauses,\n"
    "  dna_placeholders  = excluded.dna_placeholders,\n"
    "  field_count       = excluded.field_count,\n"
    "  dna_count         = excluded.dna_count,\n"
    "  updated_at        = now();"
)

# Inject into migration file
migration_content = MIGRATION_PATH.read_text(encoding="utf-8")
start_marker = "-- SEED START"
end_marker = "-- SEED END"
assert start_marker in migration_content, "SEED START marker not found"
assert end_marker in migration_content, "SEED END marker not found"

new_content = (
    migration_content
    .split(start_marker)[0]
    + start_marker + "\n" + seed_sql + "\n"
    + end_marker
    + migration_content.split(end_marker)[1]
)

MIGRATION_PATH.write_text(new_content, encoding="utf-8")
print("OK Updated:", MIGRATION_PATH)
print("   Entries:", len(inserts))
print("   SQL size:", len(seed_sql), "chars")

# Also write a standalone seed SQL file (useful for manual run)
seed_file = BASE / "supabase" / "seeds" / "015_surat_types_seed.sql"
seed_file.parent.mkdir(exist_ok=True)
seed_file.write_text(
    "-- Auto-generated seed for surat_types\n"
    "-- Source: docs/surat-dna-complete.json\n"
    "-- Run AFTER 015_surat_types.sql\n\n"
    + seed_sql,
    encoding="utf-8",
)
print("OK Standalone seed:", seed_file)