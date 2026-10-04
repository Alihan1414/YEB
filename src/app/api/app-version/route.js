import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// Unique timestamp generated at server start / deployment
const SERVER_BUILD_ID = process.env.BUILD_ID || `build_${Date.now()}`;

export async function GET() {
  return NextResponse.json(
    {
      success: true,
      buildId: SERVER_BUILD_ID,
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
