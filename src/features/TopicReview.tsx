import { useState } from "react";
import { useApp, useActiveSubject } from "../store/app";
import { pickQuestionIds, loadRunQuestions } from "../lib/quiz";
import type { RunQuestion } from "../lib/db";
import QuizRunner from "./QuizRunner";

const COUNTS = [10, 15, 22, 40];

export default function TopicReview() {
  const subject = useActiveSubject();
  const { modules } = useApp();
  const [selected, setSelected] = useState<number[]>([]);
  const [count, setCount] = useState(15);
  const [feedback, setFeedback] = useState(true);
  const [running, setRunning] = useState(false);
  const [questions, setQuestions] = useState<RunQuestion[]>([]);
  const [loading, setLoading] = useState(false);

  if (!subject) return <div className="p-6 text-muted">Nessuna materia attiva.</div>;

  function toggle(id: number) {
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  }

  async function start() {
    setLoading(true);
    const mods = selected.length ? selected : undefined;
    const ids = await pickQuestionIds(subject!.id, count, mods);
    const qs = await loadRunQuestions(ids);
    setQuestions(qs);
    setRunning(true);
    setLoading(false);
  }

  if (running) {
    return (
      <QuizRunner
        subject={subject}
        mode="topic"
        questions={questions}
        timerMinutes={0}
        feedback={feedback}
        onDone={() => setRunning(false)}
        onRestart={() => {
          setRunning(false);
          void start();
        }}
      />
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-6">
      <div className="bg-card border border-line rounded-2xl p-7">
        <h1 className="text-2xl font-bold">Ripasso per argomento</h1>
        <p className="text-muted mt-2">
          Scegli uno o più moduli (nessuno = tutti) e quante domande fare. Nessun timer.
        </p>

        <div className="mt-5 flex flex-wrap gap-2">
          {modules.map((m) => (
            <button
              key={m.id}
              onClick={() => toggle(m.id)}
              title={m.name}
              className={`px-3 py-1.5 rounded-full text-sm border transition ${
                selected.includes(m.id)
                  ? "bg-accent text-white border-accent"
                  : "bg-card-2 text-muted border-line hover:border-accent"
              }`}
            >
              {m.code}
            </button>
          ))}
        </div>
        {selected.length > 0 && (
          <p className="text-faint text-sm mt-2">
            {selected.length} modulo/i selezionati:{" "}
            {modules
              .filter((m) => selected.includes(m.id))
              .map((m) => m.name)
              .join(", ")}
          </p>
        )}

        <div className="mt-5">
          <div className="text-muted text-sm mb-2">Numero di domande</div>
          <div className="flex gap-2">
            {COUNTS.map((c) => (
              <button
                key={c}
                onClick={() => setCount(c)}
                className={`px-4 py-2 rounded-xl text-sm border transition ${
                  count === c
                    ? "bg-accent text-white border-accent"
                    : "bg-card-2 text-muted border-line hover:border-accent"
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        <label className="flex gap-2 items-center text-muted cursor-pointer mt-5">
          <input type="checkbox" checked={feedback} onChange={(e) => setFeedback(e.target.checked)} />
          Feedback immediato
        </label>

        <button
          onClick={start}
          disabled={loading}
          className="mt-6 bg-accent text-white rounded-xl px-6 py-3 font-semibold hover:brightness-110 disabled:opacity-50"
        >
          {loading ? "Carico…" : "Inizia ripasso"}
        </button>
      </div>
    </div>
  );
}
