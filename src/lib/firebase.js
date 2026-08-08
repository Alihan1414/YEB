import { initializeApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey:            process.env.NEXT_PUBLIC_FIREBASE_API_KEY            || "AIzaSyCH7bTzvqJqSzJiV0Ou6JudPovkrrWrwdw",
  authDomain:        process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN        || "vision-b1ad5.firebaseapp.com",
  databaseURL:       process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL       || "https://vision-b1ad5-default-rtdb.firebaseio.com",
  projectId:         process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID         || "vision-b1ad5",
  storageBucket:     process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET     || "vision-b1ad5.firebasestorage.app",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "121963731187",
  appId:             process.env.NEXT_PUBLIC_FIREBASE_APP_ID             || "1:121963731187:web:b79298734352c2d452bf86",
  measurementId:     process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID     || "G-32J8MVDDQT",
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const auth = getAuth(app);
const db = getFirestore(app);

export { app, auth, db };
