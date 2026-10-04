import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { readDb, writeDb } from '@/lib/db';
import { normalizeInstitutionId } from '@/lib/institution';

export const dynamic = 'force-dynamic';

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const rawInstId = searchParams.get('institutionId') || 'bolu-kilicaslan';
    const institutionId = normalizeInstitutionId(rawInstId);

    const dbData = readDb();
    const audio = (dbData.tvAudios && dbData.tvAudios[institutionId]) || null;

    return NextResponse.json({ success: true, audio });
  } catch (err) {
    console.error('GET /api/tv-audio error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const formData = await req.formData();
    const file = formData.get('file');
    const title = formData.get('title') || '';
    const rawInstId = formData.get('institutionId') || 'bolu-kilicaslan';
    const institutionId = normalizeInstitutionId(rawInstId);

    if (!file || typeof file === 'string') {
      return NextResponse.json({ success: false, error: 'Lütfen geçerli bir ses dosyası seçin.' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Dosya uzantısı kontrolü
    const origName = file.name || 'tv_fon_sesi.mp3';
    const ext = origName.includes('.') ? origName.split('.').pop() : 'mp3';
    const cleanExt = ext.replace(/[^a-zA-Z0-9]/g, '').toLowerCase() || 'mp3';
    const uniqueFileName = `${institutionId}_${Date.now()}.${cleanExt}`;
    
    const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'tv-audio');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    // Varsa önceki ses dosyasını temizle
    const dbData = readDb();
    if (!dbData.tvAudios) dbData.tvAudios = {};
    const oldAudio = dbData.tvAudios[institutionId];
    if (oldAudio && oldAudio.url && oldAudio.url.startsWith('/uploads/tv-audio/')) {
      const oldPath = path.join(process.cwd(), 'public', oldAudio.url);
      if (fs.existsSync(oldPath)) {
        try { fs.unlinkSync(oldPath); } catch (e) {}
      }
    }

    // Yeni dosyayı diske kaydet
    const filePath = path.join(uploadDir, uniqueFileName);
    fs.writeFileSync(filePath, buffer);

    const audioRecord = {
      id: `${institutionId}_audio`,
      institutionId,
      title: title.trim() || origName.replace(/\.[^/.]+$/, ""),
      fileName: origName,
      url: `/uploads/tv-audio/${uniqueFileName}`,
      sizeBytes: buffer.length,
      uploadedAt: new Date().toISOString()
    };

    dbData.tvAudios[institutionId] = audioRecord;
    writeDb(dbData);

    return NextResponse.json({ success: true, audio: audioRecord });
  } catch (err) {
    console.error('POST /api/tv-audio error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function DELETE(req) {
  try {
    const { searchParams } = new URL(req.url);
    const rawInstId = searchParams.get('institutionId') || 'bolu-kilicaslan';
    const institutionId = normalizeInstitutionId(rawInstId);

    const dbData = readDb();
    if (dbData.tvAudios && dbData.tvAudios[institutionId]) {
      const oldAudio = dbData.tvAudios[institutionId];
      if (oldAudio.url && oldAudio.url.startsWith('/uploads/tv-audio/')) {
        const oldPath = path.join(process.cwd(), 'public', oldAudio.url);
        if (fs.existsSync(oldPath)) {
          try { fs.unlinkSync(oldPath); } catch (e) {}
        }
      }
      delete dbData.tvAudios[institutionId];
      writeDb(dbData);
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('DELETE /api/tv-audio error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
