/**
 * LetterLayoutEditor — Form-Based Blanko Surat Designer
 *
 * Admin UI untuk mengatur layout surat per jenis surat.
 * Form-based section editor (NOT drag-drop WYSIWYG).
 *
 * Features:
 * - Section list (ordered, add/remove/edit)
 * - Section editor modal (per section type)
 * - Style editor (global layout style)
 * - Live preview panel (sample letter)
 * - Version history
 * - Import/Export JSON
 */

import { useState, useEffect, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  Plus,
  Pencil,
  Trash2,
  Eye,
  Download,
  Upload,
  Save,
  CheckCircle,
  Copy,
  History,
  Settings,
  FileText,
  AlertCircle,
} from "lucide-react";
import {
  type LetterLayout,
  type LetterSection,
  type LetterStyle,
  type SectionType,
  type KopSectionConfig,
  type TitleSectionConfig,
  type PembukaSectionConfig,
  type SubjectSectionConfig,
  type BodySectionConfig,
  type ClosingSectionConfig,
  type SignatureSectionConfig,
  type QRSectionConfig,
  type FooterSectionConfig,
  type SeparatorSectionConfig,
  type CustomTextSectionConfig,
  createDefaultKopSection,
  createDefaultTitleSection,
  createDefaultPembukaSection,
  createDefaultSubjectSection,
  createDefaultBodySection,
  createDefaultClosingSection,
  createDefaultSignatureSection,
  createDefaultQRSection,
  createDefaultFooterSection,
  createDefaultStyle,
} from "@/types/letter-layout";
import {
  getLayoutBySuratType,
  getAllLayoutsForType,
  createLayout,
  updateLayout,
  activateLayout,
  deleteLayout,
  duplicateLayout,
  getLayoutHistory,
} from "@/lib/layout-store";
import { SURAT_MASTER } from "@/data/surat-master";
import { LetterRenderer } from "@/components/surat/LetterRenderer";
import { buildRenderContextFromSurat } from "@/lib/letter-renderer";
import { getSettings } from "@/lib/settings-store";

// ─── Section Type Labels ────────────────────────────────────────────────────

const SECTION_TYPE_LABELS: Record<SectionType, string> = {
  kop: "Kop Surat",
  title: "Judul & Nomor",
  pembuka: "Pembuka",
  subject: "Identitas Pemohon",
  body: "Isi Surat (DNA)",
  closing: "Penutup",
  signature: "Tanda Tangan",
  qr: "QR Code",
  footer: "Footer",
  separator: "Separator",
  custom_text: "Teks Kustom",
};

// ─── Sample Data for Preview ───────────────────────────────────────────────

const SAMPLE_SURAT = {
  kode: "SKTM",
  no: "474/001/KDS.SRMB/V/2026",
  nama_surat: "SURAT KETERANGAN TIDAK MAMPU",
  data: {
    nama: "TAJUDDIN MS.",
    nik: "5201234567890123",
    tempat_lahir: "Lombok Utara",
    tanggal_lahir: "1985-05-15",
    jenis_kelamin: "Laki-Laki",
    pekerjaan: "Petani",
    agama: "Islam",
    alamat: "Dusun Mumbul RT 001 RW 002",
  },
  approved_at: new Date().toISOString(),
  signed_by: "H. SUMARDI, S.Sos.",
  signer_title: "Kepala Desa Seruni Mumbul",
};

const SAMPLE_WARGA = {
  nama: "TAJUDDIN MS.",
  nik: "5201234567890123",
  tempat_lahir: "Lombok Utara",
  tanggal_lahir: "1985-05-15",
  jenis_kelamin: "Laki-Laki",
  pekerjaan: "Petani",
  agama: "Islam",
  alamat: "Dusun Mumbul RT 001 RW 002",
  rt: "001",
  rw: "002",
  dusun: "Mumbul",
};

// ─── Main Component ─────────────────────────────────────────────────────────

