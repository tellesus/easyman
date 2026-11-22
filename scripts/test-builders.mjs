// Regression tests from the November 2026 strange-case review of the schedule builder and the
// housekeeping board: fillable shifts are filled, unusual inputs do not stop a week or a day,
// and the messages say what happened in words a manager can act on.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { registerHooks } from 'node:module';

registerHooks({
  resolve(specifier, context, next) {
    const local = specifier.startsWith('./') && !/\.(ts|js|mjs)$/.test(specifier) && context.parentURL?.includes('/app/');
    return next(local ? specifier + '.ts' : specifier, context);
  },
});

const { seed, generateSchedule, scheduleQuality, gapReason, assignmentError, effectiveShift, days, validateImport } = await import('../app/domain.ts');
const { generationSummary, ensureStaffingWeek, requirementsForDate, isOvernight } = await import('../app/staffing.ts');
const hk = await import('../app/housekeeping.ts');
const { zonedInstant } = await import('../app/time.ts');
const { manualAssignmentWarnings } = await import('../app/scheduling-actions.ts');

const WEEK = '2027-02-01'; // a Monday with no clock change
const DAY = '2027-02-03';

function scheduleFixture() {
  const state = seed();
  Object.assign(state, { week: WEEK, schedule: [], availability: [], publications: [], publishedWeeks: [], published: false, staffingWeeks: [] });
  return state;
}
function only(state, ids, change = (e) => e) {
  state.employees = state.employees.filter((e) => ids.includes(e.id)).map(change);
  return state;
}
const needs = (...rules) => rules.map(([position, shift, count = 1], i) => ({ id: 'need' + i, position, shift, count }));

// Every generated shift must pass the app's own eligibility check against the finished week.
function assertNoRuleBroken(state, result, dates = days(state.week)) {
  const final = [...state.schedule.filter((a) => !dates.includes(a.date)), ...result.assignments];
  const hours = {};
  for (const a of final) hours[a.employee] = (hours[a.employee] || 0) + Number(effectiveShift(state, a).hours);
  for (const a of result.assignments) {
    const employee = state.employees.find((e) => e.id === a.employee);
    assert.equal(assignmentError(state, employee, a.date, effectiveShift(state, a), a.position, final, a.id), null);
    assert.ok(hours[a.employee] <= Number(employee.maxHours ?? 40), employee.name + ' is over their weekly maximum');
  }
}

function boardFixture() {
  const state = seed();
  state.boards = [];
  state.housekeepingDays = [];
  return state;
}
const everyRoom = (state, service = () => 'departure') =>
  state.rooms.filter((r) => r.active !== false).map((r, i) => ({ roomNumber: String(r.number), service: service(r, i) }));
const ATTENDANTS = ['e8', 'e9', 'e10'];
function roomCounts(state, date = DAY) {
  const counts = Object.fromEntries(ATTENDANTS.map((id) => [id, 0]));
  for (const task of hk.housekeepingDay(state, date).boards) if (task.active !== false && task.employee) counts[task.employee]++;
  return ATTENDANTS.map((id) => counts[id]);
}

// ---------- schedule builder ----------

test('a person who holds two positions is moved so both positions are covered', () => {
  const state = only(scheduleFixture(), ['e1', 'e2', 'e6']);
  state.config.staffing = needs(['agent', 'am', 2], ['supervisor', 'am', 1]);
  const result = generateSchedule(state, [WEEK]);
  assert.equal(result.coverage, 100);
  assert.equal(result.assignments.find((a) => a.position === 'supervisor').employee, 'e1');
  assertNoRuleBroken(state, result, [WEEK]);
});

test('a gap is filled even when one person must hand over two shifts to take it', () => {
  const limits = { e1: 16, e2: 40, e3: 16 };
  const state = only(scheduleFixture(), ['e1', 'e2', 'e3'], (e) => ({ ...e, maxHours: limits[e.id], overnightOK: e.id === 'e3' }));
  state.config.staffing = needs(['agent', 'pm'], ['agent', 'night']);
  const dates = days(WEEK).slice(0, 2);
  const result = generateSchedule(state, dates);
  assert.equal(result.assignments.length, 4);
  assert.equal(result.coverage, 100);
  assertNoRuleBroken(state, result, dates);
});

