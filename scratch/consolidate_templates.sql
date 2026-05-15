-- ============================================================
-- MIGRATION: Consolidate surat_template Table
-- ============================================================

-- 1. Create a temporary table to hold aggregated data
CREATE TEMP TABLE temp_aggregated_templates AS
SELECT 
    code,
    MIN(name) as name,
    MIN(category) as category,
    MIN(description) as description,
    jsonb_agg(
        jsonb_build_object(
            'key', field_key,
            'label', label_field,
            'type', tipe_field,
            'source', sumber,
            'required', wajib,
            'dna_autofill', dna_autofill,
            'contoh', contoh_nilai,
            'note', keterangan_field
        )
    ) as fields_aggregated
FROM public.surat_template
GROUP BY code;

-- 2. Clear current data in surat_template (carefully)
TRUNCATE public.surat_template;

-- 3. Insert consolidated data back
INSERT INTO public.surat_template (
    id, code, name, category, description, fields, status, created_at
)
SELECT 
    gen_random_uuid(),
    code,
    name,
    category,
    description,
    fields_aggregated,
    'Disetujui',
    now()
FROM temp_aggregated_templates;

-- 4. Drop legacy columns
ALTER TABLE public.surat_template 
DROP COLUMN field_key,
DROP COLUMN label_field,
DROP COLUMN tipe_field,
DROP COLUMN sumber,
DROP COLUMN dna_autofill,
DROP COLUMN wajib,
DROP COLUMN contoh_nilai,
DROP COLUMN keterangan_field,
DROP COLUMN inisial_jabatan,
DROP COLUMN inisial_desa;

-- 5. Add unique constraint on code
ALTER TABLE public.surat_template ADD CONSTRAINT surat_template_code_unique UNIQUE (code);

-- 6. Clean up temp table
DROP TABLE temp_aggregated_templates;
