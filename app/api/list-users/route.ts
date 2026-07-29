import { NextResponse } from 'next/server';
import postgres from 'postgres';

export async function GET() {
  const db = postgres(process.env.DATABASE_URL!, { max: 1, prepare: false });
  try {
    const users = await db`SELECT id, email, name, role, must_change_password FROM users ORDER BY name`;
    const count = await db`SELECT COUNT(*) as n FROM users`;
    const dbInfo = await db`SELECT current_database() as db, current_user as usr`;
    await db.end();
    return NextResponse.json({ count: count[0].n, dbInfo: dbInfo[0], users });
  } catch (error) {
    await db.end();
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
