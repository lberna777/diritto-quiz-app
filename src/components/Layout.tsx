import { NavLink, Outlet } from "react-router-dom";
import {
  LayoutDashboard,
  GraduationCap,
  BookOpen,
  RefreshCw,
  BarChart3,
  Sparkles,
  Settings as SettingsIcon,
  Scale,
} from "lucide-react";
import { useApp } from "../store/app";
import { isTauri } from "../lib/env";

const NAV = [
  { to: "/", label: "Home", icon: LayoutDashboard, end: true },
  { to: "/esame", label: "Esame", icon: GraduationCap },
  { to: "/argomento", label: "Argomento", icon: BookOpen },
  { to: "/errori", label: "Errori", icon: RefreshCw },
  { to: "/statistiche", label: "Statistiche", icon: BarChart3 },
  { to: "/genera", label: "Genera", icon: Sparkles, tauriOnly: true },
  { to: "/impostazioni", label: "Impostazioni", icon: SettingsIcon, tauriOnly: true },
];

export default function Layout() {
  const { subjects, activeSubjectId, setActiveSubject } = useApp();
  const active = subjects.find((s) => s.id === activeSubjectId);
  const nav = NAV.filter((n) => !n.tauriOnly || isTauri());

  return (
    <div className="min-h-screen flex flex-col">
      {/* App bar */}
      <header className="sticky top-0 z-20 backdrop-blur bg-bg/85 border-b border-line">
        <div className="max-w-5xl mx-auto px-5 pt-3.5 pb-0">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2.5">
              <div className="grid place-items-center w-9 h-9 rounded-xl bg-gradient-to-br from-accent to-[#9a7bff] text-white shadow-lg shadow-accent/20">
                <Scale size={18} />
              </div>
              <div className="leading-tight">
                <div className="font-extrabold tracking-tight">Diritto Quiz</div>
                <div className="text-faint text-[11px] -mt-0.5">
                  {active ? active.name : "ripasso a quiz"}
                </div>
              </div>
            </div>

            {subjects.length > 1 && (
              <select
                value={activeSubjectId ?? ""}
                onChange={(e) => void setActiveSubject(Number(e.target.value))}
                className="bg-card-2 border border-line rounded-lg px-3 py-1.5 text-sm text-ink"
              >
                {subjects.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Horizontal nav */}
          <nav className="flex gap-1 mt-3 -mb-px overflow-x-auto">
            {nav.map((n) => (
              <NavLink
                key={n.to}
                to={n.to}
                end={n.end}
                className={({ isActive }) =>
                  `flex items-center gap-1.5 px-3.5 py-2.5 text-sm whitespace-nowrap border-b-2 transition ${
                    isActive
                      ? "border-accent text-ink font-semibold"
                      : "border-transparent text-muted hover:text-ink"
                  }`
                }
              >
                <n.icon size={16} />
                {n.label}
              </NavLink>
            ))}
          </nav>
        </div>
      </header>

      <main className="flex-1">
        <Outlet />
      </main>
    </div>
  );
}
