import { NextRequest, NextResponse } from 'next/server';
import { createDocument, getDocuments, isValidVisaCode, getVisaRouting, getPersonneById } from '@/lib/db';
import { put } from '@vercel/blob';
import { sendApprovalRequestEmail, sendVisaApprovedToPayables } from '@/lib/email';
import { applyStamp, imageToPdf } from '@/lib/pdf-stamp';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const type = (formData.get('type') as string) || 'invoice';
    const fileName = formData.get('fileName') as string;
    const volet = formData.get('volet') as string;
    const visaCode = formData.get('visaCode') as string;
    const approuveurId = formData.get('approuveurId') as string;
    const uploadedBy = (formData.get('uploadedBy') as string) || 'Comptabilité';
    const uploadedByEmail = formData.get('uploadedByEmail') as string;

    // Champs spécifiques aux dépenses Visa (Volet 2)
    const amountRaw = formData.get('amount') as string;
    const amountTpsRaw = formData.get('amountTps') as string;
    const amountTvqRaw = formData.get('amountTvq') as string;
    const category = (formData.get('category') as string) || undefined;
    const categoryOtherDescription = (formData.get('categoryOtherDescription') as string) || undefined;
    const expenseExplanation = (formData.get('expenseExplanation') as string) || undefined;

    if (!fileName || !volet) {
      return NextResponse.json({ error: 'Parametres manquants' }, { status: 400 });
    }

    // Validation des champs Volet 2
    let amount: number | undefined;
    let amountTps: number | undefined;
    let amountTvq: number | undefined;
    if (type === 'visa') {
      amount = amountRaw ? parseFloat(amountRaw) : undefined;
      amountTps = amountTpsRaw ? parseFloat(amountTpsRaw) : undefined;
      amountTvq = amountTvqRaw ? parseFloat(amountTvqRaw) : undefined;

      if (amount === undefined || isNaN(amount) || amount <= 0) {
        return NextResponse.json({ error: 'Montant invalide' }, { status: 400 });
      }
      if ((amountTps !== undefined && isNaN(amountTps)) || (amountTvq !== undefined && isNaN(amountTvq))) {
        return NextResponse.json({ error: 'Montant de taxe invalide' }, { status: 400 });
      }
      if (!category) {
        return NextResponse.json({ error: 'Catégorie requise' }, { status: 400 });
      }
      if (category === 'Autre' && !categoryOtherDescription?.trim()) {
        return NextResponse.json({ error: 'Description requise pour la catégorie Autre' }, { status: 400 });
      }
    }

    // Uploader le PDF vers Vercel Blob
    let pdfUrl: string | undefined;
    if (file) {
      const uniqueName = `originals/${Date.now()}-${fileName}`;
      const blob = await put(uniqueName, file, {
        access: 'public',
        contentType: 'application/pdf',
      });
      pdfUrl = blob.url;
    }

    // Traitement du routage visa
    let finalApprouveurId = approuveurId;
    let finalUploadedBy = uploadedBy;
    let finalUploadedByEmail = uploadedByEmail || undefined;
    if (type === 'visa') {
      if (!visaCode || !isValidVisaCode(visaCode)) {
        return NextResponse.json({ error: 'Code Visa invalide' }, { status: 400 });
      }
      const routing = getVisaRouting(visaCode);
      if (routing) {
        finalApprouveurId = routing.approuveurId;
        // Identité de l'employé déduite du code Visa (pour le batch mensuel)
        const employe = await getPersonneById(routing.employeId);
        if (employe) {
          finalUploadedBy = employe.nom;
          finalUploadedByEmail = employe.email;
        }
      }
    }

    // Tamponnage du reçu à la capture (Volet 2) :
    // - tampon VISA (bleu, centré) immédiatement
    // - si auto-approbation (Pierjean/Emre) : tampon APPROUVÉ (rouge) ajouté
    //   simultanément, décalé vers le bas pour que les deux restent lisibles
    if (type === 'visa' && file && pdfUrl) {
      try {
        const routing = getVisaRouting(visaCode);
        const raw = await file.arrayBuffer();
        const mime = (file.type || '').toLowerCase();

        // Photo de reçu (JPG/PNG) → convertie en PDF une page avant tamponnage
        let pdfBytes: Uint8Array | ArrayBuffer = raw;
        if (mime === 'image/jpeg' || mime === 'image/jpg' || mime === 'image/png') {
          pdfBytes = await imageToPdf(raw, mime === 'image/png' ? 'image/png' : 'image/jpeg');
        } else if (mime && mime !== 'application/pdf') {
          return NextResponse.json(
            { error: 'Format non supporté — utilisez un PDF ou une photo JPG/PNG' },
            { status: 400 }
          );
        }

        let stampedBytes = await applyStamp(pdfBytes, 'visa');
        if (routing?.autoApprove) {
          const approbateur = await getPersonneById(routing.approuveurId);
          stampedBytes = await applyStamp(
            stampedBytes,
            'approved',
            approbateur?.nom || 'Auto-approuvé',
            new Date(),
            -160
          );
        }
        const stampedName = fileName.replace(/\.(jpe?g|png|pdf|heic)$/i, '') + '.pdf';
        const stampedBlob = await put(`stamped/${Date.now()}-${stampedName}`, Buffer.from(stampedBytes), {
          access: 'public',
          contentType: 'application/pdf',
        });
        pdfUrl = stampedBlob.url;
      } catch (err) {
        // En cas d'échec du tamponnage, on conserve l'original (non bloquant)
        console.error('Stamp-at-capture error (original conservé):', err);
      }
    }

    const doc = await createDocument({
      type: type as 'visa' | 'invoice',
      fileName,
      approuveurId: finalApprouveurId,
      volet: parseInt(volet) as 1 | 2,
      visaCode,
      pdfUrl,
      submittedByName: finalUploadedBy,
      submittedByEmail: finalUploadedByEmail,
      amount,
      amountTps,
      amountTvq,
      category,
      categoryOtherDescription,
      expenseExplanation,
    });

    // Envoyer un email à l'approbateur pour l'aviser (sauf si auto-approuvé)
    let requestEmailSent = false;
    let requestEmailError: string | null = null;

    if (doc.status === 'pending') {
      const approbateur = await getPersonneById(finalApprouveurId);
      if (approbateur) {
        const emailResult = await sendApprovalRequestEmail(
          approbateur.email,
          approbateur.nom,
          fileName,
          uploadedBy,
          pdfUrl
        );
        requestEmailSent = emailResult.ok;
        requestEmailError = emailResult.error || null;
      } else {
        requestEmailError = 'Approbateur introuvable';
      }
    } else if (doc.status === 'approved' && type === 'visa' && pdfUrl) {
      // Auto-approbation (PS-2026, EK-2026) : la dépense ne passera jamais par
      // /api/documents/[id]/approve, donc l'envoi vers payables@ doit se faire ici.
      try {
        const approbateur = await getPersonneById(finalApprouveurId);
        const payablesResult = await sendVisaApprovedToPayables(
          fileName,
          approbateur?.nom || 'Auto-approuvé',
          pdfUrl,
          finalUploadedBy,
          amount,
          category
        );
        if (!payablesResult.ok) console.warn('Payables email failed:', payablesResult.error);
      } catch (err) {
        console.error('Payables email error (auto-approve):', err);
      }
    }

    return NextResponse.json({ ...doc, requestEmailSent, requestEmailError }, { status: 201 });
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json({ error: 'Erreur creation', details: String(error) }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const volet = request.nextUrl.searchParams.get('volet');
    const status = request.nextUrl.searchParams.get('status');
    const filters: any = {};
    if (volet) filters.volet = parseInt(volet);
    if (status) filters.status = status;
    const documents = await getDocuments(filters);
    return NextResponse.json(documents);
  } catch (error) {
    return NextResponse.json({ error: 'Erreur retrieval' }, { status: 500 });
  }
}