test('the sample week is fully covered without breaking a rule, and regenerating one day leaves the others alone', () => {
  const state = scheduleFixture();
  const week = generateSchedule(state);
  assert.equal(week.coverage, 100);
  assertNoRuleBroken(state, week);
  state.schedule = week.assignments;
  const wednesday = days(WEEK)[2];
  const others = JSON.stringify(state.schedule.filter((a) => a.date !== wednesday));
  const again = generateSchedule(state, [wednesday]);
  assert.equal(again.coverage, 100);
  assert.ok(again.assignments.every((a) => a.date === wednesday));
  assert.equal(JSON.stringify(state.schedule.filter((a) => a.date !== wednesday)), others);
});

test('gap notes name the day, the number of people, the shift, the position and the reason', () => {
  const nobodyApproved = scheduleFixture();
  nobodyApproved.employees = nobodyApproved.employees.map((e) => ({ ...e, overnightOK: false }));
  const note = generateSchedule(nobodyApproved).warnings.find((w) => w.includes('Overnight'));
  assert.equal(note, 'Mon, Feb 1: 1 more person needed for Overnight (Guest Service Agent). Of 7 qualified: 7 not approved for overnight shifts.');

  const capped = scheduleFixture();
  capped.employees = capped.employees.map((e) => ({ ...e, maxHours: 0 }));
  assert.match(generateSchedule(capped).warnings[0], /2 more people needed for Morning \(Guest Service Agent\)\. Of 7 qualified: 7 at the weekly hour limit\./);

  const empty = scheduleFixture();
  empty.employees = [];
  assert.match(generateSchedule(empty).warnings[0], /No active employee is qualified as Guest Service Agent\./);
  assert.equal(gapReason(empty, WEEK, 'gone', 'agent'), 'This shift or position no longer exists in Property settings.');
});

test('the generation message counts people, and says so when there is nothing to schedule', () => {
  const state = scheduleFixture();
  state.schedule = generateSchedule(state).assignments;
  assert.equal(generationSummary(state), 'Draft generated. Every required shift is covered.');

  const short = scheduleFixture();
  short.config.staffing = needs(['agent', 'am', 10]);
  short.schedule = generateSchedule(short).assignments;
  assert.equal(generationSummary(short), '50% covered. 35 people are still needed across 7 shifts.');

  const none = scheduleFixture();
  none.config.staffing = [];
  assert.equal(generateSchedule(none).assignments.length, 0);
  assert.match(generationSummary(none), /^No staffing needs are set for these days, so nothing was scheduled\./);
});

test('a shift switched off after the week was saved is no longer required', () => {
  const state = ensureStaffingWeek(scheduleFixture());
  state.config.shifts = state.config.shifts.map((s) => (s.id === 'pm' ? { ...s, active: false } : s));
  assert.ok(!requirementsForDate(state, WEEK).some((r) => r.shift === 'pm'));
  const result = generateSchedule(state);
  assert.equal(result.coverage, 100);
  assert.ok(!result.assignments.some((a) => a.shift === 'pm'));
  state.config.shifts = state.config.shifts.map((s) => ({ ...s, active: true }));
  assert.ok(requirementsForDate(state, WEEK).some((r) => r.shift === 'pm'), 'the saved need returns when the shift is switched back on');
});

test('a shift that ends exactly at midnight is not overnight work', () => {
  const state = scheduleFixture();
  const late = { id: 'late', name: 'Late', start: '16:00', end: '00:00', hours: 8 };
  state.config.shifts.push(late);
  state.config.staffing = needs(['agent', 'late', 2]);
  assert.equal(isOvernight(late), false);
  assert.equal(isOvernight({ start: '23:00', end: '07:30' }), true);
  assert.equal(isOvernight({ start: '08:00', end: '16:00', overnight: true }), true);
  const result = generateSchedule(state);
  assert.equal(result.coverage, 100);
  assertNoRuleBroken(state, result);
  // Being off the next day does not block a shift that finishes as that day begins.
  state.availability = [{ id: 'off', employee: 'e2', date: days(WEEK)[1] }];
  assert.equal(assignmentError(state, state.employees.find((e) => e.id === 'e2'), WEEK, late, 'agent', []), null);
});

