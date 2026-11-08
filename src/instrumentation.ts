export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { takeDue } = await import("./lib/jobs/queue");
  const { runJob } = await import("./lib/jobs/handlers");
  const { dispatchPushAlerts } = await import("./lib/pwa/push");
  setInterval(() => void dispatchPushAlerts(), 15_000).unref?.();
  void dispatchPushAlerts();
  const tick = async () => {
    for (const j of await takeDue()) await runJob(j);
  };
  setInterval(() => void tick(), 60_000).unref?.();
  void tick();
}
