import { NextResponse } from 'next/server';
import { getAllCharacters } from '@/lib/characters';

export async function GET() {
  try {
    const characters = await getAllCharacters();
    return NextResponse.json(characters);
  } catch (error) {
    console.error('Fehler beim Laden der Charaktere:', error);
    return NextResponse.json(
      { error: 'Charaktere konnten nicht geladen werden' },
      { status: 500 }
    );
  }
}