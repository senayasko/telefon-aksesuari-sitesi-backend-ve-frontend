const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

test('admin HTML event handlers are accessible at script scope', () => {
  const context = vm.createContext({ document: { addEventListener() {} } });
  vm.runInContext(fs.readFileSync(path.join(__dirname, '../public/js/admin.js'), 'utf8'), context);
  for (const name of ['handleAdminLogin', 'handleAdminCode', 'resetAdminLogin', 'handleAdminLogout']) {
    assert.equal(typeof context[name], 'function', name);
  }
});
