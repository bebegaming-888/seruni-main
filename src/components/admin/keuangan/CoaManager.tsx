import React, { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, Plus, ChevronRight, Pencil, Trash2, Home } from "lucide-react";
import { initKeuanganCoaStore, listCoa, type KeuanganCoa } from "@/lib/keuangan-store";
import { toast } from "sonner";

export function CoaManager() {
  const [coaList, setCoaList] = useState<KeuanganCoa[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | "income" | "expense">("all");

  useEffect(() => {
    async function init() {
      setLoading(true);
      await initKeuanganCoaStore();
      setCoaList(listCoa());
      setLoading(false);
    }
    init();
  }, []);

  const filtered = coaList.filter((c) => {
    const q = search.toLowerCase();
    const matchesSearch =
      !q || c.code.toLowerCase().includes(q) || c.name.toLowerCase().includes(q);
    const matchesType = typeFilter === "all" || c.type === typeFilter;
    return matchesSearch && matchesType;
  });

  // Build a tree: roots are items with no parent_code
  const roots = filtered.filter((c) => !c.parent_code);
  const getChildren = (code: string) => filtered.filter((c) => c.parent_code === code);

  const renderRow = (coa: KeuanganCoa, depth: number = 0): React.ReactElement => {
    const children = getChildren(coa.code);
    const isParent = children.length > 0;
    const isIncome = coa.type === "income";
    return (
      <>
        <tr key={coa.id} className="border-b hover:bg-muted/50">
          <td className="py-2 px-3">
            <div className="flex items-center gap-2" style={{ paddingLeft: `${depth * 24 + 8}px` }}>
              {!isParent && <div className="w-4" />}
              <code className="text-xs bg-muted px-2 py-0.5 rounded font-mono">{coa.code}</code>
            </div>
          </td>
          <td className="py-2 px-3">
            <span className={depth > 0 ? "text-muted-foreground" : "font-medium"}>{coa.name}</span>
          </td>
          <td className="py-2 px-3">
            <Badge variant={isIncome ? "default" : "destructive"}>
              {isIncome ? "Pendapatan" : "Belanja"}
            </Badge>
          </td>
          <td className="py-2 px-3 text-center">
            {isParent ? (
              <span className="text-xs text-muted-foreground">{children.length} anak</span>
            ) : (
              <span className="text-xs text-muted-foreground">—</span>
            )}
          </td>
        </tr>
        {children.map((child) => renderRow(child, depth + 1))}
      </>
    );
  };

  if (loading) {
    return <div className="text-center py-12 text-muted-foreground">Memuat COA...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Cari kode atau nama akun..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-md border border-input bg-background text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>
        <div className="flex gap-2">
          {(["all", "income", "expense"] as const).map((t) => (
            <Button
              key={t}
              variant={typeFilter === t ? "default" : "outline"}
              size="sm"
              onClick={() => setTypeFilter(t)}
            >
              {t === "all" ? "Semua" : t === "income" ? "Pendapatan" : "Belanja"}
            </Button>
          ))}
        </div>
      </div>

      <Card className="p-5">
        <div className="text-sm text-muted-foreground mb-3">
          {filtered.length} akun COA ditemukan
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b text-sm text-muted-foreground">
                <th className="text-left py-2 px-3">Kode</th>
                <th className="text-left py-2 px-3">Nama Akun</th>
                <th className="text-left py-2 px-3">Tipe</th>
                <th className="text-center py-2 px-3">Sub-akun</th>
              </tr>
            </thead>
            <tbody>{roots.map((r) => renderRow(r))}</tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
