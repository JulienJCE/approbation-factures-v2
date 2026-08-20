import { NextRequest, NextResponse } from 'next/server';
import { updateDocumentStatus, logEmail, getDocumentById, saveStampedPdfUrl, markApprovedStamp } from '@/lib/db';
import { applyStamp } from '@/lib/pdf-stamp';
import { sendApprovalEmail, sendVisaApprovedToPayables } from '@/lib/email';
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
          new Date(),
          // Reçu Visa : le tampon VISA est déjà au centre → décaler le rouge
          original.type === 'visa' ? -160 : 0
        );

        // Le contenu re-televerse est TOUJOURS un PDF (le recu photo a ete
        // converti par imageToPdf a la capture). Le blob est servi avec
        // Content-Type application/pdf, donc un navigateur l'ouvre meme sous
        // une extension .jpg — mais des qu'il est telecharge sur disque,
        // Windows se fie a l'extension et echoue. Jumeau de asPdfName() dans
        // lib/email.ts ; garder les deux alignes.
        const baseName = original.fileName.replace(/\.(jpe?g|png|heic|heif|webp|pdf)$/i, '') + '.pdf';
        const stampedName = `stamped/${Date.now()}-${baseName}`;
        const blob = await put(stampedName, Buffer.from(stampedBytes), {
          access: 'public',
          contentType: 'application/pdf',
        });
        stampedUrl = blob.url;

        await saveStampedPdfUrl(params.id, stampedUrl);
        await markApprovedStamp(params.id);
      } catch (err) {
        stampError = String(err);
        console.error('Stamp error:', err);
      }
    }

    // Envoyer le vrai email + logguer
    if (doc) {
      try {
        // Destinataire = personne qui a soumis la facture (ou fallback si pas d'info)
        const recipientEmail = original?.submittedByEmail || 'julien.j@conteneursexperts.com';

        // URL à inclure dans l'email: version tamponnée si dispo, sinon original
        const emailPdfUrl = stampedUrl || original?.pdfUrl;

        const emailResult = await sendApprovalEmail(
          recipientEmail,
          doc.fileName,
          status,
          approverName || 'Approbateur',
          emailPdfUrl || undefined
        );

        emailSent = emailResult.ok;
        if (!emailResult.ok) emailError = emailResult.error || 'Unknown';

        // NOUVEAU : Pour Volet 2 Visa approuvé, envoyer AUSSI le PDF tamponné à payables@
        if (doc.type === 'visa' && status === 'approved' && stampedUrl) {
          try {
            const payablesResult = await sendVisaApprovedToPayables(
              doc.fileName,
              approverName || 'Approbateur',
              stampedUrl,
              original?.submittedByName || 'Employé',
              doc.amount,
              doc.category,
              doc.cardType ?? original?.cardType
            );
            // Si l'envoi échoue, logguer mais ne pas bloquer le reste
            if (!payablesResult.ok) console.warn('Payables email failed:', payablesResult.error);
          } catch (err) {
            console.error('Payables email error:', err);
          }
        }

        // Logguer aussi en DB pour la page notifications
        await logEmail({
          to: recipientEmail,
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
