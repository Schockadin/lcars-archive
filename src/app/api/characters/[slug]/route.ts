import { NextResponse } from 'next/server';
import { getCharacterBySlug } from '@/lib/characters';

interface Params {
  params: Promise<{ slug: string }>;
}

export async function GET(_req: Request, { params }: Params) {
  try {
    const { slug } = await params;
    const character = await getCharacterBySlug(slug);

    if (!character) {
      return NextResponse.json(
        { error: 'Charakter nicht gefunden' },
        { status: 404 }
      );
    }

    return NextResponse.json(character);
  } catch (error) {
    console.error('Fehler beim Laden des Charakters:', error);
    return NextResponse.json(
      { error: 'Charakter konnte nicht geladen werden' },
      { status: 500 }
    );
  }
}