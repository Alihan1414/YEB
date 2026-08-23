import { NextResponse } from 'next/server';

// In-memory / storage sync store
let serverRecordsStore = [
  {
    id: 'demo-1',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 14).toISOString(),
    glucose: 110,
    insulinUnits: 14,
    insulinType: 'bazal',
    insulinSite: 'Göbek (Karın)',
    carbs: 0,
    tag: 'gece',
    notes: 'Gece bazal insülini yapıldı (Lantus)',
    source: 'web',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 14).toISOString(),
  },
  {
    id: 'demo-2',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(),
    glucose: 92,
    insulinUnits: 5,
    insulinType: 'bolus',
    insulinSite: 'Göbek (Karın)',
    carbs: 45,
    mealType: 'Kahvaltı',
    tag: 'aclik',
    notes: 'Yumurta, peynir, 2 dilim tam buğday ekmeği',
    source: 'mobile',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(),
  },
  {
    id: 'demo-3',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString(),
    glucose: 138,
    insulinUnits: 0,
    carbs: 0,
    tag: 'tokluk',
    notes: 'Kahvaltı sonrası 2. saat ölçümü. İdeal seyrediyor.',
    source: 'web',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString(),
  },
  {
    id: 'demo-4',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 1).toISOString(),
    glucose: 165,
    insulinUnits: 6,
    insulinType: 'bolus',
    insulinSite: 'Sağ Kol',
    carbs: 60,
    mealType: 'Öğle Yemeği',
    tag: 'tokluk',
    notes: 'Tavuk pilav ve salata',
    source: 'mobile',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 1).toISOString(),
  },
];

// GET: Return all synced records
export async function GET(req) {
  try {
    return NextResponse.json({
      success: true,
      count: serverRecordsStore.length,
      records: serverRecordsStore,
      syncedAt: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// POST: Receive new records from Mobile App or Web and merge
export async function POST(req) {
  try {
    const body = await req.json();
    const { record, records, action } = body;

    // Handle single record post
    if (record) {
      const existingIdx = serverRecordsStore.findIndex(r => r.id === record.id);
      if (existingIdx >= 0) {
        serverRecordsStore[existingIdx] = { ...serverRecordsStore[existingIdx], ...record, updatedAt: new Date().toISOString() };
      } else {
        serverRecordsStore.unshift({ ...record, createdAt: record.createdAt || new Date().toISOString() });
      }
    }

    // Handle bulk records post (sync batch)
    if (Array.isArray(records)) {
      for (const rec of records) {
        const existingIdx = serverRecordsStore.findIndex(r => r.id === rec.id);
        if (existingIdx >= 0) {
          serverRecordsStore[existingIdx] = { ...serverRecordsStore[existingIdx], ...rec, updatedAt: new Date().toISOString() };
        } else {
          serverRecordsStore.unshift({ ...rec, createdAt: rec.createdAt || new Date().toISOString() });
        }
      }
    }

    // Handle delete action
    if (action === 'delete' && body.id) {
      serverRecordsStore = serverRecordsStore.filter(r => r.id !== body.id);
    }

    // Sort by timestamp descending
    serverRecordsStore.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    return NextResponse.json({
      success: true,
      message: 'Senkronizasyon başarılı',
      count: serverRecordsStore.length,
      records: serverRecordsStore,
      syncedAt: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
