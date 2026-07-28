import { NextResponse } from 'next/server';
import postgres from 'postgres';

export async function GET() {
  const db = postgres(process.env.DATABASE_URL!);
  try {
    const columns = await db`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'documents'
      ORDER BY ordinal_position
    `;
    const dbInfo = await db`
      SELECT current_database() as db, current_user as user, inet_server_addr() as host
    `;
    await db.end();
    return NextResponse.json({ columns, dbInfo: dbInfo[0] });
  } catch (error) {
    await db.end();
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
