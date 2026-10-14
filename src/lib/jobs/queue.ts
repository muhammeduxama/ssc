import "server-only";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";

/**
 * Tiny durable queue for Laravel's delayed jobs (e.g. AdminQuoteReminderJob ->delay(24h)).
 * Jobs live in .jobs/queue.json so they survive restarts; a worker started from
 * src/instrumentation.ts runs due jobs every minute. Single-server by design.
 */
export type Job = { id: string; name: string; payload: Record<string, unknown>; runAt: number; attempts: number };

const DIR = path.resolve(/*turbopackIgnore: true*/ process.cwd(), ".jobs");
const FILE = path.join(DIR, "queue.json");
let lock: Promise<unknown> = Promise.resolve();

async function load(): Promise<Job[]> {
  try {
    return JSON.parse(await readFile(FILE, "utf8")) as Job[];
  } catch {
    return [];
  }
}
async function save(jobs: Job[]) {
  await mkdir(DIR, { recursive: true });
  const tmp = `${FILE}.${process.pid}.tmp`;
  await writeFile(tmp, JSON.stringify(jobs));
  await rename(tmp, FILE);
}
function locked<T>(fn: () => Promise<T>): Promise<T> {
  const run = lock.then(fn, fn);
  lock = run.catch(() => undefined);
  return run;
}

export function schedule(name: string, payload: Record<string, unknown>, delayMs: number) {
  return locked(async () => {
    const jobs = await load();
    jobs.push({ id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, name, payload, runAt: Date.now() + delayMs, attempts: 0 });
    await save(jobs);
  });
}

/** Take jobs whose time has come (removed before they run: one attempt, like the Laravel jobs). */
export function takeDue(): Promise<Job[]> {
  return locked(async () => {
    const jobs = await load();
    const now = Date.now();
    const due = jobs.filter((j) => j.runAt <= now);
    if (due.length) await save(jobs.filter((j) => j.runAt > now));
    return due;
  });
}
