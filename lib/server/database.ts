import { getDatabase } from './env';
import {
  otherOwner,
  type Letter,
  type MailboxSnapshot,
  type Owner,
} from '../mailbox-state';
import type { SavedLetterArt } from '../letter-document';

export class DatabaseError extends Error {
  constructor(
    public code: string,
    public operation?: string,
  ) {
    super(code);
  }
}
const conflicts = [
  'waiting_for_reply',
  'open_letter_first',
  'conversation_changed',
  'idempotency_conflict',
  'letter_not_found',
  'invalid_body',
  'invalid_owner',
  'invalid_artwork',
];
interface Row extends Omit<Letter, 'sender' | 'recipient' | 'artwork'> {
  sender_id: Owner;
  recipient_id: Owner;
  client_id: string;
  artwork: string | null;
  deleted_by_sender: number;
  deleted_by_recipient: number;
}
function letter(row: Row): Letter {
  return {
    id: row.id,
    sender: row.sender_id,
    recipient: row.recipient_id,
    body: row.body,
    created_at: row.created_at,
    delivered_at: row.delivered_at,
    read_at: row.read_at,
    reply_to: row.reply_to,
    artwork: row.artwork ? (JSON.parse(row.artwork) as SavedLetterArt) : null,
  };
}
const visible =
  '((sender_id = ? AND deleted_by_sender = 0) OR (recipient_id = ? AND deleted_by_recipient = 0))';
