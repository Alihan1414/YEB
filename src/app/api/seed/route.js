import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // Use Firebase client SDK via REST API to create user
    const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
    const email = "yeb@2026.com";
    const password = "enderun bilişim";

    // Step 1: Create the user via Firebase Auth REST API
    const signUpRes = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, returnSecureToken: true }),
      }
    );

    const signUpData = await signUpRes.json();

    if (signUpData.error) {
      // If user already exists, that's fine
      if (signUpData.error.message === 'EMAIL_EXISTS') {
        return NextResponse.json({
          success: true,
          message: "yeb@2026.com hesabı zaten mevcut. Giriş yapabilirsiniz.",
          email,
          password
        });
      }
      throw new Error(signUpData.error.message);
    }

    const uid = signUpData.localId;
    const idToken = signUpData.idToken;

    // Step 2: Save user metadata to Firestore via REST API
    const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
    await fetch(
      `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/users/${uid}`,
      {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          fields: {
            name: { stringValue: "Enderun Bilişim Yöneticisi" },
            email: { stringValue: email },
            role: { stringValue: "admin" },
          }
        }),
      }
    );

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
