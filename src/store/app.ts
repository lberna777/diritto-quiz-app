import { create } from "zustand";
import { getDb, getSetting, setSetting, type Subject, type Module } from "../lib/db";
import { ensureSeed } from "../lib/seed";

type AppState = {
  ready: boolean;
  error: string | null;
  subjects: Subject[];
  activeSubjectId: number | null;
  modules: Module[];
  init: () => Promise<void>;
  setActiveSubject: (id: number) => Promise<void>;
  reloadSubjects: () => Promise<void>;
};

export const useApp = create<AppState>((set, get) => ({
  ready: false,
  error: null,
  subjects: [],
  activeSubjectId: null,
  modules: [],

  init: async () => {
    try {
      await ensureSeed();
      const db = await getDb();
      const subjects = await db.select<Subject[]>(
        "SELECT * FROM subjects WHERE is_active = 1 ORDER BY created_at ASC",
      );
      const saved = await getSetting("active_subject_id", "");
      let activeId = saved ? Number(saved) : subjects[0]?.id ?? null;
      if (activeId && !subjects.some((s) => s.id === activeId)) {
        activeId = subjects[0]?.id ?? null;
      }
      let modules: Module[] = [];
      if (activeId) {
        modules = await db.select<Module[]>(
          "SELECT * FROM modules WHERE subject_id = ? ORDER BY position ASC",
          [activeId],
        );
      }
      set({ ready: true, subjects, activeSubjectId: activeId, modules });
    } catch (e: any) {
      set({ ready: true, error: e?.message ?? String(e) });
    }
  },

  setActiveSubject: async (id: number) => {
    const db = await getDb();
    const modules = await db.select<Module[]>(
      "SELECT * FROM modules WHERE subject_id = ? ORDER BY position ASC",
      [id],
    );
    await setSetting("active_subject_id", String(id));
    set({ activeSubjectId: id, modules });
  },

  reloadSubjects: async () => {
    const db = await getDb();
    const subjects = await db.select<Subject[]>(
      "SELECT * FROM subjects WHERE is_active = 1 ORDER BY created_at ASC",
    );
    set({ subjects });
    const { activeSubjectId } = get();
    if (!activeSubjectId && subjects[0]) {
      await get().setActiveSubject(subjects[0].id);
    }
  },
}));

export function useActiveSubject(): Subject | null {
  const { subjects, activeSubjectId } = useApp();
  return subjects.find((s) => s.id === activeSubjectId) ?? null;
}
