// Regression tests for the 2026-11 audit fixes: withheld edits are reported instead of
// dropped or thrown, save failures are classified for retry, and two UI invariants hold.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { test } from 'node:test';
import { registerHooks } from 'node:module';

registerHooks({
  resolve(specifier, context, next) {
    const local = specifier.startsWith('./') && !/\.(ts|js|mjs)$/.test(specifier) && context.parentURL?.includes('/app/');
    return next(local ? specifier + '.ts' : specifier, context);
  },
});

const { profileGrants, withheldMessage } = await import('../app/access.ts');
const { newIdentity, resources, directory } = await import('../app/team-crypto.ts');
const { seed } = await import('../app/domain.ts');
const { saveTeam } = await import('../app/team-client.ts');

const identity = await newIdentity();
const clone = (value) => JSON.parse(JSON.stringify(value));

// A stored-record stand-in carrying only what saveTeam reads from a prior record.
function stored(item) {
  const aadVersion = item.field === 'publication' ? 3 : item.field === 'passon' ? 2 : undefined;
  return {
    id: item.id,
    field: item.field,
    subject: item.subject,
    revision: 1,
    aadVersion,
    ...(item.field === 'publication' ? { publicationWeeks: item.value.publishedWeeks } : {}),
  };
}

function setup(profile = 'Manager') {
  const state = seed();
  const member = {
    userId: 'u1',
    email: 'manager@example.invalid',
    status: 'active',
    employeeId: 'e1',
    grants: profileGrants(profile),
    publicKey: identity.publicKey,
  };
  const context = {
    propertyId: 'hotel',
    revision: 5,
    keyEpoch: 0,
    member,
    members: [member],
    directory: directory(state),
    identity,
    known: new Map(),
  };
  for (const item of resources(state, 'u1'))
    context.known.set(item.id, { resource: stored(item), value: JSON.stringify(item.value) });
  return { state, context };
}

// Replaces fetch for one save: answers the revision check and captures the PUT body.
function server({ revision = 5, put = { status: 200 }, offline = false } = {}) {
  const calls = { put: null };
  globalThis.fetch = async (url, init) => {
    if (offline) throw new TypeError('Failed to fetch');
    if (!init || init.method !== 'PUT')
      return new Response(JSON.stringify({ revision, members: [], member: {}, keyEpoch: 0 }), { status: 200 });
    calls.put = JSON.parse(init.body);
    return new Response(JSON.stringify(put.status === 200 ? { revision: revision + 1 } : { error: put.error || 'failed' }), {
      status: put.status,
    });
  };
  return calls;
}

test('an unchanged workspace reports nothing withheld', async () => {
  const { state, context } = setup();
  const calls = server();
  const result = await saveTeam(state, context, 'u1');
  assert.deepEqual(result.withheld, []);
  assert.deepEqual(calls.put.records, []);
  assert.deepEqual(calls.put.deleted, []);
});

test('a new record the account may not write is reported, and permitted records still save', async () => {
  const { state, context } = setup();
  state.rooms = [...state.rooms, { ...clone(state.rooms[0]), id: 'room-new', number: '999' }];
  state.passon = [{ ...clone(state.passon[0]), id: 'passon-new' }, ...state.passon];
  const calls = server();
  const result = await saveTeam(state, context, 'u1');
  assert.deepEqual(result.withheld, ['rooms']);
  const saved = calls.put.records.map((r) => r.id);
  assert.ok(saved.includes('passon:passon-new'), 'the permitted pass-on is uploaded');
  assert.ok(!saved.some((id) => id.startsWith('rooms:')), 'the room is not uploaded');
  assert.match(withheldMessage(result.withheld), /permission to change rooms/);
});

test('an unpermitted edit to an existing record is reported instead of blocking the save', async () => {
  const { state, context } = setup();
  state.employees = state.employees.map((e, i) => (i === 0 ? { ...e, name: 'Renamed Person' } : e));
  state.passon = [{ ...clone(state.passon[0]), id: 'passon-new' }, ...state.passon];
  const calls = server();
  const result = await saveTeam(state, context, 'u1');
  assert.deepEqual(result.withheld, ['employees']);
  assert.ok(calls.put.records.some((r) => r.id === 'passon:passon-new'));
  assert.ok(!calls.put.records.some((r) => r.field === 'employees'));
});

test('an unpermitted delete is withheld and reported while a permitted delete goes through', async () => {
  const { state, context } = setup();
  const room = state.rooms[0].id;
  const passon = state.passon[0].id;
  state.rooms = state.rooms.slice(1);
  state.passon = state.passon.slice(1);
  const calls = server();
  const result = await saveTeam(state, context, 'u1');
  assert.deepEqual(result.withheld, ['rooms']);
  assert.ok(calls.put.deleted.includes('passon:' + passon));
  assert.ok(!calls.put.deleted.includes('rooms:' + room));
});

test('save failures say whether they can be retried', async () => {
  const offline = setup();
  server({ offline: true });
  await assert.rejects(saveTeam(offline.state, offline.context, 'u1'), (e) => e.network === true && !e.conflict);

  const moved = setup();
  server({ revision: 6 });
  await assert.rejects(saveTeam(moved.state, moved.context, 'u1'), (e) => e.conflict === true);

  const conflict = setup();
  server({ put: { status: 409, error: 'Concurrent change detected.' } });
  await assert.rejects(saveTeam(conflict.state, conflict.context, 'u1'), (e) => e.status === 409 && e.conflict === true);

  const broken = setup();
  server({ put: { status: 500 } });
  await assert.rejects(saveTeam(broken.state, broken.context, 'u1'), (e) => e.status === 500 && e.conflict === false);
});

test('workspace changes are computed outside the React state updater', () => {
  const source = fs.readFileSync('app/workspace.tsx', 'utf8');
  // A throw inside a setState updater surfaces during render and blanks the app.
  assert.ok(!/setState\(\s*\(?\w+\)?\s*=>[^;]*\bfn\(/.test(source), 'change() must not run fn inside setState');
  assert.match(source, /function commit\(next:State\)/);
});

test('only password accounts may clear the browser account key on sign-out', () => {
  const waiting = fs.readFileSync('app/account-waiting.tsx', 'utf8');
  const wipes = waiting.split("deviceStore('account:'+user.id,null)").length - 1;
  assert.equal(wipes, 1);
  const gate = waiting.indexOf("user.provider==='password'?<button");
  const wipe = waiting.indexOf("deviceStore('account:'+user.id,null)");
  const other = waiting.indexOf(':<a className="secondary" href="/signout-with-chatgpt');
  assert.ok(gate !== -1 && gate < wipe && wipe < other, 'the key wipe sits inside the password-only branch');

  const staff = fs.readFileSync('app/staff-workspace.tsx', 'utf8');
  const uses = [...staff.matchAll(/<AccountControls /g)];
  assert.ok(uses.length >= 2);
  for (const use of uses)
    assert.ok(staff.slice(0, use.index).endsWith("user.provider==='password'?"), 'AccountControls is gated on the password provider');
});
