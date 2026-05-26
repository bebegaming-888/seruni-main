import { useState } from "react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { KeuanganDashboard } from "./KeuanganDashboard";
import { KeuanganEntry } from "./KeuanganEntry";
import { CoaManager } from "./CoaManager";
import { Wallet, Plus, ListChecks, TrendingUp } from "lucide-react";

export function KeuanganMainView() {
  const [tab, setTab] = useState("dashboard");
  const [year] = useState(new Date().getFullYear());

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Keuangan APBDes</h1>
          <p className="text-muted-foreground text-sm">
            Tahun Anggaran {year} — Chart of Accounts (Permendes 4/2020)
          </p>
        </div>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="dashboard" className="gap-2">
            <TrendingUp className="w-4 h-4" />
            Dashboard
          </TabsTrigger>
          <TabsTrigger value="transaksi" className="gap-2">
            <Plus className="w-4 h-4" />
            Transaksi
          </TabsTrigger>
          <TabsTrigger value="coa" className="gap-2">
            <ListChecks className="w-4 h-4" />
            Chart of Accounts
          </TabsTrigger>
        </TabsList>

        <div className="mt-4">
          {tab === "dashboard" && <KeuanganDashboard year={year} />}
          {tab === "transaksi" && <KeuanganEntry year={year} />}
          {tab === "coa" && <CoaManager />}
        </div>
      </Tabs>
    </div>
  );
}
