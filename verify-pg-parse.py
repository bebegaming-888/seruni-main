#!/usr/bin/env python3
"""Verify PostgreSQL escaping in generated SQL by simulating PG parsing."""
from pathlib import Path

sql = Path("supabase/migrations/015_surat_types.sql").read_text(encoding="utf-8")
lines = sql.split("\n")
line = lines[167]

# Simulate PostgreSQL single-quoted string parsing for the dna_clauses column
# In the SQL file:
#   '...\"id_bdt ? \'ID DTKS...'
# PG reads:
#   1. ' starts string
#   2. \" = escaped double-quote = literal " (OK in JSON)
#   3. id_bdt ? \' = backslash + escaped-quote = literal \' (inside JSON string = valid)
#   4. But if it's actually just \' (backslash + quote) without enough escaping,
#      PG reads \' = escaped quote (ends the SQL string prematurely!)

# Let's trace the SKTM dna_clauses section byte by byte
idx = line.find("id_bdt ?")
chunk = line[max(0, idx-10):idx+80]
print("=== Line 168 bytes around 'id_bdt ?' ===")
for i, ch in enumerate(chunk[:50]):
    print(f"  {i:3d}: ord={ord(ch):4d} {repr(ch)}")

# The key test: simulate what PG reads at positions around the first quote
# PG rule: in single-quoted string, \' = escaped quote = literal '
# We want: after PG reads the string, the JSON string contains \'
# To achieve \' in JSON: we need PG to see \'\'\' = escaped quote + literal quote?
# No. JSON is inside "..." which doesn't need ' escaping except in JS expressions.
# The real issue: JSON string "..." contains no single quotes. Except in JS {{...}}.

print()
print("=== Key insight ===")
print("The JSON string is: \"{{id_bdt ? 'ID DTKS/BDT : ' + id_bdt : ''}}\"")
print("Inside this JSON string, ' is a LITERAL character (inside JS template literal)")
print("To write this to PostgreSQL JSONB:")
print("  Strategy 1: use E'...' escape string syntax")
print("  Strategy 2: use $$...$$ dollar-quoting")
print("  Strategy 3: escape ' for PG too (must be \\' in the SQL file)")
print()
print("With Strategy 3 (escape ' for PG):")
print("  In SQL file: \\' (backslash + quote)")
print("  PG reads: \\' = escaped quote = literal ' in the output string")
print("  BUT JSON string \"...\" contains literal ' which is valid!")
print()
print("Wait — JSON strings use double quotes, so ' does NOT need escaping in JSON!")
print("The problem: our SQL uses double-quoted JSON strings")
print("  '[\"...\", \"{{id_bdt ? \\'ID...\"'\"...'::jsonb")
print("  PG parses the outer '...' and sees \\' = escaped quote = literal '")
print("  But then : ''}}'\")  — the next ' starts a new string!")

# Test: what if we use $$...$$ for the JSONB value?
print()
print("=== Proposed fix: use $$...$$ for JSONB values ===")
print("  SKTM dna_clauses:  $$[\"...\",\"{{id_bdt ? 'ID...'}}\"]$$::jsonb")
print("  $$ escapes nothing — we can write actual characters!")
print("  PG reads the content literally, no escaping needed for ' or \"")
