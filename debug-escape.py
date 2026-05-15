#!/usr/bin/env python3
"""Debug: trace the exact bytes processed for the Nama clause."""
import json
from pathlib import Path

JSON_PATH = Path("docs/surat-dna-complete.json")
j = json.loads(JSON_PATH.read_text(encoding="utf-8"))
sktm = next(x for x in j["entries"] if x["code"] == "SKTM")
clause = sktm["dna_clauses"][1]  # 'Nama   : {{nama}}\nNIK...'

print("=== Input string ===")
print(f"repr: {repr(clause)}")
print(f"len: {len(clause)}")
print()
print("=== Character-by-character analysis ===")
for i, ch in enumerate(clause):
    o = ord(ch)
    marker = ""
    if o == 92:
        nxt = clause[i+1] if i+1 < len(clause) else "?"
        marker = f"  ← backslash (next={nxt!r})"
    print(f"  {i:3d}: chr({o:3d}) {ch!r}{marker}")

print()
print("=== Simulate format_jsonb_array ===")
BS = chr(92)
SQ = chr(39)
DQ = chr(34)
NL = chr(10)

out = []
i = 0
while i < len(clause):
    ch = clause[i]
    o = ord(ch)
    if o == ord(BS) and i + 1 < len(clause) and clause[i+1] in ('n', 'r', 't', '\\'):
        print(f"  pos {i}: BACKSLASH+{clause[i+1]!r} → append 2 backslashes, advance 2")
        out.append(BS + BS)
        i += 2
    elif o == ord(BS):
        print(f"  pos {i}: BACKSLASH alone → append 2 backslashes, advance 1")
        out.append(BS + BS)
        i += 1
    elif o == ord(NL):
        print(f"  pos {i}: NEWLINE (chr10) → append \\n, advance 1")
        out.append(BS + 'n')
        i += 1
    else:
        print(f"  pos {i}: {ch!r} → append as-is, advance 1")
        out.append(ch)
        i += 1

result = DQ + "".join(out) + DQ
print()
print(f"=== Output: {len(result)} chars ===")
print(f"repr: {repr(result[:60])}")
print()
print("=== File bytes (should match output above) ===")
from pathlib import Path as P
sql = P("supabase/migrations/015_surat_types.sql").read_text(encoding="utf-8")
lines = sql.split(chr(10))
line = lines[167]
idx = line.find("Nama   : {{nama}}")
snippet = line[idx:idx+40]
print(f"repr: {repr(snippet[:60])}")
