import { NextResponse } from 'next/server';
import { readDb, writeDb } from '@/lib/db';
import { normalizeInstitutionId, isInstitutionMatch } from '@/lib/institution';
import { getCached, setCached, invalidateCache } from '@/lib/serverCache';
import { listAllDocs, patchDoc, deleteDoc, S, B, readStr, docId } from '@/lib/firestoreRest';

export const dynamic = 'force-dynamic';

const NO_STORE = { 'Cache-Control': 'no-store, no-cache, must-revalidate' };
// Sunucu örnekleri arası tutarlılık için kısa tutuldu (başka örnek eski veri göstermesin)
const CACHE_TTL = 8000;

function docToReport(doc) {
  const f = doc.fields || {};
  const id = docId(doc);
  const sid = readStr(f, 'student_id', 'studentId').trim();
  const inst = normalizeInstitutionId(readStr(f, 'institution_id', 'institutionId') || 'bolu-kilicaslan');
  return {
    id,
    student_id: sid,
    studentId: sid,
    student_name: readStr(f, 'student_name', 'studentName'),
    class: readStr(f, 'class'),
    parent_phone: readStr(f, 'parent_phone'),
    content: readStr(f, 'content'),
    category: readStr(f, 'category') || 'Dahili',
    isPositive: f.isPositive?.booleanValue !== false,
    notified: f.notified?.booleanValue || false,
    institution_id: inst,
    institutionId: inst,
    created_at: readStr(f, 'created_at') || null,
    created_by: readStr(f, 'created_by') || 'Bilinmeyen Öğretmen',
  };
}

// ─── GET ─────────────────────────────────────────────────────────────────────
export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const studentId = (searchParams.get('studentId') || '').trim().toLowerCase();
    const rawInst = searchParams.get('institutionId') || '';
    const institutionId = rawInst ? normalizeInstitutionId(rawInst) : '';

    const cacheKey = `reports_${institutionId || 'all'}_${studentId || 'all'}`;
    const cached = getCached(cacheKey, CACHE_TTL);
    if (cached) return NextResponse.json({ success: true, reports: cached }, { headers: NO_STORE });

    const match = (r) =>
      (!studentId || (r.student_id || '').toLowerCase() === studentId) &&
      (!institutionId || institutionId === 'platform' || isInstitutionMatch(r.institution_id, institutionId));

    let reports;
    let source = 'firestore';
    try {
      reports = (await listAllDocs('reports')).map(docToReport).filter(match);
    } catch (err) {
      // Firestore tamamen erişilemezse yerel yedeği göster (önbelleğe ALMA)
      console.error('Reports Firestore read failed:', err.message);
      source = 'local';
      reports = (readDb().reports || []).map(r => {
        const sid = (r.student_id || r.studentId || '').trim();
        const inst = normalizeInstitutionId(r.institution_id || r.institutionId || 'bolu-kilicaslan');
        return { ...r, student_id: sid, studentId: sid, institution_id: inst, institutionId: inst };
      }).filter(match);
    }

    reports.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
    if (source === 'firestore') setCached(cacheKey, reports);
    return NextResponse.json({ success: true, reports, source }, { headers: NO_STORE });
  } catch (err) {
    return NextResponse.json({ success: false, error: err.message, reports: [] }, { status: 500 });
  }
}

function invalidateAll() {
  invalidateCache('reports');
  invalidateCache('students');
  invalidateCache('weekly_summary');
  invalidateCache('dashboard');
}

