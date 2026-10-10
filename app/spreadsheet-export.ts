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

function boardSheet(book: ExcelJS.Workbook, name: string, title: string, context: string, note: string, columns: Column[], portrait=false) {
  const ws=sheet(book,name,title,context,note,columns);
  ws.columns.forEach((column,i)=>{column.font={name:'Arial',size:11,color:{argb:INK}};column.alignment={vertical:'middle',horizontal:columns[i].format&&columns[i].format!=='@'?'center':'left',indent:columns[i].format?0:1,wrapText:true};});
  ws.getCell('A1').font={name:'Arial',size:16,bold:true,color:{argb:portrait?INK:GREEN}};
  ws.getRow(1).height=Math.max(27,Math.ceil(title.length/(portrait?48:80))*20);
  ws.getRow(2).height=Math.max(24,Math.ceil(context.length/(portrait?75:110))*16);
  ws.getCell('A3').font={name:'Arial',size:10,color:{argb:INK}};
  ws.getRow(3).height=30;ws.getRow(4).height=8;
  ws.getRow(5).height=30;
  ws.getRow(5).eachCell(cell=>{cell.font={name:'Arial',size:11,bold:true,color:{argb:portrait?INK:'FFFFFFFF'}};cell.alignment={horizontal:'center',vertical:'middle',wrapText:true};cell.fill={type:'pattern',pattern:'solid',fgColor:{argb:portrait?'FFE9EEE7':GREEN}};cell.border={right:{style:'thin',color:{argb:portrait?'FFBAC4B6':'FFFFFFFF'}}};});
  ws.pageSetup={...ws.pageSetup,orientation:portrait?'portrait':'landscape',paperSize:1 as ExcelJS.PaperSize,fitToWidth:1,fitToHeight:0,horizontalCentered:true,margins:{left:0.3,right:0.3,top:0.35,bottom:0.35,header:0.15,footer:0.15}};
  ws.headerFooter={oddFooter:'&LEasyMan&RPage &P of &N'};
  return ws;
}
function boardFinish(ws:ExcelJS.Worksheet,count:number,portrait=false) {
  finish(ws,count,portrait?28:29);
  for(let row=6;row<6+count;row++)ws.getRow(row).eachCell({includeEmpty:true},cell=>{cell.border={bottom:{style:'thin',color:{argb:'FFE1E8DA'}},right:{style:'thin',color:{argb:'FFE1E8DA'}}};if(portrait)cell.fill={type:'pattern',pattern:'solid',fgColor:{argb:'FFFFFFFF'}};});
  if(portrait)ws.autoFilter=undefined;
}
function attendantSheetName(name:string,used:Set<string>) {
  // Typographic apostrophes avoid print-name escaping issues in spreadsheet readers.
  const clean=text(name).replace(/[\\/*?:\[\]\u0000-\u001F]/g,' ').replace(/'/g,'’').trim()||'Attendant';
  const truncate=(value:string,size:number)=>value.slice(0,size).replace(/[\uD800-\uDBFF]$/,'');
  let candidate=truncate(clean,31),n=2;
  while(used.has(candidate.toLowerCase())){const suffix=' ('+n+++')';candidate=truncate(clean,31-suffix.length)+suffix;}
  used.add(candidate.toLowerCase());return candidate;
}
export async function buildRoomBoardExport(state: State, exportedAt = new Date()): Promise<ExportResult> {
  const date = state.housekeepingDate || new Intl.DateTimeFormat('en-CA', { timeZone: state.config.timezone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(exportedAt);
  const context = state.config.name+' | '+dateText(date);
  const book = newWorkbook(exportedAt);
  const summary = boardSheet(book, 'Attendant summary', 'Daily housekeeping team', context, 'Workload points measure room effort. The printable attendant tabs follow the room overview.', [
    {label:'Attendant',width:30},{label:'Assigned rooms',width:16,format:'0'},{label:'Workload points',width:19,format:'0.00'},{label:'Marked clean',width:17,format:'0'},{label:'Rooms left',width:16,format:'0'},
  ]);
  const rooms = boardSheet(book, 'Room assignments', 'Daily room board', context, 'Progress is the app status at export. DND rooms are held out of the attendant lists.', [
    {label:'Room',width:11,format:'@'},{label:'Location',width:19},{label:'Room type',width:25},{label:'Attendant',width:28},{label:'Service / priority',width:24},{label:'Progress at export',width:19},{label:'Workload points',width:17,format:'0.00'},
  ]);
  const roomRows=new Map<string,number>();
  const assignments=new Map(state.boards.filter(a=>a.active!==false).map(a=>[a.room,a]));
  const effective:Row[]=[...state.rooms].map((room):Row=>{const a=assignments.get(room.id);return {...room,score:a?.scoreOverride??room.score,flag:a?.flagOverride||room.flag};}).sort((a,b)=>text(a.number).localeCompare(text(b.number),undefined,{numeric:true}));
  const usable=(room:Row)=>room.service!=='none'&&room.flag!=='DND'&&assignments.get(room.id)?.status!=='DND'?assignments.get(room.id):undefined;
  const attendants=state.employees.filter(e=>e.active!==false&&(e.qualifications||[e.position]).includes(state.config.boardPosition)||effective.some(r=>usable(r)?.employee===e.id)).sort((a,b)=>text(a.name).localeCompare(text(b.name))||text(a.id).localeCompare(text(b.id)));
  const displayName=(id:string)=>{const e=attendants.find(e=>e.id===id);if(!e)return 'Unassigned';const same=attendants.filter(other=>text(other.name)===text(e.name));return text(e.name)+(same.length>1?' ('+(same.findIndex(other=>other.id===id)+1)+')':'');};
  for(const room of effective){const a=usable(room);const location=[room.floor!==undefined&&room.floor!==''?'Floor '+text(room.floor):'',text(room.zone)].filter(Boolean).join(' · ');const held=room.flag==='DND'||assignments.get(room.id)?.status==='DND';
    const row=rooms.addRow([text(room.number),location,nameFor(state.config.roomTypes,room.type),a?displayName(a.employee):'Unassigned',text(room.service==='none'?'No service':room.service?(room.service==='departure'?'Departure':'Stayover')+(room.flag==='Early arrival'?' · Early arrival':'') : room.flag),room.service==='none'?'No task':held?'Do not enter':a?.status==='Clean'?'Marked clean':text(a?.status||'Unassigned'),room.service==='none'?0:number(room.score)]);
    roomRows.set(room.id,row.number);
    row.height=Math.max(29,Math.ceil(location.length/18)*15,Math.ceil(nameFor(state.config.roomTypes,room.type).length/24)*15,Math.ceil(text(room.flag).length/22)*15,Math.ceil((a?displayName(a.employee):'Unassigned').length/26)*15);
  }
  boardFinish(rooms,effective.length);
  const used=new Set(['attendant summary','room assignments']);
  for(const employee of attendants){
    const own=effective.filter(r=>usable(r)?.employee===employee.id).sort((a,b)=>number(a.floor)-number(b.floor)||text(a.zone).localeCompare(text(b.zone))||text(a.number).localeCompare(text(b.number),undefined,{numeric:true}));
    const name=attendantSheetName(displayName(employee.id),used);
    const slip=boardSheet(book,name,'Daily rooms — '+displayName(employee.id),context,'Tick Done as you finish. X = already marked clean. DND rooms are held off this list.',[
      {label:'Room',width:10,format:'@'},{label:'Location',width:16},{label:'Room type',width:23},{label:'Service / priority',width:25},{label:'Done',width:8},
    ],true);
    for(const room of own){const src=roomRows.get(room.id)!;const row=slip.addRow([null,null,null,null,null]);
      const values=[text(room.number),rooms.getCell(src,2).value,nameFor(state.config.roomTypes,room.type),text(rooms.getCell(src,5).value),usable(room)?.status==='Clean'?'X':''];
      for(const [i,column] of [1,2,3,5].entries())row.getCell(i+1).value={formula:"'Room assignments'!"+rooms.getColumn(column).letter+src,result:values[i] as string};
      row.getCell(5).value={formula:"IF('Room assignments'!F"+src+'="Marked clean","X","")',result:values[4] as string};
      row.getCell(5).alignment={horizontal:'center',vertical:'middle'};
      row.height=Math.max(28,Math.ceil(text(values[1]).length/15)*15,Math.ceil(text(values[2]).length/22)*15,Math.ceil(text(values[3]).length/23)*15);
    }
    boardFinish(slip,own.length,true);
    if(!own.length)slip.getCell('A6').value='No rooms assigned today.';
    const noteRow=Math.max(6,own.length+5)+2;slip.mergeCells(noteRow,1,noteRow,5);slip.getCell(noteRow,1).value='Notes for your supervisor';slip.getCell(noteRow,1).font={name:'Arial',size:11,bold:true,color:{argb:INK}};slip.getRow(noteRow).height=22;
    for(let n=noteRow+1;n<=noteRow+3;n++){slip.mergeCells(n,1,n,5);slip.getRow(n).height=24;slip.getCell(n,1).border={bottom:{style:'thin',color:{argb:'FFBAC4B6'}}};}
    slip.pageSetup.printArea='A1:E'+(noteRow+3);
    const clean=own.filter(r=>usable(r)?.status==='Clean').length,total=own.reduce((sum,r)=>sum+number(r.score),0),row=summary.addRow([displayName(employee.id),null,null,null,null]);
    const quoted="'"+name.replace(/'/g,"''")+"'",last=Math.max(6,own.length+5);
    row.getCell(2).value=own.length?{formula:'COUNTA('+quoted+'!A6:A'+last+')',result:own.length}:0;
    row.getCell(3).value=own.length?{formula:'SUM('+own.map(r=>"'Room assignments'!G"+roomRows.get(r.id)).join(',')+')',result:total}:0;
    row.getCell(4).value=own.length?{formula:'COUNTIF('+quoted+'!E6:E'+last+',"X")',result:clean}:0;
    row.getCell(5).value={formula:'B'+row.number+'-D'+row.number,result:own.length-clean};
    row.height=Math.max(29,Math.ceil(displayName(employee.id).length/28)*15);
  }
  boardFinish(summary,attendants.length);
  return result(book, 'easyman-room-board-'+date+'.xlsx');
}
