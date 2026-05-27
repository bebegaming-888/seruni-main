/**
 * KopDanBlankoSettings — Halaman Terpadu Kop Surat + Blanko Surat
 *
 * Penggabungan:
 *  - Tab "Kop Surat"    → logo, tata letak, baris teks kop, warna, footer, style TTD
 *  - Tab "Blanko Surat" → margin kertas, font body, QR/signature position
 *
 * Fitur utama:
 *  - Split layout: pengaturan (kiri) + live preview letter (kanan)
 *  - Live preview menggunakan pipeline LetterRenderer/buildRenderedLetter SEBENARNYA
 *  - Perubahan settings langsung terlihat di preview tanpa save
 */

import React, { useMemo } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Section, Grid2, Field, ToggleRow, ImageUploadField } from "./settings-ui";
import { getSettings, DEFAULT_SETTINGS, type SystemSettings } from "@/lib/settings-store";
import { buildRenderedLetter } from "@/lib/letter-engine";
import { LetterRenderer } from "@/components/surat/LetterRenderer";
import type { SuratTemplate } from "@/lib/template-store";
import type { Penduduk } from "@/data/penduduk";
import { Plus, Trash2, Wand2, FileText, Type, LayoutTemplate } from "lucide-react";

// ── Sample data untuk live preview ──────────────────────────────────────────────

const SAMPLE_TEMPLATE: SuratTemplate = {
  id: "sktm-preview",
  code: "SKTM",
  name: "Surat Keterangan Tidak Mampu",
  description: "Surat keterangan tidak mampu untuk keperluan pengurusan bantuan sosial",
  category: "administrasi",
  fields: [],
  syarat: [],
  eta: "1 hari kerja",
  body: "",
  status: "Diverifikasi",
  dna_clauses: [
    "Berdasarkan surat pengantar RT/RW Nomor: 01/Pengantar/2026, dated 15 Mei 2026, bahwa yang bersangkutan adalah benar-benar warga kami yang berdomisili di {{alamat_lengkap}}.",
    "Berdasarkan[data研究表明] bahwa yang bersangkutan termasuk keluarga kurang mampu sehingga perlu mendapat perhatian dan bantuan dari pemerintah.",
  ],
  closing:
    "Demikian surat keterangan ini dibuat dengan sebenar-benarnya untuk dapat dipergunakan sebagaimana mestinya.",
  created_at: "2026-01-01T00:00:00Z",
};

const SAMPLE_WARGA: Partial<Penduduk> = {
  nik: "5203011234567890",
  nama: "TAJUDDIN MASHAR, S.Pd.",
  tempat_lahir: "Sumbawa",
  tanggal_lahir: "1985-03-15",
  jenis_kelamin: "Laki-Laki",
  agama: "Islam",
  status_perkawinan: "Kawin",
  pekerjaan: "Guru Honorer",
  no_kk: "5203011234567891",
  alamat: "Pringgabaya, Lombok Timur, Nusa Tenggara Barat",
  dusun: "Dusun 1",
};

const SAMPLE_REQUEST: Record<string, string> = {
  keperluan: "Pengurusan bantuan biaya pendidikan anak",
};

// ── Component ────────────────────────────────────────────────────────────────────