// ─── POST ────────────────────────────────────────────────────────────────────
export async function POST(req) {
  try {
    const {
      studentId, studentName, className, parentPhone,
      content, category, isPositive, notifyParent, institutionId = 'bolu-kilicaslan',
      createdBy, clientRequestId,
    } = await req.json();

    if (!studentId || !content || !String(content).trim()) {
      return NextResponse.json({ success: false, error: 'Eksik bilgi: Öğrenci ve içerik gereklidir.' }, { status: 400 });
    }

    const instId = normalizeInstitutionId(institutionId);
    const sid = String(studentId).trim();
    // clientRequestId ile aynı rapor tekrar gönderilse bile çift kayıt oluşmaz (idempotent)
    const safeReq = clientRequestId ? String(clientRequestId).replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 80) : '';
    const reportId = safeReq ? `report-${safeReq}` : `report-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
    const nowIso = new Date().toISOString();

    const newReport = {
      id: reportId,
      student_id: sid, studentId: sid,
      student_name: studentName || '', studentName: studentName || '',
      class: className || '',
      parent_phone: parentPhone || '', parentPhone: parentPhone || '',
      content: String(content).trim(),
      category: category || 'Dahili',
      isPositive: isPositive !== false,
      notified: !!notifyParent,
      institution_id: instId, institutionId: instId,
      created_at: nowIso,
      created_by: createdBy || 'Bilinmeyen Öğretmen',
    };

    // 1. Kalıcı kayıt: Firestore (yeniden denemeli). Başarısızsa kullanıcıya HATA dön.
    try {
      await patchDoc(`reports/${reportId}`, {
        student_id: S(sid), studentId: S(sid),
        student_name: S(newReport.student_name),
        class: S(newReport.class),
        parent_phone: S(newReport.parent_phone),
        content: S(newReport.content),
        category: S(newReport.category),
        isPositive: B(newReport.isPositive),
        notified: B(newReport.notified),
        institution_id: S(instId), institutionId: S(instId),
        created_at: S(nowIso),
        created_by: S(newReport.created_by),
      });
    } catch (err) {
      console.error('Firestore report save FAILED:', err.message);
      return NextResponse.json(
        { success: false, error: 'Rapor buluta kaydedilemedi. İnternet bağlantınızı kontrol edip tekrar deneyin.' },
        { status: 503 }
      );
    }

    // 2. Yerel yedek (sadece bu sunucu örneği için; kaynak değil)
    try {
      const db = readDb();
      db.reports = [newReport, ...(db.reports || []).filter(r => r.id !== reportId)].slice(0, 2000);
      writeDb(db);
    } catch (e) { /* yedek, kritik değil */ }

    invalidateAll();
    return NextResponse.json({ success: true, id: reportId, report: newReport });
  } catch (err) {
    console.error('ADD REPORT API ERROR:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

// ─── DELETE ──────────────────────────────────────────────────────────────────
export async function DELETE(req) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    const studentId = (searchParams.get('studentId') || '').trim();
    if (!id) return NextResponse.json({ success: false, error: 'Rapor ID eksik.' }, { status: 400 });

    try {
      await deleteDoc(`reports/${id}`);
    } catch (err) {
      return NextResponse.json({ success: false, error: 'Rapor silinemedi, tekrar deneyin.' }, { status: 503 });
    }

    try {
      const db = readDb();
      db.reports = (db.reports || []).filter(r => r.id !== id);
      writeDb(db);
    } catch (e) {}

    invalidateAll();
    return NextResponse.json({ success: true, id, studentId });
  } catch (err) {
    console.error('DELETE REPORT API ERROR:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

// ─── PUT ─────────────────────────────────────────────────────────────────────
export async function PUT(req) {
  try {
    const { id, notified } = await req.json();
    if (!id) return NextResponse.json({ success: false, error: 'ID eksik.' }, { status: 400 });

    try {
      await patchDoc(`reports/${id}`, { notified: B(notified) }, ['notified']);
    } catch (err) {
      return NextResponse.json({ success: false, error: 'Güncellenemedi, tekrar deneyin.' }, { status: 503 });
    }

    try {
      const db = readDb();
      db.reports = (db.reports || []).map(r => (r.id === id ? { ...r, notified: !!notified } : r));
      writeDb(db);
    } catch (e) {}

    invalidateCache('reports');
    return NextResponse.json({ success: true, id, notified: !!notified });
  } catch (err) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
