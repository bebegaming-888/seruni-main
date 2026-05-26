/**
 * RichTextEditor — Quill WYSIWYG editor for berita content.
 * Client-side only (SSR-safe) using dynamic import.
 */
import React, { useEffect, useRef, useState } from "react";
import { Label } from "@/components/ui/label";
import { sanitizeHtml } from "@/lib/utils";

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

export default function RichTextEditor({
  value,
  onChange,
  placeholder,
  disabled,
}: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const quillRef = useRef<unknown>(null);
  const [ready, setReady] = useState(false);
  const isInternalUpdate = useRef(false);

  // Init Quill after mount (client-side only)
  useEffect(() => {
    if (typeof window === "undefined") return;
    let mounted = true;

    (async () => {
      const [Quill, quillStyles] = await Promise.all([
        import("quill"),
        import("quill/dist/quill.snow.css"),
      ]);

      if (!mounted || !editorRef.current || quillRef.current) return;

      const q = new Quill.default(editorRef.current, {
        theme: "snow",
        placeholder: placeholder ?? "Ketik konten berita di sini...",
        modules: {
          toolbar: [
            [{ header: [1, 2, 3, false] }],
            ["bold", "italic", "underline", "strike"],
            [{ list: "ordered" }, { list: "bullet" }],
            [{ align: [] }],
            ["link"],
            ["clean"],
          ],
        },
      });

      // Set initial value
      if (value) {
        q.root.innerHTML = value;
      }

      q.on("text-change", () => {
        if (!isInternalUpdate.current) {
          onChange(q.root.innerHTML);
        }
      });

      quillRef.current = q;
      setReady(true);
    })();

    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync external value changes (e.g. when editing existing berita)
  useEffect(() => {
    if (!ready || !quillRef.current) return;
    const q = quillRef.current as { root: { innerHTML: string } };
    const current = q.root.innerHTML;
    if (current !== value) {
      isInternalUpdate.current = true;
      q.root.innerHTML = value || "";
      isInternalUpdate.current = false;
    }
  }, [value, ready]);

  if (disabled) {
    return (
      <div className="rounded-xl border border-border bg-muted/30 p-4 min-h-[200px] prose prose-sm max-w-none text-sm">
        {value ? (
          <div dangerouslySetInnerHTML={{ __html: sanitizeHtml(value) }} />
        ) : (
          <span className="text-muted-foreground">Konten kosong</span>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      <Label className="font-ui text-xs font-semibold">Konten Berita (WYSIWYG)</Label>
      <div className="rounded-xl border border-border overflow-hidden [&_.ql-toolbar]:border-b [&_.ql-toolbar]:bg-muted/30 [&_.ql-container]:min-h-[200px] [&_.ql-container]:max-h-[400px] [&_.ql-container]:overflow-y-auto [&_.ql-snow_.ql-stroke]:stroke-muted-foreground [&_.ql-snow_.ql-fill]:fill-muted-foreground">
        <div ref={editorRef} />
      </div>
      <p className="font-body text-[11px] text-muted-foreground">
        Gunakan toolbar di atas untuk format teks, membuat daftar, atau menambahkan link.
      </p>
    </div>
  );
}
