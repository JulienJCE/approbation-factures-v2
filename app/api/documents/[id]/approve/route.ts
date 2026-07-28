import { NextRequest, NextResponse } from 'next/server';
import { updateDocumentStatus, logEmail, getDocumentById, saveStampedPdfUrl } from '@/lib/db';
import { applyStamp } from '@/lib/pdf-stamp';
import { put } from '@vercel/blob';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { status, approverName } = body;

    // Récupérer le document original (avec URL Blob)
    const original = await getDocumentById(params.id);

    // Mettre à jour le statut
    const doc = await updateDocumentStatus(params.id, status, status === 'approved' ? new Date() : undefined);

    let emailLogged = false;
    let emailError: string | null = null;
    let stampError: string | null = null;
    let stampedUrl: string | null = null;

    // Appliquer le tampon visuel sur le PDF si approuvé
    if (doc && status === 'approved' && original?.pdfUrl) {
      try {
        // Télécharger le PDF original depuis Blob
        const pdfRes = await fetch(original.pdfUrl);
        if (!pdfRes.ok) throw new Error(`Fetch PDF failed: ${pdfRes.status}`);
        const pdfBytes = await pdfRes.arrayBuffer();

        // Appliquer le tampon
        const stampedBytes = await applyStamp(
          pdfBytes,
          'approved',
          approverName || 'Approbateur',
          new Date()
        );

        // Uploader la version tamponnée vers Blob
        const stampedName = `stamped/${Date.now()}-${original.fileName}`;
        const blob = await put(stampedName, Buffer.from(stampedBytes), {
          access: 'public',
          contentType: 'application/pdf',
        });
        stampedUrl = blob.url;

        // Sauvegarder l'URL en DB
        await saveStampedPdfUrl(params.id, stampedUrl);
      } catch (err) {
        stampError = String(err);
        console.error('Stamp error:', err);
      }
    }

    // Enregistrer la notification
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

    return NextResponse.json({ success: true, document: doc, emailLogged, emailError, stampError, stampedUrl });
  } catch (error) {
    console.error('Approve error:', error);
    return NextResponse.json(
      { error: 'Approval failed', details: String(error) },
      { status: 500 }
    );
  }
}