export function LetterLayoutEditor() {
  const [suratTypeCode, setSuratTypeCode] = useState<string>("");
  const [layout, setLayout] = useState<LetterLayout | null>(null);
  const [editingSection, setEditingSection] = useState<LetterSection | null>(null);
  const [showStyleEditor, setShowStyleEditor] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [previewKey, setPreviewKey] = useState(0);
  const [systemData, setSystemData] = useState<{
    village: {
      name: string;
      address: string;
      kecamatan: string;
      kabupaten: string;
      phone: string;
      email: string;
    };
    signers: Array<{ id: string; role: string; title: string; name: string; nip: string }>;
    surat_types: Array<{
      code: string;
      name: string;
      kode_klasifikasi: string;
      dna_clauses: string;
    }>;
  } | null>(null);

  const settings = getSettings();

  // Fetch system data on mount (village info, signers, surat types)
  useEffect(() => {
    fetch("/api/letter-system-data")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d?.data) setSystemData(d.data);
      })
      .catch(() => {
        /* fallback silently */
      });
  }, []);

  // Load layout when surat type changes
  useEffect(() => {
    if (!suratTypeCode) {
      setLayout(null);
      return;
    }

    getLayoutBySuratType(suratTypeCode).then((l) => {
      if (l) {
        setLayout(l);
      } else {
        // Create default layout
        const defaultLayout: Omit<LetterLayout, "id" | "created_at" | "updated_at" | "version"> = {
          surat_type_code: suratTypeCode,
          name: `Layout ${suratTypeCode}`,
          description: "Layout default",
          sections: [
            createDefaultKopSection(),
            createDefaultTitleSection(),
            createDefaultPembukaSection(),
            createDefaultSubjectSection(),
            createDefaultBodySection(),
            createDefaultClosingSection(),
            createDefaultSignatureSection(),
            createDefaultQRSection(),
            createDefaultFooterSection(),
          ],
          style: createDefaultStyle(),
          status: "draft",
          is_default: false,
        };
        setLayout(defaultLayout as LetterLayout);
      }
    });
  }, [suratTypeCode]);

  const handleSaveDraft = async () => {
    if (!layout) return;
    try {
      if (layout.id) {
        await updateLayout(layout.id, {
          sections: layout.sections,
          style: layout.style,
          name: layout.name,
          description: layout.description,
          status: "draft",
        });
      } else {
        await createLayout(layout);
      }
      toast.success("Layout disimpan sebagai draft.");
    } catch (err) {
      toast.error("Gagal menyimpan layout.");
      console.error(err);
    }
  };

  const handleActivate = async () => {
    if (!layout || !layout.id) {
      toast.error("Layout belum disimpan.");
      return;
    }
    try {
      await activateLayout(layout.id);
      toast.success("Layout diaktifkan.");
      setLayout({ ...layout, status: "active" });
    } catch (err) {
      toast.error("Gagal mengaktifkan layout.");
      console.error(err);
    }
  };

  const handleAddSection = (type: SectionType) => {
    if (!layout) return;
    const newSection: LetterSection = {
      id: `${type}-${Date.now()}`,
      type,
      enabled: true,
      order: layout.sections.length + 1,
      config: {} as any, // Will be filled by section editor
    };
    setLayout({ ...layout, sections: [...layout.sections, newSection] });
    setEditingSection(newSection);
  };

  const handleEditSection = (section: LetterSection) => {
    setEditingSection({ ...section });
  };

  const handleDeleteSection = (sectionId: string) => {
    if (!layout) return;
    setLayout({
      ...layout,
      sections: layout.sections.filter((s) => s.id !== sectionId),
    });
  };

  const handleSaveSection = (updatedSection: LetterSection) => {
    if (!layout) return;
    const idx = layout.sections.findIndex((s) => s.id === updatedSection.id);
    if (idx >= 0) {
      const newSections = [...layout.sections];
      newSections[idx] = updatedSection;
      setLayout({ ...layout, sections: newSections });
    }
    setEditingSection(null);
  };

  const handleToggleSection = (sectionId: string) => {
    if (!layout) return;
    setLayout({
      ...layout,
      sections: layout.sections.map((s) =>
        s.id === sectionId ? { ...s, enabled: !s.enabled } : s,
      ),
    });
  };

  const handleRefreshPreview = () => {
    setPreviewKey((k) => k + 1);
  };

  const sortedSections = useMemo(() => {
    if (!layout) return [];
    return [...layout.sections].sort((a, b) => (a.order ?? 999) - (b.order ?? 999));
  }, [layout]);

  const renderContext = useMemo(() => {
    if (!layout) return null;
    return buildRenderContextFromSurat(SAMPLE_SURAT, SAMPLE_WARGA, settings);
  }, [layout, settings]);

  return (
    <div className="space-y-4">
      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Layout Blanko Surat</h2>
          <p className="text-sm text-muted-foreground">
            Desain tampilan blanko surat per jenis surat
          </p>
        </div>
      </div>

      {/* ── Surat Type Selector ── */}
      <div className="flex items-center gap-3">
        <Label htmlFor="surat-type" className="text-sm font-medium">
          Jenis Surat:
        </Label>
        <Select value={suratTypeCode} onValueChange={setSuratTypeCode}>
          <SelectTrigger className="w-[300px]">
            <SelectValue placeholder="Pilih jenis surat..." />
          </SelectTrigger>
          <SelectContent>
            {systemData?.surat_types
              ? systemData.surat_types.map((s) => (
                  <SelectItem key={s.code} value={s.code}>
                    {s.code} — {s.name}
                  </SelectItem>
                ))
              : Object.values(SURAT_MASTER).map((s) => (
                  <SelectItem key={s.code} value={s.code}>
                    {s.code} — {s.name}
                  </SelectItem>
                ))}
          </SelectContent>
        </Select>
        {layout && (
          <Badge variant={layout.status === "active" ? "default" : "secondary"}>
            {layout.status === "active" ? "Aktif" : layout.status === "draft" ? "Draft" : "Arsip"}
          </Badge>
        )}
      </div>

      {!layout && suratTypeCode && (
        <div className="rounded-lg border border-border bg-muted/30 p-4 text-center text-sm text-muted-foreground">
          Memuat layout...
        </div>
      )}

      {layout && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* ── Left: Section List + Style Editor ── */}
          <div className="lg:col-span-2 space-y-4">
            {/* Action Buttons */}
            <div className="flex flex-wrap gap-2">
              <Button size="sm" onClick={handleSaveDraft}>
                <Save className="h-4 w-4 mr-1" /> Simpan Draft
              </Button>
              <Button size="sm" variant="default" onClick={handleActivate} disabled={!layout.id}>
                <CheckCircle className="h-4 w-4 mr-1" /> Aktifkan
              </Button>
              <Button size="sm" variant="outline" onClick={() => setShowStyleEditor(true)}>
                <Settings className="h-4 w-4 mr-1" /> Style
              </Button>
              <Button size="sm" variant="outline" onClick={() => setShowHistory(true)}>
                <History className="h-4 w-4 mr-1" /> Riwayat
              </Button>
              <Button size="sm" variant="outline" onClick={handleRefreshPreview}>
                <Eye className="h-4 w-4 mr-1" /> Refresh Preview
              </Button>
            </div>

            {/* Section List */}
            <div className="rounded-lg border border-border bg-card">
              <div className="border-b border-border px-4 py-3 flex items-center justify-between">
                <h3 className="font-semibold">Sections</h3>
                <Select onValueChange={(v) => handleAddSection(v as SectionType)}>
                  <SelectTrigger className="w-[180px]">
                    <Plus className="h-4 w-4 mr-1" />
                    <SelectValue placeholder="Tambah Section" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(SECTION_TYPE_LABELS).map(([type, label]) => (
                      <SelectItem key={type} value={type}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="divide-y divide-border">
                {sortedSections.length === 0 && (
                  <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                    Belum ada section. Klik "Tambah Section" untuk mulai.
                  </div>
                )}
                {sortedSections.map((section) => (
                  <div
                    key={section.id}
                    className="px-4 py-3 flex items-center gap-3 hover:bg-muted/30 transition"
                  >
                    <Switch
                      checked={section.enabled}
                      onCheckedChange={() => handleToggleSection(section.id)}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">
                        {SECTION_TYPE_LABELS[section.type] || section.type}
                      </p>
                      <p className="text-xs text-muted-foreground">Order: {section.order}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button size="sm" variant="ghost" onClick={() => handleEditSection(section)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDeleteSection(section.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ── Right: Preview Panel ── */}
          <div className="lg:col-span-1">
            <div className="sticky top-4 space-y-3">
              <div className="rounded-lg border border-border bg-card p-3">
                <h3 className="font-semibold mb-2 text-sm">Preview</h3>
                <div className="w-full overflow-auto bg-muted rounded border border-border flex justify-center p-2 max-h-[600px]">
                  {renderContext && (
                    <div
                      className="origin-top scale-[0.4] bg-white shadow-lg"
                      style={{
                        transformOrigin: "top center",
                        marginBottom: "-60%",
                      }}
                    >
                      <LetterRenderer
                        key={previewKey}
                        layout={layout}
                        context={renderContext}
                        isPrintMode={false}
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Section Editor Modal ── */}
      {editingSection && (
        <SectionEditorModal
          section={editingSection}
          onSave={handleSaveSection}
          onClose={() => setEditingSection(null)}
        />
      )}

      {/* ── Style Editor Modal ── */}
      {showStyleEditor && layout && (
        <StyleEditorModal
          style={layout.style}
          onSave={(newStyle) => {
            setLayout({ ...layout, style: newStyle });
            setShowStyleEditor(false);
          }}
          onClose={() => setShowStyleEditor(false)}
        />
      )}
    </div>
  );
}

// ─── Section Editor Modal ───────────────────────────────────────────────────

function SectionEditorModal({
  section,
  onSave,
  onClose,
}: {
  section: LetterSection;
  onSave: (section: LetterSection) => void;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState<LetterSection>(section);

  const handleSave = () => {
    onSave(draft);
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            Edit Section: {SECTION_TYPE_LABELS[section.type] || section.type}
          </DialogTitle>
          <DialogDescription>
            Konfigurasi section {section.type} — ID: {section.id}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Order */}
          <div>
            <Label htmlFor="section-order">Order</Label>
            <Input
              id="section-order"
              type="number"
              value={draft.order}
              onChange={(e) => setDraft({ ...draft, order: parseInt(e.target.value) || 0 })}
            />
          </div>

          {/* Section-specific config editors */}
          {section.type === "kop" && (
            <KopConfigEditor
              config={draft.config as KopSectionConfig}
              onChange={(c) => setDraft({ ...draft, config: c })}
            />
          )}
          {section.type === "title" && (
            <TitleConfigEditor
              config={draft.config as TitleSectionConfig}
              onChange={(c) => setDraft({ ...draft, config: c })}
            />
          )}
          {section.type === "pembuka" && (
            <PembukaConfigEditor
              config={draft.config as PembukaSectionConfig}
              onChange={(c) => setDraft({ ...draft, config: c })}
            />
          )}
          {section.type === "subject" && (
            <SubjectConfigEditor
              config={draft.config as SubjectSectionConfig}
              onChange={(c) => setDraft({ ...draft, config: c })}
            />
          )}
          {section.type === "body" && (
            <BodyConfigEditor
              config={draft.config as BodySectionConfig}
              onChange={(c) => setDraft({ ...draft, config: c })}
            />
          )}
          {section.type === "closing" && (
            <ClosingConfigEditor
              config={draft.config as ClosingSectionConfig}
              onChange={(c) => setDraft({ ...draft, config: c })}
            />
          )}
          {section.type === "signature" && (
            <SignatureConfigEditor
              config={draft.config as SignatureSectionConfig}
              onChange={(c) => setDraft({ ...draft, config: c })}
            />
          )}
          {section.type === "qr" && (
            <QRConfigEditor
              config={draft.config as QRSectionConfig}
              onChange={(c) => setDraft({ ...draft, config: c })}
            />
          )}
          {section.type === "footer" && (
            <FooterConfigEditor
              config={draft.config as FooterSectionConfig}
              onChange={(c) => setDraft({ ...draft, config: c })}
            />
          )}
          {section.type === "separator" && (
            <SeparatorConfigEditor
              config={draft.config as SeparatorSectionConfig}
              onChange={(c) => setDraft({ ...draft, config: c })}
            />
          )}
          {section.type === "custom_text" && (
            <CustomTextConfigEditor
              config={draft.config as CustomTextSectionConfig}
              onChange={(c) => setDraft({ ...draft, config: c })}
            />
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Batal
          </Button>
          <Button onClick={handleSave}>
            <Save className="h-4 w-4 mr-1" /> Simpan
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Kop Section Config Editor ─────────────────────────────────────────────

function KopConfigEditor({
  config,
  onChange,
}: {
  config: KopSectionConfig;
  onChange: (c: KopSectionConfig) => void;
}) {
  const update = (partial: Partial<KopSectionConfig>) => onChange({ ...config, ...partial });

  return (
    <div className="space-y-4">
      <div>
        <Label>Posisi Logo</Label>
        <Select
          value={config.logo_position}
          onValueChange={(v) => update({ logo_position: v as "separate" | "inline" | "none" })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="separate">Terpisah (kiri & kanan)</SelectItem>
            <SelectItem value="inline">Baris dengan teks kop</SelectItem>
            <SelectItem value="none">Tidak ada logo</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>Ukuran Logo (px)</Label>
          <Input
            type="number"
            value={config.logo_size ?? 60}
            onChange={(e) => update({ logo_size: parseInt(e.target.value) || 60 })}
          />
        </div>
        <div>
          <Label>Warna Header</Label>
          <Input
            type="color"
            value={config.header_color || "#E37222"}
            onChange={(e) => update({ header_color: e.target.value })}
          />
        </div>
      </div>

      <div>
        <Label>Style Border Bawah</Label>
        <Select
          value={config.border_style}
          onValueChange={(v) => update({ border_style: v as "single" | "double" | "thick" })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="single">Single line</SelectItem>
            <SelectItem value="double">Double line (OpenSID)</SelectItem>
            <SelectItem value="thick">Thick line</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center gap-2">
        <Switch
          checked={config.show_border_bottom ?? true}
          onCheckedChange={(v) => update({ show_border_bottom: v })}
        />
        <Label>Tampilkan border bawah kop</Label>
      </div>

      {/* Kop Lines Array Editor */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <Label>Baris Kop Surat</Label>
          <Button
            size="sm"
            variant="outline"
            onClick={() =>
              update({
                kop_lines: [
                  ...(config.kop_lines ?? []),
                  { text: "", font_size: 12, font_weight: "bold", align: "center" },
                ],
              })
            }
          >
            <Plus className="h-3 w-3 mr-1" /> Tambah Baris
          </Button>
        </div>
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {(config.kop_lines ?? []).map((line, i) => (
            <div key={i} className="flex items-center gap-2 bg-muted/30 rounded-lg p-2">
              <Input
                placeholder={`Baris ${i + 1}`}
                value={line.text}
                onChange={(e) => {
                  const lines = [...(config.kop_lines ?? [])];
                  lines[i] = { ...lines[i], text: e.target.value };
                  update({ kop_lines: lines });
                }}
                className="flex-1"
              />
              <Input
                type="number"
                value={line.font_size}
                onChange={(e) => {
                  const lines = [...(config.kop_lines ?? [])];
                  lines[i] = { ...lines[i], font_size: parseInt(e.target.value) || 12 };
                  update({ kop_lines: lines });
                }}
                className="w-16"
                title="Font size (pt)"
              />
              <Select
                value={line.font_weight}
                onValueChange={(v) => {
                  const lines = [...(config.kop_lines ?? [])];
                  lines[i] = { ...lines[i], font_weight: v as "normal" | "bold" };
                  update({ kop_lines: lines });
                }}
              >
                <SelectTrigger className="w-20">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="bold">Bold</SelectItem>
                  <SelectItem value="normal">Normal</SelectItem>
                </SelectContent>
              </Select>
              <Select
                value={line.align}
                onValueChange={(v) => {
                  const lines = [...(config.kop_lines ?? [])];
                  lines[i] = { ...lines[i], align: v as "left" | "center" | "right" };
                  update({ kop_lines: lines });
                }}
              >
                <SelectTrigger className="w-20">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="left">Kiri</SelectItem>
                  <SelectItem value="center">Tengah</SelectItem>
                  <SelectItem value="right">Kanan</SelectItem>
                </SelectContent>
              </Select>
              <button
                type="button"
                onClick={() => {
                  const lines = (config.kop_lines ?? []).filter((_, j) => j !== i);
                  update({ kop_lines: lines });
                }}
                className="text-destructive hover:bg-destructive/10 p-1 rounded"
                aria-label="Hapus baris kop surat"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          Gunakan placeholder: {"{{village.name}}"}, {"{{village.kecamatan}}"},{" "}
          {"{{village.kabupaten}}"}
        </p>
      </div>
    </div>
  );
}

// ─── Title Section Config Editor ─────────────────────────────────────────────

function TitleConfigEditor({
  config,
  onChange,
}: {
  config: TitleSectionConfig;
  onChange: (c: TitleSectionConfig) => void;
}) {
  return (
    <div className="space-y-4">
      <div>
        <Label>Format Judul</Label>
        <Select
          value={config.format}
          onValueChange={(v) =>
            onChange({ ...config, format: v as "uppercase" | "capitalize" | "normal" })
          }
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="uppercase">HURUF BESAR SEMUA</SelectItem>
            <SelectItem value="capitalize">Capitalize</SelectItem>
            <SelectItem value="normal">Normal</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center gap-2">
        <Switch
          checked={config.show_nomor ?? true}
          onCheckedChange={(v) => onChange({ ...config, show_nomor: v })}
        />
        <Label>Tampilkan Nomor Surat</Label>
      </div>

      {config.show_nomor && (
        <div>
          <Label>Format Nomor Surat</Label>
          <Input
            value={config.nomor_format || "{klasifikasi}/{no_urut}/KDS.SRMB/{bulan_romawi}/{tahun}"}
            onChange={(e) => onChange({ ...config, nomor_format: e.target.value })}
          />
          <p className="text-xs text-muted-foreground mt-1">
            Placeholder: {"{klasifikasi}"}, {"{no_urut}"}, {"{bulan_romawi}"}, {"{tahun}"},{" "}
            {"{bulan}"}, {"{tanggal}"}
          </p>
        </div>
      )}

      <div className="flex items-center gap-2">
        <Switch
          checked={config.show_perihal ?? false}
          onCheckedChange={(v) => onChange({ ...config, show_perihal: v })}
        />
        <Label>Tampilkan Perihal</Label>
      </div>

      {config.show_perihal && (
        <div>
          <Label>Label Perihal</Label>
          <Input
            value={config.purview_label || "Perihal"}
            onChange={(e) => onChange({ ...config, purview_label: e.target.value })}
          />
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>Align</Label>
          <Select
            value={config.align}
            onValueChange={(v) => onChange({ ...config, align: v as "left" | "center" | "right" })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="left">Kiri</SelectItem>
              <SelectItem value="center">Tengah</SelectItem>
              <SelectItem value="right">Kanan</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Font Weight</Label>
          <Select
            value={config.font_weight ?? "bold"}
            onValueChange={(v) => onChange({ ...config, font_weight: v as "normal" | "bold" })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="bold">Bold</SelectItem>
              <SelectItem value="normal">Normal</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Switch
          checked={config.underline ?? false}
          onCheckedChange={(v) => onChange({ ...config, underline: v })}
        />
        <Label>Underline judul</Label>
      </div>
    </div>
  );
}

// ─── Pembuka Section Config Editor ──────────────────────────────────────────

function PembukaConfigEditor({
  config,
  onChange,
}: {
  config: PembukaSectionConfig;
  onChange: (c: PembukaSectionConfig) => void;
}) {
  return (
    <div className="space-y-4">
      <div>
        <Label>Text Pembuka</Label>
        <Textarea
          rows={4}
          value={
            config.text ||
            "Yang bertanda tangan di bawah ini,{{signer.title}},Desa {{village.name}},menerangkan bahwa:"
          }
          onChange={(e) => onChange({ ...config, text: e.target.value })}
        />
        <p className="text-xs text-muted-foreground mt-1">
          Gunakan {"{newline}"} untuk baris baru. Placeholder: {"{{signer.title}}"},{" "}
          {"{{village.name}}"}, {"{{signer.name}}"}
        </p>
      </div>

      <div className="flex items-center gap-2">
        <Switch
          checked={config.show_signer_table ?? true}
          onCheckedChange={(v) => onChange({ ...config, show_signer_table: v })}
        />
        <Label>Tampilkan Tabel Pejabat (nama, jabatan, dll)</Label>
      </div>

      {config.show_signer_table && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <Label>Field Tabel Pejabat</Label>
            <Button
              size="sm"
              variant="outline"
              onClick={() =>
                onChange({
                  ...config,
                  signer_fields: [
                    ...(config.signer_fields ?? []),
                    { label: "Nama", value_source: "signer.name" },
                  ],
                })
              }
            >
              <Plus className="h-3 w-3 mr-1" /> Tambah Field
            </Button>
          </div>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {(config.signer_fields ?? []).map((field, i) => (
              <div key={i} className="flex items-center gap-2 bg-muted/30 rounded-lg p-2">
                <Input
                  placeholder="Label"
                  value={field.label}
                  onChange={(e) => {
                    const fields = [...(config.signer_fields ?? [])];
                    fields[i] = { ...fields[i], label: e.target.value };
                    onChange({ ...config, signer_fields: fields });
                  }}
                  className="w-32"
                />
                <Input
                  placeholder="value_source"
                  value={field.value_source}
                  onChange={(e) => {
                    const fields = [...(config.signer_fields ?? [])];
                    fields[i] = { ...fields[i], value_source: e.target.value };
                    onChange({ ...config, signer_fields: fields });
                  }}
                  className="flex-1"
                />
                <button
                  type="button"
                  onClick={() => {
                    const fields = (config.signer_fields ?? []).filter((_, j) => j !== i);
                    onChange({ ...config, signer_fields: fields });
                  }}
                  className="text-destructive hover:bg-destructive/10 p-1 rounded"
                  aria-label="Hapus field penandatangan"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Value sources: signer.name, signer.title, village.name, village.kecamatan
          </p>
        </div>
      )}

      <div>
        <Label>Font Size (pt)</Label>
        <Input
          type="number"
          value={config.font_size ?? 11}
          onChange={(e) => onChange({ ...config, font_size: parseInt(e.target.value) || 11 })}
        />
      </div>
    </div>
  );
}

// ─── Subject Section Config Editor ──────────────────────────────────────────

function SubjectConfigEditor({
  config,
  onChange,
}: {
  config: SubjectSectionConfig;
  onChange: (c: SubjectSectionConfig) => void;
}) {
  return (
    <div className="space-y-4">
      <div>
        <Label>Judul Section</Label>
        <Input
          value={config.title || "Menerangkan bahwa :"}
          onChange={(e) => onChange({ ...config, title: e.target.value })}
        />
      </div>

      <div>
        <Label>Layout</Label>
        <Select
          value={config.layout ?? "table"}
          onValueChange={(v) => onChange({ ...config, layout: v as "table" | "list" })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="table">Tabel (dua kolom)</SelectItem>
            <SelectItem value="list">List ( satu baris )</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>Lebar Label (%)</Label>
          <Input
            type="number"
            value={config.label_width ?? 30}
            onChange={(e) => onChange({ ...config, label_width: parseInt(e.target.value) || 30 })}
          />
        </div>
        <div>
          <Label>Separator</Label>
          <Input
            value={config.separator ?? " : "}
            onChange={(e) => onChange({ ...config, separator: e.target.value })}
          />
        </div>
      </div>

      <div>
        <Label>Format Label</Label>
        <Input
          value={config.label_format || "{label} : {value}"}
          onChange={(e) => onChange({ ...config, label_format: e.target.value })}
        />
        <p className="text-xs text-muted-foreground mt-1">
          Placeholder: {"{label}"}, {"{value}"}
        </p>
      </div>

      {/* Subject Fields Array */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <Label>Field Identitas</Label>
          <Button
            size="sm"
            variant="outline"
            onClick={() =>
              onChange({
                ...config,
                fields: [
                  ...(config.fields ?? []),
                  { id: `field-${Date.now()}`, label: "Nama", value_source: "form_data.nama" },
                ],
              })
            }
          >
            <Plus className="h-3 w-3 mr-1" /> Tambah Field
          </Button>
        </div>
        <div className="space-y-2 max-h-56 overflow-y-auto">
          {(config.fields ?? []).map((field, i) => (
            <div key={field.id} className="bg-muted/30 rounded-lg p-3 space-y-2">
              <div className="flex items-center gap-2">
                <Input
                  placeholder="Label"
                  value={field.label}
                  onChange={(e) => {
                    const fields = [...(config.fields ?? [])];
                    fields[i] = { ...fields[i], label: e.target.value };
                    onChange({ ...config, fields });
                  }}
                  className="flex-1"
                />
                <button
                  type="button"
                  onClick={() => {
                    const fields = (config.fields ?? []).filter((_, j) => j !== i);
                    onChange({ ...config, fields });
                  }}
                  className="text-destructive hover:bg-destructive/10 p-1 rounded"
                  aria-label="Hapus field"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Select
                  value={field.value_source}
                  onValueChange={(v) => {
                    const fields = [...(config.fields ?? [])];
                    fields[i] = { ...fields[i], value_source: v };
                    onChange({ ...config, fields });
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Value source" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="form_data.nama">Nama</SelectItem>
                    <SelectItem value="form_data.nik">NIK</SelectItem>
                    <SelectItem value="form_data.pekerjaan">Pekerjaan</SelectItem>
                    <SelectItem value="form_data.alamat">Alamat</SelectItem>
                    <SelectItem value="form_data.tempat_lahir">Tempat Lahir</SelectItem>
                    <SelectItem value="form_data.tanggal_lahir">Tanggal Lahir</SelectItem>
                    <SelectItem value="form_data.jenis_kelamin">Jenis Kelamin</SelectItem>
                    <SelectItem value="form_data.agama">Agama</SelectItem>
                    <SelectItem value="form_data.kewarganegaraan">Kewarganegaraan</SelectItem>
                    <SelectItem value="form_data.no_kk">No. KK</SelectItem>
                    <SelectItem value="form_data.rt">RT</SelectItem>
                    <SelectItem value="form_data.rw">RW</SelectItem>
                    <SelectItem value="form_data.dusun">Dusun</SelectItem>
                  </SelectContent>
                </Select>
                <Select
                  value={field.format ?? "normal"}
                  onValueChange={(v) => {
                    const fields = [...(config.fields ?? [])];
                    fields[i] = {
                      ...fields[i],
                      format: v as "uppercase" | "capitalize" | "normal",
                    };
                    onChange({ ...config, fields });
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Format" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="uppercase">UPPERCASE</SelectItem>
                    <SelectItem value="capitalize">Capitalize</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          ))}
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          Field ditampilkan di section "Identitas Pemohon" — dari data form.
        </p>
      </div>
    </div>
  );
}

// ─── Body Section Config Editor ────────────────────────────────────────────

function BodyConfigEditor({
  config,
  onChange,
}: {
  config: BodySectionConfig;
  onChange: (c: BodySectionConfig) => void;
}) {
  return (
    <div className="space-y-4">
      <div>
        <Label>Sumber Klausul</Label>
        <Select
          value={config.clauses_source ?? "template"}
          onValueChange={(v) =>
            onChange({ ...config, clauses_source: v as "template" | "form_data" | "static" })
          }
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="template">Template (dari database)</SelectItem>
            <SelectItem value="form_data">Form Data (clauses array)</SelectItem>
            <SelectItem value="static">Statis (custom clauses)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {config.clauses_source === "static" && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <Label>Klausul Statis</Label>
            <Button
              size="sm"
              variant="outline"
              onClick={() =>
                onChange({
                  ...config,
                  static_clauses: [...(config.static_clauses ?? []), ""],
                })
              }
            >
              <Plus className="h-3 w-3 mr-1" /> Tambah Klausul
            </Button>
          </div>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {(config.static_clauses ?? []).map((clause, i) => (
              <div key={i} className="flex items-center gap-2">
                <Textarea
                  rows={2}
                  value={clause}
                  onChange={(e) => {
                    const clauses = [...(config.static_clauses ?? [])];
                    clauses[i] = e.target.value;
                    onChange({ ...config, static_clauses: clauses });
                  }}
                  className="flex-1"
                  placeholder={`Klausul ${i + 1}`}
                />
                <button
                  type="button"
                  onClick={() => {
                    const clauses = (config.static_clauses ?? []).filter((_, j) => j !== i);
                    onChange({ ...config, static_clauses: clauses });
                  }}
                  className="text-destructive hover:bg-destructive/10 p-1 rounded shrink-0"
                  aria-label="Hapus klausul"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div>
        <Label>Format</Label>
        <Select
          value={config.format ?? "plain"}
          onValueChange={(v) =>
            onChange({ ...config, format: v as "numbered" | "bulleted" | "plain" | "paragraphs" })
          }
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="plain">Plain Text</SelectItem>
            <SelectItem value="numbered">Bernomor (1. 2. 3.)</SelectItem>
            <SelectItem value="bulleted">Bullet Point</SelectItem>
            <SelectItem value="paragraphs">Paragraf</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {config.format === "numbered" && (
        <div>
          <Label>Style Penomoran</Label>
          <Select
            value={config.numbering_style ?? "1."}
            onValueChange={(v) =>
              onChange({ ...config, numbering_style: v as "1." | "1)" | "a." | "I." | "custom" })
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1.">1. 2. 3.</SelectItem>
              <SelectItem value="1)">1) 2) 3)</SelectItem>
              <SelectItem value="a.">a. b. c.</SelectItem>
              <SelectItem value="I.">I. II. III.</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>Indent Level</Label>
          <Input
            type="number"
            min={0}
            max={5}
            value={config.indent_level ?? 0}
            onChange={(e) => onChange({ ...config, indent_level: parseInt(e.target.value) || 0 })}
          />
        </div>
        <div>
          <Label>Jarak Antar Klausul (px)</Label>
          <Input
            type="number"
            value={config.clause_spacing ?? 6}
            onChange={(e) => onChange({ ...config, clause_spacing: parseInt(e.target.value) || 6 })}
          />
        </div>
      </div>
    </div>
  );
}

// ─── Closing Section Config Editor ──────────────────────────────────────────

function ClosingConfigEditor({
  config,
  onChange,
}: {
  config: ClosingSectionConfig;
  onChange: (c: ClosingSectionConfig) => void;
}) {
  return (
    <div className="space-y-4">
      <div>
        <Label>Text Penutup</Label>
        <Textarea
          rows={3}
          value={
            config.text ||
            "Demikian surat ini dibuat dengan sebenar-benarnya untuk dapat dipergunakan sebagaimana mestinya."
          }
          onChange={(e) => onChange({ ...config, text: e.target.value })}
        />
      </div>

      <div className="flex items-center gap-2">
        <Switch
          checked={config.show_date ?? true}
          onCheckedChange={(v) => onChange({ ...config, show_date: v })}
        />
        <Label>Tampilkan Tanggal & Lokasi</Label>
      </div>

      {config.show_date && (
        <div>
          <Label>Format Tanggal</Label>
          <Input
            value={config.date_format || "{{village.name}}, {tanggal} {bulan} {tahun}"}
            onChange={(e) => onChange({ ...config, date_format: e.target.value })}
          />
          <p className="text-xs text-muted-foreground mt-1">
            Placeholder: {"{{village.name}}"}, {"{tanggal}"}, {"{bulan}"}, {"{tahun}"}
          </p>
        </div>
      )}

      <div>
        <Label>Align</Label>
        <Select
          value={config.align ?? "left"}
          onValueChange={(v) => onChange({ ...config, align: v as "left" | "center" | "right" })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="left">Kiri</SelectItem>
            <SelectItem value="center">Tengah</SelectItem>
            <SelectItem value="right">Kanan</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

// ─── Signature Section Config Editor ─────────────────────────────────────────

function SignatureConfigEditor({
  config,
  onChange,
}: {
  config: SignatureSectionConfig;
  onChange: (c: SignatureSectionConfig) => void;
}) {
  return (
    <div className="space-y-4">
      <div>
        <Label>Layout Tanda Tangan</Label>
        <Select
          value={config.layout ?? "two_column"}
          onValueChange={(v) =>
            onChange({ ...config, layout: v as "one_column" | "two_column" | "three_column" })
          }
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="one_column">1 Kolom (bawah tengah)</SelectItem>
            <SelectItem value="two_column">2 Kolom (kiri-kanan)</SelectItem>
            <SelectItem value="three_column">3 Kolom</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label>Tinggi Area TTD (px)</Label>
        <Input
          type="number"
          value={config.signature_height ?? 60}
          onChange={(e) =>
            onChange({ ...config, signature_height: parseInt(e.target.value) || 60 })
          }
        />
      </div>

      {/* Signature Columns Editor */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <Label>Kolom Tanda Tangan</Label>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              const colCount =
                config.layout === "one_column" ? 1 : config.layout === "three_column" ? 3 : 2;
              if ((config.columns ?? []).length < colCount) {
                onChange({
                  ...config,
                  columns: [
                    ...(config.columns ?? []),
                    {
                      party: "pemohon" as const,
                      title: "Yang Bersangkutan",
                      show_name: true,
                      show_title: false,
                      show_nip: false,
                      show_stamp: false,
                      name_source: "form_data.nama",
                      title_source: "custom:Pemohon",
                      nip_source: "",
                      ttd_label: "Yang Bersangkutan",
                    },
                  ],
                });
              }
            }}
          >
            <Plus className="h-3 w-3 mr-1" /> Tambah Kolom
          </Button>
        </div>
        <div className="space-y-3">
          {(config.columns ?? []).map((col, i) => (
            <div key={i} className="bg-muted/30 rounded-lg p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold">Kolom {i + 1}</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs">Party</Label>
                  <Select
                    value={col.party}
                    onValueChange={(v) => {
                      const columns = [...(config.columns ?? [])];
                      columns[i] = {
                        ...columns[i],
                        party: v as "pemohon" | "signer" | "saksi" | "custom",
                      };
                      onChange({ ...config, columns });
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pemohon">Pemohon</SelectItem>
                      <SelectItem value="signer">Penandatangan</SelectItem>
                      <SelectItem value="saksi">Saksi</SelectItem>
                      <SelectItem value="custom">Custom</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Label TTD</Label>
                  <Input
                    value={col.ttd_label}
                    onChange={(e) => {
                      const columns = [...(config.columns ?? [])];
                      columns[i] = { ...columns[i], ttd_label: e.target.value };
                      onChange({ ...config, columns });
                    }}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs">Name Source</Label>
                  <Input
                    value={col.name_source}
                    onChange={(e) => {
                      const columns = [...(config.columns ?? [])];
                      columns[i] = { ...columns[i], name_source: e.target.value };
                      onChange({ ...config, columns });
                    }}
                  />
                </div>
                <div>
                  <Label className="text-xs">Title Source</Label>
                  <Input
                    value={col.title_source}
                    onChange={(e) => {
                      const columns = [...(config.columns ?? [])];
                      columns[i] = { ...columns[i], title_source: e.target.value };
                      onChange({ ...config, columns });
                    }}
                  />
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <div className="flex items-center gap-1">
                  <Switch
                    checked={col.show_name}
                    onCheckedChange={(v) => {
                      const columns = [...(config.columns ?? [])];
                      columns[i] = { ...columns[i], show_name: v };
                      onChange({ ...config, columns });
                    }}
                  />
                  <span className="text-xs">Nama</span>
                </div>
                <div className="flex items-center gap-1">
                  <Switch
                    checked={col.show_title}
                    onCheckedChange={(v) => {
                      const columns = [...(config.columns ?? [])];
                      columns[i] = { ...columns[i], show_title: v };
                      onChange({ ...config, columns });
                    }}
                  />
                  <span className="text-xs">Jabatan</span>
                </div>
                <div className="flex items-center gap-1">
                  <Switch
                    checked={col.show_nip}
                    onCheckedChange={(v) => {
                      const columns = [...(config.columns ?? [])];
                      columns[i] = { ...columns[i], show_nip: v };
                      onChange({ ...config, columns });
                    }}
                  />
                  <span className="text-xs">NIP</span>
                </div>
                <div className="flex items-center gap-1">
                  <Switch
                    checked={col.show_stamp}
                    onCheckedChange={(v) => {
                      const columns = [...(config.columns ?? [])];
                      columns[i] = { ...columns[i], show_stamp: v };
                      onChange({ ...config, columns });
                    }}
                  />
                  <span className="text-xs">Stempel</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Switch
          checked={config.show_materai ?? false}
          onCheckedChange={(v) => onChange({ ...config, show_materai: v })}
        />
        <Label>Tampilkan Area Materai</Label>
      </div>

      {config.show_materai && (
        <div>
          <Label>Posisi Materai</Label>
          <Select
            value={config.materai_position ?? "right"}
            onValueChange={(v) => onChange({ ...config, materai_position: v as "left" | "right" })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="left">Kiri</SelectItem>
              <SelectItem value="right">Kanan</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}
    </div>
  );
}

// ─── QR Section Config Editor ────────────────────────────────────────────────

function QRConfigEditor({
  config,
  onChange,
}: {
  config: QRSectionConfig;
  onChange: (c: QRSectionConfig) => void;
}) {
  return (
    <div className="space-y-4">
      <div>
        <Label>Posisi QR Code</Label>
        <Select
          value={config.position ?? "bottom_left"}
          onValueChange={(v) =>
            onChange({
              ...config,
              position: v as "bottom_left" | "bottom_right" | "top_left" | "top_right",
            })
          }
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="bottom_left">Kiri Bawah</SelectItem>
            <SelectItem value="bottom_right">Kanan Bawah</SelectItem>
            <SelectItem value="top_left">Kiri Atas</SelectItem>
            <SelectItem value="top_right">Kanan Atas</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label>Ukuran QR (px)</Label>
        <Input
          type="number"
          value={config.size ?? 80}
          onChange={(e) => onChange({ ...config, size: parseInt(e.target.value) || 80 })}
        />
      </div>

      <div className="flex items-center gap-2">
        <Switch
          checked={config.show_verification_text ?? true}
          onCheckedChange={(v) => onChange({ ...config, show_verification_text: v })}
        />
        <Label>Tampilkan Teks Verifikasi</Label>
      </div>

      {config.show_verification_text && (
        <>
          <div>
            <Label>Teks Verifikasi</Label>
            <Input
              value={config.verification_text || "Scan untuk verifikasi"}
              onChange={(e) => onChange({ ...config, verification_text: e.target.value })}
            />
          </div>
          <div>
            <Label>URL Template Verifikasi</Label>
            <Input
              value={config.verification_url_template || "/verifikasi/{nomor_surat}"}
              onChange={(e) => onChange({ ...config, verification_url_template: e.target.value })}
            />
            <p className="text-xs text-muted-foreground mt-1">
              Placeholder: {"{nomor_surat}"}, {"{kode}"}, {"{nik}"}
            </p>
          </div>
        </>
      )}
    </div>
  );
}

// ─── Footer Section Config Editor ───────────────────────────────────────────

function FooterConfigEditor({
  config,
  onChange,
}: {
  config: FooterSectionConfig;
  onChange: (c: FooterSectionConfig) => void;
}) {
  return (
    <div className="space-y-4">
      <div>
        <Label>Text Footer</Label>
        <Input
          value={config.text || ""}
          onChange={(e) => onChange({ ...config, text: e.target.value })}
          placeholder="Contoh: Pemerintah Desa Seruni Mumbul"
        />
      </div>

      <div>
        <Label>Align</Label>
        <Select
          value={config.align ?? "center"}
          onValueChange={(v) => onChange({ ...config, align: v as "left" | "center" | "right" })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="left">Kiri</SelectItem>
            <SelectItem value="center">Tengah</SelectItem>
            <SelectItem value="right">Kanan</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label>Font Size (pt)</Label>
        <Input
          type="number"
          value={config.font_size ?? 7}
          onChange={(e) => onChange({ ...config, font_size: parseInt(e.target.value) || 7 })}
        />
      </div>

      <div className="flex items-center gap-2">
        <Switch
          checked={config.show_page_number ?? false}
          onCheckedChange={(v) => onChange({ ...config, show_page_number: v })}
        />
        <Label>Tampilkan Nomor Halaman</Label>
      </div>
    </div>
  );
}

// ─── Separator Section Config Editor ─────────────────────────────────────────

function SeparatorConfigEditor({
  config,
  onChange,
}: {
  config: SeparatorSectionConfig;
  onChange: (c: SeparatorSectionConfig) => void;
}) {
  return (
    <div className="space-y-4">
      <div>
        <Label>Style</Label>
        <Select
          value={config.style ?? "line"}
          onValueChange={(v) => onChange({ ...config, style: v as "line" | "dots" | "space" })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="line">Garis</SelectItem>
            <SelectItem value="dots">Titik-titik</SelectItem>
            <SelectItem value="space">Spasi Kosong</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label>Tinggi (px)</Label>
        <Input
          type="number"
          value={config.height ?? 8}
          onChange={(e) => onChange({ ...config, height: parseInt(e.target.value) || 8 })}
        />
      </div>

      <div>
        <Label>Warna Garis</Label>
        <Input
          type="color"
          value={config.color ?? "#D5D5D5"}
          onChange={(e) => onChange({ ...config, color: e.target.value })}
        />
      </div>
    </div>
  );
}

// ─── Custom Text Section Config Editor ──────────────────────────────────────

function CustomTextConfigEditor({
  config,
  onChange,
}: {
  config: CustomTextSectionConfig;
  onChange: (c: CustomTextSectionConfig) => void;
}) {
  return (
    <div className="space-y-4">
      <div>
        <Label>Text</Label>
        <Textarea
          rows={3}
          value={config.text || ""}
          onChange={(e) => onChange({ ...config, text: e.target.value })}
          placeholder="Teks kustom..."
        />
        <p className="text-xs text-muted-foreground mt-1">
          Placeholder: {"{{signer.name}}"}, {"{{village.name}}"}, {"{{tanggal}}"}. {"{newline}"}{" "}
          untuk baris baru.
        </p>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div>
          <Label>Align</Label>
          <Select
            value={config.align ?? "left"}
            onValueChange={(v) => onChange({ ...config, align: v as "left" | "center" | "right" })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="left">Kiri</SelectItem>
              <SelectItem value="center">Tengah</SelectItem>
              <SelectItem value="right">Kanan</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Font Size (pt)</Label>
          <Input
            type="number"
            value={config.font_size ?? 11}
            onChange={(e) => onChange({ ...config, font_size: parseInt(e.target.value) || 11 })}
          />
        </div>
        <div>
          <Label>Font Weight</Label>
          <Select
            value={config.font_weight ?? "normal"}
            onValueChange={(v) => onChange({ ...config, font_weight: v as "normal" | "bold" })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="normal">Normal</SelectItem>
              <SelectItem value="bold">Bold</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>Margin Top (px)</Label>
          <Input
            type="number"
            value={config.margin_top ?? 0}
            onChange={(e) => onChange({ ...config, margin_top: parseInt(e.target.value) || 0 })}
          />
        </div>
        <div>
          <Label>Margin Bottom (px)</Label>
          <Input
            type="number"
            value={config.margin_bottom ?? 0}
            onChange={(e) => onChange({ ...config, margin_bottom: parseInt(e.target.value) || 0 })}
          />
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Switch
          checked={config.italic ?? false}
          onCheckedChange={(v) => onChange({ ...config, italic: v })}
        />
        <Label>Italic</Label>
      </div>
    </div>
  );
}

// ─── Style Editor Modal ─────────────────────────────────────────────────────

function StyleEditorModal({
  style,
  onSave,
  onClose,
}: {
  style: LetterStyle;
  onSave: (style: LetterStyle) => void;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState<LetterStyle>(style);

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Global Style</DialogTitle>
          <DialogDescription>Font, margins, colors untuk seluruh layout</DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-4">
          <div>
            <Label>Font Family</Label>
            <Input
              value={draft.font_family}
              onChange={(e) => setDraft({ ...draft, font_family: e.target.value })}
            />
          </div>
          <div>
            <Label>Body Font Size (pt)</Label>
            <Input
              type="number"
              value={draft.font_size_body}
              onChange={(e) =>
                setDraft({ ...draft, font_size_body: parseInt(e.target.value) || 11 })
              }
            />
          </div>
          <div>
            <Label>Line Height</Label>
            <Input
              type="number"
              step="0.1"
              value={draft.line_height}
              onChange={(e) =>
                setDraft({ ...draft, line_height: parseFloat(e.target.value) || 1.2 })
              }
            />
          </div>
          <div>
            <Label>Header Color</Label>
            <Input
              type="color"
              value={draft.header_color}
              onChange={(e) => setDraft({ ...draft, header_color: e.target.value })}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Batal
          </Button>
          <Button onClick={() => onSave(draft)}>
            <Save className="h-4 w-4 mr-1" /> Simpan
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
