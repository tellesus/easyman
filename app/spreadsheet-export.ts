import ExcelJS from 'exceljs';
import { days, type State, type Row } from './domain';

const GREEN = 'FF355F49';
const PALE = 'FFF1F5ED';
const INK = 'FF283B32';
const MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
type Column = { label: string; width: number; format?: string };
type ExportResult = { bytes: Uint8Array<ArrayBuffer>; filename: string; mime: string };

// Workbooks contain only the operational fields explicitly added here.
// Text stays a string, including values beginning with '=' or room numbers with leading zeros.
const text = (value: unknown): string => String(value ?? '').slice(0, 32767);
const number = (value: unknown): number => Number.isFinite(Number(value)) ? Number(value) : 0;
const employeeName = (state: State, id: string) => text(state.employees.find(e => e.id === id)?.name || 'Unassigned');
const nameFor = (rows: Row[], id: string) => text(rows.find(r => r.id === id)?.name || id);
const dateValue = (date: string) => new Date(`${date}T00:00:00Z`);
const dateText = (date: string) => dateValue(date).toLocaleDateString('en-US', { timeZone: 'UTC', month: 'short', day: 'numeric', year: 'numeric' });
const timeValue = (time: string) => { const [hour, minute] = time.split(':').map(Number); return (hour * 60 + minute) / 1440; };
const nextDate = (date: string) => days(date, 2)[1];

function newWorkbook(exportedAt: Date) {
  const book = new ExcelJS.Workbook();
  book.creator = 'EasyMan';
  book.created = exportedAt;
  book.modified = exportedAt;
  book.calcProperties.fullCalcOnLoad = true;
  return book;
}

function sheet(book: ExcelJS.Workbook, name: string, title: string, context: string, note: string, columns: Column[]) {
  const ws = book.addWorksheet(name, {
    views: [{ state: 'frozen', ySplit: 5, showGridLines: false }],
    pageSetup: { orientation: 'landscape', paperSize: 9, fitToPage: true, fitToWidth: 1, fitToHeight: 0 },
  });
  ws.columns = columns.map(c => ({ width: c.width, style: { font: { name: 'Calibri', size: 11, color: { argb: INK } }, alignment: { vertical: 'middle', wrapText: true }, ...(c.format ? { numFmt: c.format } : {}) } }));
  for (const [row, value] of [[1, title], [2, context], [3, note]] as const) {
    ws.mergeCells(row, 1, row, columns.length);
    ws.getCell(row, 1).value = text(value);
  }
  ws.getRow(1).height = 32;
  ws.getCell('A1').font = { name: 'Calibri', size: 20, bold: true, color: { argb: GREEN } };
  ws.getRow(2).height = 24;
  ws.getRow(3).height = 34;
  ws.getCell('A3').font = { name: 'Calibri', size: 10, color: { argb: 'FF687761' } };
  ws.getRow(5).values = columns.map(c => c.label);
  ws.getRow(5).height = 32;
  ws.getRow(5).eachCell(cell => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: GREEN } };
    cell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.alignment = { vertical: 'middle', wrapText: true };
  });
  ws.pageSetup.printTitlesRow = '1:5';
  ws.pageSetup.margins = { left: 0.25, right: 0.25, top: 0.4, bottom: 0.4, header: 0.2, footer: 0.2 };
  return ws;
}

function finish(ws: ExcelJS.Worksheet, count: number, rowHeight = 30) {
  for (let row = 6; row < 6 + count; row++) {
    ws.getRow(row).height = Math.max(ws.getRow(row).height || 0, rowHeight);
    ws.getRow(row).eachCell({ includeEmpty: true }, cell => {
      if (row % 2 === 0) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: PALE } };
      cell.border = { bottom: { style: 'hair', color: { argb: 'FFE1E8DA' } } };
    });
  }
  if (count) ws.autoFilter = { from: { row: 5, column: 1 }, to: { row: 5 + count, column: ws.columnCount } };
  else {
    ws.mergeCells(6, 1, 6, ws.columnCount);
    ws.getCell('A6').value = 'No records for this export.';
    ws.getRow(6).height = 28;
  }
  ws.pageSetup.printArea = `A1:${ws.getColumn(ws.columnCount).letter}${Math.max(6, count + 5)}`;
}

async function result(book: ExcelJS.Workbook, filename: string): Promise<ExportResult> {
  const buffer = await book.xlsx.writeBuffer();
  return { bytes: new Uint8Array(buffer), filename, mime: MIME };
}

