import { getDocumentById } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const document = await getDocumentById(params.id);
    return NextResponse.json(document);
  } catch (error) {
    return NextResponse.json(
      { error: 'Document not found' },
      { status: 404 }
    );
  }
}
