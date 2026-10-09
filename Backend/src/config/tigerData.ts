import { Pool, PoolConfig } from 'pg';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config();

let pool: Pool | null = null;
let connectionTested = false;
let schemaInitialized = false;

/**
 * Validates whether Tiger Data database URL is configured in environment
 */
export function isTigerConfigured(): boolean {
  const url = process.env.TIGER_DATABASE_URL;
  return Boolean(url && url.trim().length > 0 && !url.includes('USERNAME:PASSWORD'));
}

/**
 * Returns or initializes the singleton Tiger Data (TimescaleDB) connection pool
 */
export function getTigerPool(): Pool | null {
  if (pool) return pool;

  const rawUrl = process.env.TIGER_DATABASE_URL;
  if (!rawUrl || !isTigerConfigured()) {
    return null;
  }

  try {
    let config: PoolConfig;

    try {
      // Parse URL to properly apply SSL rejectUnauthorized flag without libpq alias conflicts
      const parsed = new URL(rawUrl);
      config = {
        host: parsed.hostname,
        port: parsed.port ? Number(parsed.port) : 5432,
        user: parsed.username,
        password: decodeURIComponent(parsed.password),
        database: parsed.pathname ? parsed.pathname.replace(/^\//, '') : 'tsdb',
        ssl: {
          rejectUnauthorized: false,
        },
        max: 10,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 10000,
      };
    } catch {
      // Fallback for non-standard URI formats
      config = {
        connectionString: rawUrl,
        ssl: {
          rejectUnauthorized: false,
        },
        max: 10,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 10000,
      };
    }

    pool = new Pool(config);

    pool.on('error', (err) => {
      // Safely log error without printing connection strings or credentials
      console.error('⚠️ [Tiger Data Pool] Unexpected client error:', err.message);
    });

    return pool;
  } catch (error: any) {
    console.error('❌ [Tiger Data] Failed to initialize connection pool:', error?.message || 'Unknown error');
    return null;
  }
}

/**
 * Tests the Tiger Data connection and logs a sanitized status
 */
export async function testTigerConnection(): Promise<boolean> {
  const tigerPool = getTigerPool();
  if (!tigerPool) {
    return false;
  }

  try {
    const client = await tigerPool.connect();
    try {
      const res = await client.query('SELECT NOW() as current_time, version() as pg_version');
      if (!connectionTested) {
        console.log('🐯 [Tiger Data] Connected successfully to Tiger Cloud / TimescaleDB PostgreSQL');
        connectionTested = true;
      }
      return Boolean(res.rows && res.rows.length > 0);
    } finally {
      client.release();
    }
  } catch (error: any) {
    console.error('❌ [Tiger Data] Connection test failed:', error?.message || 'Database unreachable');
    return false;
  }
}

/**
 * Initializes the Tiger Data schema (table, TimescaleDB hypertable, indexes) idempotently
 */
export async function initTigerDatabase(): Promise<boolean> {
  if (schemaInitialized) return true;

  const tigerPool = getTigerPool();
  if (!tigerPool) return false;

  try {
    const client = await tigerPool.connect();
    try {
      // Create financial_transactions table
      await client.query(`
        CREATE TABLE IF NOT EXISTS financial_transactions (
          time TIMESTAMPTZ NOT NULL,
          user_id TEXT NOT NULL,
          transaction_id TEXT,
          transaction_type TEXT NOT NULL,
          category TEXT,
          amount NUMERIC(15, 2) NOT NULL,
          balance NUMERIC(15, 2),
          description TEXT,
          source TEXT DEFAULT 'MANUAL',
          created_at TIMESTAMPTZ DEFAULT NOW()
        );
      `);

      // Try creating TimescaleDB hypertable if not already one
      try {
        await client.query(`
          SELECT create_hypertable(
            'financial_transactions',
            'time',
            if_not_exists => TRUE,
            migrate_data => TRUE
          );
        `);
      } catch (htErr: any) {
        // If already hypertable or function call variation, safe to continue
        if (!htErr.message?.includes('already a hypertable')) {
          console.log('ℹ️ [Tiger Data] Hypertable status:', htErr.message);
        }
      }

      // Create compound time-series indexes
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_financial_transactions_user_time 
          ON financial_transactions (user_id, time DESC);
        CREATE INDEX IF NOT EXISTS idx_financial_transactions_type 
          ON financial_transactions (user_id, transaction_type, time DESC);
        CREATE INDEX IF NOT EXISTS idx_financial_transactions_category 
          ON financial_transactions (user_id, category, time DESC);
        CREATE UNIQUE INDEX IF NOT EXISTS idx_financial_transactions_unique_tx
          ON financial_transactions (user_id, transaction_id, time);
      `);

      schemaInitialized = true;
      console.log('🐯 [Tiger Data] Financial transactions hypertable & indexes initialized');
      return true;
    } finally {
      client.release();
    }
  } catch (error: any) {
    console.error('❌ [Tiger Data Schema Error]:', error?.message || 'Initialization failed');
    return false;
  }
}

/**
 * Helper to execute parameterized queries safely against Tiger Data
 */
export async function queryTiger<T = any>(sql: string, params: any[] = []): Promise<T[]> {
  const tigerPool = getTigerPool();
  if (!tigerPool) {
    throw new Error('Tiger Data database is not configured. Please check TIGER_DATABASE_URL.');
  }

  try {
    const result = await tigerPool.query(sql, params);
    return result.rows as T[];
  } catch (error: any) {
    console.error('❌ [Tiger Data Query Error]:', error?.message || 'Execution failed');
    throw error;
  }
}

/**
 * Gracefully close pool on application shutdown
 */
export async function closeTigerPool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
    connectionTested = false;
    schemaInitialized = false;
  }
}
