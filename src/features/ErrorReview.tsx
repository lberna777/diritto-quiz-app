import { useEffect, useState } from "react";
import { useActiveSubject } from "../store/app";
import { loadRunQuestions } from "../lib/quiz";
import { dueCount, pickDueIds } from "../lib/srs";
import type { RunQuestion } from "../lib/db";
import QuizRunner from "./QuizRunner";

export default function ErrorReview() {
  const subject = useActiveSubject();
  const [due, setDue] = useState<number | null>(null);
  const [running, setRunning] = useState(false);
  const [questions, setQuestions] = useState<RunQuestion[]>([]);
  const [loading, setLoading] = useState(false);

  async function refresh() {
    if (!subject) return;
    setDue(await dueCount(subject.id));
  }

  useEffect(() => {
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subject?.id]);

  if (!subject) return <div className="p-6 text-muted">Nessuna materia attiva.</div>;

  async function start() {
    setLoading(true);
    const ids = await pickDueIds(subject!.id, 30);
    const qs = await loadRunQuestions(ids);
    setQuestions(qs);
    setRunning(true);
    setLoading(false);
  }

  if (running) {
    return (
      <QuizRunner
        subject={subject}
        mode="review"
        questions={questions}
        timerMinutes={0}
        feedback={true}
        onDone={() => {
          setRunning(false);
          void refresh();
        }}
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
        <h1 className="text-2xl font-bold">Ripassa gli errori</h1>
        <p className="text-muted mt-2">
          Spaced repetition (Leitner): qui finiscono solo le domande che hai{" "}
          <b className="text-ink">sbagliato</b>. Tornano subito, poi sempre più di rado man mano che
          le azzecchi (box 1→5). Quando le padroneggi escono dal ciclo.
        </p>

        <div className="mt-5 text-5xl font-extrabold">
          {due ?? "—"}
          <span className="text-muted text-xl font-semibold"> da ripassare ora</span>
        </div>

        {due === 0 ? (
          <p className="text-green mt-4">
            🎯 Niente in scadenza. Fai qualche simulazione o ripasso: gli errori finiranno qui.
          </p>
        ) : (
          <button
            onClick={start}
            disabled={loading || !due}
            className="mt-6 bg-accent text-white rounded-xl px-6 py-3 font-semibold hover:brightness-110 disabled:opacity-50"
          >
            {loading ? "Carico…" : "Inizia ripasso mirato"}
          </button>
        )}
      </div>
    </div>
  );
}
