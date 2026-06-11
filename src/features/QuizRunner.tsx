import { useEffect, useMemo, useRef, useState } from "react";
import type { RunQuestion, Subject, QuizMode } from "../lib/db";
import { fmtPts, grade, createSession, recordAnswer, finishSession } from "../lib/quiz";
import { updateSrs } from "../lib/srs";

type Props = {
  subject: Subject;
  mode: QuizMode;
  questions: RunQuestion[];
  timerMinutes: number;
  feedback: boolean;
  onDone: () => void;
  onRestart: () => void;
};

type Miss = { moduleCode: string; text: string; correct: string };

export default function QuizRunner({
  subject,
  mode,
  questions,
  timerMinutes,
  feedback,
  onDone,
  onRestart,
}: Props) {
  const total = questions.length;
  const [idx, setIdx] = useState(0);
  const [nCorrect, setNCorrect] = useState(0);
  const [nWrong, setNWrong] = useState(0);
  const [chosenId, setChosenId] = useState<number | null>(null);
  const [answered, setAnswered] = useState(false);
  const [misses, setMisses] = useState<Miss[]>([]);
  const [finished, setFinished] = useState(false);
  const [timeLeft, setTimeLeft] = useState(timerMinutes * 60);

  const sessionId = useRef<number | null>(null);
  const startedAt = useRef<number>(Date.now());
  const qStartedAt = useRef<number>(Date.now());
  const finishedRef = useRef(false);

  // crea la sessione una volta
  useEffect(() => {
    let cancelled = false;
    createSession(subject.id, mode, timerMinutes > 0).then((id) => {
      if (!cancelled) sessionId.current = id;
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // timer
  useEffect(() => {
    if (timerMinutes <= 0 || finished) return;
    const t = setInterval(() => {
      setTimeLeft((s) => {
        if (s <= 1) {
          clearInterval(t);
          void end();
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timerMinutes, finished]);

  const q = questions[idx];

  async function answer(optId: number, correct: boolean) {
    if (answered) return;
    setChosenId(optId);
    setAnswered(true);
    const spent = Math.round((Date.now() - qStartedAt.current) / 1000);
    if (correct) setNCorrect((n) => n + 1);
    else {
      setNWrong((n) => n + 1);
      const corr = q.options.find((o) => o.correct);
      setMisses((m) => [
        ...m,
        { moduleCode: q.moduleCode, text: q.text, correct: corr?.text ?? "" },
      ]);
    }
    if (sessionId.current != null) {
      await recordAnswer(sessionId.current, q.id, optId, correct, spent);
    }
    await updateSrs(q.id, correct);
  }

  function next() {
    if (idx < total - 1) {
      setIdx((i) => i + 1);
      setChosenId(null);
      setAnswered(false);
      qStartedAt.current = Date.now();
    } else {
      void end();
    }
  }

  async function end() {
    if (finishedRef.current) return;
    finishedRef.current = true;
    const dur = Math.round((Date.now() - startedAt.current) / 1000);
    if (sessionId.current != null) {
      await finishSession(sessionId.current, subject, total, nCorrectRef.current, nWrongRef.current, dur);
    }
    setFinished(true);
  }

  // ref mirrors per leggere conteggi aggiornati dentro end()
  const nCorrectRef = useRef(0);
  const nWrongRef = useRef(0);
  nCorrectRef.current = nCorrect;
  nWrongRef.current = nWrong;

  const score = nCorrect * subject.exam_points_correct + nWrong * subject.exam_points_wrong;
  const maxScore = total * subject.exam_points_correct;
  const timerStr = useMemo(() => {
    const m = Math.floor(timeLeft / 60);
    const s = timeLeft % 60;
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }, [timeLeft]);

  if (total === 0) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <div className="bg-card border border-line rounded-2xl p-8 text-center">
          <p className="text-muted">Nessuna domanda disponibile per questa selezione.</p>
          <button
            onClick={onDone}
            className="mt-4 bg-accent text-white rounded-xl px-5 py-2.5 font-semibold"
          >
            Torna indietro
          </button>
        </div>
      </div>
    );
  }

  if (finished) {
    const g = grade(nCorrect, total, subject.grade_scale_max);
    const pct = nCorrect / total;
    const msg =
      pct >= 0.9
        ? "Eccellente. Sei pronto."
        : pct >= 0.75
          ? "Buono. Rifinisci i moduli sbagliati."
          : pct >= 0.55
            ? "Sufficiente. Ripassa i punti deboli."
            : "Da consolidare. Rivedi i moduli sbagliati.";
    const byMod = misses.reduce<Record<string, number>>((acc, m) => {
      acc[m.moduleCode] = (acc[m.moduleCode] || 0) + 1;
      return acc;
    }, {});
    return (
      <div className="max-w-2xl mx-auto p-6">
        <div className="bg-card border border-line rounded-2xl p-8">
          <h1 className="text-2xl font-bold">Risultato</h1>
          <div className="text-5xl font-extrabold my-3">
            {fmtPts(score)} <span className="text-muted text-2xl">/ {fmtPts(maxScore)}</span>
          </div>
          <div className="flex gap-5 text-sm text-muted flex-wrap">
            <span>
              Corrette <b className="text-ink">{nCorrect}</b>/{total}
            </span>
            {mode === "exam" && (
              <span>
                Voto indicativo /{subject.grade_scale_max}: <b className="text-gold">{g}</b>
              </span>
            )}
          </div>
          <p className="text-muted mt-3">{msg}</p>

          <div className="mt-5 border-t border-line pt-4">
            {misses.length === 0 ? (
              <b className="text-green">Nessun errore. 🎯</b>
            ) : (
              <>
                <b className="text-ink">Moduli da ripassare:</b>{" "}
                <span className="text-muted">
                  {Object.entries(byMod)
                    .sort()
                    .map(([k, v]) => `${k} (${v})`)
                    .join(" · ")}
                </span>
                <ul className="mt-3 space-y-3">
                  {misses.map((m, i) => (
                    <li key={i} className="text-sm">
                      <span className="text-faint font-semibold">{m.moduleCode}</span> — {m.text}
                      <br />
                      <span className="text-green">✓ {m.correct}</span>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>

          <div className="flex gap-3 mt-6">
            <button
              onClick={onRestart}
              className="bg-accent text-white rounded-xl px-5 py-2.5 font-semibold hover:brightness-110"
            >
              Rifai (nuove domande)
            </button>
            <button
              onClick={onDone}
              className="border border-line text-ink rounded-xl px-5 py-2.5 font-semibold hover:border-accent"
            >
              Torna al menu
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-6">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-bold tracking-wide bg-card-2 text-accent px-2.5 py-1 rounded-full">
          {q.moduleCode}
        </span>
        {timerMinutes > 0 && (
          <span
            className={`font-bold tabular-nums ${timeLeft <= 300 ? "text-red" : "text-muted"}`}
          >
            {timerStr}
          </span>
        )}
      </div>
      <div className="h-2 bg-card-2 rounded-full overflow-hidden mb-3">
        <div
          className="h-full bg-accent transition-all"
          style={{ width: `${(idx / total) * 100}%` }}
        />
      </div>
      <div className="flex gap-5 text-sm text-muted flex-wrap mb-3">
        <span>
          Domanda <b className="text-ink">{idx + 1}</b>/{total}
        </span>
        <span>
          Punteggio <b className="text-ink">{fmtPts(score)}</b>
        </span>
        <span>
          Corrette <b className="text-green">{nCorrect}</b> · Errate{" "}
          <b className="text-red">{nWrong}</b>
        </span>
      </div>

      <div className="bg-card border border-line rounded-2xl p-6">
        <div className="text-lg font-semibold mb-4">{q.text}</div>
        <div className="space-y-2.5">
          {q.options.map((o) => {
            let cls =
              "w-full text-left bg-card-2 border border-line rounded-xl px-4 py-3 transition";
            if (answered) {
              if (o.correct) cls += " border-green bg-green/15";
              else if (o.id === chosenId) cls += " border-red bg-red/15";
              else cls += " opacity-70";
            } else {
              cls += " hover:border-accent cursor-pointer";
            }
            return (
              <button
                key={o.id}
                disabled={answered}
                onClick={() => answer(o.id, o.correct)}
                className={cls}
              >
                {o.text}
              </button>
            );
          })}
        </div>

        {answered && feedback && q.explanation && (
          <div className="mt-4 bg-card-2 border-l-2 border-gold rounded-lg px-4 py-3 text-sm text-ink/90">
            💡 {q.explanation}
          </div>
        )}

        <div className="flex justify-end mt-5">
          <button
            disabled={!answered}
            onClick={next}
            className="bg-accent text-white rounded-xl px-5 py-2.5 font-semibold disabled:opacity-40 hover:brightness-110"
          >
            {idx === total - 1 ? "Vedi risultato" : "Prossima"}
          </button>
        </div>
      </div>
    </div>
  );
}
