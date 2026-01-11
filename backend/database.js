// backend/database.js (PostgreSQL)
// This module replaces the old SQLite implementation but keeps the same public API:
//   - runAsync(sql, params)
//   - getAsync(sql, params)
//   - allAsync(sql, params)
// Routes can keep using "?" placeholders; we convert them to $1, $2, ... for Postgres.

const { Pool } = require("pg");
const fs = require("fs");
const path = require("path");
const bcrypt = require("bcryptjs");

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.warn("⚠️  DATABASE_URL is not set. Set it to your Postgres connection string.");
}

// Enable SSL by default in production (Supabase/Neon often require it)
const useSSL =
  (process.env.PGSSL || "").toLowerCase() === "false"
    ? false
    : process.env.NODE_ENV === "production";

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: useSSL ? { rejectUnauthorized: false } : undefined,
});

// Convert SQLite-style ? placeholders to Postgres $1, $2, ...
function convertPlaceholders(sql) {
  let i = 0;
  return sql.replace(/\?/g, () => `$${++i}`);
}

// Coerce COUNT(*) results (pg returns them as strings)
function coerceRow(row) {
  if (!row || typeof row !== "object") return row;
  const out = { ...row };
  for (const k of Object.keys(out)) {
    const v = out[k];
    if (typeof v === "string" && /^-?\d+(\.\d+)?$/.test(v)) {
      if (["count", "total", "amount", "balance", "rate"].includes(k)) out[k] = Number(v);
    }
  }
  return out;
}

let initPromise;
async function init() {
  if (initPromise) return initPromise;

  initPromise = (async () => {
    const schemaPath = path.join(__dirname, "schema.sql");
    const schemaSQL = fs.readFileSync(schemaPath, "utf-8");

    const statements = schemaSQL
      .split(/;\s*\n/)
      .map((s) => s.trim())
      .filter((s) => s && !s.startsWith("--"));

    const client = await pool.connect();
    try {
      for (const stmt of statements) {
        await client.query(stmt);
      }

      // Create default admin (admin/admin123) if not exists
      const hashedPassword = await bcrypt.hash("admin123", 10);

      await client.query(
        `INSERT INTO users (username, email, password, role, permissions, session_version)
         VALUES ($1, $2, $3, $4, $5, 1)
         ON CONFLICT (email) DO NOTHING`,
        ["admin", "admin@realestate.com", hashedPassword, "admin", JSON.stringify(["all"])],
      );

      return true;
    } finally {
      client.release();
    }
  })();

  return initPromise;
}

async function query(sql, params = []) {
  await init();
  const pgSql = convertPlaceholders(sql);
  return pool.query(pgSql, params);
}

// runAsync returns { lastID, changes } to match SQLite behavior.
// For INSERTs without RETURNING, we auto-append RETURNING id.
async function runAsync(sql, params = []) {
  await init();
  let s = sql.trim();

  // Safety: if any old SQLite keywords remain, routes should be updated,
  // but this prevents immediate crashes.
  s = s.replace(/^INSERT\s+OR\s+IGNORE/i, "INSERT");
  s = s.replace(/^INSERT\s+OR\s+REPLACE/i, "INSERT");

  const isInsert = /^INSERT\s+/i.test(s);
  const hasReturning = /\bRETURNING\b/i.test(s);

  if (isInsert && !hasReturning) {
    s = `${s} RETURNING id`;
  }

  const res = await query(s, params);

  if (isInsert) {
    const lastID = res.rows && res.rows[0] ? res.rows[0].id : undefined;
    return { lastID, changes: res.rowCount };
  }

  return { lastID: undefined, changes: res.rowCount };
}

async function getAsync(sql, params = []) {
  const res = await query(sql, params);
  return coerceRow(res.rows[0]);
}

async function allAsync(sql, params = []) {
  const res = await query(sql, params);
  return res.rows.map(coerceRow);
}

module.exports = {
  db: pool,
  runAsync,
  getAsync,
  allAsync,
};
