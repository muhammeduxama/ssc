"use client";
import { createContext, useCallback, useContext, useState } from "react";

type T = { id: number; text: string; ok: boolean };
const ItemsCtx = createContext<T[]>([]);
const Ctx = createContext<(text: string, ok?: boolean) => void>(() => {});
export const useToast = () => useContext(Ctx);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<T[]>([]);
  const push = useCallback((text: string, ok = true) => {
    const id = Date.now() + Math.random();
    setItems((x) => [...x, { id, text, ok }]);
    setTimeout(() => setItems((x) => x.filter((i) => i.id !== id)), 3500);
  }, []);
  return (
    <Ctx.Provider value={push}>
      <ItemsCtx.Provider value={items}>
        {children}
        <ToastViewport />
      </ItemsCtx.Provider>
    </Ctx.Provider>
  );
}

export function ToastViewport() {
  const items = useContext(ItemsCtx);
  return (
      <div className="pointer-events-none fixed bottom-4 right-4 z-50 max-w-[calc(100vw-2rem)] flex flex-col gap-2" aria-live="polite">
        {items.map((i) => (
          <div key={i.id} className={`pointer-events-auto rounded-lg border px-4 py-3 text-sm font-medium shadow-card ${i.ok ? "border-brand bg-raised" : "border-danger bg-danger-soft"}`}>
            {i.text}
          </div>
        ))}
      </div>
  );
}
