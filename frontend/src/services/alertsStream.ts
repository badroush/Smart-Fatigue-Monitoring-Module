/**
 * Flux SSE : notification dès qu'une alerte change côté serveur.
 * ?token= (JWT après connexion) ou ?api_key= (clé siège / legacy).
 */

const API_BASE_URL =
  process.env.REACT_APP_API_BASE_URL || "http://127.0.0.1:5000/api";
const API_KEY =
  process.env.REACT_APP_API_KEY || "sfam_superviseur_secret_2026";

type Listener = () => void;

const listeners = new Set<Listener>();
let source: EventSource | null = null;
let reconnectTimer: number | null = null;

function streamUrl(): string {
  const base = API_BASE_URL.replace(/\/$/, "");
  const token =
    typeof localStorage !== "undefined"
      ? localStorage.getItem("sfam_token")
      : null;
  if (token) {
    return `${base}/alerts/stream?token=${encodeURIComponent(token)}`;
  }
  return `${base}/alerts/stream?api_key=${encodeURIComponent(API_KEY)}`;
}

function closeSource() {
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
  if (source) {
    source.close();
    source = null;
  }
}

function scheduleReconnect() {
  if (listeners.size === 0) return;
  if (reconnectTimer) return;
  reconnectTimer = window.setTimeout(() => {
    reconnectTimer = null;
    closeSource();
    ensureConnection();
  }, 2000);
}

function ensureConnection() {
  if (listeners.size === 0) {
    closeSource();
    return;
  }

  if (source) {
    const rs = source.readyState;
    if (rs !== EventSource.CLOSED) {
      return;
    }
    source.close();
    source = null;
  }

  const url = streamUrl();

  try {
    source = new EventSource(url);

    source.addEventListener("alerts", () => {
      listeners.forEach((fn) => {
        try {
          fn();
        } catch {
          /* ignore */
        }
      });
    });

    source.addEventListener("open", () => {
      if (reconnectTimer) {
        clearTimeout(reconnectTimer);
        reconnectTimer = null;
      }
    });

    source.onerror = () => {
      if (listeners.size === 0) {
        closeSource();
        return;
      }
      scheduleReconnect();
    };
  } catch {
    source = null;
    scheduleReconnect();
  }
}

export function subscribeSupervisorAlertsStream(onNotify: Listener): () => void {
  listeners.add(onNotify);
  ensureConnection();

  return () => {
    listeners.delete(onNotify);
    if (listeners.size === 0) {
      closeSource();
    }
  };
}
