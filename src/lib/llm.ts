import { getSetting } from "./db";

export type Provider = "grok" | "ollama";

export type GenQuestion = {
  q: string;
  o: string[]; // prima = corretta
  e: string;
  d?: number;
};

const GROK_BASE = "https://api.x.ai/v1";

export async function getProvider(): Promise<Provider> {
  return ((await getSetting("llm_provider", "grok")) as Provider) || "grok";
}

async function chat(
  messages: { role: string; content: string }[],
  opts: { json?: boolean } = {},
): Promise<string> {
  const provider = await getProvider();
  if (provider === "ollama") {
    const host = await getSetting("ollama_host", "http://localhost:11434");
    const model = await getSetting("ollama_model", "llama3.1:8b");
    const r = await fetch(`${host}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        messages,
        stream: false,
        format: opts.json ? "json" : undefined,
        options: { temperature: 0.4 },
      }),
    });
    if (!r.ok) throw new Error(`Ollama HTTP ${r.status}: ${(await r.text()).slice(0, 160)}`);
    const data = await r.json();
    return data.message?.content ?? "";
  }
  // grok (xAI, OpenAI-compatibile)
  const key = await getSetting("grok_api_key", "");
  if (!key) throw new Error("Manca la API key Grok. Vai su Impostazioni.");
  const model = await getSetting("grok_model", "grok-3");
  const r = await fetch(`${GROK_BASE}/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.4,
      response_format: opts.json ? { type: "json_object" } : undefined,
    }),
  });
  if (!r.ok) throw new Error(`Grok HTTP ${r.status}: ${(await r.text()).slice(0, 160)}`);
  const data = await r.json();
  return data.choices?.[0]?.message?.content ?? "";
}

export async function pingProvider(): Promise<{ ok: boolean; error?: string }> {
  try {
    const out = await chat([{ role: "user", content: "Rispondi solo: ok" }]);
    return { ok: out.toLowerCase().includes("ok") || out.length > 0 };
  } catch (e: any) {
    return { ok: false, error: e?.message ?? String(e) };
  }
}

function extractJson(s: string): any {
  // tollera ```json ... ``` o testo attorno
  const fence = s.match(/```(?:json)?\s*([\s\S]*?)```/);
  const raw = fence ? fence[1] : s;
  const start = raw.search(/[[{]/);
  if (start < 0) throw new Error("Nessun JSON trovato nella risposta.");
  return JSON.parse(raw.slice(start));
}

/** Genera domande MC per un modulo, ancorate al testo-fonte fornito. */
export async function generateQuestions(
  moduleName: string,
  sourceText: string,
  count: number,
): Promise<GenQuestion[]> {
  const sys =
    "Sei un docente di Diritto dell'Informatica che scrive quiz d'esame a risposta multipla " +
    "per studenti di ingegneria. Le domande devono essere DIFFICILI (no banalità), con 3 opzioni " +
    "di cui UNA sola corretta e due distrattori plausibili (parafrasi che invertono un dettaglio). " +
    "Usa SOLO informazioni presenti nel materiale fornito: non inventare articoli o numeri.";
  const user = `Materiale del modulo "${moduleName}":\n\n${sourceText}\n\n` +
    `Scrivi ${count} domande nuove e non banali basate SOLO su questo materiale. ` +
    `Rispondi in JSON con questa forma esatta:\n` +
    `{"questions":[{"q":"testo","o":["OPZIONE CORRETTA","distrattore1","distrattore2"],"e":"spiegazione breve","d":4}]}\n` +
    `La PRIMA opzione di ogni domanda è sempre quella corretta. "d" è la difficoltà 1-5.`;
  const out = await chat(
    [
      { role: "system", content: sys },
      { role: "user", content: user },
    ],
    { json: true },
  );
  const parsed = extractJson(out);
  const arr: GenQuestion[] = parsed.questions ?? parsed;
  return arr.filter(
    (x) => x && typeof x.q === "string" && Array.isArray(x.o) && x.o.length >= 2,
  );
}

/** Verifica una domanda contro il materiale-fonte. Ritorna ok + motivo. */
export async function verifyQuestion(
  qn: GenQuestion,
  sourceText: string,
): Promise<{ ok: boolean; reason: string }> {
  const sys =
    "Sei un revisore severo di quiz giuridici. Devi verificare se la risposta marcata come corretta " +
    "è davvero corretta e se i distrattori sono davvero errati, basandoti SOLO sul materiale fornito.";
  const user =
    `Materiale:\n${sourceText}\n\n` +
    `Domanda: ${qn.q}\n` +
    `Risposta marcata corretta: ${qn.o[0]}\n` +
    `Distrattori: ${qn.o.slice(1).join(" | ")}\n\n` +
    `Rispondi in JSON: {"ok": true/false, "reason": "spiegazione breve"}. ` +
    `ok=true solo se la risposta corretta è supportata dal materiale e i distrattori sono errati.`;
  try {
    const out = await chat(
      [
        { role: "system", content: sys },
        { role: "user", content: user },
      ],
      { json: true },
    );
    const parsed = extractJson(out);
    return { ok: !!parsed.ok, reason: parsed.reason ?? "" };
  } catch (e: any) {
    return { ok: false, reason: `Verifica fallita: ${e?.message ?? e}` };
  }
}
