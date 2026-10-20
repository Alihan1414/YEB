/**
 * firestoreRest.js — Tek, güvenilir Firestore REST katmanı.
 *
 * NEDEN: Vercel'de her istek farklı bir sunucu örneğine (instance) gidebilir ve
 * /tmp dosyası sadece o örnekte yaşar. Firestore yazımı sessizce başarısız olursa
 * kayıt sadece o örnekte görünür, örnek ~15-20 dk sonra kapanınca kayıt "kaybolur".
 * Bu yüzden: yazımlar yeniden denenir ve başarısızsa HATA döner (sessiz yutma yok),
 * okumalar tüm sayfaları çeker ve yarım veri "başarılı" sayılmaz.
 */

export function getFsConfig() {
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'student-reports-app-22e38';
  const apiKey    = process.env.NEXT_PUBLIC_FIREBASE_API_KEY    || 'AIzaSyDAkvmh3UMgWeKs-Cqjd4_hS6pzb2pXkqU';
  return { projectId, apiKey };
}

export function fsDocUrl(path, extra = '') {
  const { projectId, apiKey } = getFsConfig();
  return `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/${path}?key=${apiKey}${extra}`;
}

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function fetchWithTimeout(url, opts = {}, timeoutMs = 9000) {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { cache: 'no-store', ...opts, signal: controller.signal });
  } finally {
    clearTimeout(t);
  }
}

/** Yeniden denemeli istek. 4xx (404 hariç istenirse) tekrar denenmez. */
async function fsRequest(url, opts, { retries = 3, timeoutMs = 9000, okStatuses = [] } = {}) {
  let lastErr;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetchWithTimeout(url, opts, timeoutMs);
      if (res.ok || okStatuses.includes(res.status)) return res;
      const body = await res.text().catch(() => '');
      lastErr = new Error(`Firestore HTTP ${res.status}: ${body.slice(0, 200)}`);
      if (res.status >= 400 && res.status < 500 && res.status !== 429) break;
    } catch (e) {
      lastErr = e;
    }
    if (attempt < retries) await sleep(300 * Math.pow(2, attempt));
  }
  throw lastErr || new Error('Firestore isteği başarısız');
}

/**
 * Bir koleksiyonun TÜM dokümanlarını sayfa sayfa çeker.
 * Herhangi bir sayfa başarısız olursa hata fırlatır (yarım liste döndürmez).
 */
export async function listAllDocs(collection) {
  const docs = [];
  let pageToken = '';
  let guard = 0;
  do {
    const tokenParam = pageToken ? `&pageToken=${encodeURIComponent(pageToken)}` : '';
    const res = await fsRequest(fsDocUrl(collection, `&pageSize=300${tokenParam}`), { method: 'GET' });
    const data = await res.json();
    if (data.error) throw new Error(data.error.message || 'Firestore list error');
    (data.documents || []).forEach(d => docs.push(d));
    pageToken = data.nextPageToken || '';
  } while (pageToken && ++guard < 200);
  return docs;
}

export async function getDoc(path) {
  const res = await fsRequest(fsDocUrl(path), { method: 'GET' }, { okStatuses: [404] });
  if (res.status === 404) return null;
  return res.json();
}

/** Doküman yaz (oluştur / güncelle). fieldMask verilirse sadece o alanlar güncellenir. */
export async function patchDoc(path, fields, fieldMask = null) {
  const extra = fieldMask && fieldMask.length
    ? '&' + fieldMask.map(f => `updateMask.fieldPaths=${encodeURIComponent(f)}`).join('&')
    : '';
  const res = await fsRequest(fsDocUrl(path, extra), {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fields }),
  });
  return res.json();
}

export async function deleteDoc(path) {
  await fsRequest(fsDocUrl(path), { method: 'DELETE' }, { okStatuses: [404] });
  return true;
}

// ─── Değer dönüştürücüler ───────────────────────────────────────────────────
export const S = (v) => ({ stringValue: v == null ? '' : String(v) });
export const B = (v) => ({ booleanValue: !!v });
export const ARR = (list) => ({ arrayValue: { values: (list || []).map(x => ({ stringValue: String(x) })) } });

export function readStr(f, ...keys) {
  for (const k of keys) {
    const v = f?.[k];
    if (v?.stringValue !== undefined) return v.stringValue;
    if (v?.timestampValue !== undefined) return v.timestampValue;
  }
  return '';
}

export function readArr(f, key) {
  return (f?.[key]?.arrayValue?.values || []).map(v => v.stringValue).filter(Boolean);
}

export function docId(doc) {
  return doc.name.split('/').pop();
}
