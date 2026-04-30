import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { RunHistoryEntry } from '../lib/cookies';

interface RunHistoryState {
  history: RunHistoryEntry[];
  addRun: (entry: RunHistoryEntry) => void;
  deleteRun: (runId: string) => void;
  clearHistory: () => void;
  loadHistory: (entries: RunHistoryEntry[]) => void;
}

export const useRunHistory = create<RunHistoryState>()(
  persist(
    (set) => ({
      history: [],
      addRun: (entry) =>
        set((state) => ({
          history: [entry, ...state.history.filter((run) => run.runId !== entry.runId)].slice(0, 50),
        })),
      deleteRun: (runId) =>
        set((state) => ({
          history: state.history.filter((run) => run.runId !== runId),
        })),
      clearHistory: () => set({ history: [] }),
      loadHistory: (entries) => set({ history: entries }),
    }),
    { name: 'artisan-dap-run-history' }
  )
);
