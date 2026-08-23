import { NextResponse } from 'next/server';
import { readDb, writeDb } from '@/lib/db';

export const dynamic = 'force-dynamic';

const FIREBASE_API_KEY    = process.env.NEXT_PUBLIC_FIREBASE_API_KEY    || 'AIzaSyCH7bTzvqJqSzJiV0Ou6JudPovkrrWrwdw';
const FIREBASE_PROJECT_ID = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'vision-b1ad5';

function getTodayString() {
  const d = new Date();
  return d.toISOString().split('T')[0];
}

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const rawInstId = searchParams.get('institutionId') || 'yamanevler';
    const institutionId = rawInstId.trim().toLowerCase();
    const date = searchParams.get('date') || getTodayString();
    const week = searchParams.get('week'); // if 'current', return list of recent/week menus

    let menus = [];

    // 1. Fetch from local DB
    try {
      const dbData = readDb();
      const localMenus = dbData.foodMenus || [];
      menus = localMenus.filter(m => (m.institutionId || m.institution_id || '').toLowerCase() === institutionId);
    } catch (e) {
      console.warn("Local DB read foodMenus warn:", e.message);
    }

    // 2. Fetch from Firestore
    try {
      const res = await fetch(
        `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/foodMenus?key=${FIREBASE_API_KEY}&pageSize=100`,
        { cache: 'no-store' }
      );
      if (res.ok) {
        const data = await res.json();
        const docs = data.documents || [];
        docs.forEach(doc => {
          const f = doc.fields || {};
          const docInst = (f.institutionId?.stringValue || f.institution_id?.stringValue || '').toLowerCase();
          if (docInst === institutionId) {
            const menuId = doc.name.split('/').pop();
            const existingIndex = menus.findIndex(m => m.id === menuId || m.date === f.date?.stringValue);
            const item = {
              id: menuId,
              institutionId: docInst,
              date: f.date?.stringValue || '',
              dayName: f.dayName?.stringValue || '',
              breakfast: f.breakfast?.stringValue || '',
              lunch: f.lunch?.stringValue || '',
              dinner: f.dinner?.stringValue || '',
              snack: f.snack?.stringValue || '',
              note: f.note?.stringValue || '',
              updated_by: f.updated_by?.stringValue || '',
              updated_at: f.updated_at?.stringValue || ''
            };
            if (existingIndex >= 0) {
              menus[existingIndex] = item;
            } else {
              menus.push(item);
            }
          }
        });
      }
    } catch (err) {
      console.warn("Firestore fetch foodMenus error:", err.message);
    }

    menus.sort((a, b) => (b.date || '').localeCompare(a.date || ''));

    // If specific date requested
    if (date && !week) {
      const todayMenu = menus.find(m => m.date === date) || null;
      return NextResponse.json({ success: true, menu: todayMenu, allMenus: menus });
    }

    return NextResponse.json({ success: true, menus, currentMenu: menus.find(m => m.date === getTodayString()) || null });

  } catch (error) {
    console.error("GET Food Menu error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const body = await req.json();
    const {
      institutionId = 'yamanevler',
      date = getTodayString(),
      dayName,
      breakfast = '',
      lunch = '',
      dinner = '',
      snack = '',
      note = '',
      updated_by = 'Aşçı'
    } = body;

    const instId = institutionId.trim().toLowerCase();
    const menuId = `${instId}_${date}`;
    const nowIso = new Date().toISOString();

    const menuData = {
      id: menuId,
      institutionId: instId,
      date,
      dayName: dayName || new Date(date).toLocaleDateString('tr-TR', { weekday: 'long' }),
      breakfast: breakfast.trim(),
      lunch: lunch.trim(),
      dinner: dinner.trim(),
      snack: snack.trim(),
      note: note.trim(),
      updated_by,
      updated_at: nowIso
    };

    // 1. Save to local DB
    try {
      const dbData = readDb();
      dbData.foodMenus = dbData.foodMenus || [];
      dbData.foodMenus = dbData.foodMenus.filter(m => m.id !== menuId && !(m.institutionId === instId && m.date === date));
      dbData.foodMenus.unshift(menuData);
      writeDb(dbData);
    } catch (e) {
      console.error("Local DB save foodMenu error:", e.message);
    }

    // 2. Save to Firestore
    try {
      await fetch(
        `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/foodMenus/${menuId}?key=${FIREBASE_API_KEY}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fields: {
              institutionId: { stringValue: instId },
              date:          { stringValue: date },
              dayName:       { stringValue: menuData.dayName },
              breakfast:     { stringValue: menuData.breakfast },
              lunch:         { stringValue: menuData.lunch },
              dinner:        { stringValue: menuData.dinner },
              snack:         { stringValue: menuData.snack },
              note:          { stringValue: menuData.note },
              updated_by:    { stringValue: updated_by },
              updated_at:    { stringValue: nowIso },
            },
          }),
        }
      );
    } catch (fsErr) {
      console.warn("Firestore save foodMenu warn:", fsErr.message);
    }

    return NextResponse.json({ success: true, menu: menuData });

  } catch (error) {
    console.error("POST Food Menu error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(req) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ success: false, error: 'Menü ID eksik' }, { status: 400 });

    const dbData = readDb();
    if (dbData.foodMenus) {
      dbData.foodMenus = dbData.foodMenus.filter(m => m.id !== id);
      writeDb(dbData);
    }

    try {
      await fetch(
        `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/foodMenus/${id}?key=${FIREBASE_API_KEY}`,
        { method: 'DELETE' }
      );
    } catch (e) {
      console.warn("Firestore delete foodMenu warn:", e.message);
    }

    return NextResponse.json({ success: true, id });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