export function KopDanBlankoSettings({
  s,
  update,
}: {
  s: SystemSettings;
  update: <K extends keyof SystemSettings>(k: K, patch: Partial<SystemSettings[K]>) => void;
}) {
  const kopLines = s.kopSurat.kop_lines ?? [];
  const pdfLayout = s.pdfLayout ?? DEFAULT_SETTINGS.pdfLayout;

  // ── Kop line helpers ──
  const updateKopLine = (id: string, patch: Partial<(typeof kopLines)[0]>) => {
    update("kopSurat", {
      kop_lines: kopLines.map((l) => (l.id === id ? { ...l, ...patch } : l)),
    });
  };

  const addKopLine = () => {
    const semanticIds = ["kab", "kec", "des", "almt", "kontak"];
    const usedIds = new Set(kopLines.map((l) => l.id));
    const nextId = semanticIds.find((id) => !usedIds.has(id)) ?? `custom_${Date.now()}`;
    update("kopSurat", {
      kop_lines: [
        ...kopLines,
        {
          id: nextId,
          label: `Baris ${kopLines.length + 1}`,
          text: "",
          font_size: 11,
          bold: false,
          italic: false,
        },
      ],
    });
  };

  const autofillKop = () => {
    if (kopLines.length > 0) return;
    const villageData = s.village;
    const autoLines = [
      { label: "Nama Desa", text: villageData.name },
      {
        label: "Alamat",
        text: [villageData.address, villageData.district, villageData.regency]
          .filter(Boolean)
          .join(", "),
      },
      {
        label: "Telepon / WhatsApp",
        text: villageData.phone
          ? `Telp. ${villageData.phone}${villageData.whatsapp ? ` / WA ${villageData.whatsapp}` : ""}`
          : "",
      },
      { label: "Website", text: s.social?.website ?? "" },
      { label: "Email Resmi", text: villageData.email },
    ];
    const semanticIds = ["kab", "kec", "des", "almt", "kontak"];
    update("kopSurat", {
      kop_lines: autoLines.map((l, i) => ({
        id: semanticIds[i],
        label: l.label,
        text: l.text,
        font_size: l.label === "Nama Desa" ? 13 : 10,
        bold: l.label === "Nama Desa",
        italic: false,
      })),
    });
  };

  // ── Live preview letter ──
  const renderedLetter = useMemo(() => {
    return buildRenderedLetter({
      template: SAMPLE_TEMPLATE,
      warga: SAMPLE_WARGA,
      requestData: SAMPLE_REQUEST,
      nomorSurat: "470/001/KDS.SRMB/V/2026",
      tanggalSurat: "2026-05-20",
      qrPayload: "SERUNI-MUMBBUL-PREVIEW-2026",
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    s.kopSurat.logo_kab_url,
    s.kopSurat.logo_desa_url,
    s.kopSurat.logo_position,
    s.kopSurat.logo_kab_storage_path,
    s.kopSurat.logo_desa_storage_path,
    s.kopSurat.kop_lines,
    s.kopSurat.header_bar_color,
    s.kopSurat.footer_enabled,
    s.kopSurat.footer_text,
    s.kopSurat.signature_style,
    s.signature.sign_image_url,
    s.signature.sign_image_storage_path,
    s.signature.signer_name,
    s.signature.signer_title,
    s.pdfLayout?.body_font,
    s.pdfLayout?.body_font_size,
    s.pdfLayout?.font,
    s.pdfLayout?.signaturePos,
    s.village,
  ]);

  // ── PDF Layout helpers ──
  const updateMargin = (key: "top" | "bottom" | "left" | "right", val: string) => {
    update("pdfLayout", { margin: { ...pdfLayout.margin, [key]: val } });
  };
  const updateFont = (key: "family" | "size" | "lineHeight", val: string) => {
    update("pdfLayout", { font: { ...pdfLayout.font, [key]: val } });
  };
  const updateSigPos = (key: "qrWidth" | "marginY", val: string) => {
    update("pdfLayout", { signaturePos: { ...pdfLayout.signaturePos, [key]: val } });
  };

  const bodyFont = pdfLayout.body_font || "Arial, sans-serif";
  const bodyFontSize = pdfLayout.body_font_size || 11;
  const primaryColor = s.kopSurat.header_bar_color;

  return (
    <div className="flex flex-col xl:flex-row gap-6">
      {/* ── SETTINGS PANEL (left/top) ── */}
      <div className="flex-1 space-y-6 min-w-0">
        {/* ── 1. Logo & Tata Letak ── */}
        <Section
          title="Logo & Tata Letak"
          desc="Logo Kabupaten (kiri) dan Logo Desa (kanan) yang muncul di header surat."
        >
          <div className="grid sm:grid-cols-2 gap-4">
            <ImageUploadField
              label="Logo Kabupaten (Kiri)"
              hint="PNG transparan, maks 500KB"
              value={s.kopSurat.logo_kab_url}
              onChange={(v) => update("kopSurat", { logo_kab_url: v })}
              onStoragePathChange={(path) => update("kopSurat", { logo_kab_storage_path: path })}
            />
            <ImageUploadField
              label="Logo Desa (Kanan)"
              hint="PNG transparan, maks 500KB"
              value={s.kopSurat.logo_desa_url}
              onChange={(v) => update("kopSurat", { logo_desa_url: v })}
              onStoragePathChange={(path) => update("kopSurat", { logo_desa_storage_path: path })}
            />
          </div>
          <Field label="Tata Letak Logo">
            <select
              className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm focus-visible:outline-none focus:ring-2 focus:ring-primary/30"
              value={s.kopSurat.logo_position}
              onChange={(e) =>
                update("kopSurat", {
                  logo_position: e.target.value as SystemSettings["kopSurat"]["logo_position"],
                })
              }
            >
              <option value="separate">Terpisah (Kab Kiri · Desa Kanan)</option>
              <option value="left">Logo Kabupaten Saja (Kiri)</option>
              <option value="center">Logo Desa Saja (Tengah)</option>
              <option value="right">Logo Desa Saja (Kanan)</option>
            </select>
          </Field>
        </Section>

        {/* ── 2. Baris Teks Kop Surat ── */}
        <Section
          title="Baris Teks Kop Surat"
          desc="Teks di header surat. ID baris harus unik dan sesuai (kab, kec, des, almt, kontak)."
        >
          <div className="flex items-center justify-between mb-3">
            <p className="font-ui text-[11px] text-muted-foreground">
              5 baris default: Nama Desa, Alamat, Telepon, Website, Email.
            </p>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={autofillKop}
              className="shrink-0 gap-1.5"
            >
              <Wand2 className="h-3.5 w-3.5" />
              Isi Otomatis
            </Button>
          </div>

          <div className="space-y-3">
            {kopLines.map((line) => (
              <div
                key={line.id}
                className="rounded-xl border border-border bg-muted/20 p-3 space-y-2"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-ui text-[10px] font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                      {line.id}
                    </span>
                    <span className="font-ui text-xs font-semibold text-foreground">
                      {line.label}
                    </span>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      update("kopSurat", { kop_lines: kopLines.filter((l) => l.id !== line.id) })
                    }
                    className="text-destructive hover:bg-destructive/10 h-7 w-7 p-0 flex items-center justify-center"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
                <Input
                  value={line.text}
                  onChange={(e) => updateKopLine(line.id, { text: e.target.value })}
                  placeholder="Teks untuk baris ini…"
                  className="text-sm"
                />
                <div className="grid grid-cols-4 gap-2">
                  <Field label="Ukuran">
                    <select
                      className="w-full rounded-lg border border-border bg-background px-2 py-1.5 text-xs focus-visible:outline-none"
                      value={line.font_size}
                      onChange={(e) =>
                        updateKopLine(line.id, { font_size: Number(e.target.value) })
                      }
                    >
                      {[8, 9, 10, 11, 12, 13, 14, 16, 18, 20].map((sz) => (
                        <option key={sz} value={sz}>
                          {sz}pt
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Bold">
                    <select
                      className="w-full rounded-lg border border-border bg-background px-2 py-1.5 text-xs focus-visible:outline-none"
                      value={line.bold ? "1" : "0"}
                      onChange={(e) => updateKopLine(line.id, { bold: e.target.value === "1" })}
                    >
                      <option value="1">Ya</option>
                      <option value="0">Tidak</option>
                    </select>
                  </Field>
                  <Field label="Italic">
                    <select
                      className="w-full rounded-lg border border-border bg-background px-2 py-1.5 text-xs focus-visible:outline-none"
                      value={line.italic ? "1" : "0"}
                      onChange={(e) => updateKopLine(line.id, { italic: e.target.value === "1" })}
                    >
                      <option value="1">Ya</option>
                      <option value="0">Tidak</option>
                    </select>
                  </Field>
                  <Field label="Label">
                    <Input
                      value={line.label}
                      onChange={(e) => updateKopLine(line.id, { label: e.target.value })}
                      className="text-xs h-8"
                    />
                  </Field>
                </div>
              </div>
            ))}
            <Button type="button" variant="outline" size="sm" onClick={addKopLine}>
              <Plus className="h-3.5 w-3.5 mr-1" /> Tambah Baris
            </Button>
          </div>
        </Section>

        {/* ── 3. Warna, Footer & Style TTD ── */}
        <Section
          title="Warna, Footer & Style TTD"
          desc="Warna garis atas/bawah, teks footer surat, dan tampilan tanda tangan."
        >
          <Field label="Warna Bar Header">
            <div className="flex gap-2">
              <input
                type="color"
                value={s.kopSurat.header_bar_color}
                onChange={(e) => update("kopSurat", { header_bar_color: e.target.value })}
                className="h-10 w-14 rounded border border-border bg-card cursor-pointer"
              />
              <Input
                value={s.kopSurat.header_bar_color}
                onChange={(e) => update("kopSurat", { header_bar_color: e.target.value })}
                className="flex-1"
              />
            </div>
          </Field>
          <ToggleRow
            label="Aktifkan Footer Surat"
            checked={s.kopSurat.footer_enabled}
            onChange={(v) => update("kopSurat", { footer_enabled: v })}
          />
          {s.kopSurat.footer_enabled && (
            <Field label="Teks Footer" hint="Muncul di bagian bawah surat.">
              <Textarea
                rows={2}
                value={s.kopSurat.footer_text}
                onChange={(e) => update("kopSurat", { footer_text: e.target.value })}
                placeholder="Harap sampaikan抽出这个消息..."
              />
            </Field>
          )}
          <Field label="Style Tanda Tangan">
            <select
              className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm focus-visible:outline-none focus:ring-2 focus:ring-primary/30"
              value={s.kopSurat.signature_style}
              onChange={(e) =>
                update("kopSurat", {
                  signature_style: e.target.value as SystemSettings["kopSurat"]["signature_style"],
                })
              }
            >
              <option value="text">Teks (Nama + Jabatan)</option>
              <option value="image">Gambar Spesimen TTD</option>
            </select>
          </Field>
          <ImageUploadField
            label="Gambar Spesimen TTD"
            hint="Muncul di area tanda tangan jika style = Gambar"
            value={s.signature.sign_image_url || ""}
            onChange={(v) => update("signature", { sign_image_url: v })}
            onStoragePathChange={(path) => update("signature", { sign_image_storage_path: path })}
          />
        </Section>

        {/* ── 4. Blanko: Margin & Font ── */}
        <Section
          title="Blanko Surat — Margin & Font"
          desc="Pengaturan kertas, font body, dan ukuran teks surat."
        >
          <div className="rounded-xl border border-border bg-muted/20 p-4 space-y-3">
            <p className="font-ui text-[10px] font-bold text-foreground uppercase tracking-wider">
              <FileText className="h-3 w-3 inline mr-1" />
              Margin Kertas (A4)
            </p>
            <Grid2>
              {(["top", "bottom", "left", "right"] as const).map((dir) => (
                <Field key={dir} label={dir.charAt(0).toUpperCase() + dir.slice(1)}>
                  <select
                    className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm focus-visible:outline-none focus:ring-2 focus:ring-primary/30"
                    value={pdfLayout.margin[dir]}
                    onChange={(e) => updateMargin(dir, e.target.value)}
                  >
                    {["15mm", "18mm", "20mm", "22mm", "25mm", "28mm", "30mm"].map((v) => (
                      <option key={v} value={v}>
                        {v}
                      </option>
                    ))}
                  </select>
                </Field>
              ))}
            </Grid2>
          </div>

          <div className="rounded-xl border border-border bg-muted/20 p-4 space-y-3">
            <p className="font-ui text-[10px] font-bold text-foreground uppercase tracking-wider">
              <Type className="h-3 w-3 inline mr-1" />
              Font Body Surat
            </p>
            <Grid2>
              <Field label="Font Family">
                <select
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm focus-visible:outline-none focus:ring-2 focus:ring-primary/30"
                  value={pdfLayout.body_font || "Arial, sans-serif"}
                  onChange={(e) =>
                    update("pdfLayout", {
                      body_font: e.target.value,
                      body_font_size: pdfLayout.body_font_size ?? 11,
                    })
                  }
                >
                  <option value="Arial, sans-serif">Arial (Sans-Serif)</option>
                  <option value="Times New Roman, serif">Times New Roman (Serif)</option>
                  <option value="Georgia, serif">Georgia (Serif)</option>
                  <option value="Verdana, sans-serif">Verdana (Sans-Serif)</option>
                  <option value="Tahoma, sans-serif">Tahoma (Sans-Serif)</option>
                </select>
              </Field>
              <Field label="Ukuran Font">
                <select
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm focus-visible:outline-none focus:ring-2 focus:ring-primary/30"
                  value={pdfLayout.body_font_size ?? 11}
                  onChange={(e) => update("pdfLayout", { body_font_size: Number(e.target.value) })}
                >
                  {[9, 10, 11, 12, 13, 14].map((v) => (
                    <option key={v} value={v}>
                      {v}pt {v === 11 ? "— Normal" : v < 11 ? "— Kecil" : "— Besar"}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Line Height">
                <select
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm focus-visible:outline-none focus:ring-2 focus:ring-primary/30"
                  value={pdfLayout.font.lineHeight}
                  onChange={(e) => updateFont("lineHeight", e.target.value)}
                >
                  {[
                    { v: "1.0", l: "1.0 — Padat" },
                    { v: "1.2", l: "1.2 — Normal" },
                    { v: "1.5", l: "1.5 — Sedang" },
                    { v: "1.8", l: "1.8 — Luas" },
                    { v: "2.0", l: "2.0 — Sangat Luas" },
                  ].map(({ v, l }) => (
                    <option key={v} value={v}>
                      {l}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Font Heading (Kop)">
                <select
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm focus-visible:outline-none focus:ring-2 focus:ring-primary/30"
                  value={pdfLayout.font.family}
                  onChange={(e) => updateFont("family", e.target.value)}
                >
                  <option value="Arial, sans-serif">Arial — Default</option>
                  <option value="Times New Roman, serif">Times New Roman (Serif)</option>
                  <option value="Georgia, serif">Georgia (Serif)</option>
                </select>
              </Field>
            </Grid2>
          </div>
        </Section>

        {/* ── 5. Blanko: QR & TTD Position ── */}
        <Section
          title="Blanko Surat — QR & Posisi TTD"
          desc="Ukuran QR code dan jarak vertikal area tanda tangan."
        >
          <Grid2>
            <Field label="Lebar QR Code">
              <select
                className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm focus-visible:outline-none focus:ring-2 focus:ring-primary/30"
                value={pdfLayout.signaturePos.qrWidth}
                onChange={(e) => updateSigPos("qrWidth", e.target.value)}
              >
                {["50px", "60px", "70px", "80px", "90px", "100px", "120px"].map((v) => (
                  <option key={v} value={v}>
                    {v}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Jarak Vertikal TTD">
              <select
                className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm focus-visible:outline-none focus:ring-2 focus:ring-primary/30"
                value={pdfLayout.signaturePos.marginY}
                onChange={(e) => updateSigPos("marginY", e.target.value)}
              >
                {["0.5rem", "1rem", "1.5rem", "2rem", "2.5rem", "3rem"].map((v) => (
                  <option key={v} value={v}>
                    {v}
                  </option>
                ))}
              </select>
            </Field>
          </Grid2>
        </Section>
      </div>

      {/* ── LIVE PREVIEW PANEL (right) ── */}
      <div className="xl:w-[480px] shrink-0 xl:sticky xl:top-4 xl:self-start">
        <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
          {/* Preview header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/40">
            <div>
              <p className="font-ui text-sm font-semibold flex items-center gap-1.5">
                <LayoutTemplate className="h-4 w-4" />
                Preview Surat
              </p>
              <p className="font-ui text-[10px] text-muted-foreground mt-0.5">
                SKTM · Perubahan langsung terlihat
              </p>
            </div>
            <span className="font-ui text-[10px] bg-primary/10 text-primary px-2 py-1 rounded-full font-semibold">
              LIVE
            </span>
          </div>

          {/* Preview area — scrollable */}
          <div className="overflow-auto bg-muted/20 p-3 max-h-[720px]">
            {/* A4 ratio container */}
            <div
              className="mx-auto"
              style={{
                width: 200,
                minHeight: 282,
                backgroundColor: "#fff",
                boxShadow: "0 2px 16px rgba(0,0,0,0.12)",
              }}
            >
              <LetterRenderer
                letter={renderedLetter}
                namaPemohon="TAJUDDIN MASHAR, S.Pd."
                primaryColor={primaryColor}
                isPrintMode={false}
              />
            </div>
          </div>

          {/* Info footer */}
          <div className="px-4 py-2.5 border-t border-border bg-muted/40">
            <p className="font-ui text-[10px] text-muted-foreground">
              Font: <strong>{bodyFont}</strong>, {bodyFontSize}pt. Margin: {pdfLayout.margin.top}/
              {pdfLayout.margin.right}/{pdfLayout.margin.bottom}/{pdfLayout.margin.left}. QR:{" "}
              {pdfLayout.signaturePos.qrWidth}.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
