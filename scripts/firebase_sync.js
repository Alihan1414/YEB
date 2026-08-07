/**
 * firebase_sync.js
 * Firebase Firestore'da kurumları güncelle / ekle
 * (Local DB zaten script ile güncellendi, bu script Firebase senkronizasyonunu yapar)
 */

const FIREBASE_API_KEY    = 'AIzaSyA1UmjpiDX47qk8c6tJoM1xkJbRMGIsqfg';
const FIREBASE_PROJECT_ID = 'student-687f2';
const BASE_FS = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents`;

async function patchFirestore(docPath, fields) {
  const res = await fetch(`${BASE_FS}/${docPath}?key=${FIREBASE_API_KEY}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fields })
  });
  const data = await res.json();
  if (data.error) throw new Error(`Firestore error: ${JSON.stringify(data.error)}`);
  return data;
}

async function signUpFirebase(email, password) {
  const res = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${FIREBASE_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, returnSecureToken: true })
    }
  );
  return await res.json();
}

// Email'i normalize et (yoksa .com ekle)
function normalizeEmail(raw) {
  const parts = raw.split('@');
  if (parts.length === 2 && !parts[1].includes('.')) return `${parts[0]}@${parts[1]}.com`;
  return raw;
}

async function main() {
  // ── 1. Kılıçaslan primaryColor güncelle ─────────────────────────
  console.log('🔄 Kılıçaslan Firestore güncelleniyor...');
  try {
    await patchFirestore('institutions/bolu-kilicaslan', {
      logoUrl:      { stringValue: '/kilicaslan-logo.png' },
      primaryColor: { stringValue: '#009b9e' },
    });
    console.log('✅ Kılıçaslan institution güncellendi');
  } catch(e) { console.warn('⚠️ Kılıçaslan institution:', e.message); }

  // Kılıçaslan kullanıcısını da güncelle (UID: 1PkNaCnMiIY03dk4jiMsvMuexby2)
  try {
    await patchFirestore('users/1PkNaCnMiIY03dk4jiMsvMuexby2', {
      logoUrl:      { stringValue: '/kilicaslan-logo.png' },
      primaryColor: { stringValue: '#009b9e' },
    });
    console.log('✅ Kılıçaslan user güncellendi');
  } catch(e) { console.warn('⚠️ Kılıçaslan user:', e.message); }

  // ── 2. Pendik Talebe Yurdu ekle ─────────────────────────────────
  console.log('\n🔄 Pendik Talebe Yurdu Firebase\'e ekleniyor...');
  const PENDIK_ID = 'pendik-talebe-yurdu';
  const rawEmail = 'pty@2026';
  const firebaseEmail = normalizeEmail(rawEmail); // pty@2026.com
  const password = 'pendikmerkez';

  let uid = `admin-${PENDIK_ID}-${Date.now()}`;

  // Firebase Auth kaydı
  try {
    const signUp = await signUpFirebase(firebaseEmail, password);
    if (!signUp.error && signUp.localId) {
      uid = signUp.localId;
      console.log('✅ Firebase Auth kaydı:', uid);
    } else {
      console.warn('⚠️ Firebase Auth:', signUp.error?.message || 'zaten var');
    }
  } catch(e) { console.warn('⚠️ Auth signup:', e.message); }

  // Firestore institution
  try {
    await patchFirestore(`institutions/${PENDIK_ID}`, {
      id:           { stringValue: PENDIK_ID },
      name:         { stringValue: 'Pendik Talebe Yurdu' },
      email:        { stringValue: rawEmail },
      logoUrl:      { stringValue: '/pendik-logo.png' },
      primaryColor: { stringValue: '#b8962e' },
      disabled:     { booleanValue: false },
    });
    console.log('✅ Pendik institution Firestore\'a eklendi');
  } catch(e) { console.warn('⚠️ Pendik institution:', e.message); }

  // Firestore user
  try {
    await patchFirestore(`users/${uid}`, {
      name:            { stringValue: 'Pendik Talebe Yurdu Yöneticisi' },
      email:           { stringValue: rawEmail },
      role:            { stringValue: 'admin' },
      institutionId:   { stringValue: PENDIK_ID },
      institutionName: { stringValue: 'Pendik Talebe Yurdu' },
      logoUrl:         { stringValue: '/pendik-logo.png' },
      primaryColor:    { stringValue: '#b8962e' },
      disabled:        { booleanValue: false },
    });
    console.log('✅ Pendik user Firestore\'a eklendi, uid:', uid);
  } catch(e) { console.warn('⚠️ Pendik user:', e.message); }

  // ── 3. Tüm kurumların students/reports temizle ──────────────────
  // (Firebase'de bu veriler Firestore'da saklanmıyor, local JSON DB'de — zaten temizlendi)
  console.log('\n✅ Firebase senkronizasyonu tamamlandı!');
}

main().catch(console.error);
