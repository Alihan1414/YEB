import { NextResponse } from 'next/server';

let currentDoctorPlan = {
  patientId: '@default_patient',
  doctorName: 'Uzm. Dr. T1D Ekibi',
  doctorPhone: '05551234567',
  emergencyPhone: '112',
  icrMorning: 10,
  icrLunch: 12,
  icrDinner: 12,
  icrNight: 12,
  isf: 40,
  targetGlucose: 110,
  maxSingleBolus: 15,
  bolusBrand: 'Novorapid',
  basalBrand: 'Lantus',
  specialInstructions: 'Ana öğünlerden 15 dk önce bolus insülininizi yapın. Gece 03:00 hipoglisemi riskine karşı dikkatli olun.',
  updatedAt: new Date().toISOString(),
};

// GET: Return current Doctor Plan / Patient Parameters
export async function GET(req) {
  try {
    return NextResponse.json({
      success: true,
      plan: currentDoctorPlan,
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// POST: Update Doctor Plan / Patient Parameters
export async function POST(req) {
  try {
    const body = await req.json();
    currentDoctorPlan = {
      ...currentDoctorPlan,
      ...body,
      updatedAt: new Date().toISOString(),
    };

    return NextResponse.json({
      success: true,
      message: 'Doktor planı güncellendi ve senkronize edildi',
      plan: currentDoctorPlan,
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
