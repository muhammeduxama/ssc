"use client";
import { FloatingPanel } from "@/components/FloatingPanel";
import { BellRing, Download, Volume2, VolumeX, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useToast } from "@/components/Toast";
import { applicationKey, getInstallPrompt, playChime, registerPwa, unlockSound } from "@/lib/pwa/client";

type Alert = { id: string; title: string; body: string; url: string; account?: string };
type Config = { ready: boolean; publicKey: string | null; subscribed: boolean; account: string };
export function AppAlerts({ accountKey }: { accountKey: string }) {
  const [open, setOpen] = useState(false);
  const [config, setConfig] = useState<Config | null>(null);
  const [sound, setSound] = useState(false);
  const [busy, setBusy] = useState(false);
  const [supported, setSupported] = useState(false);
  const [installed, setInstalled] = useState(false);
  const [installable, setInstallable] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [recent, setRecent] = useState<Alert[]>([]);
  const [unread, setUnread] = useState(0);
  const soundRef = useRef(false);
  const cursor = useRef<string | null>(null);
  const toast = useToast(); const router = useRouter();
  const control = useRef<HTMLButtonElement>(null);
  const pref = `ssc-sound:${accountKey}`;

  useEffect(() => {
    let stopped = false; let timer: ReturnType<typeof setTimeout>;
    cursor.current = null;
    const isSoundOn = () => { try { return localStorage.getItem(pref) === "on"; } catch { return false; } };
    const poll = async () => {
      if (stopped) return;
      try {
        if (document.visibilityState === "visible") {
          const res = await fetch(`/api/pwa/events${cursor.current === null ? "" : `?after=${cursor.current}`}`, { cache: "no-store" });
          if (res.ok) {
            const data = await res.json();
            if (!stopped && data.account === accountKey) {
              cursor.current = data.cursor; setRecent(data.recent); setUnread(data.unread);
              if ("setAppBadge" in navigator) { const nav = navigator as Navigator & { setAppBadge: (n: number) => Promise<void>; clearAppBadge: () => Promise<void> }; void (data.unread ? nav.setAppBadge(data.unread) : nav.clearAppBadge()).catch(() => {}); }
              for (const alert of data.events.slice(-3)) await receive(alert);
            }
          }
        }
      } catch { /* Poll again after a temporary network loss. */ }
      if (!stopped) timer = setTimeout(poll, 8000);
    };
    const receive = async (alert: Alert) => {
      if (document.visibilityState !== "visible" || (alert.account && alert.account !== accountKey)) return;
      const claim = () => {
        const key = `ssc-alerts-seen:${accountKey}`;
        try { const seen = JSON.parse(localStorage.getItem(key) || "[]") as string[]; if (seen.includes(alert.id)) return false; localStorage.setItem(key, JSON.stringify([...seen.slice(-99), alert.id])); } catch { /* Storage may be disabled. */ }
        return true;
      };
      const claimed = "locks" in navigator ? await navigator.locks.request(`ssc-alert:${accountKey}`, claim) : claim();
      if (!claimed || stopped) return;
      toast(`${alert.title}: ${alert.body}`);
      if (soundRef.current) void playChime();
      router.refresh();
    };
    const message = (event: MessageEvent) => { if (event.data?.type === "SSC_ALERT" && event.data.alert?.id) void receive(event.data.alert); };
    const unlock = () => { if (isSoundOn()) void unlockSound().catch(() => {}); };
    const install = () => setInstallable(!!getInstallPrompt());
    const setup = async () => {
      try {
        const res = await fetch("/api/pwa/subscription", { cache: "no-store" });
        if (!res.ok || stopped) return;
        const data = await res.json();
        if (data.account !== accountKey) return;
        setConfig(data); soundRef.current = isSoundOn(); setSound(soundRef.current);
        setPermission("Notification" in window ? Notification.permission : "denied");
        setSupported(window.isSecureContext && "Notification" in window && "PushManager" in window && "serviceWorker" in navigator);
        setInstalled(window.matchMedia("(display-mode: standalone)").matches || !!(navigator as Navigator & { standalone?: boolean }).standalone);
        install();
        // Restore this account's existing device after signing in again. Never ask for permission automatically.
        if (data.ready && "Notification" in window && Notification.permission === "granted" && (data.subscribed || localStorage.getItem(`ssc-push:${accountKey}`) === "on")) {
          const reg = await registerPwa();
          const sub = await reg.pushManager.getSubscription();
          if (sub && !stopped) {
            const restored = await fetch("/api/pwa/subscription", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ subscription: sub.toJSON(), sound: soundRef.current }) });
            if (restored.ok && !stopped) setConfig({ ...data, subscribed: true });
          }
        }
      } catch { /* In-app sound remains available even if push isn't configured. */ }
    };
    void setup(); void poll();
    navigator.serviceWorker?.addEventListener("message", message);
    window.addEventListener("pointerdown", unlock);
    window.addEventListener("ssc-install-ready", install);
    return () => { stopped = true; clearTimeout(timer); navigator.serviceWorker?.removeEventListener("message", message); window.removeEventListener("pointerdown", unlock); window.removeEventListener("ssc-install-ready", install); };
  }, [accountKey, pref, router, toast]);

  const updateSubscription = async (nextSound: boolean) => {
    const reg = await registerPwa();
    let sub = await reg.pushManager.getSubscription();
    if (!sub) sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: applicationKey(config!.publicKey!) });
    const res = await fetch("/api/pwa/subscription", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ subscription: sub.toJSON(), sound: nextSound }) });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Notifications could not be enabled.");
    setConfig(c => c && { ...c, subscribed: true });
  };
  const enable = async () => {
    if (!supported || !config?.ready || !config.publicKey) return;
    setBusy(true);
    try {
      void unlockSound().catch(() => {});
      const allowed = await Notification.requestPermission(); setPermission(allowed);
      if (allowed !== "granted") { toast("Notifications weren't enabled. You can change this in your browser settings.", false); return; }
      await updateSubscription(true);
      localStorage.setItem(`ssc-push:${accountKey}`, "on");
      localStorage.setItem(pref, "on"); soundRef.current = true; setSound(true); void playChime();
      toast("Notifications and sound enabled on this device.");
    } catch (e) { toast(e instanceof Error ? e.message : "Notifications could not be enabled.", false); }
    finally { setBusy(false); }
  };
  const disable = async () => {
    setBusy(true);
    try {
      const res = await fetch("/api/pwa/subscription", { method: "DELETE" });
      if (!res.ok) throw new Error("Could not turn off notifications. Please retry.");
      localStorage.removeItem(`ssc-push:${accountKey}`);
      const reg = await navigator.serviceWorker.ready; await (await reg.pushManager.getSubscription())?.unsubscribe();
      setConfig(c => c && { ...c, subscribed: false }); toast("Push notifications turned off on this device.");
    } catch (e) { toast(e instanceof Error ? e.message : "Please try again.", false); }
    finally { setBusy(false); }
  };
  const toggleSound = async () => {
    const value = !sound; soundRef.current = value; setSound(value);
    try { localStorage.setItem(pref, value ? "on" : "off"); if (config?.subscribed) await updateSubscription(value); if (value) void playChime(); }
    catch { toast("Sound is changed in this tab. Please retry to update background notifications.", false); }
  };
  const install = async () => {
    const prompt = getInstallPrompt();
    if (!prompt) { toast("Use your browser menu and choose Install app or Add to Home Screen."); return; }
    await prompt.prompt(); const choice = await prompt.userChoice;
    if (choice.outcome === "accepted") { setInstalled(true); setInstallable(false); }
  };
  return <div className="pwa-control">
    <button ref={control} className="pwa-control-trigger" onClick={() => setOpen(!open)} aria-label="Install app and notification settings" aria-expanded={open} title="Install app & alerts"><BellRing size={19}/>{unread > 0 && <span>{unread > 99 ? "99+" : unread}</span>}</button>
    <FloatingPanel anchor={control} open={open} onClose={() => setOpen(false)} width={350} label="App and notification settings" className="pwa-panel"><header><div><h2>Install & alerts</h2><p>Stay up to date on this device.</p></div><button onClick={() => setOpen(false)} aria-label="Close notification settings"><X size={17}/></button></header>
      <div className="pwa-settings"><button className="btn btn-secondary w-full" onClick={install} disabled={installed}><Download size={16}/>{installed ? "App installed" : installable ? "Install app" : "How to install"}</button>
        {!installed && !installable && <p>iPhone or iPad: open the browser’s Share menu and choose Add to Home Screen. Other devices: choose Install app in the browser menu.</p>}
        <div className="pwa-setting"><span><b>Push notifications</b><small>{config?.subscribed ? "Enabled on this device" : "New orders and messages, even when closed"}</small></span></div>
        {config?.subscribed ? <button disabled={busy} onClick={disable} className="btn btn-secondary w-full">{busy ? "Updating…" : "Turn off notifications"}</button> : <button disabled={busy || !supported || !config?.ready || permission === "denied"} onClick={enable} className="btn btn-primary w-full">{busy ? "Enabling…" : "Enable notifications"}</button>}
        {permission === "denied" && <p>Notifications are blocked. Allow them in your browser or device settings, then reopen the app.</p>}
        {!supported && <p>Push needs HTTPS and a supported browser. On iPhone and iPad, install the app on your Home Screen first.</p>}
        {supported && config && !config.ready && <p>Push notifications need to be configured on the server. In-app sounds can still be enabled below.</p>}
        <div className="pwa-setting"><span><b>Notification sound</b><small>A custom chime while the app is open. Background sound follows your device settings.</small></span><button className="pwa-sound-switch" role="switch" aria-checked={sound} aria-label="Notification sound" onClick={toggleSound} disabled={busy}>{sound ? <Volume2 size={18}/> : <VolumeX size={18}/>} {sound ? "On" : "Off"}</button></div>
        <button className="pwa-test-sound" onClick={() => { void playChime().then(ok => !ok && toast("Sound couldn't play. Check your browser and device sound settings.", false)); }}>Test sound</button>
      </div>
      {!!recent.length && <div className="pwa-recent"><h3>Recent alerts</h3>{recent.slice(0, 5).map(n => <Link key={n.id} href={n.url} onClick={() => setOpen(false)}><strong>{n.title}</strong><span>{n.body}</span></Link>)}</div>}
    </FloatingPanel>
  </div>;
}
