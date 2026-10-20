import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// Versiyon kimliği: Yeni güncelleme yayınlandığında telefonların otomatik güncellenmesini sağlar.
// Serverless cold-start sırasında sürekli değişip döngüye girmemesi için sabit release etiketi kullanılır.
const APP_RELEASE_VERSION = process.env.VERCEL_GIT_COMMIT_SHA || process.env.NEXT_PUBLIC_APP_VERSION || 'v2.5.0-bolu-oct2026';

export async function GET() {
  return NextResponse.json(
    {
      success: true,
      buildId: APP_RELEASE_VERSION,
      version: '2.5.0',
      timestamp: Date.now(),
    },
    {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    }
  );
}