test('the week of the spring clock change can be generated when a shift ends in the skipped hour', () => {
  const state = scheduleFixture();
  state.week = '2027-03-08';
  state.config.shifts.push({ id: 'bar', name: 'Bar close', start: '18:00', end: '02:30', hours: 8 });
  state.config.staffing = needs(['agent', 'bar']);
  state.employees = state.employees.map((e) => ({ ...e, overnightOK: true }));
  const result = generateSchedule(state);
  assert.equal(result.coverage, 100);
  assertNoRuleBroken(state, result);
  const notes = scheduleQuality({ ...state, schedule: result.assignments }).constraintWarnings;
  assert.ok(!notes.some((note) => /does not exist|daylight/.test(note)), notes.join(' | '));
  const saturday = { id: 'x', employee: 'e2', date: '2027-03-13', shift: 'bar', position: 'agent' };
  assert.ok(!manualAssignmentWarnings(state, saturday).some((note) => /does not exist/.test(note)));
  // A skipped time resolves one hour later, on either side of the world; an existing time is still exact.
  const iso = (date, time, zone, lenient) => new Date(zonedInstant(date, time, zone, lenient)).toISOString();
  assert.equal(iso('2027-03-14', '02:30', 'America/Chicago', true), '2027-03-14T08:30:00.000Z');
  assert.equal(iso('2027-10-03', '02:30', 'Australia/Sydney', true), '2027-10-02T16:30:00.000Z');
  assert.equal(iso('2027-03-14', '03:30', 'America/Chicago', true), '2027-03-14T08:30:00.000Z');
  assert.throws(() => zonedInstant('2027-03-14', '02:30', 'America/Chicago'), /does not exist/);
});

test('odd stored values do not derail generation', () => {
  const text = scheduleFixture();
  text.config.shifts = text.config.shifts.map((s) => ({ ...s, hours: '8' }));
  assert.equal(generateSchedule(text).coverage, 100);
  const malformed = scheduleFixture();
  malformed.employees = malformed.employees.map((e) => (e.id === 'e2' ? { ...e, preferredWeekdays: 3 } : e));
  assert.equal(generateSchedule(malformed).coverage, 100);
});

test('a team of 60 is scheduled promptly', () => {
  const state = scheduleFixture();
  state.employees = Array.from({ length: 60 }, (_, i) => ({ id: 'p' + String(i).padStart(3, '0'), name: 'Person ' + i, position: 'agent', qualifications: ['agent'], hours: 40, active: true, overnightOK: i % 3 === 0, preferred: ['am', 'pm', 'night'][i % 3] }));
  state.config.staffing = needs(['agent', 'am', 12], ['agent', 'pm', 12], ['agent', 'night', 6]);
  const started = performance.now();
  const result = generateSchedule(state);
  const seconds = (performance.now() - started) / 1000;
  assert.equal(result.coverage, 100);
  // Before the fix this took about ten seconds; the generous limit only guards against a return to that.
  assert.ok(seconds < 5, 'took ' + seconds.toFixed(1) + ' seconds');
});

test('imports refuse an empty qualifications list and a second active room with the same number', () => {
  const state = scheduleFixture();
  const person = { id: 'new1', name: 'Pat Example', department: 'fo', position: 'agent' };
  assert.throws(() => validateImport('employees', [{ ...person, qualifications: [] }], state), /qualifications is empty/);
  assert.equal(validateImport('employees', [person], state).length, 1);
  const room = { id: 'dup-201', number: '201', type: 'king', floor: 2, score: 1 };
  assert.throws(() => validateImport('rooms', [room], state), /Room number 201 would belong to more than one active room/);
  assert.equal(validateImport('rooms', [{ ...room, active: false }], state).length, 1);
  assert.equal(validateImport('rooms', [{ ...room, id: 'r0' }], state).length, 1, 'updating the room that already has the number is allowed');
});

// ---------- housekeeping board ----------

