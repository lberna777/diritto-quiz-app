import { useEffect } from "react";
import { Routes, Route } from "react-router-dom";
import { useApp } from "./store/app";
import Layout from "./components/Layout";
import Dashboard from "./features/Dashboard";
import ExamSim from "./features/ExamSim";
import TopicReview from "./features/TopicReview";
import ErrorReview from "./features/ErrorReview";
import Stats from "./features/Stats";
import Generate from "./features/Generate";
import Settings from "./features/Settings";
import { isTauri } from "./lib/env";

export default function App() {
  const { ready, error, init } = useApp();

  useEffect(() => {
    void init();
  }, [init]);

  if (!ready) {
    return (
      <div className="h-screen flex items-center justify-center text-muted">
        Caricamento…
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-screen flex items-center justify-center p-8">
        <div className="bg-card border border-red/40 rounded-2xl p-6 max-w-lg">
          <h2 className="text-red font-bold mb-2">Errore di avvio</h2>
          <pre className="text-sm text-muted whitespace-pre-wrap">{error}</pre>
        </div>
      </div>
    );
  }

  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Dashboard />} />
        <Route path="esame" element={<ExamSim />} />
        <Route path="argomento" element={<TopicReview />} />
        <Route path="errori" element={<ErrorReview />} />
        <Route path="statistiche" element={<Stats />} />
        {isTauri() && <Route path="genera" element={<Generate />} />}
        {isTauri() && <Route path="impostazioni" element={<Settings />} />}
      </Route>
    </Routes>
  );
}
