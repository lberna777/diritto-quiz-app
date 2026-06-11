import React from "react";
import ReactDOM from "react-dom/client";
import { HashRouter } from "react-router-dom";
import App from "./App";
import "./index.css";

class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { error: Error | null }
> {
  state = { error: null };
  static getDerivedStateFromError(error: Error) {
    return { error };
  }
  render() {
    if (this.state.error) {
      const e = this.state.error as Error;
      return (
        <div
          style={{
            padding: 32,
            fontFamily: "monospace",
            color: "#e8eaf6",
            background: "#0f1220",
            minHeight: "100vh",
          }}
        >
          <h2 style={{ color: "#ff6b6b" }}>Errore — copia e invia per debug:</h2>
          <pre style={{ whiteSpace: "pre-wrap", marginTop: 16, fontSize: 13 }}>
            {e?.message}
            {"\n\n"}
            {e?.stack}
          </pre>
        </div>
      );
    }
    return this.props.children;
  }
}

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <ErrorBoundary>
      <HashRouter>
        <App />
      </HashRouter>
    </ErrorBoundary>
  </React.StrictMode>,
);
