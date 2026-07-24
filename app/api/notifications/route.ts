import { NextResponse } from 'next/server';
import postgres from 'postgres';

export async function GET() {
  const db = postgres(process.env.DATABASE_URL!);
  try {
    const result = await db`
      SELECT jc.*, d.file_name, d.status as doc_status
      FROM journal_courriels jc
      JOIN documents d ON jc.document_id = d.id
      ORDER BY jc.sent_at DESC
      LIMIT 50
    `;
    await db.end();
    return NextResponse.json(result);
  } catch (error) {
    await db.end();
    console.error('Erreur notifications:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
