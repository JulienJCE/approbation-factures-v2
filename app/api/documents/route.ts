import { NextRequest, NextResponse } from 'next/server';
import { createDocument, getDocuments, isValidVisaCode, getVisaRouting } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const type = (formData.get('type') as string) || 'invoice';
    const fileName = formData.get('fileName') as string;
    const volet = formData.get('volet') as string;
    const visaCode = formData.get('visaCode') as string;
    const approuveurId = formData.get('approuveurId') as string;

    if (!fileName || !volet) {
      return NextResponse.json({ error: 'Parametres manquants' }, { status: 400 });
    }

    // Encoder le fichier en base64 pour stockage en DB
    let pdfData: string | undefined;
    if (file) {
      const bytes = await file.arrayBuffer();
      pdfData = Buffer.from(bytes).toString('base64');
    }

    // Traiter le fichier (pour l'instant, juste sauvegarder les métadonnées)
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
      pdfData,
    });

    return NextResponse.json(doc, { status: 201 });
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
