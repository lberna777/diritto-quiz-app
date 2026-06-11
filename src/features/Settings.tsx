import { useEffect, useState } from "react";
import { getSetting, setSetting, getDb } from "../lib/db";
import { pingProvider, type Provider } from "../lib/llm";
import { useApp, useActiveSubject } from "../store/app";
import { countActive } from "../lib/questions";

export default function Settings() {
  const subject = useActiveSubject();
  const { reloadSubjects, setActiveSubject } = useApp();

  const [provider, setProvider] = useState<Provider>("grok");
  const [grokKey, setGrokKey] = useState("");
  const [grokModel, setGrokModel] = useState("grok-3");
  const [ollamaHost, setOllamaHost] = useState("http://localhost:11434");
  const [ollamaModel, setOllamaModel] = useState("llama3.1:8b");
  const [ping, setPing] = useState<string>("");
  const [saved, setSaved] = useState(false);
  const [poolCount, setPoolCount] = useState(0);

  // nuova materia
  const [nsName, setNsName] = useState("");
  const [nsN, setNsN] = useState(22);
  const [nsTimer, setNsTimer] = useState(45);
  const [nsMsg, setNsMsg] = useState("");

  useEffect(() => {
    void (async () => {
      setProvider(((await getSetting("llm_provider", "grok")) as Provider) || "grok");
      setGrokKey(await getSetting("grok_api_key", ""));
      setGrokModel(await getSetting("grok_model", "grok-3"));
      setOllamaHost(await getSetting("ollama_host", "http://localhost:11434"));
      setOllamaModel(await getSetting("ollama_model", "llama3.1:8b"));
      if (subject) setPoolCount(await countActive(subject.id));
    })();
  }, [subject?.id]);

  async function save() {
    await setSetting("llm_provider", provider);
    await setSetting("grok_api_key", grokKey.trim());
    await setSetting("grok_model", grokModel.trim());
    await setSetting("ollama_host", ollamaHost.trim());
    await setSetting("ollama_model", ollamaModel.trim());
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  }

  async function test() {
    setPing("Provo…");
    await save();
    const r = await pingProvider();
    setPing(r.ok ? "✓ Connessione ok" : `✗ ${r.error}`);
  }

  async function createSubject() {
    if (nsName.trim().length < 3) {
      setNsMsg("Inserisci un nome valido.");
      return;
    }
    const db = await getDb();
    const code = nsName
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
    const dup = await db.select<{ id: number }[]>("SELECT id FROM subjects WHERE code = ?", [code]);
    if (dup.length) {
      setNsMsg("Esiste già una materia con questo nome.");
      return;
    }
    const res = await db.execute(
      `INSERT INTO subjects (name, code, exam_n_questions, exam_timer_minutes) VALUES (?, ?, ?, ?)`,
      [nsName.trim(), code, nsN, nsTimer],
    );
    await reloadSubjects();
    await setActiveSubject(res.lastInsertId as number);
    setNsMsg(`Materia "${nsName}" creata e attivata. Aggiungi moduli e domande da "Genera domande".`);
    setNsName("");
  }

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-5">
      <h1 className="text-2xl font-bold">Impostazioni</h1>

      <div className="bg-card border border-line rounded-2xl p-5 space-y-4">
        <div className="font-semibold">Provider AI (per generare domande)</div>

        <div className="flex gap-2">
          {(["grok", "ollama"] as Provider[]).map((p) => (
            <button
              key={p}
              onClick={() => setProvider(p)}
              className={`px-4 py-2 rounded-xl text-sm border capitalize transition ${
                provider === p
                  ? "bg-accent text-white border-accent"
                  : "bg-card-2 text-muted border-line hover:border-accent"
              }`}
            >
              {p === "grok" ? "Grok (xAI)" : "Ollama (locale)"}
            </button>
          ))}
        </div>

        {provider === "grok" ? (
          <>
            <Field label="API key Grok (xAI)">
              <input
                type="password"
                value={grokKey}
                onChange={(e) => setGrokKey(e.target.value)}
                placeholder="xai-…"
                className="w-full bg-card-2 border border-line rounded-lg px-3 py-2 text-ink text-sm"
              />
            </Field>
            <Field label="Modello">
              <input
                value={grokModel}
                onChange={(e) => setGrokModel(e.target.value)}
                className="w-full bg-card-2 border border-line rounded-lg px-3 py-2 text-ink text-sm"
              />
            </Field>
          </>
        ) : (
          <>
            <Field label="Host Ollama">
              <input
                value={ollamaHost}
                onChange={(e) => setOllamaHost(e.target.value)}
                className="w-full bg-card-2 border border-line rounded-lg px-3 py-2 text-ink text-sm"
              />
            </Field>
            <Field label="Modello">
              <input
                value={ollamaModel}
                onChange={(e) => setOllamaModel(e.target.value)}
                className="w-full bg-card-2 border border-line rounded-lg px-3 py-2 text-ink text-sm"
              />
            </Field>
          </>
        )}

        <div className="flex gap-3 items-center">
          <button
            onClick={save}
            className="bg-accent text-white rounded-xl px-5 py-2.5 font-semibold hover:brightness-110"
          >
            {saved ? "Salvato ✓" : "Salva"}
          </button>
          <button
            onClick={test}
            className="border border-line text-ink rounded-xl px-5 py-2.5 font-semibold hover:border-accent"
          >
            Test connessione
          </button>
          {ping && <span className="text-sm text-muted">{ping}</span>}
        </div>
      </div>

      <div className="bg-card border border-line rounded-2xl p-5 space-y-3">
        <div className="font-semibold">Materia attiva</div>
        {subject ? (
          <p className="text-muted text-sm">
            {subject.name} — {poolCount} domande attive nel pool · {subject.exam_n_questions}{" "}
            domande/esame · timer {subject.exam_timer_minutes} min.
          </p>
        ) : (
          <p className="text-muted text-sm">Nessuna.</p>
        )}
      </div>

      <div className="bg-card border border-line rounded-2xl p-5 space-y-3">
        <div className="font-semibold">Nuova materia</div>
        <Field label="Nome">
          <input
            value={nsName}
            onChange={(e) => setNsName(e.target.value)}
            placeholder="es. Sicurezza Informatica T"
            className="w-full bg-card-2 border border-line rounded-lg px-3 py-2 text-ink text-sm"
          />
        </Field>
        <div className="flex gap-3">
          <Field label="Domande/esame">
            <input
              type="number"
              value={nsN}
              onChange={(e) => setNsN(Number(e.target.value))}
              className="w-28 bg-card-2 border border-line rounded-lg px-3 py-2 text-ink text-sm"
            />
          </Field>
          <Field label="Timer (min)">
            <input
              type="number"
              value={nsTimer}
              onChange={(e) => setNsTimer(Number(e.target.value))}
              className="w-28 bg-card-2 border border-line rounded-lg px-3 py-2 text-ink text-sm"
            />
          </Field>
        </div>
        <button
          onClick={createSubject}
          className="bg-accent text-white rounded-xl px-5 py-2.5 font-semibold hover:brightness-110"
        >
          Crea materia
        </button>
        {nsMsg && <p className="text-sm text-muted">{nsMsg}</p>}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block text-sm">
      <div className="text-muted mb-1">{label}</div>
      {children}
    </label>
  );
}
