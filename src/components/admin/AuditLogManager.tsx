import { useEffect, useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Search, User, Activity, Calendar, AlertCircle, RefreshCw } from "lucide-react";
import { listAudit } from "@/lib/settings-store";
import { formatDate } from "@/lib/utils";

export function AuditLogManager() {
  const [logs, setLogs] = useState<Awaited<ReturnType<typeof listAudit>>>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [error, setError] = useState<string | null>(null);

  const fetchLogs = async () => {
    setLoading(true);
    setError(null);
    try {
      const entries = await listAudit();
      setLogs(entries);
    } catch (err) {
      console.error("Audit fetch failed:", err);
      setError("Gagal memuat log audit.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const filtered = logs.filter(
    (l) =>
      l.user.toLowerCase().includes(query.toLowerCase()) ||
      l.action.toLowerCase().includes(query.toLowerCase()) ||
      (l.detail || "").toLowerCase().includes(query.toLowerCase()),
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4 sm:items-center sm:justify-between bg-card border border-border p-4 rounded-2xl shadow-card">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Cari berdasarkan user, aksi, atau detail..."
            className="pl-9 bg-background/50 rounded-xl"
          />
        </div>
        <button
          onClick={fetchLogs}
          disabled={loading}
          className="btn-pill bg-muted hover:bg-accent text-foreground flex items-center gap-2 px-4 py-2 text-sm transition-all"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Refresh Log
        </button>
      </div>

      {error ? (
        <div className="flex flex-col items-center justify-center py-12 px-4 text-center bg-destructive/5 rounded-3xl border border-destructive/20">
          <AlertCircle className="h-12 w-12 text-destructive mb-4" />
          <h3 className="font-display text-xl font-bold text-foreground">Gagal Memuat</h3>
          <p className="font-body text-muted-foreground mt-2 max-w-md">{error}</p>
        </div>
      ) : (
        <div className="rounded-3xl border border-border bg-card overflow-hidden shadow-card">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead className="w-[180px] font-ui font-bold">Waktu</TableHead>
                  <TableHead className="w-[150px] font-ui font-bold">User</TableHead>
                  <TableHead className="w-[150px] font-ui font-bold">Aksi</TableHead>
                  <TableHead className="font-ui font-bold">Detail</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell colSpan={4} className="h-16 animate-pulse bg-muted/20" />
                    </TableRow>
                  ))
                ) : filtered.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={4}
                      className="h-32 text-center text-muted-foreground font-body"
                    >
                      Tidak ada log yang ditemukan.
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((log) => (
                    <TableRow key={log.id} className="hover:bg-muted/30 transition-colors">
                      <TableCell className="font-mono text-xs text-muted-foreground whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-3 w-3" />
                          {formatDate(log.ts)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 font-ui font-semibold text-sm">
                          <div className="h-6 w-6 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                            <User className="h-3 w-3" />
                          </div>
                          {log.user}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-accent text-[10px] font-bold tracking-wider uppercase text-accent-foreground">
                          <Activity className="h-3 w-3" />
                          {log.action}
                        </span>
                      </TableCell>
                      <TableCell className="font-body text-sm text-foreground/80">
                        {log.detail ?? "-"}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      )}
    </div>
  );
}
