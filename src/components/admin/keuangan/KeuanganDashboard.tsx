import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Wallet, Plus, Download } from "lucide-react";
import {
  formatRupiah,
  loadRingkasan,
  getRingkasan,
  type KeuanganRingkasan,
} from "@/lib/keuangan-store";

interface KeuanganDashboardProps {
  year?: number;
  onAddEntry?: () => void;
}

export function KeuanganDashboard({ year, onAddEntry }: KeuanganDashboardProps) {
  const [ringkasan, setRingkasan] = useState<KeuanganRingkasan | null>(null);
  const [loading, setLoading] = useState(true);
  const currentYear = year ?? new Date().getFullYear();

  useEffect(() => {
    async function load() {
      setLoading(true);
      await loadRingkasan(currentYear);
      setRingkasan(getRingkasan());
      setLoading(false);
    }
    load();
  }, [currentYear]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-muted-foreground">Memuat data keuangan...</div>
      </div>
    );
  }

  if (!ringkasan) {
    return (
      <Card className="p-8 text-center">
        <p className="text-muted-foreground mb-4">
          Belum ada data keuangan untuk tahun {currentYear}
        </p>
        <Button onClick={onAddEntry}>
          <Plus className="w-4 h-4 mr-2" />
          Tambah Transaksi Pertama
        </Button>
      </Card>
    );
  }

  const { totals } = ringkasan;
  const saldo = totals.saldo_akhir;
  const isSurplus = saldo >= 0;

  return (
    <div className="space-y-6">
      {/* Stat Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total Pendapatan</p>
              <p className="text-2xl font-bold text-green-600">
                {formatRupiah(totals.total_income)}
              </p>
            </div>
            <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total Belanja</p>
              <p className="text-2xl font-bold text-red-600">
                {formatRupiah(totals.total_expense)}
              </p>
            </div>
            <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
              <TrendingDown className="w-6 h-6 text-red-600" />
            </div>
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Saldo Akhir</p>
              <p
                className={`text-2xl font-bold ${isSurplus ? "text-blue-600" : "text-orange-600"}`}
              >
                {formatRupiah(Math.abs(saldo))}
              </p>
              <Badge variant={isSurplus ? "default" : "destructive"} className="mt-1">
                {isSurplus ? "Surplus" : "Defisit"}
              </Badge>
            </div>
            <div
              className={`w-12 h-12 rounded-full ${isSurplus ? "bg-blue-100" : "bg-orange-100"} flex items-center justify-center`}
            >
              <Wallet className={`w-6 h-6 ${isSurplus ? "text-blue-600" : "text-orange-600"}`} />
            </div>
          </div>
        </Card>
      </div>

      {/* Monthly Summary Table */}
      <Card className="p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Ringkasan Bulanan {currentYear}</h3>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={onAddEntry}>
              <Plus className="w-4 h-4 mr-2" />
              Tambah Transaksi
            </Button>
            <Button variant="outline" size="sm">
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2 px-3">Bulan</th>
                <th className="text-right py-2 px-3">Pendapatan</th>
                <th className="text-right py-2 px-3">Belanja</th>
                <th className="text-right py-2 px-3">Saldo</th>
              </tr>
            </thead>
            <tbody>
              {ringkasan.months.map((m) => {
                const monthName = new Date(currentYear, m.month - 1).toLocaleDateString("id-ID", {
                  month: "long",
                });
                const hasSaldo = m.saldo !== 0;
                return (
                  <tr key={m.month} className="border-b hover:bg-muted/50">
                    <td className="py-2 px-3 font-medium">{monthName}</td>
                    <td className="text-right py-2 px-3 text-green-600">
                      {formatRupiah(m.income)}
                    </td>
                    <td className="text-right py-2 px-3 text-red-600">{formatRupiah(m.expense)}</td>
                    <td
                      className={`text-right py-2 px-3 font-semibold ${hasSaldo ? (m.saldo > 0 ? "text-blue-600" : "text-orange-600") : ""}`}
                    >
                      {formatRupiah(m.saldo)}
                    </td>
                  </tr>
                );
              })}
              <tr className="font-bold bg-muted/30">
                <td className="py-3 px-3">TOTAL</td>
                <td className="text-right py-3 px-3 text-green-600">
                  {formatRupiah(totals.total_income)}
                </td>
                <td className="text-right py-3 px-3 text-red-600">
                  {formatRupiah(totals.total_expense)}
                </td>
                <td className={`py-3 px-3 ${isSurplus ? "text-blue-600" : "text-orange-600"}`}>
                  {formatRupiah(totals.saldo_akhir)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
