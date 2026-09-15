import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  agingStage,
  getMailboxState,
  type Letter,
  type MailboxSnapshot,
} from '../lib/mailbox-state';
const now = Date.parse('2026-09-05T12:00:00Z');
const days = (n: number) => new Date(now - n * 86400000).toISOString();
const letter: Letter = {
  id: crypto.randomUUID(),
  sender: 'auggie',
  recipient: 'indi',
  body: 'A little hello.',
  created_at: days(0),
  delivered_at: days(0),
  read_at: null,
  reply_to: null,
};
const snapshot: MailboxSnapshot = {
  latest: null,
  last_incoming_at: null,
  established_at: days(0),
};
for (const [daysAgo, expected] of [
  [0, 0],
  [6.99, 0],
  [7, 1],
  [13.99, 1],
  [14, 2],
  [29.99, 2],
  [30, 3],
  [90, 3],
] as const) {
  void test('aging boundary: ' + daysAgo + ' days', () =>
    assert.equal(agingStage(days(daysAgo), days(99), now), expected),
  );
}
void test('no messages: first-run mailbox is fresh', () =>
  assert.deepEqual(getMailboxState('indi', snapshot, now), {
    state: 'empty-fresh',
    age: 0,
  }));
void test('no incoming letters age from world creation', () =>
  assert.equal(
    getMailboxState('indi', { ...snapshot, established_at: days(30) }, now).age,
    3,
  ));
void test('unread incoming mail restores the mailbox', () =>
  assert.deepEqual(
    getMailboxState(
      'indi',
      { ...snapshot, latest: letter, established_at: days(15) },
      now,
    ),
    { state: 'new-mail', age: 0 },
  ));
void test('opened incoming letter remains available to reopen and reply', () =>
  assert.equal(
    getMailboxState(
      'indi',
      { ...snapshot, latest: { ...letter, read_at: days(0) } },
      now,
    ).state,
    'opened-awaiting-reply',
  ));
void test('latest outgoing letter waits for a reply', () =>
  assert.equal(
    getMailboxState('auggie', { ...snapshot, latest: letter }, now).state,
    'waiting',
  ));
void test('outgoing activity does not reset incoming age', () =>
  assert.equal(
    getMailboxState(
      'auggie',
      { ...snapshot, latest: letter, last_incoming_at: days(14) },
      now,
    ).age,
    2,
  ));
void test('future timestamps stay fresh', () =>
  assert.equal(agingStage(days(-2), days(0), now), 0));
