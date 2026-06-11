import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { GraduationCap, BookOpen, RefreshCw, BarChart3 } from "lucide-react";
import { useActiveSubject } from "../store/app";
import { getOverview, getModuleStats, type Overview, type ModuleStat } from "../lib/stats";
import { dueCount } from "../lib/srs";

export default function Dashboard() {
  const subject = useActiveSubject();
  const [ov, setOv] = useState<Overview | null>(null);
  const [mods, setMods] = useState<ModuleStat[]>([]);
  const [due, setDue] = useState(0);

  useEffect(() => {
    if (!subject) return;
    void (async () => {
      setOv(await getOverview(subject.id));
      setMods(await getModuleStats(subject.id));
      setDue(await dueCount(subject.id));
    })();
  }, [subject?.id]);

  if (!subject) return <div className="p-6 text-muted">Nessuna materia attiva.</div>;

  const weak = [...mods]
    .filter((m) => m.total >= 2 && m.accuracy >= 0)
    .sort((a, b) => a.accuracy - b.accuracy)
    .slice(0, 4);

  const cards = [
    { to: "/esame", icon: GraduationCap, title: "Simulazione esame", desc: `${subject.exam_n_questions} domande · timer` },
    { to: "/argomento", icon: BookOpen, title: "Ripasso per argomento", desc: "Scegli i moduli" },
    { to: "/errori", icon: RefreshCw, title: "Ripassa errori", desc: due ? `${due} in scadenza` : "Leitner SRS" },
    { to: "/statistiche", icon: BarChart3, title: "Statistiche", desc: "Andamento e trabocchetti" },
  ];

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-1">{subject.name}</h1>
      <p className="text-muted mb-6">Ripasso a quiz · {mods.length} moduli</p>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <Stat label="Quiz svolti" value={ov?.totalSessions ?? 0} />
        <Stat
          label="Accuratezza"
          value={ov ? `${Math.round(ov.accuracy * 100)}%` : "—"}
        />
        <Stat label="Ultimo voto" value={ov?.lastGrade ?? "—"} accent />
        <Stat label="Miglior voto" value={ov?.bestGrade ?? "—"} accent />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
        {cards.map((c) => (
          <Link
            key={c.to}
            to={c.to}
            className="bg-card border border-line rounded-2xl p-5 hover:border-accent transition flex items-center gap-4"
          >
            <div className="bg-card-2 rounded-xl p-3 text-accent">
              <c.icon size={24} />
            </div>
            <div>
              <div className="font-semibold">{c.title}</div>
              <div className="text-muted text-sm">{c.desc}</div>
            </div>
          </Link>
        ))}
      </div>

      {weak.length > 0 && (
        <div className="bg-card border border-line rounded-2xl p-5">
          <div className="font-semibold mb-3">Moduli più deboli</div>
          <div className="space-y-2">
            {weak.map((m) => (
              <div key={m.module_id} className="flex items-center gap-3">
                <span className="text-xs font-bold text-faint w-10">{m.code}</span>
                <div className="flex-1 h-2 bg-card-2 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-red"
                    style={{ width: `${Math.round(m.accuracy * 100)}%` }}
                  />
                </div>
                <span className="text-sm text-muted w-12 text-right">
                  {Math.round(m.accuracy * 100)}%
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: any; accent?: boolean }) {
  return (
    <div className="bg-card border border-line rounded-2xl p-4">
      <div className={`text-3xl font-extrabold ${accent ? "text-gold" : ""}`}>{value}</div>
      <div className="text-muted text-sm mt-1">{label}</div>
    </div>
  );
}
