"use client";

import { create } from "zustand";

type AnnouncerState = {
  message: string;
  announce: (message: string) => void;
};

const useAnnouncerStore = create<AnnouncerState>((set) => ({
  message: "",
  announce: (message) => {
    // Clear first so repeating the same message is re-announced.
    set({ message: "" });
    setTimeout(() => set({ message }), 50);
  },
}));

export function announce(message: string) {
  useAnnouncerStore.getState().announce(message);
}

export function StatusAnnouncer() {
  const message = useAnnouncerStore((state) => state.message);

  return (
    <div aria-live="polite" role="status" className="sr-only">
      {message}
    </div>
  );
}
