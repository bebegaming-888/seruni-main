import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useSettings, saveSettings } from "@/lib/settings-store";
import type { WilayahConfig } from "@/lib/settings-store";
import { MapPin, Plus, Trash2, Save } from "lucide-react";

interface WilayahSettingsProps {
  villageName?: string;
  onVillageNameChange?: (v: string) => void;
}

export function WilayahSettings({ villageName, onVillageNameChange }: WilayahSettingsProps = {}) {
  const s = useSettings();
  const currentWilayah = s.wilayah;
  // Include selected_kode so it can be saved back
  const [wilayah, setWilayah] = useState<WilayahConfig & { selected_kode: string }>({
    ...currentWilayah,
  });
  const [newDusun, setNewDusun] = useState("");

  const update = (key: keyof typeof wilayah, value: unknown) => {
    setWilayah((prev) => ({ ...prev, [key]: value }));
  };

  const addDusun = () => {
    const name = newDusun.trim();
    if (!name) return;
    if (wilayah.dusun_list?.includes(name)) {
      toast.error(`Dusun "${name}" sudah ada`);
      return;
    }
    setWilayah((prev) => ({
      ...prev,
      dusun_list: [...(prev.dusun_list ?? []), name],
    }));
    setNewDusun("");
  };

  const removeDusun = (name: string) => {
    setWilayah((prev) => ({
      ...prev,
      dusun_list: (prev.dusun_list ?? []).filter((d) => d !== name),
    }));
  };

  const handleSave = async () => {
    const updated = { ...s, wilayah: { ...wilayah, village: villageName ?? wilayah.village } };
    await saveSettings(updated);
    toast.success("Pengaturan wilayah berhasil disimpan", {
      description: "Dusun dan hierarki wilayah telah diperbarui.",
    });
  };

  const hasChange = JSON.stringify(wilayah) !== JSON.stringify(currentWilayah);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
          <MapPin className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h2 className="font-display text-xl font-bold">Wilayah Desa</h2>
          <p className="font-body text-sm text-muted-foreground">
            Identitas wilayah dan daftar dusun. Ubah di sini — semua bagian sistem akan otomatis
            menggunakan nilai terbaru.
          </p>
        </div>
      </div>

      {/* Hierarki Wilayah */}
      <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
        <p className="font-ui text-xs font-bold uppercase tracking-widest text-primary">
          Hierarki Wilayah
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field
            label="Provinsi"
            value={wilayah.province ?? ""}
            onChange={(v) => update("province", v)}
            placeholder="cth: Nusa Tenggara Barat"
          />
          <Field
            label="Kabupaten / Kota"
            value={wilayah.regency ?? ""}
            onChange={(v) => update("regency", v)}
            placeholder="cth: Lombok Timur"
          />
          <Field
            label="Kecamatan"
            value={wilayah.district ?? ""}
            onChange={(v) => update("district", v)}
            placeholder="cth: Pringgabaya"
          />
          <div className="space-y-1.5">
            <Label className="font-ui text-xs font-semibold">Nama Desa</Label>
            <div className="rounded-xl border border-info/20 bg-info/5 px-3 py-2.5 text-sm font-ui">
              <span className="font-semibold text-foreground">
                {villageName ?? wilayah.village}
              </span>
              <span className="text-[11px] text-muted-foreground ml-2">
                (sinkron dari Profil Desa)
              </span>
            </div>
            <p className="font-body text-[11px] text-muted-foreground">
              Nama Desa diatur di tab <strong>Profil Desa</strong>. Perubahan di sana akan terlihat
              di sini secara otomatis.
            </p>
          </div>
          <Field
            label="Kode Desa (Kode Pos)"
            value={wilayah.village_code}
            onChange={(v) => update("village_code", v)}
            placeholder="cth: 5203012001"
          />
          <Field
            label="Kode Pos"
            value={wilayah.postal_code}
            onChange={(v) => update("postal_code", v)}
            placeholder="cth: 83654"
          />
        </div>
      </div>

      {/* Alamat Pusat Desa */}
      <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
        <p className="font-ui text-xs font-bold uppercase tracking-widest text-primary">
          Alamat Pusat Desa
        </p>
        <Field
          label="Alamat Lengkap"
          value={wilayah.address}
          onChange={(v) => update("address", v)}
          placeholder="cth: Jl. Raya Pringgabaya No. 88"
          sm
        />
      </div>

      {/* Default RT/RW */}
      <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
        <p className="font-ui text-xs font-bold uppercase tracking-widest text-primary">
          Default RT / RW
        </p>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <Field
            label="Default RT"
            value={wilayah.default_rt}
            onChange={(v) => update("default_rt", v)}
            placeholder="cth: 001"
          />
          <Field
            label="Default RW"
            value={wilayah.default_rw}
            onChange={(v) => update("default_rw", v)}
            placeholder="cth: 001"
          />
        </div>
      </div>

      {/* Daftarusun */}
      <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
        <p className="font-ui text-xs font-bold uppercase tracking-widest text-primary">
          Daftar Namausun ({wilayah.dusun_list.length} dusun)
        </p>
        {wilayah.dusun_list.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {wilayah.dusun_list.map((d) => (
              <div
                key={d}
                className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 text-primary px-3 py-1.5 text-sm font-ui font-semibold"
              >
                <span>{d}</span>
                <button
                  onClick={() => removeDusun(d)}
                  className="h-4 w-4 rounded-full bg-primary/20 hover:bg-destructive/20 hover:text-destructive flex items-center justify-center transition-colors"
                  title={`Hapus ${d}`}
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        )}
        {wilayah.dusun_list.length === 0 && (
          <p className="font-body text-sm text-muted-foreground italic">
            Belum ada dusun. Tambahkan di bawah.
          </p>
        )}
        <div className="flex gap-2">
          <Input
            value={newDusun}
            onChange={(e) => setNewDusun(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addDusun()}
            placeholder="Nama dusun baru…"
            className="rounded-xl flex-1"
          />
          <Button variant="outline" size="sm" onClick={addDusun} disabled={!newDusun.trim()}>
            <Plus className="h-4 w-4 mr-1" />
            Tambah
          </Button>
        </div>
      </div>

      {/* Save */}
      <div className="flex items-center gap-4">
        <Button
          onClick={handleSave}
          disabled={!hasChange}
          className="bg-primary hover:bg-primary text-primary-foreground"
        >
          <Save className="h-4 w-4 mr-2" />
          Simpan Pengaturan Wilayah
        </Button>
        {hasChange && (
          <span className="font-body text-sm text-warning">Ada perubahan yang belum disimpan</span>
        )}
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  sm,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  sm?: boolean;
}) {
  return (
    <div className={sm ? "sm:col-span-2" : ""}>
      <Label className="text-xs font-semibold mb-1 block">{label}</Label>
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="rounded-xl"
      />
    </div>
  );
}