export async function buildScheduleExport(state: State, exportedAt = new Date()): Promise<ExportResult> {
  const dates = days(state.week);
  const assignments = state.schedule.filter(a => dates.includes(a.date)).sort((a, b) => a.date.localeCompare(b.date) || employeeName(state, a.employee).localeCompare(employeeName(state, b.employee)));
  const status = state.published ? 'Published' : 'Draft';
  const context = `${state.config.name} | ${dateText(dates[0])} – ${dateText(dates[6])} | ${status} | ${state.config.timezone}`;
  const book = newWorkbook(exportedAt);
  const overview = sheet(book, 'Weekly schedule', 'Weekly schedule', context, 'Times use the property shift templates. Overnight shifts belong to their start date. Hours are scheduling estimates.', [
    { label: 'Employee', width: 25 }, { label: 'Department', width: 21 }, { label: 'Primary position', width: 26 },
    ...dates.map(d => ({ label: dateValue(d).toLocaleDateString('en-US', { timeZone: 'UTC', weekday: 'short', month: 'short', day: 'numeric' }), width: 23 })),
    { label: 'Scheduled hours', width: 17, format: '0.##' }, { label: 'Employee ID', width: 24 },
  ]);
  overview.views = [{ state: 'frozen', xSplit: 3, ySplit: 5, showGridLines: false }];
  overview.getColumn(12).hidden = true;
  const details = sheet(book, 'Shift details', 'Shift assignments', context, 'One row per assignment. End date accounts for overnight shifts. Use the filters to sort by employee, date, department, or position.', [
    { label: 'Employee ID', width: 24 }, { label: 'Employee', width: 25 }, { label: 'Department', width: 21 }, { label: 'Assigned position', width: 27 },
    { label: 'Start date', width: 17, format: 'yyyy-mm-dd' }, { label: 'Shift', width: 18 }, { label: 'Start time', width: 14, format: 'hh:mm' },
    { label: 'End date', width: 17, format: 'yyyy-mm-dd' }, { label: 'End time', width: 14, format: 'hh:mm' },
    { label: 'Scheduled hours', width: 17, format: '0.##' }, { label: 'Schedule status', width: 18 },
  ]);
  for (const a of assignments) {
    const employee = state.employees.find(e => e.id === a.employee);
    const shift = state.config.shifts.find(sh => sh.id === a.shift);
    const assignedPosition = state.config.positions.find(p => p.id === a.position);
    details.addRow([
      text(a.employee), employeeName(state, a.employee), nameFor(state.config.departments, assignedPosition?.department || employee?.department || ''),
      nameFor(state.config.positions, a.position), dateValue(a.date), shift ? text(shift.name) : 'Unknown shift',
      shift ? timeValue(shift.start) : null, dateValue(shift && shift.end <= shift.start ? nextDate(a.date) : a.date),
      shift ? timeValue(shift.end) : null, number(shift?.hours), status,
    ]);
  }
  finish(details, assignments.length);
  const employees = state.employees.filter(e => assignments.some(a => a.employee === e.id) || e.active !== false && state.config.staffing.some(r => (e.qualifications || [e.position]).includes(r.position)));
  // Preserve orphaned assignments in the overview as well as in the detailed sheet.
  for (const a of assignments) if (!employees.some(e => e.id === a.employee)) employees.push({ id: a.employee, name: 'Unassigned', position: '', department: '' });
  const lastDetail = Math.max(6, assignments.length + 5);
  for (const e of employees) {
    const own = assignments.filter(a => a.employee === e.id);
    const row = overview.addRow([
      text(e.name), nameFor(state.config.departments, e.department), nameFor(state.config.positions, e.position),
      ...dates.map(d => own.filter(a => a.date === d).map(a => {
        const shift = state.config.shifts.find(sh => sh.id === a.shift);
        return shift ? `${text(shift.name)} ${shift.start}–${shift.end}${shift.end <= shift.start ? ' (+1 day)' : ''}\n${nameFor(state.config.positions, a.position)}` : 'Unknown shift';
      }).join('\n') || 'Day off'),
      null, text(e.id),
    ]);
    row.getCell(11).value = { formula: `SUMPRODUCT(('Shift details'!$A$6:$A$${lastDetail}=L${row.number})*'Shift details'!$J$6:$J$${lastDetail})`, result: own.reduce((total, a) => total + number(state.config.shifts.find(sh => sh.id === a.shift)?.hours), 0) };
    row.height = Math.max(64, ...dates.map(d => own.filter(a => a.date === d).length * 44));
  }
  finish(overview, employees.length, 68);
  return result(book, `easyman-schedule-${dates[0]}-to-${dates[6]}.xlsx`);
}

