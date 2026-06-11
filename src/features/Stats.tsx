import { useEffect, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
} from "recharts";
import { useActiveSubject } from "../store/app";
import {
  getModuleStats,
  getGradeTrend,
  getTraps,
  type ModuleStat,
  type GradePoint,
  type TrapRow,
} from "../lib/stats";

export default function Stats() {
  const subject = useActiveSubject();
  const [mods, setMods] = useState<ModuleStat[]>([]);
  const [trend, setTrend] = useState<GradePoint[]>([]);
  const [traps, setTraps] = useState<TrapRow[]>([]);

  useEffect(() => {
    if (!subject) return;
    void (async () => {
      setMods(await getModuleStats(subject.id));
      setTrend(await getGradeTrend(subject.id));
      setTraps(await getTraps(subject.id));
    })();
  }, [subject?.id]);

  if (!subject) return <div className="p-6 text-muted">Nessuna materia attiva.</div>;

  const modData = mods
    .filter((m) => m.total > 0)
    .map((m) => ({ name: m.code, acc: Math.round(m.accuracy * 100) }));

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-5">
      <h1 className="text-2xl font-bold">Statistiche</h1>

      <Panel title="Accuratezza per modulo">
        {modData.length === 0 ? (
          <Empty />
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={modData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2c3354" />
              <XAxis dataKey="name" stroke="#9aa3c4" fontSize={12} />
              <YAxis domain={[0, 100]} stroke="#9aa3c4" fontSize={12} unit="%" />
              <Tooltip
                contentStyle={{ background: "#1a1f35", border: "1px solid #2c3354", borderRadius: 10 }}
                labelStyle={{ color: "#e8eaf6" }}
              />
              <Bar dataKey="acc" fill="#6c8cff" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </Panel>

      <Panel title="Andamento voto (simulazioni)">
        {trend.length < 2 ? (
          <p className="text-muted text-sm">Servono almeno 2 simulazioni complete per il trend.</p>
        ) : (
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={trend}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2c3354" />
              <XAxis dataKey="idx" stroke="#9aa3c4" fontSize={12} />
              <YAxis domain={[0, subject.grade_scale_max]} stroke="#9aa3c4" fontSize={12} />
              <Tooltip
                contentStyle={{ background: "#1a1f35", border: "1px solid #2c3354", borderRadius: 10 }}
                labelStyle={{ color: "#e8eaf6" }}
              />
              <Line type="monotone" dataKey="grade" stroke="#ffce5a" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </Panel>

      <Panel title="Trabocchetti ricorrenti (domande più sbagliate)">
        {traps.length === 0 ? (
          <Empty />
        ) : (
          <ul className="space-y-3">
            {traps.map((t) => (
              <li key={t.question_id} className="text-sm">
                <span className="text-xs font-bold text-faint">{t.code}</span> — {t.text}
                <span className="text-red ml-2">
                  ({t.wrong}/{t.seen} errate)
                </span>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-card border border-line rounded-2xl p-5">
      <div className="font-semibold mb-4">{title}</div>
      {children}
    </div>
  );
}

function Empty() {
  return <p className="text-muted text-sm">Ancora nessun dato. Fai qualche quiz.</p>;
}
