import { getCharacterBySlug } from '@/lib/characters';
import { notFound } from 'next/navigation';
import CharakterDetailPage from './CharacterDetailPage';

// export const dynamic = 'force-dynamic';

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function CharakterPage({ params }: Props) {
  const { slug } = await params;
  const character = await getCharacterBySlug(slug);

  if (!character) notFound();

  return <CharakterDetailPage character={character}/>
}