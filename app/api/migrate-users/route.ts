import { NextResponse } from 'next/server';
import postgres from 'postgres';

export async function GET() {
  const db = postgres(process.env.DATABASE_URL!, { max: 1, prepare: false });

  try {
    await db`DROP TABLE IF EXISTS users CASCADE`;

    await db`
      CREATE TABLE users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email VARCHAR(255) NOT NULL UNIQUE,
        name VARCHAR(255) NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        role VARCHAR(50) NOT NULL CHECK (role IN ('admin', 'approbateur', 'comptabilite')),
        can_approve BOOLEAN NOT NULL DEFAULT false,
        must_change_password BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;

    const check = await db`
      SELECT column_name FROM information_schema.columns WHERE table_name = 'users' ORDER BY ordinal_position
    `;

    await db.end();

    return NextResponse.json({
      success: true,
      message: 'Table users creee!',
      columns: check
    });
  } catch (error) {
    await db.end();
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
