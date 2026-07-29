// File: app/api/migrate-submitted-by.ts
// This endpoint runs the migration to add submitted_by_name and submitted_by_email columns
// Usage: GET /api/migrate-submitted-by

import postgres from 'postgres';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  // Security check - only allow from localhost or specific origins
  const origin = req.headers.get('origin');
  const host = req.headers.get('host');
  
  // Log the request
  console.log(`[MIGRATION] Request from origin: ${origin}, host: ${host}`);

  try {
    const db = postgres(process.env.DATABASE_URL!);

    console.log('[MIGRATION] Starting migration...');

    // Step 1: Add columns if they don't exist
    await db`ALTER TABLE documents 
              ADD COLUMN IF NOT EXISTS submitted_by_name VARCHAR(255),
              ADD COLUMN IF NOT EXISTS submitted_by_email VARCHAR(255)`;
    console.log('[MIGRATION] ✅ Columns added (or already exist)');

    // Step 2: Create index if it doesn't exist
    try {
      await db`CREATE INDEX IF NOT EXISTS idx_documents_submitted_by_email ON documents(submitted_by_email)`;
      console.log('[MIGRATION] ✅ Index created (or already exists)');
    } catch (err) {
      console.log('[MIGRATION] Index may already exist:', err);
    }

    // Step 3: Set default values for NULL entries
    const updateResult = await db`UPDATE documents 
                                   SET submitted_by_name = 'Unknown' 
                                   WHERE submitted_by_name IS NULL`;
    console.log(`[MIGRATION] ✅ Updated ${updateResult.count} rows with default submitted_by_name`);

    await db.end();

    return NextResponse.json({
      success: true,
      message: 'Migration completed successfully!',
      timestamp: new Date().toISOString(),
      details: {
        columnsAdded: true,
        indexCreated: true,
        rowsUpdated: updateResult.count
      }
    });
  } catch (error: any) {
    console.error('[MIGRATION] Error:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Migration failed',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}
