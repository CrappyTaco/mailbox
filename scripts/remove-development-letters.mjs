// Run only with the local database bridge stopped. Never touches hosted data.
import { PGlite } from '@electric-sql/pglite';
import { mkdir, writeFile } from 'node:fs/promises';
const db = new PGlite('.local/postgres');
try {
  const letters = (
    await db.query('select * from public.letters order by created_at, id')
  ).rows;
  const knownEarlyChecks = new Set([
    '427ee160-943e-4aa9-a083-6f1949150a5d',
    'e906c8ca-d8da-4db8-a9bf-2e13a1a74398',
  ]);
  const removed = letters.filter(
    (l) => l.body.startsWith('[Preview test]') || knownEarlyChecks.has(l.id),
  );
  if (!removed.length) {
    console.log('No development letters remain.');
  } else {
    const ids = removed.map((l) => l.id),
      idSet = new Set(ids),
      byId = new Map(letters.map((l) => [l.id, l]));
    await mkdir('.local/maintenance', { recursive: true });
    await writeFile(
      `.local/maintenance/before-development-cleanup-${Date.now()}.json`,
      JSON.stringify(
        {
          letters,
          world: (await db.query('select * from public.mailbox_world')).rows,
        },
        null,
        2,
      ),
      { flag: 'wx' },
    );
    await db.transaction(async (tx) => {
      // Walk past removed checks so genuine replies still point to retained mail.
      for (const letter of letters.filter((l) => !idSet.has(l.id))) {
        let reply = letter.reply_to;
        while (reply && idSet.has(reply))
          reply = byId.get(reply)?.reply_to ?? null;
        if (reply !== letter.reply_to)
          await tx.query('update public.letters set reply_to=$1 where id=$2', [
            reply,
            letter.id,
          ]);
      }
      await tx.query(
        'update public.mailbox_world set latest_id=(select id from public.letters where not(id=any($1::uuid[])) order by created_at desc,id desc limit 1)',
        [ids],
      );
      await tx.query(
        'update public.letters set reply_to=null where id=any($1::uuid[])',
        [ids],
      );
      await tx.query('delete from public.letters where id=any($1::uuid[])', [
        ids,
      ]);
    });
    console.log(
      `Removed ${removed.length} known development letters; preserved ${letters.length - removed.length} other letters. Private recovery copy saved outside the app.`,
    );
  }
} finally {
  await db.close();
}
