import { NextResponse } from 'next/server';
import postgres from 'postgres';

export async function GET() {
  const db = postgres(process.env.DATABASE_URL!);
  try {
    // Forcer un refresh du cache de schéma en tapant sur la table d'abord
    await db`SELECT id FROM documents LIMIT 1`;
    
    const columns = await db`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'documents'
      ORDER BY ordinal_position
    `;
    const dbInfo = await db`
      SELECT current_database() as db, current_user as user, inet_server_addr() as host, current_setting('cluster_name', true) as cluster
    `;
    // Compter les documents pour voir si c'est la même table
    const count = await db`SELECT COUNT(*) as n FROM documents`;
    await db.end();
    return NextResponse.json({ columns, dbInfo: dbInfo[0], docCount: count[0].n });
  } catch (error) {
    await db.end();
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
