import { NextResponse } from 'next/server';
import postgres from 'postgres';

export async function GET() {
  const db = postgres(process.env.DATABASE_URL!, { max: 1 });

  try {
    // Utiliser une transaction explicite pour forcer le commit
    const result = await db.begin(async (tx) => {
      await tx`ALTER TABLE documents ADD COLUMN IF NOT EXISTS pdf_data TEXT`;
      await tx`ALTER TABLE documents ADD COLUMN IF NOT EXISTS pdf_data_stamped TEXT`;

      // Vérifier immédiatement dans la transaction
      const check = await tx`
        SELECT column_name FROM information_schema.columns
        WHERE table_name = 'documents' AND column_name IN ('pdf_data', 'pdf_data_stamped')
      `;
      return check;
    });

    await db.end();

    return NextResponse.json({
      success: true,
      message: 'Migration terminee',
      columnsFound: result
    });
  } catch (error) {
    await db.end();
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}
