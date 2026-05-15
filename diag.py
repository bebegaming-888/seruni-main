#!/usr/bin/env python3
"""Diagnose and fix the actual newline → backslash-n issue."""
import json
from pathlib import Path

j = json.loads(Path("docs/surat-dna-complete.json").read_text(encoding="utf-8"))
sktm = next(x for x in j["entries"] if x["code"] == "SKTM")
c = sktm["dna_clauses"][1]

print("=== ACTUAL STRING (Python bytes) ===")
print(f"Length: {len(c)}")
print(f"Bytes 0-20: {[ord(ch) for ch in c[:20]]}")
# chr(10) = newline. The clause should NOT have chr(10) but let's check.
has_newline = chr(10) in c
print(f"Has actual newline (chr 10): {has_newline}")

# Show the correct output
# Input: 'Nama   : {{nama}}\\nNIK...'
# JSON has: backslash (92) + n (110) = correct \n sequence
# Step 1: replace actual newline chr(10) with \n (text)
#   but our clause doesn't have chr(10) — it already has 92+110 ✓
# Step 2: escape backslash → so 92+110 becomes 92+92+110 = \\n
# Step 3: escape single quote
result = c.replace("\\", "\\\\").replace("'", "\\'")
print(f"\nCorrect output (first 20 chars): {repr(result[:20])}")

# Now compare with what's in the SQL
sql = Path("supabase/migrations/015_surat_types.sql").read_text(encoding="utf-8")
idx = sql.find("Nama   : {{nama}}")
sql_snippet = sql[idx:idx+50]
print(f"\nSQL file bytes 0-20: {[ord(ch) for ch in sql_snippet[:20]]}")
print(f"SQL snippet: {repr(sql_snippet[:50])}")