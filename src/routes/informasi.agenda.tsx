import { createFileRoute } from "@tanstack/react-router";
import { Navbar } from "@/components/site/Navbar";
import { Footer } from "@/components/site/Footer";
import { VILLAGE } from "@/data/site";
import { AGENDA } from "@/data/site";
import { Calendar, MapPin, Clock, ChevronLeft, ChevronRight } from "lucide-react";
import { useState, useMemo } from "react";

export const Route = createFileRoute("/informasi/agenda")({
  head: () => ({
    meta: [
      { title: `Agenda Kegiatan — ${VILLAGE.name}` },
      {
        name: "description",
        content: `Jadwal kegiatan dan agenda ${VILLAGE.name}.`,
      },
    ],
  }),
  component: () => <AgendaPage />,
});

type AgendaItem = {
  id: number;
  day: string;
  month: string;
  title: string;
  time: string;
  location: string;
  category: string;
};

const KATEGORI_CONFIG: Record<string, { color: string; bg: string; icon: string }> = {
  Musyawarah: { color: "text-primary", bg: "bg-primary/10 border-primary/20", icon: "🤝" },
  Kesehatan: { color: "text-red-500", bg: "bg-red-50 border-red-200", icon: "💊" },
  Budaya: { color: "text-purple-600", bg: "bg-purple-50 border-purple-200", icon: "🎭" },
};

const ALL_AGENDA: AgendaItem[] = [
  {
    id: 1,
    day: "04",
    month: "JUN",
    title: "Musrenbangdes 2027",
    time: "08:30 – 12:00 WITA",
    location: "Balai Desa Seruni Mumbul",
    category: "Musyawarah",
  },
  {
    id: 2,
    day: "11",
    month: "JUN",
    title: "Posyandu Balita & Lansia",
    time: "09:00 – 11:00 WITA",
    location: "Posyandu Mawar",
    category: "Kesehatan",
  },
  {
    id: 3,
    day: "17",
    month: "JUN",
    title: "Festival Tenun Sasak 2026",
    time: "14:00 – 21:00 WITA",
    location: "Lapangan Desa",
    category: "Budaya",
  },
  {
    id: 4,
    day: "20",
    month: "JUN",
    title: "Rapat Bulanan BPD",
    time: "09:00 – 11:00 WITA",
    location: "Ruang Rapat BPD",
    category: "Musyawarah",
  },
  {
    id: 5,
    day: "25",
    month: "JUN",
    title: "Pelatihan Digital Marketing UMKM",
    time: "09:00 – 15:00 WITA",
    location: "Balai Desa Seruni Mumbul",
    category: "Musyawarah",
  },
  {
    id: 6,
    day: "28",
    month: "JUN",
    title: "Pemeriksaan Kesehatan Gratis",
    time: "08:00 – 14:00 WITA",
    location: "Puskesmas Pringgabaya",
    category: "Kesehatan",
  },
];

const MONTHS = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
];

const DAYS = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number) {
  return new Date(year, month, 1).getDay();
}

// Build EVENT_MAP dynamically from ALL_AGENDA using current date reference
function buildEventMap(): Record<string, AgendaItem[]> {
  const now = new Date();
  const year = now.getFullYear();
  const map: Record<string, AgendaItem[]> = {};
  ALL_AGENDA.forEach((item) => {
    const monthIdx = MONTHS.findIndex((m) => m === item.month);
    if (monthIdx === -1) return;
    const dateStr = `${year}-${String(monthIdx + 1).padStart(2, "0")}-${item.day.padStart(2, "0")}`;
    if (!map[dateStr]) map[dateStr] = [];
    map[dateStr].push(item);
  });
  return map;
}

