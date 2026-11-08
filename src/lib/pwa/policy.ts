/** Only browser push providers may receive server-side delivery requests. */
export function validPushEndpoint(value: string) {
  try {
    const u = new URL(value);
    const hosts = ["fcm.googleapis.com", "push.services.mozilla.com", "notify.windows.com", "push.apple.com"];
    return u.protocol === "https:" && !u.username && !u.password && (!u.port || u.port === "443") && hosts.some(h => u.hostname === h || u.hostname.endsWith(`.${h}`));
  } catch { return false; }
}

export function safeAlertUrl(value: string) {
  return /^\/(?![\/\\])/.test(value) && !/[\\\r\n]/.test(value) ? value : "/dashboard";
}

export function alertAudiences(s: { kind: string; id: string; role: string }) {
  return [s.role === "admin" || s.role === "editor" ? "staff" : `user:${s.id}`];
}
