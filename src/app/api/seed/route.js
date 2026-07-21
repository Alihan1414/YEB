import { NextResponse } from 'next/server';
import { getAuth, createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { app, db } from '@/lib/firebase';

export async function GET() {
  try {
    const auth = getAuth(app);
    const email = "yeb@2026.com";
    const password = "enderun bilişim";

    const cred = await createUserWithEmailAndPassword(auth, email, password);
    await setDoc(doc(db, 'users', cred.user.uid), {
      name: "Enderun Bilişim Yöneticisi",
      email: email,
      role: "admin"
    });

    return NextResponse.json({
      success: true,
      message: "YEB yönetici hesabı başarıyla oluşturuldu!",
      email,
      password
    });
  } catch (error) {
    console.error("SEED ERROR:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
