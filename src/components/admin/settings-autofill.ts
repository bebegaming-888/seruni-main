import { useState } from "react";
import { toast } from "sonner";
import {
  initPerangkatStore,
  listStrukturAktif,
  getPerangkatByStrukturId,
} from "@/lib/perangkat-desa-store";

/**
 * useAutoFillVillage — autofill Profil Desa (village settings) dari data Perangkat Desa aktif.
 * Mengisi nama Kepala Desa dan Sekretaris Desa secara otomatis.
 */
export function useAutoFillVillage(
  update: <K extends string>(k: K, patch: Record<string, unknown>) => void,
) {
  const [autofilling, setAutofilling] = useState(false);

  const handleAutoFillVillage = async () => {
    setAutofilling(true);
    try {
      await initPerangkatStore();
      const strukturs = listStrukturAktif();

      const kepalaDesa = strukturs.find((st) => st.nama_jabatan.toLowerCase().includes("kepala"));
      const sekdes = strukturs.find((st) => st.nama_jabatan.toLowerCase().includes("sekretaris"));

      let filled = false;

      if (kepalaDesa) {
        const person = getPerangkatByStrukturId(kepalaDesa.id).find((p) => p.status_aktif);
        if (person) {
          update("village", { head: person.nama });
          filled = true;
        }
      }

      if (sekdes) {
        const person = getPerangkatByStrukturId(sekdes.id).find((p) => p.status_aktif);
        if (person) {
          update("village", { secretary: person.nama });
          filled = true;
        }
      }

      if (filled) {
        toast.success("Profil Desa autofill berhasil", {
          description: "Nama Kepala Desa dan Sekretaris Desa telah diisi dari data Perangkat Desa.",
        });
      } else {
        toast.warning("Tidak ada Perangkat Desa aktif", {
          description:
            "Pastikan struktur jabatan Kepala Desa dan Sekretaris Desa sudah diisi di menu Perangkat Desa.",
        });
      }
    } finally {
      setAutofilling(false);
    }
  };

  return { autofilling, handleAutoFillVillage };
}

/**
 * useAutoFillSignature — autofill Tanda Tangan (signer info) dari data Perangkat Desa aktif.
 * Mengisi nama dan jabatan penandatangan dari struktur dengan kategori "Pimpinan".
 */
export function useAutoFillSignature(
  update: <K extends string>(k: K, patch: Record<string, unknown>) => void,
) {
  const [autofilling, setAutofilling] = useState(false);

  const handleAutoFillSignature = async () => {
    setAutofilling(true);
    try {
      await initPerangkatStore();
      const strukturs = listStrukturAktif();

      // Cari struktur dengan kategori Pimpinan yang aktif
      const pimpinan = strukturs.find(
        (st) => st.kategori === "Pimpinan" && st.status_aktif === true,
      );

      if (pimpinan) {
        const person = getPerangkatByStrukturId(pimpinan.id).find((p) => p.status_aktif);
        if (person) {
          update("signature", {
            signer_name: person.nama,
            signer_title: pimpinan.nama_jabatan,
          });
          toast.success("Penandatangan autofill berhasil", {
            description: `Nama: ${person.nama}, Jabatan: ${pimpinan.nama_jabatan}`,
          });
          return;
        }
      }

      toast.warning("Tidak ada Pimpinan aktif", {
        description:
          "Pastikan jabatan dengan kategori 'Pimpinan' sudah terisi di menu Perangkat Desa.",
      });
    } finally {
      setAutofilling(false);
    }
  };

  return { autofilling, handleAutoFillSignature };
}
