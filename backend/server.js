require('dotenv').config();

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { Pool } = require('pg');

const app = express();

const PORT = Number(process.env.PORT || 3000);
const DATABASE_URL = process.env.DATABASE_URL || '';
const CORS_ORIGIN = process.env.CORS_ORIGIN || 'https://hlbbusisup-creator.github.io';
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || '';
const DELETE_CODE = process.env.DELETE_CODE || '';
const DELETE_CODE_FALLBACK_HASH = '04f21e1fc82e36aa8346a4cb5a2db97a97dc2f800967e44e6b0950b63b29bd87';

if (!DATABASE_URL) {
  throw new Error('DATABASE_URL is required.');
}

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production'
    ? { rejectUnauthorized: false }
    : false,
  max: Number(process.env.PG_POOL_MAX || 10),
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000
});

const allowedOrigins = CORS_ORIGIN === '*'
  ? '*'
  : CORS_ORIGIN.split(',').map(value => value.trim()).filter(Boolean);

app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' }
}));

app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins === '*' || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error(`CORS origin not allowed: ${origin}`));
  },
  methods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'x-admin-token', 'x-delete-code']
}));

app.use(express.json({ limit: '25mb' }));

function requireAdmin(req, res, next) {
  if (!ADMIN_TOKEN) {
    return res.status(403).json({
      error: 'Delete operations are disabled because ADMIN_TOKEN is not configured.'
    });
  }

  if (req.headers['x-admin-token'] !== ADMIN_TOKEN) {
    return res.status(401).json({ error: 'Invalid admin token.' });
  }

  next();
}

function requireDeleteCode(req, res, next) {
  const suppliedCode = String(req.headers['x-delete-code'] || '');
  const suppliedHash = crypto
    .createHash('sha256')
    .update(suppliedCode, 'utf8')
    .digest('hex');

  const isValid = DELETE_CODE
    ? suppliedCode === DELETE_CODE
    : suppliedHash === DELETE_CODE_FALLBACK_HASH;

  if (!isValid) {
    return res.status(401).json({ error: 'Invalid delete code.' });
  }

  next();
}

