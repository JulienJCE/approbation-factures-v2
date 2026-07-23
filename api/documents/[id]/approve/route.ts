import { NextRequest, NextResponse } from 'next/server';
import { updateDocumentStatus, getDocumentById } from '@/lib/db';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { status } = body;

    if (!status || !['approved', 'rejected'].includes(status)) {
      return NextResponse.json(
        { error: 'Statut invalide' },
        { status: 400 }
      );
    }

    const doc = await getDocumentById(params.id);
    if (!doc) {
      return NextResponse.json(
        { error: 'Document non trouvé' },
        { status: 404 }
      );
    }

    const updated = await updateDocumentStatus(
      params.id,
      status,
      status === 'approved' ? new Date() : undefined
    );

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Erreur lors de la mise à jour du document:', error);
    return NextResponse.json(
      { error: 'Impossible de mettre à jour le document' },
      { status: 500 }
    );
  }
}
