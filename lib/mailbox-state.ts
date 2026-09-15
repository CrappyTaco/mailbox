import type { SavedLetterArt } from './letter-document';
export type Owner = 'indi' | 'auggie';
export const displayName = (owner: Owner) =>
  owner === 'indi' ? 'Indi' : 'Auggie';
export const otherOwner = (owner: Owner): Owner =>
  owner === 'indi' ? 'auggie' : 'indi';
export interface Letter {
  id: string;
  sender: Owner;
  recipient: Owner;
  body: string;
  created_at: string;
  delivered_at: string;
  read_at: string | null;
  reply_to: string | null;
  artwork?: SavedLetterArt | null;
}
export interface MailboxSnapshot {
  reply_to?: string | null;
  waiting?: boolean;
  latest: Letter | null;
  received?: Letter | null;
  last_incoming_at: string | null;
  established_at: string;
}
export function receivedLetter(owner: Owner, snapshot: MailboxSnapshot | null) {
  // Historical received letters stay stored, but only the current unanswered
  // incoming letter belongs to the interactive mailbox.
  return snapshot?.latest?.recipient === owner ? snapshot.latest : null;
}
export function mailboxPresentation(state: MailboxState) {
  return {
    door:
      state === 'opened-awaiting-reply'
        ? ('open' as const)
        : ('closed' as const),
    flag: state === 'new-mail' || state === 'opened-awaiting-reply',
    envelope: state === 'opened-awaiting-reply',
  };
}
export type MailboxState =
  | 'empty-fresh'
  | 'empty-dusty'
  | 'empty-weathered'
  | 'empty-overgrown'
  | 'new-mail'
  | 'opened-awaiting-reply'
  | 'waiting';
export function agingStage(
  lastIncoming: string | null,
  establishedAt: string,
  now = Date.now(),
): 0 | 1 | 2 | 3 {
  const days = Math.max(
    0,
    (now - Date.parse(lastIncoming ?? establishedAt)) / 86_400_000,
  );
  return days >= 30 ? 3 : days >= 14 ? 2 : days >= 7 ? 1 : 0;
}
export function getMailboxState(
  owner: Owner,
  snapshot: MailboxSnapshot,
  now = Date.now(),
): { state: MailboxState; age: 0 | 1 | 2 | 3 } {
  const age = agingStage(
    snapshot.last_incoming_at,
    snapshot.established_at,
    now,
  );
  if (snapshot.latest?.recipient === owner)
    return {
      state: snapshot.latest.read_at ? 'opened-awaiting-reply' : 'new-mail',
      age: snapshot.latest.read_at ? age : 0,
    };
  if (snapshot.latest?.sender === owner || snapshot.waiting)
    return { state: 'waiting', age };
  return {
    state: (
      [
        'empty-fresh',
        'empty-dusty',
        'empty-weathered',
        'empty-overgrown',
      ] as const
    )[age],
    age,
  };
}