function parseJson(value) {
  if (value === null || value === undefined) return null;
  if (typeof value === 'object') return value;

  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function normalizeRecord(row) {
  return {
    id: row.id,
    sessionId: row.session_id,
    stage: Number(row.stage),
    kind: row.kind,
    type: row.type,
    title: row.title,
    content: row.content,
    fileName: row.file_name,
    fileText: row.file_text,
    agendaSummary: row.agenda_summary,
    decisionTitle: row.decision_title,
    authorName: row.author_name,
    data: parseJson(row.data_json),
    display: parseJson(row.display_json),
    versionNo: Number(row.version_no || 1),
    createdAt: row.created_at
  };
}

function normalizeDocument(row) {
  return {
    sessionId: row.session_id,
    decisionTitle: row.decision_title,
    authorName: row.author_name,
    agendaSummary: row.agenda_summary,
    currentStage: Number(row.current_stage),
    status: row.status,
    hasReport: Boolean(row.has_report),
    recordCount: Number(row.record_count || 0),
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function safeString(value, maxLength = 1000000) {
  return String(value ?? '').slice(0, maxLength);
}

async function initializeSchema() {
  const schemaPath = path.join(__dirname, 'schema.postgresql.sql');
  const schemaSql = fs.readFileSync(schemaPath, 'utf8');
  await pool.query(schemaSql);
}

app.get('/api/health', async (req, res) => {
  try {
    const result = await pool.query('SELECT NOW() AS db_time');
    res.json({
      ok: true,
      service: 'project-zero-shared-db-api',
      database: 'postgresql',
      dbTime: result.rows[0].db_time,
      time: new Date().toISOString()
    });
  } catch (error) {
    res.status(503).json({ ok: false, error: error.message });
  }
});

app.post('/api/history', async (req, res) => {
  const client = await pool.connect();

  try {
    const body = req.body || {};
    const id = safeString(
      body.id || `hist_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`,
      200
    );
    const sessionId = safeString(
      body.sessionId || body.session_id || `session_${Date.now()}`,
      200
    );
    const stage = Number(body.stage);
    const kind = safeString(body.kind || 'input', 20);
    const type = safeString(body.type || '', 100);
    const title = safeString(body.title || '', 500);
    const content = safeString(body.content || '', 5000000);
    const fileName = safeString(body.fileName || body.file_name || '', 500);
    const fileText = safeString(body.fileText || body.file_text || '', 10000000);
    const agendaSummary = safeString(body.agendaSummary || body.agenda_summary || '', 5000);
    const decisionTitle = safeString(body.decisionTitle || body.decision_title || '', 500);
    const authorName = safeString(body.authorName || body.author_name || '', 200);
    const createdAt = body.createdAt || body.created_at || new Date().toISOString();
    const hasReportRecord = stage === 5 || kind === 'report';
    const sessionStatus = hasReportRecord
      ? 'completed'
      : (type === 'draft_save' ? 'draft' : 'in_progress');

    if (!Number.isInteger(stage) || stage < 1 || stage > 5) {
      return res.status(400).json({ error: 'stage must be an integer from 1 through 5.' });
    }

    if (!['input', 'output', 'report'].includes(kind)) {
      return res.status(400).json({ error: 'kind must be input, output, or report.' });
    }

    await client.query('BEGIN');

    await client.query(
      `INSERT INTO decision_sessions (
         session_id, decision_title, author_name, agenda_summary,
         current_stage, status, has_report, last_record_id,
         created_at, updated_at
       )
       VALUES (
         $1::text,
         $2::text,
         $3::text,
         $4::text,
         $5::smallint,
         $6::text,
         $7::boolean,
         $8::text,
         $9::timestamptz,
         $9::timestamptz
       )
       ON CONFLICT (session_id) DO UPDATE SET
         decision_title = CASE
           WHEN EXCLUDED.decision_title <> '' THEN EXCLUDED.decision_title
           ELSE decision_sessions.decision_title
         END,
         author_name = CASE
           WHEN EXCLUDED.author_name <> '' THEN EXCLUDED.author_name
           ELSE decision_sessions.author_name
         END,
         agenda_summary = CASE
           WHEN EXCLUDED.agenda_summary <> '' THEN EXCLUDED.agenda_summary
           ELSE decision_sessions.agenda_summary
         END,
         current_stage = GREATEST(
           decision_sessions.current_stage,
           EXCLUDED.current_stage
         ),
         status = CASE
           WHEN decision_sessions.has_report OR EXCLUDED.has_report THEN 'completed'
           WHEN decision_sessions.status = 'in_progress' THEN 'in_progress'
           ELSE EXCLUDED.status
         END,
         has_report = decision_sessions.has_report OR EXCLUDED.has_report,
         last_record_id = EXCLUDED.last_record_id,
         updated_at = GREATEST(
           decision_sessions.updated_at,
           EXCLUDED.updated_at
         )`,
      [
        sessionId,
        decisionTitle,
        authorName,
        agendaSummary,
        stage,
        sessionStatus,
        hasReportRecord,
        id,
        createdAt
      ]
    );

    const versionResult = await client.query(
      `SELECT COALESCE(MAX(version_no), 0) + 1 AS next_version
       FROM decision_history
       WHERE session_id = $1::text
         AND stage = $2::smallint
         AND kind = $3::text`,
      [sessionId, stage, kind]
    );

    const versionNo = Number(versionResult.rows[0].next_version);

    const insertResult = await client.query(
      `INSERT INTO decision_history (
         id, session_id, stage, kind, type, title, content,
         file_name, file_text, agenda_summary, decision_title,
         author_name, data_json, display_json, version_no, created_at
       )
       VALUES (
         $1::text,
         $2::text,
         $3::smallint,
         $4::text,
         $5::text,
         $6::text,
         $7::text,
         $8::text,
         $9::text,
         $10::text,
         $11::text,
         $12::text,
         $13::jsonb,
         $14::jsonb,
         $15::integer,
         $16::timestamptz
       )
       ON CONFLICT (id) DO UPDATE SET
         session_id = EXCLUDED.session_id,
         stage = EXCLUDED.stage,
         kind = EXCLUDED.kind,
         type = EXCLUDED.type,
         title = EXCLUDED.title,
         content = EXCLUDED.content,
         file_name = EXCLUDED.file_name,
         file_text = EXCLUDED.file_text,
         agenda_summary = EXCLUDED.agenda_summary,
         decision_title = EXCLUDED.decision_title,
         author_name = EXCLUDED.author_name,
         data_json = EXCLUDED.data_json,
         display_json = EXCLUDED.display_json
       RETURNING *`,
      [
        id,
        sessionId,
        stage,
        kind,
        type,
        title,
        content,
        fileName,
        fileText,
        agendaSummary,
        decisionTitle,
        authorName,
        body.data === undefined || body.data === null
          ? null
          : JSON.stringify(body.data),
        body.display === undefined || body.display === null
          ? null
          : JSON.stringify(body.display),
        versionNo,
        createdAt
      ]
    );

    await client.query('COMMIT');
    res.status(201).json(normalizeRecord(insertResult.rows[0]));
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('POST /api/history failed:', {
      message: error.message,
      code: error.code,
      detail: error.detail,
      hint: error.hint
    });
    res.status(500).json({
      error: error.message,
      code: error.code || 'DB_WRITE_FAILED'
    });
  } finally {
    client.release();
  }
});

app.get('/api/documents', async (req, res) => {
  try {
    const page = Math.max(Number(req.query.page || 1), 1);
    const pageSize = Math.min(Math.max(Number(req.query.pageSize || 100), 1), 500);
    const offset = (page - 1) * pageSize;
    const search = safeString(req.query.search || '', 500).trim();

    const whereSql = search
      ? `WHERE
           LOWER(s.decision_title) LIKE LOWER($1)
           OR LOWER(s.author_name) LIKE LOWER($1)
           OR LOWER(s.agenda_summary) LIKE LOWER($1)`
      : '';

    const countParams = search ? [`%${search}%`] : [];
    const listParams = search
      ? [`%${search}%`, pageSize, offset]
      : [pageSize, offset];

    const countResult = await pool.query(
      `SELECT COUNT(*)::INTEGER AS total
       FROM decision_sessions s
       ${whereSql}`,
      countParams
    );

    const limitIndex = search ? 2 : 1;
    const offsetIndex = search ? 3 : 2;

    const listResult = await pool.query(
      `SELECT
         s.session_id,
         s.decision_title,
         s.author_name,
         s.agenda_summary,
         s.current_stage,
         s.status,
         s.has_report,
         s.created_at,
         s.updated_at,
         COUNT(h.id)::INTEGER AS record_count
       FROM decision_sessions s
       LEFT JOIN decision_history h ON h.session_id = s.session_id
       ${whereSql}
       GROUP BY s.session_id
       ORDER BY s.updated_at DESC
       LIMIT $${limitIndex} OFFSET $${offsetIndex}`,
      listParams
    );

    res.json({
      page,
      pageSize,
      total: Number(countResult.rows[0].total),
      documents: listResult.rows.map(normalizeDocument)
    });
  } catch (error) {
    console.error('GET /api/documents failed:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/documents/:sessionId', async (req, res) => {
  try {
    const sessionId = safeString(req.params.sessionId, 200);

    const sessionResult = await pool.query(
      `SELECT
         s.*,
         COUNT(h.id)::INTEGER AS record_count
       FROM decision_sessions s
       LEFT JOIN decision_history h ON h.session_id = s.session_id
       WHERE s.session_id = $1
       GROUP BY s.session_id`,
      [sessionId]
    );

    if (!sessionResult.rows.length) {
      return res.status(404).json({ error: 'Decision document not found.' });
    }

    const historyResult = await pool.query(
      `SELECT *
       FROM decision_history
       WHERE session_id = $1
       ORDER BY created_at ASC, version_no ASC`,
      [sessionId]
    );

    res.json({
      document: normalizeDocument(sessionResult.rows[0]),
      records: historyResult.rows.map(normalizeRecord)
    });
  } catch (error) {
    console.error('GET /api/documents/:sessionId failed:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/history', async (req, res) => {
  try {
    const page = Math.max(Number(req.query.page || 1), 1);
    const pageSize = Math.min(Math.max(Number(req.query.pageSize || req.query.limit || 200), 1), 500);
    const offset = (page - 1) * pageSize;

    const clauses = [];
    const params = [];

    function addClause(sql, value) {
      params.push(value);
      clauses.push(sql.replace('?', `$${params.length}`));
    }

    if (req.query.stage && req.query.stage !== 'all') {
      addClause('stage = ?', Number(req.query.stage));
    }
    if (req.query.kind) {
      addClause('kind = ?', safeString(req.query.kind, 20));
    }
    if (req.query.sessionId || req.query.session_id) {
      addClause('session_id = ?', safeString(req.query.sessionId || req.query.session_id, 200));
    }
    if (req.query.decisionTitle || req.query.decision_title) {
      addClause(
        'LOWER(decision_title) LIKE LOWER(?)',
        `%${safeString(req.query.decisionTitle || req.query.decision_title, 500)}%`
      );
    }
    if (req.query.authorName || req.query.author_name) {
      addClause(
        'LOWER(author_name) LIKE LOWER(?)',
        `%${safeString(req.query.authorName || req.query.author_name, 200)}%`
      );
    }

    const whereSql = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';

    const countResult = await pool.query(
      `SELECT COUNT(*)::INTEGER AS total
       FROM decision_history
       ${whereSql}`,
      params
    );

    const listParams = [...params, pageSize, offset];
    const limitIndex = params.length + 1;
    const offsetIndex = params.length + 2;

    const listResult = await pool.query(
      `SELECT *
       FROM decision_history
       ${whereSql}
       ORDER BY created_at DESC
       LIMIT $${limitIndex} OFFSET $${offsetIndex}`,
      listParams
    );

    res.json({
      page,
      pageSize,
      total: Number(countResult.rows[0].total),
      records: listResult.rows.map(normalizeRecord)
    });
  } catch (error) {
    console.error('GET /api/history failed:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/analytics', async (req, res) => {
  try {
    const [
      summaryResult,
      stageResult,
      statusResult,
      authorResult,
      dailyResult
    ] = await Promise.all([
      pool.query(
        `SELECT
           COUNT(*)::INTEGER AS document_count,
           COUNT(*) FILTER (WHERE has_report)::INTEGER AS completed_count,
           COALESCE(
             ROUND(
               (COUNT(*) FILTER (WHERE has_report)::NUMERIC * 100)
               / NULLIF(COUNT(*), 0),
               1
             ),
             0
           ) AS completion_rate,
           COALESCE(
             ROUND(
               (SELECT COUNT(*)::NUMERIC FROM decision_history)
               / NULLIF(COUNT(*), 0),
               1
             ),
             0
           ) AS average_records_per_document,
           (
             SELECT COUNT(*)::INTEGER
             FROM decision_history
             WHERE created_at >= NOW() - INTERVAL '7 days'
           ) AS records_last_7_days,
           (
             SELECT COUNT(DISTINCT session_id)::INTEGER
             FROM decision_history
             WHERE created_at >= NOW() - INTERVAL '7 days'
           ) AS active_documents_last_7_days
         FROM decision_sessions`
      ),
      pool.query(
        `SELECT
           CASE
             WHEN has_report THEN 'REPORT'
             WHEN current_stage <= 0 THEN '신규'
             WHEN current_stage = 1 THEN 'STAGE 01'
             WHEN current_stage = 2 THEN 'STAGE 02'
             WHEN current_stage = 3 THEN 'STAGE 03'
             WHEN current_stage = 4 THEN 'STAGE 04'
             ELSE '기타'
           END AS label,
           COUNT(*)::INTEGER AS count,
           CASE
             WHEN BOOL_OR(has_report) THEN 6
             WHEN MIN(current_stage) <= 0 THEN 0
             ELSE MIN(current_stage)
           END AS sort_order
         FROM decision_sessions
         GROUP BY
           CASE
             WHEN has_report THEN 'REPORT'
             WHEN current_stage <= 0 THEN '신규'
             WHEN current_stage = 1 THEN 'STAGE 01'
             WHEN current_stage = 2 THEN 'STAGE 02'
             WHEN current_stage = 3 THEN 'STAGE 03'
             WHEN current_stage = 4 THEN 'STAGE 04'
             ELSE '기타'
           END
         ORDER BY sort_order`
      ),
      pool.query(
        `SELECT
           CASE
             WHEN has_report OR status = 'completed' THEN 'completed'
             WHEN status = 'draft' THEN 'draft'
             ELSE 'in_progress'
           END AS status,
           COUNT(*)::INTEGER AS count
         FROM decision_sessions
         GROUP BY 1
         ORDER BY 1`
      ),
      pool.query(
        `SELECT
           COALESCE(NULLIF(TRIM(author_name), ''), '작성자 미입력') AS author,
           COUNT(*)::INTEGER AS count
         FROM decision_sessions
         GROUP BY 1
         ORDER BY count DESC, author ASC
         LIMIT 10`
      ),
      pool.query(
        `WITH days AS (
           SELECT generate_series(
             CURRENT_DATE - INTERVAL '13 days',
             CURRENT_DATE,
             INTERVAL '1 day'
           )::DATE AS date
         ),
         activity AS (
           SELECT created_at::DATE AS date, COUNT(*)::INTEGER AS count
           FROM decision_history
           WHERE created_at >= CURRENT_DATE - INTERVAL '13 days'
           GROUP BY created_at::DATE
         )
         SELECT
           TO_CHAR(days.date, 'YYYY-MM-DD') AS date,
           COALESCE(activity.count, 0)::INTEGER AS count
         FROM days
         LEFT JOIN activity USING (date)
         ORDER BY days.date`
      )
    ]);

    const summaryRow = summaryResult.rows[0] || {};

    res.json({
      generatedAt: new Date().toISOString(),
      summary: {
        documentCount: Number(summaryRow.document_count || 0),
        completedCount: Number(summaryRow.completed_count || 0),
        completionRate: Number(summaryRow.completion_rate || 0),
        averageRecordsPerDocument: Number(
          summaryRow.average_records_per_document || 0
        ),
        recordsLast7Days: Number(summaryRow.records_last_7_days || 0),
        activeDocumentsLast7Days: Number(
          summaryRow.active_documents_last_7_days || 0
        )
      },
      stageDistribution: stageResult.rows.map(row => ({
        label: row.label,
        count: Number(row.count || 0)
      })),
      statusDistribution: statusResult.rows.map(row => ({
        status: row.status,
        count: Number(row.count || 0)
      })),
      authorDistribution: authorResult.rows.map(row => ({
        author: row.author,
        count: Number(row.count || 0)
      })),
      dailyActivity: dailyResult.rows.map(row => ({
        date: row.date,
        count: Number(row.count || 0)
      }))
    });
  } catch (error) {
    console.error('GET /api/analytics failed:', {
      message: error.message,
      code: error.code,
      detail: error.detail
    });
    res.status(500).json({
      error: error.message,
      code: error.code || 'ANALYTICS_QUERY_FAILED'
    });
  }
});

app.get('/api/stats', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT
         (SELECT COUNT(*)::INTEGER FROM decision_sessions) AS document_count,
         (SELECT COUNT(*)::INTEGER FROM decision_history) AS record_count,
         (SELECT COUNT(DISTINCT NULLIF(author_name, ''))::INTEGER FROM decision_sessions) AS author_count`
    );

    res.json({
      documentCount: Number(result.rows[0].document_count),
      recordCount: Number(result.rows[0].record_count),
      authorCount: Number(result.rows[0].author_count)
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/export', async (req, res) => {
  try {
    const sessions = await pool.query(
      'SELECT * FROM decision_sessions ORDER BY updated_at DESC'
    );
    const histories = await pool.query(
      'SELECT * FROM decision_history ORDER BY created_at ASC'
    );

    res.json({
      exportedAt: new Date().toISOString(),
      documents: sessions.rows.map(normalizeDocument),
      records: histories.rows.map(normalizeRecord)
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/history/:id', requireAdmin, async (req, res) => {
  try {
    await pool.query('DELETE FROM decision_history WHERE id = $1', [req.params.id]);
    res.status(204).end();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/documents/bulk-delete', requireDeleteCode, async (req, res) => {
  const client = await pool.connect();

  try {
    const sessionIds = Array.isArray(req.body?.sessionIds)
      ? [...new Set(req.body.sessionIds.map(value => safeString(value, 200)).filter(Boolean))]
      : [];

    if (sessionIds.length === 0) {
      return res.status(400).json({ error: 'sessionIds must contain at least one document ID.' });
    }

    if (sessionIds.length > 200) {
      return res.status(400).json({ error: 'A maximum of 200 documents can be deleted at once.' });
    }

    await client.query('BEGIN');

    const result = await client.query(
      `DELETE FROM decision_sessions
       WHERE session_id = ANY($1::text[])
       RETURNING session_id`,
      [sessionIds]
    );

    await client.query('COMMIT');

    res.json({
      deletedCount: result.rowCount,
      deletedSessionIds: result.rows.map(row => row.session_id)
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('POST /api/documents/bulk-delete failed:', error);
    res.status(500).json({ error: error.message });
  } finally {
    client.release();
  }
});

app.delete('/api/documents/:sessionId', requireAdmin, async (req, res) => {
  try {
    await pool.query('DELETE FROM decision_sessions WHERE session_id = $1', [req.params.sessionId]);
    res.status(204).end();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/history', requireAdmin, async (req, res) => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    await client.query('DELETE FROM decision_history');
    await client.query('DELETE FROM decision_sessions');
    await client.query('COMMIT');
    res.status(204).end();
  } catch (error) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: error.message });
  } finally {
    client.release();
  }
});

async function start() {
  await initializeSchema();
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Project Zero shared DB API listening on port ${PORT}`);
  });
}

start().catch(error => {
  console.error('Server initialization failed:', error);
  process.exit(1);
});

process.on('SIGTERM', async () => {
  await pool.end();
  process.exit(0);
});