function CalendarWidget({
  onDayClick,
}: {
  onDayClick: (date: string, events: AgendaItem[]) => void;
}) {
  const now = useMemo(() => new Date(), []);
  const [currentMonth, setCurrentMonth] = useState(now.getMonth());
  const [currentYear, setCurrentYear] = useState(now.getFullYear());
  const eventMap = useMemo(() => buildEventMap(), []);

  const daysInMonth = getDaysInMonth(currentYear, currentMonth);
  const firstDay = getFirstDayOfMonth(currentYear, currentMonth);
  const monthName = MONTHS[currentMonth];

  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const prevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear((y) => y - 1);
    } else setCurrentMonth((m) => m - 1);
  };
  const nextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear((y) => y + 1);
    } else setCurrentMonth((m) => m + 1);
  };

  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={prevMonth}
          className="h-7 w-7 rounded-lg hover:bg-muted/60 flex items-center justify-center transition-colors"
        >
          <ChevronLeft className="h-4 w-4 text-muted-foreground" />
        </button>
        <p className="font-display text-base font-bold text-ink">
          {monthName} {currentYear}
        </p>
        <button
          onClick={nextMonth}
          className="h-7 w-7 rounded-lg hover:bg-muted/60 flex items-center justify-center transition-colors"
        >
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        </button>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 mb-2">
        {DAYS.map((d) => (
          <div
            key={d}
            className="text-center font-ui text-[10px] font-semibold text-muted-foreground py-1"
          >
            {d}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-1">
        {cells.map((day, idx) => {
          if (!day) return <div key={`empty-${idx}`} />;
          const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
          const events = eventMap[dateStr] ?? [];
          const hasEvents = events.length > 0;
          const isToday =
            day === now.getDate() &&
            currentMonth === now.getMonth() &&
            currentYear === now.getFullYear();

          return (
            <button
              key={day}
              onClick={() => onDayClick(dateStr, events)}
              className={`relative flex h-9 w-full items-center justify-center rounded-lg font-ui text-xs transition-all hover:bg-primary/10 ${
                hasEvents ? "bg-primary/10 font-semibold text-primary" : "text-foreground"
              } ${isToday ? "ring-2 ring-primary ring-offset-1" : ""}`}
            >
              {day}
              {hasEvents && (
                <span className="absolute bottom-1 left-1/2 -translate-x-1/2 h-1 w-1 rounded-full bg-primary" />
              )}
            </button>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-3 mt-4 pt-3 border-t border-border/50">
        <div className="flex items-center gap-1.5">
          <div className="h-2 w-2 rounded-full bg-primary" />
          <span className="font-ui text-[10px] text-muted-foreground">Ada agenda</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-4 w-4 rounded border border-primary" />
          <span className="font-ui text-[10px] text-muted-foreground">Hari ini</span>
        </div>
      </div>
    </div>
  );
}

function AgendaCard({ item }: { item: AgendaItem }) {
  const cfg = KATEGORI_CONFIG[item.category] ?? KATEGORI_CONFIG.Musyawarah;
  return (
    <div className="group rounded-2xl border border-border bg-card p-4 hover:border-primary/30 hover:shadow-md transition-all duration-300">
      <div className="flex items-start gap-4">
        {/* Date badge */}
        <div className="shrink-0 flex flex-col items-center">
          <div className="flex h-14 w-14 flex-col items-center justify-center rounded-xl bg-primary/10 border border-primary/20">
            <span className="font-display text-xl font-bold text-primary leading-none">
              {item.day}
            </span>
            <span className="font-ui text-[10px] font-semibold text-primary/70 uppercase">
              {item.month}
            </span>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div
            className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 font-ui text-[10px] font-semibold mb-2 ${cfg.color} ${cfg.bg}`}
          >
            <span>{cfg.icon}</span>
            <span>{item.category}</span>
          </div>
          <h3 className="font-display text-sm font-bold text-ink leading-snug group-hover:text-primary transition-colors mb-2">
            {item.title}
          </h3>
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Clock className="h-3 w-3 shrink-0" />
              <span className="font-ui text-[11px]">{item.time}</span>
            </div>
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <MapPin className="h-3 w-3 shrink-0" />
              <span className="font-ui text-[11px]">{item.location}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function DayEventsPanel({
  date,
  events,
  onClose,
}: {
  date: string;
  events: AgendaItem[];
  onClose: () => void;
}) {
  if (events.length === 0) return null;
  const [year, month, day] = date.split("-");
  const monthName = MONTHS[parseInt(month) - 1];
  return (
    <div className="rounded-2xl border border-primary/30 bg-primary/5 p-4">
      <div className="flex items-center justify-between mb-3">
        <div>
          <p className="font-display text-sm font-bold text-ink">
            {day} {monthName}
          </p>
          <p className="font-ui text-[10px] text-muted-foreground">{events.length} agenda</p>
        </div>
        <button
          onClick={onClose}
          className="h-6 w-6 rounded-full bg-muted flex items-center justify-center font-ui text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          ✕
        </button>
      </div>
      <div className="space-y-2">
        {events.map((e) => (
          <AgendaCard key={e.id} item={e} />
        ))}
      </div>
    </div>
  );
}

export function AgendaPage() {
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedEvents, setSelectedEvents] = useState<AgendaItem[]>([]);
  const [filter, setFilter] = useState<string>("Semua");

  const categories = ["Semua", ...Object.keys(KATEGORI_CONFIG)];
  const filtered = ALL_AGENDA.filter((a) => filter === "Semua" || a.category === filter);

  const handleDayClick = (date: string, events: AgendaItem[]) => {
    setSelectedDate(date);
    setSelectedEvents(events);
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main>
        {/* Hero */}
        <section className="relative pt-32 pb-12 px-4 bg-gradient-to-br from-primary/5 via-background to-muted/30 overflow-hidden">
          <div className="max-w-5xl mx-auto relative">
            <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 border border-primary/20 px-3 py-1 font-ui text-xs font-semibold text-primary mb-5">
              <Calendar className="h-3.5 w-3.5" />
              Agenda Desa
            </div>
            <h1 className="font-display text-4xl sm:text-5xl font-bold text-ink mb-3">
              Kalender Kegiatan
            </h1>
            <p className="font-body text-muted-foreground max-w-xl text-base leading-relaxed mb-5">
              Jadwal kegiatan masyarakat {VILLAGE.name}. Klik tanggal pada kalender untuk melihat
              agenda hari tersebut.
            </p>
            <div className="flex flex-wrap gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-info/10 border border-info/20 px-3 py-1 font-ui text-xs font-semibold text-info">
                <Calendar className="h-3.5 w-3.5" />
                {ALL_AGENDA.length} Agenda Aktif
              </span>
            </div>
          </div>
        </section>

        {/* Content */}
        <section className="px-4 mb-16">
          <div className="max-w-5xl mx-auto">
            <div className="grid lg:grid-cols-[280px_1fr] gap-6">
              {/* Sidebar: Calendar + Filters */}
              <div className="space-y-4">
                <CalendarWidget onDayClick={handleDayClick} />

                {/* Filter */}
                <div className="rounded-2xl border border-border bg-card p-4">
                  <p className="font-ui text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                    Filter Kategori
                  </p>
                  <div className="space-y-1">
                    {categories.map((cat) => {
                      const cfg = cat !== "Semua" ? KATEGORI_CONFIG[cat] : null;
                      return (
                        <button
                          key={cat}
                          onClick={() => setFilter(cat)}
                          className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 font-ui text-xs font-semibold transition-all ${
                            filter === cat
                              ? cfg
                                ? `${cfg.color} ${cfg.bg}`
                                : "bg-primary text-primary-foreground"
                              : "text-muted-foreground hover:bg-muted/50"
                          }`}
                        >
                          {cfg && <span>{cfg.icon}</span>}
                          {cat}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Main: Events */}
              <div className="space-y-4">
                {/* Selected date events panel */}
                {selectedDate && selectedEvents.length > 0 && (
                  <DayEventsPanel
                    date={selectedDate}
                    events={selectedEvents}
                    onClose={() => {
                      setSelectedDate(null);
                      setSelectedEvents([]);
                    }}
                  />
                )}

                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-display text-xl font-bold text-ink">Daftar Agenda</h2>
                  <span className="font-ui text-xs text-muted-foreground">
                    {filtered.length} agenda
                  </span>
                </div>

                <div className="space-y-3">
                  {filtered.map((item) => (
                    <AgendaCard key={item.id} item={item} />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
