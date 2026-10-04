/**
 * Normalizes any variation of an institution identifier to its canonical form.
 * Handles variations like:
 * - 'bolu-kilicaslan', 'bolu-kilicarslan', 'kilicaslan', 'kilicarslan', 'bolu' -> 'bolu-kilicaslan'
 * - 'cinardere-erenler', 'cinardere', 'erenler' -> 'cinardere-erenler'
 * - 'yamanevler', 'yeb' -> 'yamanevler'
 * - 'pendik-talebe-yurdu', 'pendik', 'pty' -> 'pendik-talebe-yurdu'
 * - 'platform', 'admin' -> 'platform'
 */
export function normalizeInstitutionId(id) {
  if (!id) return 'bolu-kilicaslan';
  const clean = String(id).trim().toLowerCase();
  if (clean === 'platform' || clean === 'admin') return 'platform';
  if (clean.includes('kilic') || clean.includes('bolu')) return 'bolu-kilicaslan';
  if (clean.includes('erenler') || clean.includes('cinardere')) return 'cinardere-erenler';
  if (clean.includes('yamanevler') || clean === 'yeb') return 'yamanevler';
  if (clean.includes('pendik') || clean === 'pty') return 'pendik-talebe-yurdu';
  return clean;
}

export function isInstitutionMatch(a, b) {
  if (!a || !b) return false;
  const normA = normalizeInstitutionId(a);
  const normB = normalizeInstitutionId(b);
  if (normA === 'platform' || normB === 'platform') return true;
  return normA === normB;
}

export function getInstitutionDisplayName(id) {
  const norm = normalizeInstitutionId(id);
  switch (norm) {
    case 'bolu-kilicaslan':
      return 'Bolu Kılıçarslan';
    case 'cinardere-erenler':
      return 'Çınardere Erenler';
    case 'yamanevler':
      return 'Yamanevler Enderun Bilişim';
    case 'pendik-talebe-yurdu':
      return 'Pendik Talebe Yurdu';
    default:
      return 'Bolu Kılıçarslan';
  }
}
