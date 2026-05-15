#!/usr/bin/env python3
"""Regenerate 015_surat_types.sql using $$...$$ dollar-quoting for JSONB.

Problem: JSON strings contain ' (JS template literal quotes).
SQL uses '...::jsonb' where PG needs to parse '...' as a string.
- Inside '...': PG sees \' = escaped quote = literal ' — but then ''}} is outside!
Solution: $$...$$ dollar-quoting — PG reads content LITERALLY, no escaping needed.
  $$["...","{{id_bdt ? 'ID' : ''}}"]$$  ← writes actual ' directly!

ESCAPING RULES ($$ quoting, PG reads content literally):
  - JSON \\n (chr92+'n' = two Python chars) → file must have \\\\n (two backslashes)
    PG reads \\\\n → \\ + n = JSON \\n → parsed as newline by JSONB!
  - Actual newline chr(10) → file: \n (one backslash+n)
    PG reads \n → JSON \n → parsed as newline by JSONB!
  - Single quote ' → written literally (no escaping in $$)
  - Double quote " → written literally (no escaping in $$)
  - Backslash alone → \\\\ (two backslashes)
"""
import json
from pathlib import Path

JSON_PATH = Path("docs/surat-dna-complete.json")
MIGRATION_PATH = Path("supabase/migrations/015_surat_types.sql")

j = json.loads(JSON_PATH.read_text(encoding="utf-8"))

BS = chr(92)
SQ = chr(39)
DQ = chr(34)
NL = chr(10)

def format_jsonb_array(arr):
    """Use $$...$$ so JSON chars (including ') are written literally.

    Data dalam JSON: \\n = chr(92)+chr(110) = literal backslash + letter n.
    json.loads() membaca ini tetap dua karakter (bukan chr(10) newline!).
    Untuk JSON yang valid: \\n harus ditulis sebagai \\\\n (double backslash).
    PostgreSQL: \\\\n → satu backslash + n = JSON \\n → chr(10) newline saat JSONB parsed.
    """
    if not arr:
        return "'[]'::jsonb"
    items = []
    for item in arr:
        if isinstance(item, str):
            out = []
            i = 0
            while i < len(item):
                ch = item[i]
                o = ord(ch)
                # Backslash followed by n/r/t/\ → must become \\ (escaped backslash) + literal char
                # e.g. \\n (chr92+'n') → \\\\ + 'n' = two backslashes in file → \\n in JSON
                if o == ord(BS) and i + 1 < len(item) and item[i+1] in ('n', 'r', 't', '\\'):
                    out.append(BS + BS)   # \\ = escaped backslash in PG
                    i += 2               # consume backslash + the following char
                elif o == ord(BS):
                    # Standalone backslash at end-of-string
                    out.append(BS + BS)
                    i += 1
                elif o == ord(NL):       # actual newline chr(10) → \n in PG
                    out.append(BS + 'n')
                    i += 1
                elif o == 13:           # carriage return
                    out.append(BS + 'r')
                    i += 1
                elif o == 9:            # tab
                    out.append(BS + 't')
                    i += 1
                else:
                    out.append(ch)       # all else written literally in $$
                    i += 1
            items.append(DQ + "".join(out) + DQ)
        elif isinstance(item, (dict, list)):
            items.append(json.dumps(item, ensure_ascii=False))
        else:
            items.append(json.dumps(item))
    return "$$[" + ",".join(items) + "]$$::jsonb"

def format_text_array(arr):
    if not arr:
        return "'{}'::text[]"
    items = []
    for item in arr:
        # In single-quoted text[] elements: ' → ''
        s = str(item).replace(BS, BS + BS).replace(SQ, SQ + SQ)
        items.append(DQ + s + DQ)
    return "'{" + ",".join(items) + "}'::text[]"

def esc(s):
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

# Verify
sql_content = MIGRATION_PATH.read_text(encoding="utf-8")

# Check SKD line for correct double-backslash+n (should be chr92+chr92+chr110)
lines = sql_content.split("\n")
sktm_line = next(l for l in lines if "'SKTM'" in l)
idx = sktm_line.find("Nama   : {{nama}}")
snippet = sktm_line[idx:idx+25]
byte_report = " ".join(f"{i}:{ord(c)}" for i, c in enumerate(snippet))
print(f"SKTM Nama bytes: {byte_report}")

# SKD line — check that \\n becomes \\\\n (2 backslashes + n)
skd_line = next(l for l in lines if "'SKD'" in l)
idx2 = skd_line.find("Nama        : {{nama}}")
snippet2 = skd_line[idx2:idx2+30]
byte_report2 = " ".join(f"{i}:{ord(c)}" for i, c in enumerate(snippet2))
print(f"SKD Nama bytes: {byte_report2}")

print(f"Done: {MIGRATION_PATH} | {len(inserts)} entries | {len(seed_sql)} chars")
