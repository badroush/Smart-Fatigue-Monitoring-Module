export const NIVEAU_SEVERITY = {
  NORMAL: 0,
  FATIGUE_LEGERE: 1,
  FATIGUE_MODEREE: 2,
  FATIGUE_SEVERE: 3,
  SOMNOLENCE_CRITIQUE: 4,
};

export function severityFromNiveau(niveau) {
  const key = String(niveau || 'NORMAL');
  return NIVEAU_SEVERITY[key] ?? 0;
}

export function niveauFromSeverity(sev) {
  const s = Number(sev) || 0;
  if (s >= 4) return 'SOMNOLENCE_CRITIQUE';
  if (s === 3) return 'FATIGUE_SEVERE';
  if (s === 2) return 'FATIGUE_MODEREE';
  if (s === 1) return 'FATIGUE_LEGERE';
  return 'NORMAL';
}

