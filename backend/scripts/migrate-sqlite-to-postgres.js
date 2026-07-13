require('dotenv').config();

const path = require('path');
let sqlite3;
try {
  sqlite3 = require('sqlite3').verbose();
} catch (error) {
  console.error('sqlite3 모듈이 필요합니다. 이관 PC에서 npm install sqlite3 --no-save 를 먼저 실행하세요.');
  process.exit(1);
}
const { Pool } = require('pg');

const sqlitePath = process.env.SQLITE_PATH || './data/project_zero_history.sqlite';
const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error('DATABASE_URL is required.');
}

const sqlite = new sqlite3.Database(path.resolve(sqlitePath));
const pool = new Pool({
  connectionString: databaseUrl,
  ssl: process.env.NODE_ENV === 'production'
    ? { rejectUnauthorized: false }
    : false
});

function allSqlite(sql) {
  return new Promise((resolve, reject) => {
    sqlite.all(sql, [], (error, rows) => {
      if (error) reject(error);
      else resolve(rows);
    });
  });
}

async function migrate() {
  const rows = await allSqlite(
    'SELECT * FROM decision_history ORDER BY created_at ASC'
  );

  console.log(`Found ${rows.length} SQLite history records.`);

  for (const row of rows) {
    await pool.query(
      `INSERT INTO decision_sessions (
         session_id, decision_title, author_name, agenda_summary,
         current_stage, status, has_report, last_record_id,
         created_at, updated_at
       )
       VALUES (
         $1, $2, $3, $4, $5,
         CASE WHEN $5 = 5 OR $6 = 'report' THEN 'completed' ELSE 'in_progress' END,
         ($5 = 5 OR $6 = 'report'),
         $7, $8, $8
       )
       ON CONFLICT (session_id) DO UPDATE SET
         decision_title = CASE WHEN EXCLUDED.decision_title <> '' THEN EXCLUDED.decision_title ELSE decision_sessions.decision_title END,
         author_name = CASE WHEN EXCLUDED.author_name <> '' THEN EXCLUDED.author_name ELSE decision_sessions.author_name END,
         agenda_summary = CASE WHEN EXCLUDED.agenda_summary <> '' THEN EXCLUDED.agenda_summary ELSE decision_sessions.agenda_summary END,
         current_stage = GREATEST(decision_sessions.current_stage, EXCLUDED.current_stage),
         has_report = decision_sessions.has_report OR EXCLUDED.has_report,
         last_record_id = EXCLUDED.last_record_id,
         updated_at = GREATEST(decision_sessions.updated_at, EXCLUDED.updated_at)`,
      [
        row.session_id,
        row.decision_title || '',
        row.author_name || '',
        row.agenda_summary || '',
        Number(row.stage),
        row.kind,
        row.id,
        row.created_at
      ]
    );

    const versionResult = await pool.query(
      `SELECT COALESCE(MAX(version_no), 0) + 1 AS next_version
       FROM decision_history
       WHERE session_id = $1 AND stage = $2 AND kind = $3`,
      [row.session_id, Number(row.stage), row.kind]
    );

    await pool.query(
      `INSERT INTO decision_history (
         id, session_id, stage, kind, type, title, content,
         file_name, file_text, agenda_summary, decision_title,
         author_name, data_json, display_json, version_no, created_at
       )
       VALUES (
         $1, $2, $3, $4, $5, $6, $7,
         $8, $9, $10, $11, $12, $13::jsonb,
         $14::jsonb, $15, $16
       )
       ON CONFLICT (id) DO NOTHING`,
      [
        row.id,
        row.session_id,
        Number(row.stage),
        row.kind,
        row.type || '',
        row.title || '',
        row.content || '',
        row.file_name || '',
        row.file_text || '',
        row.agenda_summary || '',
        row.decision_title || '',
        row.author_name || '',
        row.data_json || null,
        row.display_json || null,
        Number(versionResult.rows[0].next_version),
        row.created_at
      ]
    );
  }

  console.log('Migration completed.');
}

migrate()
  .catch(error => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    sqlite.close();
    await pool.end();
  });
