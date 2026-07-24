import { NextResponse } from 'next/server';
import postgres from 'postgres';

export async function GET() {
  const db = postgres(process.env.DATABASE_URL!);

  try {
    // Supprimer l'ancienne table documents si elle existe (contrainte FK cassée)
    await db`DROP TABLE IF EXISTS journal_courriels CASCADE`;
    await db`DROP TABLE IF EXISTS documents CASCADE`;

    // Recréer sans la contrainte FK stricte sur approuveur_id
    // (les personnes sont gérées en mémoire dans le code, pas en DB)
    await db`
      CREATE TABLE documents (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        type VARCHAR(50) NOT NULL CHECK (type IN ('invoice', 'visa')),
        file_name VARCHAR(255) NOT NULL,
        volet INTEGER NOT NULL CHECK (volet IN (1, 2)),
        status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
        approuveur_id VARCHAR(50) NOT NULL,
        visa_code VARCHAR(50),
        pdf_url VARCHAR(512),
        stamps_applied TEXT[],
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        approved_at TIMESTAMP
      )
    `;

    await db`
      CREATE TABLE journal_courriels (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        document_id UUID NOT NULL,
        approuveur_id VARCHAR(50) NOT NULL,
        to_email VARCHAR(255) NOT NULL,
        subject VARCHAR(512) NOT NULL,
        status VARCHAR(50) NOT NULL CHECK (status IN ('sent', 'failed')),
        sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;

    await db.end();

    return NextResponse.json({
      success: true,
      message: 'Table documents recréée sans contrainte FK. Prête à utiliser!'
    });
  } catch (error) {
    await db.end();
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}
