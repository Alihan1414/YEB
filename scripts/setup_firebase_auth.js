/**
 * setup_firebase_auth.js
 * Ensures all institution admin accounts exist in Firebase Auth for vision-b1ad5
 */

const FIREBASE_API_KEY = 'AIzaSyCH7bTzvqJqSzJiV0Ou6JudPovkrrWrwdw';

const seedAccounts = [
  { email: 'yeb@2026.com', password: 'yeb2026', name: 'Yamanevler Yöneticisi' },
  { email: 'kilicaslan@2026.com', password: 'bolukilicaslan', name: 'Bolu Kılıçaslan Yöneticisi' },
  { email: 'erenler@2026.com', password: 'erenler2026', name: 'Çınardere Erenler Yöneticisi' },
  { email: 'pty@2026.com', password: 'pendikmerkez', name: 'Pendik Talebe Yurdu Yöneticisi' },
  { email: 'admin@yeb.local', password: 'admin', name: 'Sistem Yöneticisi' }
];

async function setupAuth() {
  console.log('🔄 Checking/Creating Firebase Auth users for vision-b1ad5...');

  for (const acc of seedAccounts) {
    try {
      // 1. Try to sign in first to see if exists
      const signInRes = await fetch(
        `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${FIREBASE_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: acc.email, password: acc.password, returnSecureToken: true })
        }
      );

      const signInData = await signInRes.json();
      if (signInData.localId) {
        console.log(`✅ User exists in Firebase Auth: ${acc.email} (UID: ${signInData.localId})`);
        continue;
      }

      // 2. If doesn't exist, sign up (create account)
      const signUpRes = await fetch(
        `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${FIREBASE_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: acc.email, password: acc.password, returnSecureToken: true })
        }
      );

      const signUpData = await signUpRes.json();
      if (signUpData.localId) {
        console.log(`🎉 User created in Firebase Auth: ${acc.email} (UID: ${signUpData.localId})`);
      } else {
        console.error(`❌ Failed to create user ${acc.email}:`, signUpData.error);
      }
    } catch (e) {
      console.error(`❌ Error for ${acc.email}:`, e.message);
    }
  }
}

setupAuth().catch(console.error);