function validateOwner(owner: Owner) {
  if (owner !== 'indi' && owner !== 'auggie')
    throw new DatabaseError('invalid_owner');
}
export class MailboxDatabase {
  constructor(private db: D1Database) {}
  private async run<T>(
    operation: string,
    action: () => Promise<T>,
  ): Promise<T> {
    try {
      return await action();
    } catch (error) {
      if (error instanceof DatabaseError) throw error;
      // Classify constant messages; never retain SQL, mail, or raw errors.
      const message = error instanceof Error ? error.message : '';
      const code =
        conflicts.find((value) => message.includes(value)) ??
        (message.includes('no such table')
          ? 'd1_migrations_missing'
          : 'd1_unavailable');
      throw new DatabaseError(code, operation);
    }
  }
  async snapshot(owner: Owner): Promise<MailboxSnapshot> {
    validateOwner(owner);
    return this.run('snapshot', async () => {
      const results = await this.db.batch([
        this.db
          .prepare(
            `SELECT l.* FROM mailbox_world w JOIN letters l ON l.id = w.latest_id WHERE ${visible}`,
          )
          .bind(owner, owner),
        this.db
          .prepare(
            'SELECT * FROM letters WHERE recipient_id = ? AND deleted_by_recipient = 0 ORDER BY created_at DESC, rowid DESC LIMIT 1',
          )
          .bind(owner),
        this.db
          .prepare(`SELECT w.established_at, w.latest_id AS reply_to, l.sender_id = ? AS waiting,
          (SELECT max(delivered_at) FROM letters WHERE recipient_id = ?) AS last_incoming_at
          FROM mailbox_world w LEFT JOIN letters l ON l.id = w.latest_id WHERE singleton = 1`)
          .bind(owner, owner),
      ]);
      const meta = results[2].results[0] as
        | {
            established_at: string;
            last_incoming_at: string | null;
            reply_to: string | null;
            waiting: number | null;
          }
        | undefined;
      if (!meta) throw new DatabaseError('d1_migrations_missing', 'snapshot');
      return {
        ...meta,
        waiting: Boolean(meta.waiting),
        latest: results[0].results[0]
          ? letter(results[0].results[0] as unknown as Row)
          : null,
        received: results[1].results[0]
          ? letter(results[1].results[0] as unknown as Row)
          : null,
      };
    });
  }
  async send(
    owner: Owner,
    input: {
      body: string;
      reply_to: string | null;
      client_id: string;
      artwork?: SavedLetterArt | null;
    },
  ): Promise<Letter> {
    validateOwner(owner);
    const body = input.body.trim();
    if (!body || body.length > 20000) throw new DatabaseError('invalid_body');
    const artwork = input.artwork ? JSON.stringify(input.artwork) : null;
    if (artwork && new TextEncoder().encode(artwork).length > 1900000)
      throw new DatabaseError('invalid_artwork');
    return this.run('send', async () => {
      const results = await this.db.batch([
        this.db
          .prepare(`INSERT INTO letters (id, sender_id, recipient_id, body, reply_to, client_id, artwork)
          SELECT ?, ?, ?, ?, ?, ?, ? WHERE NOT EXISTS (SELECT 1 FROM letters WHERE sender_id = ? AND client_id = ?)`)
          .bind(
            crypto.randomUUID(),
            owner,
            otherOwner(owner),
            body,
            input.reply_to,
            input.client_id,
            artwork,
            owner,
            input.client_id,
          ),
        this.db
          .prepare(
            'SELECT * FROM letters WHERE sender_id = ? AND client_id = ?',
          )
          .bind(owner, input.client_id),
      ]);
      const row = results[1].results[0] as unknown as Row;
      if (!row) throw new DatabaseError('d1_unavailable', 'send');
      if (
        row.body !== body ||
        row.reply_to !== input.reply_to ||
        row.artwork !== artwork
      )
        throw new DatabaseError('idempotency_conflict');
      if (row.deleted_by_sender) throw new DatabaseError('letter_not_found');
      return letter(row);
    });
  }
  async list(
    owner: Owner,
    box: 'inbox' | 'sent',
    offset = 0,
  ): Promise<Letter[]> {
    validateOwner(owner);
    return this.run('list', async () => {
      // Fixed queries, never identifiers received from a request.
      const sql =
        box === 'inbox'
          ? 'SELECT * FROM letters WHERE recipient_id = ? AND deleted_by_recipient = 0 ORDER BY created_at DESC, rowid DESC LIMIT 20 OFFSET ?'
          : 'SELECT * FROM letters WHERE sender_id = ? AND deleted_by_sender = 0 ORDER BY created_at DESC, rowid DESC LIMIT 20 OFFSET ?';
      const result = await this.db.prepare(sql).bind(owner, offset).all<Row>();
      return result.results.map(letter);
    });
  }
  async open(owner: Owner, id: string, recipientOnly = false): Promise<Letter> {
    validateOwner(owner);
    return this.run('open', async () => {
      const results = await this.db.batch([
        this.db
          .prepare(
            `UPDATE letters SET read_at = coalesce(read_at, strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) WHERE id = ? AND recipient_id = ? AND deleted_by_recipient = 0`,
          )
          .bind(id, owner),
        this.db
          .prepare(
            recipientOnly
              ? 'SELECT * FROM letters WHERE id = ? AND recipient_id = ? AND deleted_by_recipient = 0'
              : `SELECT * FROM letters WHERE id = ? AND ${visible}`,
          )
          .bind(...(recipientOnly ? [id, owner] : [id, owner, owner])),
      ]);
      const row = results[1].results[0] as unknown as Row | undefined;
      if (!row) throw new DatabaseError('letter_not_found');
      return letter(row);
    });
  }
  async delete(owner: Owner, id: string): Promise<void> {
    validateOwner(owner);
    return this.run('delete', async () => {
      const row = await this.db
        .prepare(`UPDATE letters SET
        deleted_by_sender = CASE WHEN sender_id = ? THEN 1 ELSE deleted_by_sender END,
        deleted_by_recipient = CASE WHEN recipient_id = ? THEN 1 ELSE deleted_by_recipient END
        WHERE id = ? AND (sender_id = ? OR recipient_id = ?) RETURNING id`)
        .bind(owner, owner, id, owner, owner)
        .first();
      if (!row) throw new DatabaseError('letter_not_found');
    });
  }
}
export async function mailboxDatabase() {
  return new MailboxDatabase(await getDatabase());
}
