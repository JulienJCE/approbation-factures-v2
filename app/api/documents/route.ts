import { NextRequest, NextResponse } from 'next/server';
import { createDocument, getDocuments, isValidVisaCode, getVisaRouting, getPersonneById } from '@/lib/db';
import { put } from '@vercel/blob';
import { sendApprovalRequestEmail } from '@/lib/email';

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
    if (type === 'visa') {
      if (!visaCode || !isValidVisaCode(visaCode)) {
        return NextResponse.json({ error: 'Code Visa invalide' }, { status: 400 });
      }
      const routing = getVisaRouting(visaCode);
      if (routing) finalApprouveurId = routing.approuveurId;
    }

    const doc = await createDocument({
      type: type as 'visa' | 'invoice',
      fileName,
      approuveurId: finalApprouveurId,
      volet: parseInt(volet) as 1 | 2,
      visaCode,
      pdfUrl,
      submittedByName: uploadedBy,
      submittedByEmail: uploadedByEmail || undefined,
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