test('rebalancing reports what happened: nobody working, nothing to clean, or who received no rooms', () => {
  const nobody = hk.rebalanceDay(hk.applyDaySetup(boardFixture(), DAY, everyRoom(boardFixture()), true, []), DAY);
  assert.equal(hk.rebalanceSummary(nobody, DAY), 'Nobody is marked as working, so all 24 rooms stay unassigned. Choose who is working under Working today, then rebalance.');

  const nothing = hk.applyDaySetup(boardFixture(), DAY, everyRoom(boardFixture(), () => 'none'), true, ATTENDANTS);
  assert.equal(hk.rebalanceSummary(nothing, DAY), 'No rooms need cleaning on this day, so there is nothing to assign.');

  const few = hk.applyDaySetup(boardFixture(), DAY, everyRoom(boardFixture(), (r, i) => (i < 2 ? 'departure' : 'none')), true, ATTENDANTS);
  assert.equal(hk.rebalanceSummary(few, DAY), '2 rooms balanced across 2 attendants. Rooms kept with attendants were preserved. Lily Thompson has no rooms.');

  const all = hk.applyDaySetup(boardFixture(), DAY, everyRoom(boardFixture()), true, ATTENDANTS);
  assert.equal(hk.rebalanceSummary(all, DAY), '24 rooms balanced across 3 attendants. Rooms kept with attendants were preserved.');
});

test('rooms worth no points are shared out by room count', () => {
  const some = boardFixture();
  some.rooms = some.rooms.map((r, i) => ({ ...r, score: i < 8 ? 0 : 1 }));
  assert.deepEqual(roomCounts(hk.applyDaySetup(some, DAY, everyRoom(some), true, ATTENDANTS)), [8, 8, 8]);

  const every = boardFixture();
  every.rooms = every.rooms.map((r) => ({ ...r, score: 0 }));
  assert.deepEqual(roomCounts(hk.applyDaySetup(every, DAY, everyRoom(every), true, ATTENDANTS)), [8, 8, 8]);

  // The daily points field on a room accepts 0.
  let daily = hk.applyDaySetup(boardFixture(), DAY, everyRoom(boardFixture()), true, ATTENDANTS);
  for (const room of daily.rooms.slice(0, 6)) daily = hk.updateDayTask(daily, DAY, room.id, { scoreOverride: 0 });
  const counts = roomCounts(hk.rebalanceDay(daily, DAY));
  assert.ok(Math.max(...counts) - Math.min(...counts) <= 2, 'room counts ' + counts.join(' / '));
});

test('an ordinary day stays balanced by workload points', () => {
  const state = hk.applyDaySetup(boardFixture(), DAY, everyRoom(boardFixture()), true, ATTENDANTS);
  const view = hk.housekeepingDay(state, DAY);
  const points = ATTENDANTS.map((id) => view.boards.filter((b) => b.employee === id).reduce((sum, b) => sum + view.rooms.find((r) => r.id === b.room).score, 0));
  assert.deepEqual(roomCounts(state), [8, 8, 8]);
  assert.ok(Math.max(...points) - Math.min(...points) <= 2, 'points ' + points.join(' / '));
});

test('rooms held by someone who can no longer work the board are released', () => {
  const state = hk.applyDaySetup(boardFixture(), DAY, everyRoom(boardFixture()), true, ATTENDANTS);
  const retired = { ...state, employees: state.employees.map((e) => (e.id === 'e9' ? { ...e, active: false } : e)) };
  const result = hk.releaseUnqualifiedAttendants(retired, 'e9', DAY);
  assert.equal(result.released, 8);
  assert.ok(!result.state.boards.some((b) => b.employee === 'e9'));
  assert.equal(hk.releaseUnqualifiedAttendants(state, 'e9', DAY).released, 0);
  assert.equal(hk.releaseUnqualifiedAttendants(state, 'e9', DAY).state, state, 'nothing changes while they can still work the board');
  // Days already past keep their record of who cleaned what.
  assert.equal(hk.releaseUnqualifiedAttendants(retired, 'e9', '2027-02-04').released, 0);
  // Saving one profile never releases another attendant's rooms, even when this account cannot see that attendant's record.
  const partial = { ...state, employees: state.employees.filter((e) => e.id !== 'e8') };
  assert.equal(hk.releaseUnqualifiedAttendants(partial, 'e9', DAY).released, 0);
  assert.equal(hk.releaseUnqualifiedAttendants({ ...partial, employees: retired.employees.filter((e) => e.id !== 'e8') }, 'e9', DAY).state.boards.filter((b) => b.employee === 'e8').length, 8);
});

