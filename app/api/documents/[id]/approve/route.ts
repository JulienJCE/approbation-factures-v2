import { NextRequest, NextResponse } from 'next/server';
import { updateDocumentStatus, logEmail } from '@/lib/db';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { status, approverName } = body;

    // Mettre à jour le document
    const doc = await updateDocumentStatus(params.id, status, status === 'approved' ? new Date() : undefined);

    // Enregistrer la notification (visible dans "Mes notifications" pour la comptabilité)
    if (doc) {
      const subject = status === 'approved'
        ? `Facture approuvée: ${doc.fileName}`
        : `Facture rejetée: ${doc.fileName}`;

      await logEmail({
        to: 'comptabilite@conteneursexperts.com',
        subject,
        approuveurId: doc.approuveurId,
        documentId: doc.id,
        status: 'sent',
      });
    }

    return NextResponse.json({ success: true, document: doc });
  } catch (error) {
    console.error('Approve error:', error);
    return NextResponse.json(
      { error: 'Approval failed', details: String(error) },
      { status: 500 }
    );
  }
}
