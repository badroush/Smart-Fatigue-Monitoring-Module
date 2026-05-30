export function getDataProvider() {
  const v = (process.env.DATA_PROVIDER || 'mysql').toLowerCase();
  if (v === 'firestore') return 'firestore';
  if (v === 'dual') return 'dual';
  return 'mysql';
}

