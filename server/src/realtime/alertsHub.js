/**
 * Diffusion SSE vers les superviseurs connectés (rafraîchissement immédiat des listes d'alertes).
 */
const clients = new Set();

export function addAlertsSseClient(res) {
  clients.add(res);
}

export function removeAlertsSseClient(res) {
  clients.delete(res);
}

/**
 * @param {{ reason?: string }} [payload]
 */
export function notifyAlertsChanged(payload = {}) {
  const data = JSON.stringify({
    reason: payload.reason || 'update',
    at: new Date().toISOString(),
  });
  for (const res of clients) {
    try {
      res.write(`event: alerts\ndata: ${data}\n\n`);
    } catch {
      clients.delete(res);
    }
  }
}

export function getAlertsSseClientCount() {
  return clients.size;
}
