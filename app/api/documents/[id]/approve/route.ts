import { NextRequest, NextResponse } from 'next/server';
import { updateDocumentStatus, logEmail, getDocumentById, saveStampedPdf } from '@/lib/db';
import { applyStamp } from '@/lib/pdf-stamp';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { status, approverName } = body;

    // Récupérer le document original (avec le PDF)
    const original = await getDocumentById(params.id);

    // Mettre à jour le statut
    const doc = await updateDocumentStatus(params.id, status, status === 'approved' ? new Date() : undefined);

    let emailLogged = false;
    let emailError: string | null = null;
    let stampError: string | null = null;

    // Appliquer le tampon visuel sur le PDF si approuvé et qu'on a le fichier original
    if (doc && status === 'approved' && original?.pdfData) {
      try {
        const pdfBytes = Buffer.from(original.pdfData, 'base64');
        const stampedBytes = await applyStamp(
          pdfBytes,
          'approved',
          approverName || 'Approbateur',
          new Date()
        );
        const stampedBase64 = Buffer.from(stampedBytes).toString('base64');
        await saveStampedPdf(params.id, stampedBase64);
      } catch (err) {
        stampError = String(err);
        console.error('Stamp error:', err);
      }
    }

    // Enregistrer la notification (visible dans "Mes notifications" pour la comptabilité)
    if (doc) {
      const subject = status === 'approved'
        ? `Facture approuvée: ${doc.fileName}`
        : `Facture rejetée: ${doc.fileName}`;

      try {
        const logged = await logEmail({
          to: 'comptabilite@conteneursexperts.com',
          subject,
          approuveurId: doc.approuveurId,
          documentId: doc.id,
          status: 'sent',
        });
        emailLogged = logged !== null;
      } catch (err) {
        emailError = String(err);
        console.error('Email log error:', err);
      }
    }

    return NextResponse.json({ success: true, document: doc, emailLogged, emailError, stampError });
  } catch (error) {
    console.error('Approve error:', error);
    return NextResponse.json(
      { error: 'Approval failed', details: String(error) },
      { status: 500 }
    );
  }
}
