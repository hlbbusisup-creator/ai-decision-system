BEGIN;

CREATE TABLE IF NOT EXISTS decision_sessions (
  session_id TEXT PRIMARY KEY,
  decision_title TEXT NOT NULL DEFAULT '',
  author_name TEXT NOT NULL DEFAULT '',
  agenda_summary TEXT NOT NULL DEFAULT '',
  current_stage SMALLINT NOT NULL DEFAULT 0 CHECK (current_stage BETWEEN 0 AND 5),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'in_progress', 'completed', 'archived')),
  has_report BOOLEAN NOT NULL DEFAULT FALSE,
  last_record_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS decision_history (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  stage SMALLINT NOT NULL CHECK (stage BETWEEN 1 AND 5),
  kind TEXT NOT NULL CHECK (kind IN ('input', 'output', 'report')),
  type TEXT NOT NULL DEFAULT '',
  title TEXT NOT NULL DEFAULT '',
  content TEXT NOT NULL DEFAULT '',
  file_name TEXT NOT NULL DEFAULT '',
  file_text TEXT NOT NULL DEFAULT '',
  agenda_summary TEXT NOT NULL DEFAULT '',
  decision_title TEXT NOT NULL DEFAULT '',
  author_name TEXT NOT NULL DEFAULT '',
  data_json JSONB,
  display_json JSONB,
  version_no INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Earlier versions may already have decision_history with fewer columns.
ALTER TABLE decision_history ADD COLUMN IF NOT EXISTS decision_title TEXT NOT NULL DEFAULT '';
ALTER TABLE decision_history ADD COLUMN IF NOT EXISTS author_name TEXT NOT NULL DEFAULT '';
ALTER TABLE decision_history ADD COLUMN IF NOT EXISTS version_no INTEGER NOT NULL DEFAULT 1;

-- Build session summaries from any existing history rows.
INSERT INTO decision_sessions (
  session_id,
  decision_title,
  author_name,
  agenda_summary,
  current_stage,
  status,
  has_report,
  last_record_id,
  created_at,
  updated_at
)
SELECT
  h.session_id,
  COALESCE((ARRAY_AGG(h.decision_title ORDER BY h.created_at DESC)
    FILTER (WHERE COALESCE(h.decision_title, '') <> ''))[1], ''),
  COALESCE((ARRAY_AGG(h.author_name ORDER BY h.created_at DESC)
    FILTER (WHERE COALESCE(h.author_name, '') <> ''))[1], ''),
  COALESCE((ARRAY_AGG(h.agenda_summary ORDER BY h.created_at DESC)
    FILTER (WHERE COALESCE(h.agenda_summary, '') <> ''))[1], ''),
  LEAST(COALESCE(MAX(h.stage), 0), 5)::SMALLINT,
  CASE
    WHEN BOOL_OR(h.stage = 5 OR h.kind = 'report') THEN 'completed'
    WHEN MAX(h.stage) > 0 THEN 'in_progress'
    ELSE 'draft'
  END,
  BOOL_OR(h.stage = 5 OR h.kind = 'report'),
  (ARRAY_AGG(h.id ORDER BY h.created_at DESC))[1],
  MIN(h.created_at),
  MAX(h.created_at)
FROM decision_history h
GROUP BY h.session_id
ON CONFLICT (session_id) DO UPDATE SET
  decision_title = CASE WHEN EXCLUDED.decision_title <> '' THEN EXCLUDED.decision_title ELSE decision_sessions.decision_title END,
  author_name = CASE WHEN EXCLUDED.author_name <> '' THEN EXCLUDED.author_name ELSE decision_sessions.author_name END,
  agenda_summary = CASE WHEN EXCLUDED.agenda_summary <> '' THEN EXCLUDED.agenda_summary ELSE decision_sessions.agenda_summary END,
  current_stage = GREATEST(decision_sessions.current_stage, EXCLUDED.current_stage),
  status = EXCLUDED.status,
  has_report = decision_sessions.has_report OR EXCLUDED.has_report,
  last_record_id = EXCLUDED.last_record_id,
  updated_at = GREATEST(decision_sessions.updated_at, EXCLUDED.updated_at);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'decision_history_session_fk'
  ) THEN
    ALTER TABLE decision_history
      ADD CONSTRAINT decision_history_session_fk
      FOREIGN KEY (session_id)
      REFERENCES decision_sessions(session_id)
      ON DELETE CASCADE
      NOT VALID;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_decision_sessions_updated_at
  ON decision_sessions(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_decision_sessions_title
  ON decision_sessions(LOWER(decision_title));
CREATE INDEX IF NOT EXISTS idx_decision_sessions_author
  ON decision_sessions(LOWER(author_name));
CREATE INDEX IF NOT EXISTS idx_decision_sessions_stage
  ON decision_sessions(current_stage);

CREATE INDEX IF NOT EXISTS idx_decision_history_created_at
  ON decision_history(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_decision_history_session_created
  ON decision_history(session_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_decision_history_stage
  ON decision_history(stage);
CREATE INDEX IF NOT EXISTS idx_decision_history_kind
  ON decision_history(kind);
CREATE UNIQUE INDEX IF NOT EXISTS uq_decision_history_version
  ON decision_history(session_id, stage, kind, version_no);

CREATE OR REPLACE FUNCTION set_decision_session_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_decision_sessions_updated_at ON decision_sessions;
CREATE TRIGGER trg_decision_sessions_updated_at
BEFORE UPDATE ON decision_sessions
FOR EACH ROW
EXECUTE FUNCTION set_decision_session_updated_at();

COMMIT;
