const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const express = require('express');
const { createStorage, createDataRoutes } = require('../lib/storage');

function database({ failCommit = false } = {}) {
  const saved = new Map([['products.json', [{ id: 1, stock: 9 }]]]);
  const migrations = new Set();
  const statements = [];
  let commits = 0;
  const pool = {
    on() {}, end: async () => {},
    async connect() {
      let transaction;
      return {
        release() {},
        async query(sql, params = []) {
          statements.push(sql);
          if (sql === 'BEGIN') transaction = structuredClone(saved);
          else if (sql === 'COMMIT') {
            if (failCommit && commits > 0 && statements.some(s => s.startsWith('UPDATE'))) throw new Error('Connection lost');
            saved.clear();
            for (const [name, data] of transaction) saved.set(name, data);
            commits++;
          } else if (sql === 'ROLLBACK') transaction = undefined;
          else if (sql.startsWith('INSERT INTO vitrin_migrations')) {
            if (migrations.has(params[0])) return { rows: [] };
            migrations.add(params[0]);
            return { rows: [{ id: params[0] }] };
          } else if (sql.startsWith('INSERT')) {
            if (!transaction.has(params[0])) transaction.set(params[0], JSON.parse(params[1]));
          } else if (sql.startsWith('SELECT name')) {
            return { rows: [...transaction].map(([name, data]) => ({ name, data })) };
          } else if (sql.startsWith('UPDATE')) transaction.set(params[0], JSON.parse(params[1]));
          return { rows: [] };
        }
      };
    }
  };
  return { pool, saved, statements, migrations };
}

test('database storage preserves existing data and commits changes across requests', async () => {
  const db = database();
  const storage = createStorage({ dataDir: path.join(__dirname, '../data'), pool: db.pool });
  await storage.run(() => {
    assert.equal(storage.read('products.json')[0].stock, 9);
    storage.write('products.json', [{ id: 1, stock: 8 }]);
    storage.write('orders.json', [{ id: 'test-order' }]);
    return { statusCode: 201 };
  }, true);
  await storage.run(() => {
    assert.equal(storage.read('products.json')[0].stock, 8);
    assert.equal(storage.read('orders.json')[0].id, 'test-order');
    return { statusCode: 200 };
  }, false);
  assert.ok(db.statements.includes('SELECT pg_advisory_xact_lock($1)'));
  assert.ok(db.statements.includes('SELECT pg_advisory_xact_lock_shared($1)'));
  assert.deepEqual(db.saved.get('reviews.json'), []);
  assert.equal(db.migrations.size, 1);
});

test('failed commits return an error instead of success and keep stored data intact', async () => {
  const db = database({ failCommit: true });
  const storage = createStorage({ dataDir: path.join(__dirname, '../data'), pool: db.pool });
  const app = express();
  const routes = createDataRoutes(app, storage);
  routes.post('/test', (req, res) => {
    storage.write('products.json', [{ id: 1, stock: 0 }]);
    storage.write('orders.json', [{ id: 'not-committed' }]);
    res.status(201).json({ success: true });
  });
  const server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  try {
    const response = await fetch(`http://127.0.0.1:${server.address().port}/test`, { method: 'POST' });
    assert.equal(response.status, 503);
    assert.equal((await response.json()).success, false);
    assert.equal(db.saved.get('products.json')[0].stock, 9);
    assert.ok(!db.saved.get('orders.json').some(order => order.id === 'not-committed'));
  } finally {
    await new Promise(resolve => server.close(resolve));
  }
});
