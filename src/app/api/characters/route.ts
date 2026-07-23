import { NextResponse } from 'next/server';
import { getAllCharacters } from '@/lib/characters';
import { logCaughtError } from '@/lib/errorLog';

export async function GET() {
  try {
    const characters = await getAllCharacters();
    return NextResponse.json(characters);
  } catch (error) {
    console.error('Fehler beim Laden der Charaktere:', error);
    await logCaughtError(error, 'api/characters/route.ts:GET');
    return NextResponse.json(
      { error: 'Charaktere konnten nicht geladen werden' },
      { status: 500 }
    );
  }
}