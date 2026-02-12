import { prisma } from '@/lib/db';
import { PersonaLibrary } from '@/app/components/personas/PersonaLibrary';

export default async function PersonasPage() {
  const personas = await prisma.persona.findMany({
    orderBy: { name: 'asc' },
  });

  return (
    <div className="container mx-auto py-8">
      <PersonaLibrary personas={personas} />
    </div>
  );
}
