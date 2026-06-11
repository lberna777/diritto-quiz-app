import { useState } from "react";
import { useActiveSubject } from "../store/app";
import { pickQuestionIds, loadRunQuestions } from "../lib/quiz";
import type { RunQuestion } from "../lib/db";
import QuizRunner from "./QuizRunner";

export default function ExamSim() {
  const subject = useActiveSubject();
  const [feedback, setFeedback] = useState(true);
  const [useTimer, setUseTimer] = useState(true);
  const [running, setRunning] = useState(false);
  const [questions, setQuestions] = useState<RunQuestion[]>([]);
  const [loading, setLoading] = useState(false);

  if (!subject) return <div className="p-6 text-muted">Nessuna materia attiva.</div>;

  async function start() {
    setLoading(true);
    const ids = await pickQuestionIds(subject!.id, subject!.exam_n_questions);
    const qs = await loadRunQuestions(ids);
    setQuestions(qs);
    setRunning(true);
    setLoading(false);
  }

  if (running) {
    return (
      <QuizRunner
        subject={subject}
        mode="exam"
        questions={questions}
        timerMinutes={useTimer ? subject.exam_timer_minutes : 0}
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
        <h1 className="text-2xl font-bold">Simulazione d'esame</h1>
        <p className="text-muted mt-2">
          {subject.exam_n_questions} quiz a scelta multipla · {subject.exam_n_options} opzioni, 1
          corretta · <b className="text-ink">{subject.exam_points_correct.toString().replace(".", ",")} punti</b> a
          risposta giusta, <b className="text-ink">{subject.exam_points_wrong}</b> alle errate ·{" "}
          {subject.exam_timer_minutes} minuti.
          <br />
          Le domande sono pescate a caso e cambiano a ogni avvio.
        </p>

        <div className="mt-5 space-y-2.5">
          <label className="flex gap-2 items-center text-muted cursor-pointer">
            <input type="checkbox" checked={feedback} onChange={(e) => setFeedback(e.target.checked)} />
            Feedback immediato (mostra la spiegazione dopo ogni risposta)
          </label>
          <label className="flex gap-2 items-center text-muted cursor-pointer">
            <input type="checkbox" checked={useTimer} onChange={(e) => setUseTimer(e.target.checked)} />
            Timer {subject.exam_timer_minutes} minuti
          </label>
        </div>

        <button
          onClick={start}
          disabled={loading}
          className="mt-6 bg-accent text-white rounded-xl px-6 py-3 font-semibold hover:brightness-110 disabled:opacity-50"
        >
          {loading ? "Carico…" : "Inizia simulazione"}
        </button>
      </div>
    </div>
  );
}
