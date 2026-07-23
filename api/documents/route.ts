import { NextRequest, NextResponse } from 'next/server';
import { createDocument, getDocuments, isValidVisaCode, getVisaRouting } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, fileName, approuveurId, volet, visaCode } = body;

    if (!type || !fileName || !volet) {
      return NextResponse.json({ error: 'Parametres manquants' }, { status: 400 });
    }

    let finalApprouveurId = approuveurId;
    if (type === 'visa') {
      if (!visaCode || !isValidVisaCode(visaCode)) {
        return NextResponse.json({ error: 'Code Visa invalide' }, { status: 400 });
      }
      const routing = getVisaRouting(visaCode);
      if (routing) finalApprouveurId = routing.approuveurId;
    }

    const doc = await createDocument({
      type,
      fileName,
      approuveurId: finalApprouveurId,
      volet,
      visaCode,
    });

    return NextResponse.json(doc, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Erreur creation' }, { status: 500 });
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
