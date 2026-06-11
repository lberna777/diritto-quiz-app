import { NavLink, Outlet } from "react-router-dom";
import {
  LayoutDashboard,
  GraduationCap,
  BookOpen,
  RefreshCw,
  BarChart3,
  Sparkles,
  Settings as SettingsIcon,
} from "lucide-react";
import { useApp } from "../store/app";

const NAV = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/esame", label: "Simulazione esame", icon: GraduationCap },
  { to: "/argomento", label: "Ripasso argomento", icon: BookOpen },
  { to: "/errori", label: "Ripassa errori", icon: RefreshCw },
  { to: "/statistiche", label: "Statistiche", icon: BarChart3 },
  { to: "/genera", label: "Genera domande", icon: Sparkles },
  { to: "/impostazioni", label: "Impostazioni", icon: SettingsIcon },
];

export default function Layout() {
  const { subjects, activeSubjectId, setActiveSubject } = useApp();

  return (
    <div className="flex h-screen">
      <aside className="w-60 shrink-0 bg-bg-2 border-r border-line flex flex-col">
        <div className="px-4 py-5 border-b border-line">
          <div className="font-extrabold text-lg tracking-tight">Diritto Quiz</div>
          <div className="text-faint text-xs">ripasso a quiz</div>
        </div>

        {subjects.length > 1 && (
          <div className="px-3 pt-3">
            <select
              value={activeSubjectId ?? ""}
              onChange={(e) => void setActiveSubject(Number(e.target.value))}
              className="w-full bg-card-2 border border-line rounded-lg px-2 py-2 text-sm text-ink"
            >
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
        )}

        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {NAV.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              end={n.end}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition ${
                  isActive
                    ? "bg-accent text-white font-semibold"
                    : "text-muted hover:bg-card hover:text-ink"
                }`
              }
            >
              <n.icon size={18} />
              {n.label}
            </NavLink>
          ))}
        </nav>

        <div className="p-3 text-faint text-xs border-t border-line">
          Esame: 16/06/2026 · in bocca al lupo
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
}
