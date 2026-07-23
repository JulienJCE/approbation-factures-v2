import { NextRequest, NextResponse } from 'next/server';
import { updateDocumentStatus } from '@/lib/db';
import { sendApprovalEmail } from '@/lib/email';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { status, approverName } = body;

    // Mettre à jour le document
    const doc = await updateDocumentStatus(params.id, status);

    // Envoyer l'email
    if (doc) {
      await sendApprovalEmail(
        'notification@conteneursexperts.com',
        doc.fileName,
        status,
        approverName || 'Admin'
      );
    }

    return NextResponse.json({ success: true, document: doc });
  } catch (error) {
    return NextResponse.json(
      { error: 'Approval failed' },
      { status: 500 }
    );
  }
}
