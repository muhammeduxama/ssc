export type InstallPrompt = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: "accepted" | "dismissed" }> };
let installPrompt: InstallPrompt | null = null;
export const getInstallPrompt = () => installPrompt;
export function captureInstallPrompt(event: Event) {
  event.preventDefault(); installPrompt = event as InstallPrompt;
  window.dispatchEvent(new Event("ssc-install-ready"));
}
export function clearInstallPrompt() { installPrompt = null; window.dispatchEvent(new Event("ssc-install-ready")); }
export async function registerPwa() {
  await navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" });
  return navigator.serviceWorker.ready;
}
let context: AudioContext | null = null;
export async function unlockSound() {
  context ??= new AudioContext();
  if (context.state === "suspended") await context.resume();
  return context;
}
export async function playChime() {
  try {
    const ctx = await unlockSound();
    if (ctx.state !== "running") return false;
    for (const [offset, frequency] of [[0, 660], [.14, 880]]) {
      const oscillator = ctx.createOscillator(); const gain = ctx.createGain();
      oscillator.type = "sine"; oscillator.frequency.value = frequency;
      gain.gain.setValueAtTime(0, ctx.currentTime + offset);
      gain.gain.linearRampToValueAtTime(.12, ctx.currentTime + offset + .02);
      gain.gain.exponentialRampToValueAtTime(.001, ctx.currentTime + offset + .24);
      oscillator.connect(gain); gain.connect(ctx.destination);
      oscillator.start(ctx.currentTime + offset); oscillator.stop(ctx.currentTime + offset + .25);
    }
    return true;
  } catch { return false; }
}
export function applicationKey(value: string) {
  const raw = atob(value.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat((4 - value.length % 4) % 4));
  return Uint8Array.from(raw, x => x.charCodeAt(0));
}
