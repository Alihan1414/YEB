import { NextResponse } from 'next/server';
import { readDb, writeDb } from '@/lib/db';

export async function POST(req) {
  try {
    const { institutionId, name, email, logoUrl, primaryColor, enabledModules } = await req.json();

    if (!institutionId) {
      return NextResponse.json({ success: false, error: 'Kurum ID zorunludur.' }, { status: 400 });
    }

    const dbData = readDb();
    if (!dbData.institutions) dbData.institutions = [];

    let instIndex = dbData.institutions.findIndex(i => i.id === institutionId);
    let instRecord = instIndex >= 0 ? dbData.institutions[instIndex] : { id: institutionId };

    if (name) instRecord.name = name.trim();
    if (email) instRecord.email = email.trim();
    if (logoUrl !== undefined) instRecord.logoUrl = logoUrl;
    if (primaryColor !== undefined) instRecord.primaryColor = primaryColor;
    if (enabledModules !== undefined) instRecord.enabledModules = enabledModules;

    if (instIndex >= 0) {
      dbData.institutions[instIndex] = instRecord;
    } else {
      dbData.institutions.push(instRecord);
    }

    // Also update matching users' institutionName, logoUrl, primaryColor
    if (dbData.users) {
      dbData.users = dbData.users.map(u => {
        if (u.institutionId === institutionId) {
          return {
            ...u,
            institutionName: name ? name.trim() : u.institutionName,
            logoUrl: logoUrl !== undefined ? logoUrl : u.logoUrl,
            primaryColor: primaryColor !== undefined ? primaryColor : u.primaryColor,
          };
        }
        return u;
      });
    }

    writeDb(dbData);

    return NextResponse.json({
      success: true,
      institution: instRecord,
      message: 'Kurum markalaştırma ve ayarları başarıyla güncellendi.'
    });

  } catch (error) {
    console.error("Update institution API error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
