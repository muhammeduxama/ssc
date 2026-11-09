import type { ReactNode } from "react";
export default function MechanicLayout({ children }: { children: ReactNode }) {
  return <div className="mechanic-workspace">{children}</div>;
}
