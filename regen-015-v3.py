#!/usr/bin/env python3
"""Regenerate 015_surat_types.sql with correct PostgreSQL escaping.

Key fix: single quote inside JSON string needs THREE backslash escapes + quote
  → chr(92)*3 + chr(39) = 3 backslashes + quote in the file
  → PostgreSQL reads: \\\\' = backslash + escaped-quote = literal \' in JSON
"""
import json
from pathlib import Path

JSON_PATH = Path("docs/surat-dna-complete.json")
MIGRATION_PATH = Path("supabase/migrations/015_surat_types.sql")

j = json.loads(JSON_PATH.read_text(encoding="utf-8"))

# PostgreSQL string escape reference (single-quoted '...'):
#   \\ = one literal backslash
#   \' = one literal single quote  (or '' = one literal single quote)
#
# For JSON strings (delimited by double-quotes inside the SQL):
#   "foo" → valid JSON string
#   "it's" → valid JSON string (no escaping needed for ' in JSON double-quotes)
#   {{id_bdt ? \'ID\'}}  →  in SQL file: \\\\ + \\'  → 3 backslashes + quote
#     PostgreSQL reads: \\\\' → backslash (\\\\ = \\) + escaped-quote (\' = ')
#     Result in DB: \'  (backslash + quote as 2 JSON chars)

BS = chr(92)   # backslash
SQ = chr(39)   # single quote
DQ = chr(34)   # double quote
NL = chr(10)   # newline

def format_jsonb_array(arr):
    if not arr:
        return "'[]'::jsonb"
    items = []
    for item in arr:
        if isinstance(item, str):
            out = []
            for ch in item:
                o = ord(ch)
                if o == ord(BS):
                    out.append(BS + BS)              # \\  → 2 backslashes in file
                elif o == ord(SQ):
                    out.append(BS + BS + BS + SQ)    # \\\' → PG reads \\ + \' = backslash + quote
                elif o == ord(DQ):
                    out.append(BS + DQ)             # \"  → escaped double-quote
                elif o == ord(NL):
                    out.append(BS + 'n')            # \n  → PG newline escape
                elif o == 13:
                    out.append(BS + 'r')
                elif o == 9:
                    out.append(BS + 't')
                else:
                    out.append(ch)
            items.append(DQ + "".join(out) + DQ)
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
        s = str(item)
        # Escape for PostgreSQL TEXT[] element: double up ' and escape \
        s = s.replace(BS, BS + BS).replace(SQ, SQ + SQ)
        items.append(DQ + s + DQ)
    return f"'{{{','.join(items)}}}'::text[]"

def esc(s):
    """Escape a plain text value for PostgreSQL single-quoted string."""
    if s is None:
        return "NULL"
    return "'" + str(s).replace(BS, BS + BS).replace(SQ, SQ + SQ) + "'"

inserts = []
for e in j["entries"]:
    sql = (
        f"  ({esc(e['code'])}, {esc(e['name'])}, {esc(e['category'])},"
        f" {'true' if e['wewenang'] else 'false'}, {esc(e['description'])},"
        f" {esc(e['eta'])}, {esc(e['kode_klasifikasi'])},"
        f" {'true' if e['is_new'] else 'false'}, {esc(e.get('note') or '')},"
        f" {format_jsonb_array(e['fields'])},"
        f" {format_jsonb_array(e['dna_clauses'])},"
        f" {format_text_array(e['placeholders'])},"
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

# Verify: show the first few bytes around id_bdt in the SKTM row
sql_content = MIGRATION_PATH.read_text(encoding="utf-8")
idx = sql_content.find("'SKTM'")
sktm_row = sql_content[idx:idx+800]
idx2 = sktm_row.find("id_bdt")
snippet = sktm_row[idx2:idx2+60]
byte_report = [f"{i}:{ord(c)}" for i, c in enumerate(snippet)]
print("SKTM id_bdt bytes:", " ".join(byte_report[:20]))
print("Done:", MIGRATION_PATH, len(inserts), "entries")
