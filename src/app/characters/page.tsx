import { getAllCharacters } from '@/lib/characters';
import CharacterPage from './CharacterPage';
export const dynamic = 'force-dynamic';

export default async function CharakterePage() {
  const characters = await getAllCharacters(); 
  return <CharacterPage characters={characters} />;
}
