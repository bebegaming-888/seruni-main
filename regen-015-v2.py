#!/usr/bin/env python3
"""Fix: need 3 backslashes + quote to produce PostgreSQL \' (escaped quote)."""
import json, re
from pathlib import Path

JSON_PATH = Path("docs/surat-dna-complete.json")
MIGRATION_PATH = Path("supabase/migrations/015_surat_types.sql")

j = json.loads(JSON_PATH.read_text(encoding="utf-8"))

def format_jsonb_array(arr):
    if not arr:
        return "'[]'::jsonb"
    items = []
    for item in arr:
        if isinstance(item, str):
            result = []
            for ch in item:
                o = ord(ch)
                if o == 92:   # backslash → 2 backslashes (escaped)
                    result.append("\\\\")
                elif o == 39: # single quote → 3 backslashes + quote
                    # \\ = one literal backslash in PG
                    # \' = one literal quote in PG
                    result.append("\\\\\\'")
                elif o == 34: # double quote
                    result.append('\\"')
                elif o == 10: # actual newline → PG escape \n
                    result.append("\\n")
                elif o == 13: # carriage return
                    result.append("\\r")
                elif o == 9:  # tab
                    result.append("\\t")
                else:
                    result.append(ch)
            items.append('"' + "".join(result) + '"')
        elif isinstance(item, (dict, list)):
            items.append(json.dumps(item, ensure_ascii=False))
        else:
            items.append(json.dumps(item))
    return f"'[{','.join(items)}]'::jsonb"

def format_text_array(arr):
    if not arr:
        return "'{}'::text[]"
    items = []
    for item in arr:
        s = str(item).replace("\\", "\\\\").replace('"', '\\"').replace("'", "''")
        items.append(f'"{s}"')
    return f"'{{{','.join(items)}}}'::text[]"

inserts = []
for e in j["entries"]:
    def esc(s):
        if s is None:
            return "NULL"
        return "'" + str(s).replace("\\", "\\\\").replace("'", "''") + "'"

    form_fields   = format_jsonb_array(e["fields"])
    dna_clauses   = format_jsonb_array(e["dna_clauses"])
    dna_placeholders = format_text_array(e["placeholders"])

    sql = (
        f"  ({esc(e['code'])}, {esc(e['name'])}, {esc(e['category'])},"
        f" {'true' if e['wewenang'] else 'false'}, {esc(e['description'])},"
        f" {esc(e['eta'])}, {esc(e['kode_klasifikasi'])},"
        f" {'true' if e['is_new'] else 'false'}, {esc(e.get('note') or '')},"
        f" {form_fields}, {dna_clauses}, {dna_placeholders},"
        f" {e['field_count']}, {e['dna_count']})"
    )
    inserts.append(sql)

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
    "  kode_klasifikasi  = excluded.kode_klasifikasi,\n"
    "  is_substitute     = excluded.is_substitute,\n"
    "  note              = excluded.note,\n"
    "  form_fields       = excluded.form_fields,\n"
    "  dna_clauses       = excluded.dna_clauses,\n"
    "  dna_placeholders  = excluded.dna_placeholders,\n"
    "  field_count       = excluded.field_count,\n"
    "  dna_count         = excluded.dna_count,\n"
    "  updated_at        = now();"
)

content = MIGRATION_PATH.read_text(encoding="utf-8")
start = content.index("-- SEED START")
end   = content.index("-- SEED END")

new_content = (
    content[:start + len("-- SEED START") + 1]
    + "\n" + seed_sql + "\n"
    + content[end:]
)

MIGRATION_PATH.write_text(new_content, encoding="utf-8")
print("Done:", MIGRATION_PATH, len(inserts), "entries")