const FIREBASE_API_KEY = process.env.NEXT_PUBLIC_FIREBASE_API_KEY || 'AIzaSyCH7bTzvqJqSzJiV0Ou6JudPovkrrWrwdw';
const FIREBASE_PROJECT_ID = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'vision-b1ad5';

/**
 * Safe fetch from Firestore REST API with a strict timeout (default 1500ms).
 * Never hangs, and if rate-limited / quota-exceeded (429), returns null immediately
 * allowing fallback to local DB with zero delay.
 */
export async function safeFirestoreFetch(endpoint, options = {}, timeoutMs = 1500) {
  if (!FIREBASE_PROJECT_ID || !FIREBASE_API_KEY) return null;

  const url = endpoint.startsWith('http')
    ? endpoint
    : `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/${endpoint}?key=${FIREBASE_API_KEY}`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, {
      ...options,
      signal: controller.signal,
      cache: 'no-store',
    });
    clearTimeout(timeoutId);

    if (!res.ok) {
      // 429 Too Many Requests / Quota Exceeded or any HTTP error
      return null;
    }

    const data = await res.json();
    if (data && data.error) return null;
    return data;
  } catch (err) {
    clearTimeout(timeoutId);
    return null;
  }
}

export { FIREBASE_API_KEY, FIREBASE_PROJECT_ID };
