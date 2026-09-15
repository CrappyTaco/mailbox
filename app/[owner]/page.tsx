import { parseAnimalDev } from '@/lib/animals/config';
import { notFound } from 'next/navigation';
import { MailboxWorld } from '@/components/world/MailboxWorld';
import { parseSkyPreview } from '@/lib/world-time';
export default async function MailboxPage({
  params,
  searchParams,
}: {
  params: Promise<{ owner: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { owner } = await params;
  if (owner !== 'indi' && owner !== 'auggie') notFound();
  const search = await searchParams;
  const local = process.env.LOCAL_PREVIEW === 'true';
  const animalDev = parseAnimalDev(
    search,
    process.env.LOCAL_PREVIEW === 'true',
  );
  // This server route captures one request timestamp, serialized for hydration.
  // oxlint-disable-next-line react/react-compiler
  const initialTime = Date.now();
  return (
    <MailboxWorld
      key={owner}
      owner={owner}
      animalDev={animalDev}
      initialTime={initialTime}
      previewTime={parseSkyPreview(search.skyTime, local)}
      mailboxPose={
        local &&
        (search.mailboxPose === 'open' || search.mailboxPose === 'closed')
          ? search.mailboxPose
          : undefined
      }
    />
  );
}
