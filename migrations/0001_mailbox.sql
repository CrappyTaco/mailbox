-- Preserve UUIDs, artwork, delivery dates, reply links and retry IDs.
CREATE TABLE letters (
  id TEXT PRIMARY KEY NOT NULL,
  sender_id TEXT NOT NULL CHECK (sender_id IN ('indi', 'auggie')),
  recipient_id TEXT NOT NULL CHECK (recipient_id IN ('indi', 'auggie')),
  subject TEXT,
  body TEXT NOT NULL CHECK (length(trim(body)) BETWEEN 1 AND 20000),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  delivered_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  read_at TEXT,
  reply_to TEXT REFERENCES letters(id),
  client_id TEXT NOT NULL,
  artwork TEXT CHECK (artwork IS NULL OR (json_valid(artwork) AND length(CAST(artwork AS BLOB)) <= 1900000)),
  deleted_by_sender INTEGER NOT NULL DEFAULT 0 CHECK (deleted_by_sender IN (0, 1)),
  deleted_by_recipient INTEGER NOT NULL DEFAULT 0 CHECK (deleted_by_recipient IN (0, 1)),
  CHECK (sender_id <> recipient_id),
  UNIQUE (sender_id, client_id)
);
CREATE INDEX idx_letters_recipient_created ON letters(recipient_id, created_at DESC, id DESC);
CREATE INDEX idx_letters_sender_created ON letters(sender_id, created_at DESC, id DESC);
CREATE TABLE mailbox_world (
  singleton INTEGER PRIMARY KEY CHECK (singleton = 1),
  latest_id TEXT REFERENCES letters(id),
  established_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
INSERT INTO mailbox_world(singleton) VALUES (1);

-- Checks and pointer updates run atomically with the insert, including races.
CREATE TRIGGER letters_validate_turn BEFORE INSERT ON letters BEGIN
  SELECT CASE
    WHEN EXISTS (SELECT 1 FROM mailbox_world w JOIN letters l ON l.id = w.latest_id WHERE l.sender_id = NEW.sender_id)
      THEN RAISE(ABORT, 'waiting_for_reply')
    WHEN EXISTS (SELECT 1 FROM mailbox_world w JOIN letters l ON l.id = w.latest_id WHERE l.read_at IS NULL AND l.deleted_by_recipient = 0)
      THEN RAISE(ABORT, 'open_letter_first')
    WHEN NEW.reply_to IS NOT (SELECT latest_id FROM mailbox_world WHERE singleton = 1)
      THEN RAISE(ABORT, 'conversation_changed')
  END;
END;
CREATE TRIGGER letters_advance_turn AFTER INSERT ON letters BEGIN
  UPDATE mailbox_world SET latest_id = NEW.id WHERE singleton = 1;
END;
