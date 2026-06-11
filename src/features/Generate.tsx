import { useEffect, useState } from "react";
import { Check, X, Sparkles } from "lucide-react";
import { useApp, useActiveSubject } from "../store/app";
import { generateQuestions, verifyQuestion, getProvider } from "../lib/llm";
import {
  insertDraft,
  listDrafts,
  approveDraft,
  rejectDraft,
  type DraftQuestion,
} from "../lib/questions";

export default function Generate() {
  const subject = useActiveSubject();
  const { modules } = useApp();
  const [moduleId, setModuleId] = useState<number | null>(null);
  const [source, setSource] = useState("");
  const [count, setCount] = useState(5);
  const [busy, setBusy] = useState(false);
  const [log, setLog] = useState<string>("");
  const [drafts, setDrafts] = useState<DraftQuestion[]>([]);

  useEffect(() => {
    if (modules.length && moduleId == null) setModuleId(modules[0].id);
  }, [modules, moduleId]);

  async function refresh() {
    if (subject) setDrafts(await listDrafts(subject.id));
  }
  useEffect(() => {
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subject?.id]);

  if (!subject) return <div className="p-6 text-muted">Nessuna materia attiva.</div>;

  const mod = modules.find((m) => m.id === moduleId);

  async function run() {
    if (!mod) return;
    if (source.trim().length < 80) {
      setLog("Incolla prima il testo-fonte del modulo (almeno qualche paragrafo).");
      return;
    }
    setBusy(true);
    setLog("Generazione in corso…");
    try {
      const provider = await getProvider();
      const gen = await generateQuestions(mod.name, source, count);
      setLog(`Generate ${gen.length} candidate. Verifico contro la fonte…`);
      let ok = 0;
      let skipped = 0;
      for (const g of gen) {
        const v = await verifyQuestion(g, source);
        if (!v.ok) {
          skipped++;
          continue;
        }
        const id = await insertDraft(
          subject!.id,
          mod!.id,
          subject!.code,
          mod!.code,
          g,
          provider,
          `verificata: ${v.reason}`.slice(0, 300),
        );
        if (id) ok++;
      }
      setLog(
        `Fatto. ${ok} domande verificate aggiunte come bozze, ${skipped} scartate dalla verifica. Approvale qui sotto.`,
      );
      await refresh();
    } catch (e: any) {
      setLog(`Errore: ${e?.message ?? e}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-5">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Sparkles size={22} className="text-accent" /> Genera domande
        </h1>
        <p className="text-muted mt-1">
          Le candidate vengono verificate contro la fonte e finiscono in bozza: nessuna entra nel
          pool finché non la approvi. Configura il provider in Impostazioni.
        </p>
      </div>

      <div className="bg-card border border-line rounded-2xl p-5 space-y-4">
        <div className="flex gap-3 flex-wrap items-end">
          <label className="text-sm">
            <div className="text-muted mb-1">Modulo</div>
            <select
              value={moduleId ?? ""}
              onChange={(e) => setModuleId(Number(e.target.value))}
              className="bg-card-2 border border-line rounded-lg px-3 py-2 text-ink"
            >
              {modules.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.code} — {m.name}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            <div className="text-muted mb-1">Quante</div>
            <input
              type="number"
              min={1}
              max={15}
              value={count}
              onChange={(e) => setCount(Math.max(1, Math.min(15, Number(e.target.value))))}
              className="bg-card-2 border border-line rounded-lg px-3 py-2 text-ink w-20"
            />
          </label>
        </div>

        <label className="text-sm block">
          <div className="text-muted mb-1">
            Testo-fonte del modulo (incolla dallo speed review / appunti)
          </div>
          <textarea
            value={source}
            onChange={(e) => setSource(e.target.value)}
            rows={8}
            placeholder="Incolla qui il contenuto del modulo da cui generare le domande…"
            className="w-full bg-card-2 border border-line rounded-lg px-3 py-2 text-ink text-sm font-mono"
          />
        </label>

        <button
          onClick={run}
          disabled={busy}
          className="bg-accent text-white rounded-xl px-5 py-2.5 font-semibold hover:brightness-110 disabled:opacity-50"
        >
          {busy ? "Lavoro…" : "Genera e verifica"}
        </button>
        {log && <p className="text-sm text-muted">{log}</p>}
      </div>

      <div className="bg-card border border-line rounded-2xl p-5">
        <div className="font-semibold mb-3">
          Bozze da approvare {drafts.length > 0 && <span className="text-muted">({drafts.length})</span>}
        </div>
        {drafts.length === 0 ? (
          <p className="text-muted text-sm">Nessuna bozza in attesa.</p>
        ) : (
          <ul className="space-y-4">
            {drafts.map((d) => (
              <li key={d.id} className="border border-line rounded-xl p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="text-sm">
                    <span className="text-xs font-bold text-faint">
                      {d.moduleCode} · diff {d.difficulty} · {d.origin}
                    </span>
                    <div className="font-medium mt-1">{d.text}</div>
                    <ul className="mt-2 space-y-1">
                      {d.options.map((o) => (
                        <li
                          key={o.id}
                          className={o.correct ? "text-green" : "text-muted"}
                        >
                          {o.correct ? "✓ " : "• "}
                          {o.text}
                        </li>
                      ))}
                    </ul>
                    {d.explanation && (
                      <div className="text-faint text-xs mt-2">💡 {d.explanation}</div>
                    )}
                  </div>
                  <div className="flex flex-col gap-2 shrink-0">
                    <button
                      onClick={async () => {
                        await approveDraft(d.id);
                        await refresh();
                      }}
                      title="Approva"
                      className="bg-green/20 text-green border border-green/40 rounded-lg p-2 hover:bg-green/30"
                    >
                      <Check size={16} />
                    </button>
                    <button
                      onClick={async () => {
                        await rejectDraft(d.id);
                        await refresh();
                      }}
                      title="Scarta"
                      className="bg-red/15 text-red border border-red/40 rounded-lg p-2 hover:bg-red/25"
                    >
                      <X size={16} />
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
