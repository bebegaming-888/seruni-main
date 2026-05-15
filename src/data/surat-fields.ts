// Definisi field tambahan per jenis surat (di luar identitas yang sudah autofill)
import type { Penduduk } from "@/data/penduduk";

export type FieldDef = {
  key: string;
  label: string;
  type: "text" | "textarea" | "number" | "date" | "select" | "multiselect";
  placeholder?: string;
  options?: string[];
  required?: boolean;
  helper?: string;
  colSpan?: 1 | 2;
  default?: string;
  /**
   * Jika diisi, nilai field ini akan otomatis di-autofill dari data Penduduk
   * yang sudah diverifikasi via NIK. Warga tetap bisa mengeditnya.
   */
  autofill?: keyof Penduduk;
};
