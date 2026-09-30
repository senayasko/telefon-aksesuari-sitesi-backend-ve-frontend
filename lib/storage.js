const fs = require('node:fs');
const path = require('node:path');
const { AsyncLocalStorage } = require('node:async_hooks');
const { Pool } = require('pg');

const FILES = ['products.json', 'users.json', 'orders.json', 'coupons.json', 'reviews.json', 'stock-notifications.json', 'auth.json'];
const LOCK_ID = 19374628;

function createStorage({ dataDir, connectionString, pool: suppliedPool } = {}) {
  const context = new AsyncLocalStorage();
  const pool = suppliedPool || (connectionString ? new Pool({
    connectionString,
    max: 3,
    connectionTimeoutMillis: 15000,
    idleTimeoutMillis: 10000,
    allowExitOnIdle: true
  }) : null);
  if (pool) pool.on('error', () => console.error('Database connection interrupted.'));
  let initialization;

  function readFile(name) {
    if (!FILES.includes(name)) throw new Error('Unknown data collection');
    const file = path.join(dataDir, name);
    return fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : [];
  }

  async function initialize() {
    if (!pool) return;
    if (!initialization) initialization = (async () => {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        await client.query('SELECT pg_advisory_xact_lock($1)', [LOCK_ID]);
        await client.query(`CREATE TABLE IF NOT EXISTS vitrin_collections (
          name text PRIMARY KEY,
          data jsonb NOT NULL,
          updated_at timestamptz NOT NULL DEFAULT now()
        )`);
        for (const name of FILES) {
          await client.query(
            'INSERT INTO vitrin_collections (name, data) VALUES ($1, $2::jsonb) ON CONFLICT (name) DO NOTHING',
            [name, JSON.stringify(readFile(name))]
          );
        }
        await client.query('COMMIT');
      } catch (error) {
        await client.query('ROLLBACK').catch(() => {});
        throw error;
      } finally {
        client.release();
      }
    })().catch(error => {
      initialization = undefined;
      throw error;
    });
    return initialization;
  }

  function read(name) {
    if (!pool) return readFile(name);
    const state = context.getStore();
    if (!state || !state.collections.has(name)) throw new Error('Data read outside a transaction');
    return state.collections.get(name);
  }

  function write(name, data) {
    if (!FILES.includes(name)) throw new Error('Unknown data collection');
    if (!pool) {
      fs.writeFileSync(path.join(dataDir, name), JSON.stringify(data, null, 2), 'utf8');
      return;
    }
    const state = context.getStore();
    if (!state || !state.writable) throw new Error('Data write outside a writable transaction');
    state.collections.set(name, data);
    state.dirty.add(name);
  }

  async function run(handler, writable) {
    if (!pool) return handler();
    await initialize();
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(writable
        ? 'SELECT pg_advisory_xact_lock($1)'
        : 'SELECT pg_advisory_xact_lock_shared($1)', [LOCK_ID]);
      const { rows } = await client.query('SELECT name, data FROM vitrin_collections');
      const state = { writable, collections: new Map(rows.map(row => [row.name, row.data])), dirty: new Set() };
      const response = await context.run(state, handler);
      if (response.statusCode >= 400) {
        await client.query('ROLLBACK');
        return response;
      }
      for (const name of state.dirty) {
        await client.query('UPDATE vitrin_collections SET data = $2::jsonb, updated_at = now() WHERE name = $1',
          [name, JSON.stringify(state.collections.get(name))]);
      }
      await client.query('COMMIT');
      return response;
    } catch (error) {
      await client.query('ROLLBACK').catch(() => {});
      throw error;
    } finally {
      client.release();
    }
  }

  return { read, write, run, close: () => pool ? pool.end() : Promise.resolve(), persistent: Boolean(pool) };
}

// Keep the existing synchronous route logic inside a transaction, then send
// the response only after all database changes have committed.
function createDataRoutes(app, storage, authorize = () => true) {
  const routes = {};
  for (const method of ['get', 'post', 'put']) {
    routes[method] = (route, handler) => app[method](route, async (req, res, next) => {
      const output = {
        statusCode: 200, headers: {}, kind: null, body: undefined,
        status(code) { this.statusCode = code; return this; },
        header(name, value) { this.headers[name] = value; return this; },
        json(body) { this.kind = 'json'; this.body = body; return this; },
        send(body) { this.kind = 'send'; this.body = body; return this; }
      };
      try {
        await storage.run(async () => {
          if (await authorize(req, output)) await handler(req, output);
          if (!output.kind) throw new Error('Data route did not produce a response');
          return output;
        }, req.method !== 'GET' && req.method !== 'HEAD');
        res.status(output.statusCode).set(output.headers);
        res[output.kind](output.body);
      } catch (error) {
        // Database errors must not disclose connection strings or credentials.
        if (storage.persistent) {
          console.error('Database request failed.');
          return res.status(503).json({ success: false, message: 'Veritabanına şu anda ulaşılamıyor. İşlem kaydedilmedi.' });
        }
        next(error);
      }
    });
  }
  return routes;
}

module.exports = { createStorage, createDataRoutes };
