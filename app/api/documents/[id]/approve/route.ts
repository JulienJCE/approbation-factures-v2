import { NextRequest, NextResponse } from 'next/server';
import { updateDocumentStatus, logEmail, getDocumentById, saveStampedPdfUrl } from '@/lib/db';
import { applyStamp } from '@/lib/pdf-stamp';
import { sendApprovalEmail } from '@/lib/email';
import { put } from '@vercel/blob';

// Adresse email de la comptabilité qui reçoit les notifications
const COMPTA_EMAIL = process.env.COMPTA_EMAIL || 'julien.j@conteneursexperts.com';

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

    let emailSent = false;
    let emailError: string | null = null;
    let stampError: string | null = null;
    let stampedUrl: string | null = null;

    // Appliquer le tampon visuel sur le PDF si approuvé
    if (doc && status === 'approved' && original?.pdfUrl) {
      try {
        const pdfRes = await fetch(original.pdfUrl);
        if (!pdfRes.ok) throw new Error(`Fetch PDF failed: ${pdfRes.status}`);
        const pdfBytes = await pdfRes.arrayBuffer();

        const stampedBytes = await applyStamp(
          pdfBytes,
          'approved',
          approverName || 'Approbateur',
          new Date()
        );

        const stampedName = `stamped/${Date.now()}-${original.fileName}`;
        const blob = await put(stampedName, Buffer.from(stampedBytes), {
          access: 'public',
          contentType: 'application/pdf',
        });
        stampedUrl = blob.url;

        await saveStampedPdfUrl(params.id, stampedUrl);
      } catch (err) {
        stampError = String(err);
        console.error('Stamp error:', err);
      }
    }

    // Envoyer le vrai email + logguer
    if (doc) {
      try {
        // URL à inclure dans l'email: version tamponnée si dispo, sinon original
        const emailPdfUrl = stampedUrl || original?.pdfUrl;

        const emailResult = await sendApprovalEmail(
          COMPTA_EMAIL,
          doc.fileName,
          status,
          approverName || 'Approbateur',
          emailPdfUrl || undefined
        );

        emailSent = emailResult.ok;
        if (!emailResult.ok) emailError = emailResult.error || 'Unknown';

        // Logguer aussi en DB pour la page notifications
        await logEmail({
          to: COMPTA_EMAIL,
          subject: status === 'approved'
            ? `Facture approuvée: ${doc.fileName}`
            : `Facture rejetée: ${doc.fileName}`,
          approuveurId: doc.approuveurId,
          documentId: doc.id,
          status: emailResult.ok ? 'sent' : 'failed',
        });
      } catch (err) {
        emailError = String(err);
        console.error('Email error:', err);
      }
    }

    return NextResponse.json({
      success: true,
      document: doc,
      emailSent,
      emailError,
      stampError,
      stampedUrl,
    });
  } catch (error) {
    console.error('Approve error:', error);
    return NextResponse.json(
      { error: 'Approval failed', details: String(error) },
      { status: 500 }
    );
  }
}
