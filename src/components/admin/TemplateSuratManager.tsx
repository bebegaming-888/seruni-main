import { useMemo, useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import Papa from "papaparse";
import { FileText, Plus, Pencil, Trash2, Eye, Download, Upload, Search, Copy } from "lucide-react";
import {
  listTemplates,
  saveTemplate,
  deleteTemplate,
  newBlankTemplate,
  renderTemplate,
  type SuratTemplate,
  type TemplateField,
} from "@/lib/template-store";
import { can } from "@/lib/roles";
import { Switch } from "@/components/ui/switch";

export function TemplateSuratManager() {
  const [items, setItems] = useState<SuratTemplate[]>(() => listTemplates());
  const [q, setQ] = useState("");
  const [editing, setEditing] = useState<SuratTemplate | null>(null);
  const [previewing, setPreviewing] = useState<SuratTemplate | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const refresh = () => setItems(listTemplates());

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return items;
    return items.filter((t) =>
      [t.code, t.name, t.category, t.description].some((v) => (v ?? "").toLowerCase().includes(s)),
    );
  }, [items, q]);

  const handleNew = () => setEditing(newBlankTemplate());
  const handleEdit = (t: SuratTemplate) => setEditing({ ...t });
  const handleDuplicate = (t: SuratTemplate) => {
    const copy: SuratTemplate = {
      ...t,
      id: crypto.randomUUID(),
      code: `${t.code}-CPY`,
      name: `${t.name} (Salinan)`,
      status: "Draft",
      created_at: new Date().toISOString(),
    };
    saveTemplate(copy);
    refresh();
    toast.success("Template diduplikasi");
  };
  const handleDelete = (t: SuratTemplate) => {
    if (!confirm(`Hapus template "${t.name}"?`)) return;
    deleteTemplate(t.id);
    refresh();
    toast.success("Template dihapus");
  };

  const onSave = () => {
    if (!editing) return;
    if (!editing.code.trim() || !editing.name.trim()) {
      toast.error("Kode dan Nama Surat wajib diisi");
      return;
    }
    saveTemplate(editing);
    refresh();
    setEditing(null);
    toast.success("Template tersimpan");
  };

  const exportCsv = () => {
    const rows = items.map((t) => ({
      id: t.id,
      code: t.code,
      name: t.name,
      category: t.category,
      description: t.description,
      eta: t.eta,
      status: t.status,
      syarat: t.syarat.join("|"),
      body: t.body,
    }));
    const csv = Papa.unparse(rows);
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `template-surat-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`${rows.length} template diekspor`);
  };

  const onImport = (file: File) => {
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (res) => {
        let n = 0;
        res.data.forEach((r) => {
          if (!r.code || !r.name) return;
          const tpl: SuratTemplate = {
            id: r.id || crypto.randomUUID(),
            code: r.code,
            name: r.name,
            category: r.category || "Surat Keterangan",
            description: r.description || "",
            syarat: (r.syarat || "").split("|").filter(Boolean),
            fields: [],
            eta: r.eta || "1 hari kerja",
            body: r.body || "",
            status: (r.status as SuratTemplate["status"]) || "Draft",
            created_at: new Date().toISOString(),
          };
          saveTemplate(tpl);
          n += 1;
        });
        refresh();
        toast.success(`Imported ${n} template`);
      },
    });
  };

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-xl sm:text-2xl font-bold flex items-center gap-2">
              <FileText className="h-6 w-6 text-primary" /> Manajemen Template Surat
            </h2>
            <p className="font-body text-sm text-muted-foreground mt-1">
              {items.length} template · CRUD, import/export, dan preview
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {can("template.create") && (
              <>
                <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()}>
                  <Upload className="h-4 w-4 mr-1.5" /> Import CSV
                </Button>
                <input
                  ref={fileRef}
                  type="file"
                  accept=".csv"
                  hidden
                  onChange={(e) => e.target.files?.[0] && onImport(e.target.files[0])}
                />
              </>
            )}
            <Button variant="outline" size="sm" onClick={exportCsv}>
              <Download className="h-4 w-4 mr-1.5" /> Export CSV
            </Button>
            {can("template.create") && (
              <Button
                size="sm"
                onClick={handleNew}
                className="bg-primary hover:bg-primary-hover text-primary-foreground"
              >
                <Plus className="h-4 w-4 mr-1.5" /> Template Baru
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Cari kode/nama…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="pl-9 w-64 rounded-full"
          />
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card shadow-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-xs font-ui uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="text-left px-4 py-3">Kode</th>
                <th className="text-left px-4 py-3">Nama Surat</th>
                <th className="text-left px-4 py-3 hidden md:table-cell">Kategori</th>
                <th className="text-left px-4 py-3 hidden lg:table-cell">ETA</th>
                <th className="text-right px-4 py-3">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-12 text-muted-foreground">
                    Tidak ada template.
                  </td>
                </tr>
              ) : (
                filtered.map((t) => (
                  <tr key={t.id} className="border-t border-border hover:bg-muted/30 transition">
                    <td className="px-4 py-3 font-mono text-xs font-semibold text-primary">
                      {t.code}
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-ui font-semibold">{t.name}</div>
                      <div className="text-xs text-muted-foreground line-clamp-1 max-w-md">
                        {t.description}
                      </div>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell text-xs">{t.category}</td>
                    <td className="px-4 py-3 hidden lg:table-cell text-xs text-muted-foreground">
                      {t.eta}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1 flex-wrap">
                        <IconBtn title="Preview" onClick={() => setPreviewing(t)}>
                          <Eye className="h-4 w-4" />
                        </IconBtn>
                        {can("template.create") && (
                          <IconBtn title="Duplikasi" onClick={() => handleDuplicate(t)}>
                            <Copy className="h-4 w-4" />
                          </IconBtn>
                        )}
                        {can("template.edit") && (
                          <IconBtn title="Edit" onClick={() => handleEdit(t)}>
                            <Pencil className="h-4 w-4" />
                          </IconBtn>
                        )}
                        {can("template.delete") && (
                          <IconBtn title="Hapus" tone="destructive" onClick={() => handleDelete(t)}>
                            <Trash2 className="h-4 w-4" />
                          </IconBtn>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit dialog */}
      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editing?.code ? `Edit Template — ${editing.name}` : "Template Baru"}
            </DialogTitle>
          </DialogHeader>
          {editing && (
            <div className="grid sm:grid-cols-2 gap-4 py-2">
              <Field label="Kode Surat *">
                <Input
                  value={editing.code}
                  onChange={(e) => setEditing({ ...editing, code: e.target.value.toUpperCase() })}
                  placeholder="SKD"
                />
              </Field>
              <Field label="Kategori">
                <Input
                  value={editing.category}
                  onChange={(e) => setEditing({ ...editing, category: e.target.value })}
                />
              </Field>
              <Field label="Nama Surat *" full>
                <Input
                  value={editing.name}
                  onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                  placeholder="Surat Keterangan Domisili"
                />
              </Field>
              <Field label="Deskripsi" full>
                <Textarea
                  rows={2}
                  value={editing.description}
                  onChange={(e) => setEditing({ ...editing, description: e.target.value })}
                />
              </Field>
              <Field label="ETA">
                <Input
                  value={editing.eta}
                  onChange={(e) => setEditing({ ...editing, eta: e.target.value })}
                />
              </Field>
              <Field label="Syarat (pisahkan dengan |)">
                <Input
                  value={editing.syarat.join("|")}
                  onChange={(e) =>
                    setEditing({
                      ...editing,
                      syarat: e.target.value
                        .split("|")
                        .map((s) => s.trim())
                        .filter(Boolean),
                    })
                  }
                />
              </Field>
              <Field label="Body Template (gunakan {{placeholder}})" full>
                <Textarea
                  rows={12}
                  value={editing.body}
                  onChange={(e) => setEditing({ ...editing, body: e.target.value })}
                  className="font-mono text-xs"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Placeholder umum: <code>{"{{nama}}"}</code>, <code>{"{{nik}}"}</code>,{" "}
                  <code>{"{{alamat}}"}</code>, <code>{"{{keperluan}}"}</code>,{" "}
                  <code>{"{{tanggal}}"}</code>
                </p>
              </Field>
              <div className="sm:col-span-2 space-y-2 border-t border-border pt-4">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-ui font-semibold">Field Form Pengajuan</Label>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      setEditing({
                        ...editing,
                        fields: [
                          ...editing.fields,
                          {
                            key: `field_${editing.fields.length + 1}`,
                            label: "Field Baru",
                            type: "text",
                            enabled: true,
                          },
                        ],
                      })
                    }
                  >
                    <Plus className="h-3.5 w-3.5 mr-1" /> Tambah Field
                  </Button>
                </div>
                {editing.fields.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic">
                    Belum ada field. Klik "Tambah Field".
                  </p>
                ) : (
                  <div className="space-y-2">
                    {editing.fields.map((f, i) => (
                      <div
                        key={i}
                        className="grid grid-cols-12 gap-2 items-center rounded-md border border-border p-2 bg-muted/30"
                      >
                        <Input
                          className="col-span-3 h-8 text-xs"
                          placeholder="key"
                          value={f.key}
                          onChange={(e) => {
                            const fields = [...editing.fields];
                            fields[i] = { ...f, key: e.target.value };
                            setEditing({ ...editing, fields });
                          }}
                        />
                        <Input
                          className="col-span-4 h-8 text-xs"
                          placeholder="Label"
                          value={f.label}
                          onChange={(e) => {
                            const fields = [...editing.fields];
                            fields[i] = { ...f, label: e.target.value };
                            setEditing({ ...editing, fields });
                          }}
                        />
                        <select
                          className="col-span-2 h-8 text-xs rounded-md border border-input bg-background px-2"
                          value={f.type}
                          onChange={(e) => {
                            const fields = [...editing.fields];
                            fields[i] = { ...f, type: e.target.value as TemplateField["type"] };
                            setEditing({ ...editing, fields });
                          }}
                        >
                          <option value="text">text</option>
                          <option value="textarea">textarea</option>
                          <option value="number">number</option>
                          <option value="date">date</option>
                          <option value="select">select</option>
                        </select>
                        <label className="col-span-2 flex items-center gap-1.5 text-xs">
                          <Switch
                            checked={f.enabled !== false}
                            onCheckedChange={(v) => {
                              const fields = [...editing.fields];
                              fields[i] = { ...f, enabled: v };
                              setEditing({ ...editing, fields });
                            }}
                          />
                          {f.enabled !== false ? "Aktif" : "Nonaktif"}
                        </label>
                        <button
                          type="button"
                          className="col-span-1 text-destructive hover:bg-destructive/10 h-8 rounded-md inline-flex items-center justify-center"
                          onClick={() =>
                            setEditing({
                              ...editing,
                              fields: editing.fields.filter((_, j) => j !== i),
                            })
                          }
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>
              Batal
            </Button>
            <Button
              onClick={onSave}
              className="bg-primary hover:bg-primary-hover text-primary-foreground"
            >
              Simpan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Preview dialog */}
      <Dialog open={!!previewing} onOpenChange={(o) => !o && setPreviewing(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              Preview — {previewing?.name}
            </DialogTitle>
          </DialogHeader>
          {previewing && (
            <div className="rounded-xl border border-border bg-background p-6 font-body text-sm whitespace-pre-wrap leading-relaxed">
              {renderTemplate(previewing.body, {
                no: "001/SKD/2025",
                nama: "Budi Santoso",
                nik: "5203120101900001",
                tempat_lahir: "Lombok Timur",
                tanggal_lahir: "1990-01-01",
                alamat: "Dusun Seruni RT 01/RW 02",
                keperluan: "Pembukaan rekening bank",
                tanggal: new Date().toLocaleDateString("id-ID", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                }),
              })}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setPreviewing(null)}>
              Tutup
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Field({
  label,
  children,
  full,
}: {
  label: string;
  children: React.ReactNode;
  full?: boolean;
}) {
  return (
    <div className={full ? "sm:col-span-2 space-y-1.5" : "space-y-1.5"}>
      <Label className="text-xs font-ui font-semibold">{label}</Label>
      {children}
    </div>
  );
}

function IconBtn({
  children,
  title,
  onClick,
  tone,
}: {
  children: React.ReactNode;
  title: string;
  onClick: () => void;
  tone?: "destructive";
}) {
  return (
    <button
      title={title}
      onClick={onClick}
      className={`h-8 w-8 inline-flex items-center justify-center rounded-md border border-border text-muted-foreground transition ${
        tone === "destructive"
          ? "hover:bg-destructive/10 hover:text-destructive hover:border-destructive/40"
          : "hover:bg-muted"
      }`}
    >
      {children}
    </button>
  );
}