export async function buildRoomBoardExport(state: State, exportedAt = new Date()): Promise<ExportResult> {
  const date = new Intl.DateTimeFormat('en-CA', { timeZone: state.config.timezone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(exportedAt);
  const context = `${state.config.name} | ${dateText(date)} | ${state.config.timezone}`;
  const book = newWorkbook(exportedAt);
  const summary = sheet(book, 'Attendant summary', 'Housekeeping workload', context, 'Current board snapshot. Workload points reflect room scores; equal workload may mean different room counts.', [
    { label: 'Attendant', width: 29 }, { label: 'Assigned rooms', width: 20, format: '0' }, { label: 'Workload points', width: 22, format: '0.##' },
    { label: 'Clean rooms', width: 18, format: '0' }, { label: 'Rooms to clean', width: 20, format: '0' }, { label: 'Locked rooms', width: 19, format: '0' }, { label: 'Attendant ID', width: 25 },
  ]);
  summary.getColumn(7).hidden = true;
  const rooms = sheet(book, 'Room assignments', 'Room assignments', context, 'Room numbers are text to preserve leading zeros. Unassigned rooms, including DND rooms, are included. Locked assignments remain fixed during rebalancing.', [
    { label: 'Room', width: 14, format: '@' }, { label: 'Floor / zone', width: 17 }, { label: 'Room type', width: 25 }, { label: 'Attendant', width: 27 },
    { label: 'Room flag', width: 22 }, { label: 'Cleaning status', width: 21 }, { label: 'Workload points', width: 21, format: '0.##' },
    { label: 'Assignment locked', width: 22 }, { label: 'Attendant ID', width: 25 },
  ]);
  for (const room of [...state.rooms].sort((a, b) => text(a.number).localeCompare(text(b.number), undefined, { numeric: true }))) {
    const assignment = state.boards.find(a => a.room === room.id);
    rooms.addRow([text(room.number), typeof room.floor === 'number' ? room.floor : text(room.floor), nameFor(state.config.roomTypes, room.type),
      assignment ? employeeName(state, assignment.employee) : 'Unassigned', text(room.flag), text(assignment?.status || 'Unassigned'), number(room.score),
      assignment?.locked ? 'Yes' : 'No', text(assignment?.employee),
    ]);
  }
  finish(rooms, state.rooms.length);
  const assignedEmployees = [...new Set(state.boards.filter(a => state.rooms.some(r => r.id === a.room)).map(a => a.employee))];
  const lastRoom = Math.max(6, state.rooms.length + 5);
  for (const id of assignedEmployees) {
    const assigned = state.rooms.filter(r => state.boards.some(a => a.room === r.id && a.employee === id));
    const clean = assigned.filter(r => state.boards.find(a => a.room === r.id)?.status === 'Clean').length;
    const locked = assigned.filter(r => state.boards.find(a => a.room === r.id)?.locked).length;
    const row = summary.addRow([employeeName(state, id), null, null, null, null, null, text(id)]);
    const n = row.number;
    row.getCell(2).value = { formula: `SUMPRODUCT(--('Room assignments'!$I$6:$I$${lastRoom}=G${n}))`, result: assigned.length };
    row.getCell(3).value = { formula: `SUMPRODUCT(('Room assignments'!$I$6:$I$${lastRoom}=G${n})*'Room assignments'!$G$6:$G$${lastRoom})`, result: assigned.reduce((total, r) => total + number(r.score), 0) };
    row.getCell(4).value = { formula: `SUMPRODUCT(('Room assignments'!$I$6:$I$${lastRoom}=G${n})*('Room assignments'!$F$6:$F$${lastRoom}="Clean"))`, result: clean };
    row.getCell(5).value = { formula: `B${n}-D${n}`, result: assigned.length - clean };
    row.getCell(6).value = { formula: `SUMPRODUCT(('Room assignments'!$I$6:$I$${lastRoom}=G${n})*('Room assignments'!$H$6:$H$${lastRoom}="Yes"))`, result: locked };
  }
  finish(summary, assignedEmployees.length);
  return result(book, `easyman-room-board-${date}.xlsx`);
}
