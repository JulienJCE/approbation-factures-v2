import { NextResponse } from 'next/server';
import postgres from 'postgres';

export async function GET() {
  const db = postgres(process.env.DATABASE_URL!, { max: 1, prepare: false });

  try {
    // Ajouter les colonnes pour tracer qui a soumis la facture
    await db`ALTER TABLE documents ADD COLUMN IF NOT EXISTS submitted_by_name VARCHAR(255)`;
    await db`ALTER TABLE documents ADD COLUMN IF NOT EXISTS submitted_by_email VARCHAR(255)`;

    // Vérification
    const check = await db`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'documents' AND column_name IN ('submitted_by_name', 'submitted_by_email')
    `;

    await db.end();

    return NextResponse.json({
      success: true,
      message: 'Colonnes submitted_by ajoutees!',
      columnsFound: check,
    });
  } catch (error) {
    await db.end();
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
