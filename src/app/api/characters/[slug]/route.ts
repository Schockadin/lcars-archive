import { NextResponse } from 'next/server';
import { getCharacterBySlug } from '@/lib/characters';
import { getViewer, canView } from '@/lib/visibility';
import { logCaughtError } from '@/lib/errorLog';

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

    if (character.visibility !== 'public') {
      const viewer = await getViewer();
      if (!canView(character.visibility, character.player_id, viewer)) {
        return NextResponse.json(
          { error: 'Charakter nicht gefunden' },
          { status: 404 }
        );
      }
    }

    return NextResponse.json(character);
  } catch (error) {
    console.error('Fehler beim Laden des Charakters:', error);
    await logCaughtError(error, 'api/characters/[slug]/route.ts:GET');
    return NextResponse.json(
      { error: 'Charakter konnte nicht geladen werden' },
      { status: 500 }
    );
  }
}