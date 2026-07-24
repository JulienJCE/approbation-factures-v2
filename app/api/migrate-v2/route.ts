import { NextResponse } from 'next/server';
import postgres from 'postgres';

export async function GET() {
  const db = postgres(process.env.DATABASE_URL!);

  try {
    // Ajouter les colonnes pour stocker le PDF (base64) original et le PDF tamponné
    await db`ALTER TABLE documents ADD COLUMN IF NOT EXISTS pdf_data TEXT`;
    await db`ALTER TABLE documents ADD COLUMN IF NOT EXISTS pdf_data_stamped TEXT`;

    await db.end();

    return NextResponse.json({
      success: true,
      message: 'Colonnes pdf_data et pdf_data_stamped ajoutees avec succes!'
    });
  } catch (error) {
    await db.end();
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}
