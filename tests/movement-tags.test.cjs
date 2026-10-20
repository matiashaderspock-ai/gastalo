const { test } = require('node:test');
const assert = require('node:assert/strict');
const A = require('../app.js');
const tag = (id, name = id, archived_at = null) => ({ id, name, archived_at });

test('suggestions rank posted usage, ignore deleted movements and do not preselect tags', () => {
  const state = { tags: [tag('a'), tag('b'), tag('c')], transactions: [
    { status: 'posted', tag_ids: ['b', 'c'] }, { status: 'posted', tag_ids: ['b'] },
    ...Array.from({ length: 10 }, () => ({ status: 'deleted', tag_ids: ['a'] })),
  ] };
  const selected = [], before = structuredClone(state);
  assert.deepEqual(A.movementTagSuggestions(state, selected, 2).map(t => t.id), ['b', 'c']);
  assert.deepEqual(selected, []);
  assert.deepEqual(state, before);
});

test('limit popular tags to six, retain all selected tags including archived and uncommon ones', () => {
  const state = { tags: [...Array.from({ length: 8 }, (_, i) => tag('tag' + i)), tag('archived', 'Archived', '2026-01-01')], transactions: [] };
  assert.equal(A.movementTagSuggestions(state).length, 6);
  const result = A.movementTagSuggestions(state, ['tag7', 'archived']);
  assert.equal(result.length, 8);
  assert.ok(result.some(t => t.id === 'tag7'));
  assert.ok(result.some(t => t.id === 'archived'));
  assert.equal(new Set(result.map(t => t.id)).size, result.length);
  assert.equal(A.movementTagSuggestions(state).some(t => t.id === 'archived'), false);
});

test('empty tags and alphabetic ties produce stable suggestions', () => {
  assert.deepEqual(A.movementTagSuggestions(A.emptyState()), []);
  const state = { tags: [tag('z', 'Zeta'), tag('b', 'Almuerzo'), tag('a', 'Almuerzo')], transactions: [] };
  assert.deepEqual(A.movementTagSuggestions(state).map(t => t.id), ['a', 'b', 'z']);
});