test('a retired room that shares a number with a live room does not take its service', () => {
  const state = boardFixture();
  state.rooms = [{ id: 'old201', number: '201', type: 'king', floor: 2, score: 1, active: false }, ...state.rooms];
  const set = hk.applyDaySetup(state, DAY, [{ roomNumber: '201', service: 'departure' }], true, ATTENDANTS);
  const view = hk.housekeepingDay(set, DAY);
  assert.equal(view.rooms.find((r) => r.id === 'r0').service, 'departure');
  assert.ok(view.boards.some((b) => b.room === 'r0' && b.employee));
});

test('a room retired after the day was set up does not block edits to that day', () => {
  let state = hk.applyDaySetup(boardFixture(), DAY, everyRoom(boardFixture()), true, ATTENDANTS);
  state = { ...state, rooms: state.rooms.map((r) => (r.id === 'r3' ? { ...r, active: false } : r)) };
  const rows = hk.housekeepingDay(state, DAY).rooms.map((r) => ({ roomNumber: String(r.number), service: r.id === 'r5' ? 'stayover' : r.service }));
  const next = hk.applyHousekeepingDay(state, DAY, rows);
  const view = hk.housekeepingDay(next, DAY);
  assert.equal(view.rooms.find((r) => r.id === 'r5').service, 'stayover');
  assert.equal(view.rooms.find((r) => r.id === 'r3').service, 'departure', 'the retired room keeps the service it was set up with for that day');
  // A new day uses only the live catalog.
  assert.ok(hk.dayImportProblems([{ roomNumber: '204', service: 'departure' }], next, '2027-02-04')[0].includes('unknown room "204"'));
});

test('daily file room numbers ignore stray spaces, and unmatched numbers are quoted', () => {
  const state = boardFixture();
  const file = JSON.stringify({ format: 'easyman-housekeeping-day-v1', date: DAY, rooms: [{ roomNumber: ' 201 ', service: 'departure' }], unmatched: [] });
  const parsed = hk.parseDayImport(file, DAY);
  assert.equal(parsed.rooms[0].roomNumber, '201');
  assert.deepEqual(hk.dayImportProblems(parsed.rooms, state), []);
  assert.equal(hk.dayImportProblems([{ roomNumber: '201 ', service: 'departure' }], state)[0], 'Entry 1: unknown room "201 ". Choose a catalog room or exclude this entry.');
  state.rooms = [...state.rooms, { id: 'dup', number: '201', type: 'king', floor: 2, score: 1 }];
  assert.match(hk.dayImportProblems([{ roomNumber: '201', service: 'departure' }], state)[0], /more than one active room is numbered "201"\. Correct the room catalog/);
});

test('a property of 1,200 rooms is balanced promptly', () => {
  const state = boardFixture();
  state.rooms = Array.from({ length: 1200 }, (_, i) => ({ id: 'R' + i, number: String(1000 + i), type: 'king', floor: 1 + Math.floor(i / 40), score: [1, 1.25, 2][i % 3] }));
  state.employees = Array.from({ length: 40 }, (_, i) => ({ id: 'A' + i, name: 'Attendant ' + i, position: 'attendant', qualifications: ['attendant'], active: true }));
  const started = performance.now();
  const set = hk.applyDaySetup(state, DAY, everyRoom(state), true, state.employees.map((e) => e.id));
  const seconds = (performance.now() - started) / 1000;
  assert.equal(hk.housekeepingDay(set, DAY).boards.filter((b) => b.employee).length, 1200);
  // Before the fix this took eight to ten seconds.
  assert.ok(seconds < 4, 'took ' + seconds.toFixed(1) + ' seconds');
});
