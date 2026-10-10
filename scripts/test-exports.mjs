import assert from 'node:assert/strict';
import { test } from 'node:test';
import { registerHooks } from 'node:module';
import ExcelJS from 'exceljs';
import JSZip from 'jszip';


// The production bundler resolves this extensionless import; Node's TS runner needs the extension.
registerHooks({ resolve(specifier, context, nextResolve) {
  return nextResolve(specifier.startsWith('./')&&!/\.(ts|js|mjs)$/.test(specifier)&&context.parentURL?.includes('/app/')?specifier+'.ts':specifier, context);
} });
const {seed,days}=await import('../app/domain.ts');
const { buildScheduleExport, buildRoomBoardExport } = await import('../app/spreadsheet-export.ts');
const {applyHousekeepingDay,rebalanceDay,housekeepingDay,updateDayTask}=await import('../app/housekeeping.ts');
const generatedAt = new Date('2026-10-07T01:00:00Z');
async function open(result) {
  assert.match(result.filename, /\.xlsx$/);
  assert.equal(result.mime, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  assert.equal(result.bytes[0], 0x50);
  assert.equal(result.bytes[1], 0x4b);
  const book = new ExcelJS.Workbook();
  await book.xlsx.load(result.bytes);
  return book;
}
function allStrings(book) {
  const values = [];
  book.eachSheet(sheet => sheet.eachRow(row => row.eachCell(cell => { if (typeof cell.value === 'string') values.push(cell.value); })));
  return values;
}
test('schedule workbook limits export to the selected week and preserves overnight dates and numeric hours', async () => {
  const state = seed();
  state.week = '2026-10-05';
  state.schedule = [
    { id: 'one', employee: 'e2', date: '2026-10-05', position: 'agent', shift: 'night' },
    { id: 'two', employee: 'e2', date: '2026-10-08', position: 'agent', shift: 'am' },
    { id: 'outside', employee: 'e2', date: '2026-10-12', position: 'agent', shift: 'pm' },
  ];
  state.published = false;
  const file = await buildScheduleExport(state, generatedAt);
  assert.equal(file.filename, 'easyman-schedule-2026-10-05-to-2026-10-11.xlsx');
  const book = await open(file);
  assert.deepEqual(book.worksheets.map(s => s.name), ['Weekly schedule', 'Shift details']);
  const details = book.getWorksheet('Shift details');
  assert.equal(details.rowCount, 7);
  assert.equal(details.getCell('E6').value.toISOString(), '2026-10-05T00:00:00.000Z');
  assert.equal(details.getCell('H6').value.toISOString(), '2026-10-06T00:00:00.000Z');
  assert.equal(details.getCell('J6').value, 8);
  assert.equal(details.getCell('K6').value, 'Draft');
  const overview = book.getWorksheet('Weekly schedule');
  const row = overview.getColumn(12).values.findIndex(value => value === 'e2');
  assert.equal(overview.getCell(row, 11).value.result, 16);
  assert.match(overview.getCell(row, 4).value, /\(\+1 day\)/);
  assert.equal(overview.getCell(row, 5).value, 'Day off');
  assert.equal(overview.getColumn(12).hidden, true);
  assert.equal(overview.views[0].ySplit, 5);
  assert.ok(details.autoFilter);
});
test('room board includes readable manager progress and portrait attendant sheets without internal IDs or lock fields', async () => {
  const state = seed();
  state.employees=state.employees.filter(e=>e.id==='e8');
  state.rooms = [
    { id: 'a', number: '001', type: 'king', floor: 1, score: 1.25, flag: 'Departure' },
    { id: 'b', number: '002', type: 'suite', floor: 1, score: 2, flag: 'DND' },
    { id: 'c', number: '010', type: 'king', floor: 1, score: 0, flag: 'Stayover' },
  ];
  state.boards = [{ id: 'assigned-a', room: 'a', employee: 'e8', status: 'Clean', locked: true }, { id: 'assigned-c', room: 'c', employee: 'e8', status: 'To clean', locked: false }];
  const file = await buildRoomBoardExport(state, generatedAt);
  assert.equal(file.filename, 'easyman-room-board-2026-10-06.xlsx');
  const book = await open(file);
  assert.deepEqual(book.worksheets.map(s => s.name), ['Attendant summary', 'Room assignments', 'Sofia Martinez']);
  const rooms = book.getWorksheet('Room assignments');
  assert.equal(rooms.rowCount, 8);
  assert.equal(rooms.getCell('A6').value, '001');
  assert.equal(rooms.getCell('G6').value, 1.25);
  assert.equal(rooms.getCell('F6').value, 'Marked clean');
  assert.equal(rooms.getCell('B6').value, 'Floor 1');
  assert.equal(rooms.getCell('B6').alignment.horizontal, 'left');
  assert.equal(rooms.getCell('B6').alignment.indent, 1);
  assert.equal(rooms.columnCount,7);
  assert.equal(rooms.getCell('G6').numFmt,'0.00');
  assert.ok(!allStrings(book).some(value=>/Attendant ID|Assignment locked|Locked rooms/.test(value)));
  const slip=book.getWorksheet('Sofia Martinez');
  assert.equal(slip.pageSetup.orientation,'portrait');
  assert.equal(slip.pageSetup.paperSize,1);
  assert.equal(slip.pageSetup.fitToWidth,1);
  assert.equal(slip.pageSetup.fitToHeight,0);
  assert.equal(slip.getCell('A6').value.result,'001');
  assert.equal(slip.getCell('A7').value.result,'010');
  assert.equal(slip.getCell('E6').value.result,'X');
  assert.equal(slip.autoFilter,undefined);
  assert.equal(slip.columnCount,5);
  assert.equal(slip.getCell('A9').value,'Notes for your supervisor');
  assert.equal(rooms.getCell('D7').value, 'Unassigned');
  assert.equal(rooms.getCell('E7').value, 'DND');
  assert.equal(rooms.getCell('G8').value, 0);
  const summary = book.getWorksheet('Attendant summary');
  assert.equal(summary.getCell('B6').value.result, 2);
  assert.equal(summary.getCell('C6').value.result, 1.25);
  assert.equal(summary.getCell('D6').value.result, 1);
  assert.equal(summary.getCell('E6').value.result, 1);
  assert.equal(summary.columnCount,5);
});
test('exports keep imported formula-like text literal and exclude unrelated personnel and availability records', async () => {
  const state = seed();
  state.employees[1].name = '=HYPERLINK("https://example.invalid","click")';
  state.employees[1].hours = 123456;
  state.training = [{ id: 'private-t', employee: 'e2', description: 'SECRET COACHING CONTENT' }];
  state.discipline = [{ id: 'private-d', employee: 'e2', description: 'SECRET DISCIPLINE CONTENT' }];
  state.availability = [{ id: 'av', employee: 'e2', reason: 'SECRET AVAILABILITY REASON' }];
  state.passon = [{ id: 'pass', description: 'SECRET GUEST CONTENT' }];
  state.schedule = [{ id: 'one', employee: 'e2', date: state.week, position: 'agent', shift: 'am' }];
  const schedule = await open(await buildScheduleExport(state, generatedAt));
  assert.equal(schedule.getWorksheet('Shift details').getCell('B6').type, ExcelJS.ValueType.String);
  assert.equal(schedule.getWorksheet('Shift details').getCell('B6').value, state.employees[1].name);
  const board = await open(await buildRoomBoardExport(state, generatedAt));
  const strings = [...allStrings(schedule), ...allStrings(board)].join('\n');
  assert.ok(!strings.includes('SECRET'));
  assert.ok(!strings.includes('123456'));
});
test('duplicate employee names remain separate and zero-assignment employees show zero hours', async () => {
  const state = seed();
  state.employees[1].name = 'Same name';
  state.employees[2].name = 'Same name';
  state.schedule = [{ id: 'one', employee: 'e2', date: state.week, position: 'agent', shift: 'am' }];
  const file = await buildScheduleExport(state, generatedAt);
  const book = await open(file);
  const ws = book.getWorksheet('Weekly schedule');
  const ids = ws.getColumn(12).values;
  assert.equal(ws.getCell(ids.findIndex(v => v === 'e2'), 11).value.result, 8);
  // ExcelJS's reader omits cached zero results; verify the actual OOXML value independently.
  const xml = await (await JSZip.loadAsync(file.bytes)).file('xl/worksheets/sheet1.xml').async('string');
  const zeroRow = ids.findIndex(v => v === 'e3');
  assert.match(xml, new RegExp('<c r="K' + zeroRow + '"[^>]*><f>[^<]+</f><v>0</v></c>'));
  assert.match(ws.getCell(ids.findIndex(v => v === 'e2'), 11).value.formula, /SUMPRODUCT/);
});
test('empty exports produce valid workbooks without invalid filters or missing data sheets', async () => {
  const state = seed();
  state.employees = [];
  state.schedule = [];
  state.rooms = [];
  state.boards = [];
  for (const builder of [buildScheduleExport, buildRoomBoardExport]) {
    const book = await open(await builder(state, generatedAt));
    for (const ws of book.worksheets) {
      assert.equal(ws.getCell('A6').value, 'No records for this export.');
      assert.equal(ws.autoFilter, undefined);
    }
  }
});

test('attendant sheets keep duplicate names separate, sanitize tab names, exclude inactive/DND assignments and respect overrides',async()=>{const s=seed();s.employees=[{id:'one',name:"O'Brien / Team: [A] very long name repeated",position:'attendant',qualifications:['attendant'],active:true},{id:'two',name:"O'Brien / Team: [A] very long name repeated",position:'attendant',qualifications:['attendant'],active:true}];s.rooms=[{id:'a',number:'007',floor:0,zone:'East',type:'king',flag:'Departure',score:1},{id:'b',number:'008',floor:2,type:'suite',flag:'Departure',score:2},{id:'dnd',number:'009',floor:2,type:'king',flag:'DND',score:1},{id:'dormant',number:'010',floor:2,type:'king',flag:'Departure',score:1}];s.boards=[{id:'a',room:'a',employee:'one',status:'To clean',scoreOverride:1.5,flagOverride:'Early arrival'},{id:'b',room:'b',employee:'two',status:'Clean'},{id:'d',room:'dnd',employee:'one',status:'To clean',locked:true},{id:'z',room:'dormant',employee:'two',active:false}];const book=await open(await buildRoomBoardExport(s,generatedAt));const tabs=book.worksheets.slice(2);assert.equal(tabs.length,2);assert.equal(new Set(tabs.map(t=>t.name.toLowerCase())).size,2);for(const tab of tabs){assert.ok(tab.name.length<=31);assert.ok(!/[\\/*?:\[\]]/.test(tab.name));assert.equal(tab.getCell('A7').value,null);}assert.equal(tabs[0].getCell('A6').value.result,'007');assert.equal(tabs[1].getCell('A6').value.result,'008');const rooms=book.getWorksheet('Room assignments');assert.equal(rooms.getCell('B6').value,'Floor 0 · East');assert.equal(rooms.getCell('E6').value,'Early arrival');assert.equal(rooms.getCell('G6').value,1.5);assert.equal(rooms.getCell('D8').value,'Unassigned');assert.equal(rooms.getCell('F8').value,'Do not enter');assert.equal(rooms.getCell('D9').value,'Unassigned');assert.equal(book.getWorksheet('Attendant summary').getCell('B6').value.result,1);assert.match(book.getWorksheet('Attendant summary').getCell('B6').value.formula,/O’Brien/);});

test('dated housekeeping exports use the selected day and omit no-service and DND rooms from attendant sheets',async()=>{
  let state=seed();state.boards=[];
  state=rebalanceDay(applyHousekeepingDay(state,'2026-10-10',[{roomNumber:'201',service:'departure'},{roomNumber:'202',service:'stayover'},{roomNumber:'203',service:'departure'}]),'2026-10-10');
  state=updateDayTask(state,'2026-10-10','r2',{flagOverride:'DND',active:false});
  const file=await buildRoomBoardExport(housekeepingDay(state,'2026-10-10'),generatedAt),book=await open(file);
  assert.equal(file.filename,'easyman-room-board-2026-10-10.xlsx');
  const overview=book.getWorksheet('Room assignments');assert.equal(overview.getCell('A2').value,'The Linden House | Oct 10, 2026');
  assert.equal(overview.getCell('E7').value,'Stayover');assert.equal(overview.getCell('F8').value,'Do not enter');
  assert.equal(overview.getCell('E9').value,'No service');assert.equal(overview.getCell('F9').value,'No task');assert.equal(overview.getCell('G9').value,0);
  const printed=book.worksheets.slice(2).flatMap(s=>s.getColumn(1).values.filter(v=>v&&typeof v==='object'&&'result' in v).map(v=>v.result));
  assert.deepEqual(printed.sort(),['201','202']);assert.ok(book.worksheets.slice(2).every(s=>s.pageSetup.orientation==='portrait'));
});
