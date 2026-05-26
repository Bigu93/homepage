// js/api.js
// Thin wrapper around fetch for the backend API.
// Injects Authorization header + baseUrl from overlay.settings.sync.

export class NetError extends Error {
  constructor(msg) {
    super(msg);
    this.name = "NetError";
  }
}
export class AuthError extends Error {
  constructor() {
    super("Invalid or missing token");
    this.name = "AuthError";
  }
}
export class ConflictError extends Error {
  constructor(body) {
    super("Sync conflict");
    this.name = "ConflictError";
    this.body = body;
  }
}

/**
 * apiFetch(sync, path, opts)
 *   sync — overlay.settings.sync
 *   path — e.g. "/api/v1/sync"
 *   opts — fetch options (method, body, headers, …)
 */
export async function apiFetch(sync, path, opts = {}) {
  const base = (sync.baseUrl || "").replace(/\/+$/, "");
  const url = base + path;

  const headers = {
    "Content-Type": "application/json",
    ...(opts.headers || {}),
    Authorization: `Bearer ${sync.token}`,
    "X-Device-Id": sync.deviceId || "",
  };

  let resp;
  try {
    resp = await fetch(url, { ...opts, headers });
  } catch (e) {
    throw new NetError(e.message);
  }

  if (resp.status === 401) throw new AuthError();
  if (resp.status === 409) {
    const body = await resp.json().catch(() => ({}));
    throw new ConflictError(body);
  }
  return resp;
}
