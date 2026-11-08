"use client";
import { useEffect } from "react";
import { captureInstallPrompt, clearInstallPrompt, registerPwa } from "@/lib/pwa/client";
export function PwaRegistration() {
  useEffect(() => {
    if (window.isSecureContext && "serviceWorker" in navigator) void registerPwa().catch(() => {});
    window.addEventListener("beforeinstallprompt", captureInstallPrompt);
    window.addEventListener("appinstalled", clearInstallPrompt);
    return () => { window.removeEventListener("beforeinstallprompt", captureInstallPrompt); window.removeEventListener("appinstalled", clearInstallPrompt); };
  }, []);
  return null;
}
