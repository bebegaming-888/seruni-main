import { SURAT_MASTER } from "../src/data/surat-master";
import type { SuratMaster } from "../src/data/surat-master";

type SuratCode = keyof typeof SURAT_MASTER;

const sourceKeys = Object.keys(SURAT_MASTER) as SuratCode[];

console.log("Source Count:", sourceKeys.length);
console.log(
  "Sample fields (SKD):",
  JSON.stringify((SURAT_MASTER["SKD"] as SuratMaster | undefined)?.fields, null, 2),
);
console.log(
  "Sample fields (SKU):",
  JSON.stringify((SURAT_MASTER["SKU"] as SuratMaster | undefined)?.fields, null, 2),
);
console.log(
  "Sample fields (SKTM):",
  JSON.stringify((SURAT_MASTER["SKTM"] as SuratMaster | undefined)?.fields, null, 2),
);
