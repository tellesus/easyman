export type Row = { id: string; [key: string]: any };
export type Configuration = { name: string; timezone: string; boardPosition: string; departments: Row[]; positions: Row[]; shifts: Row[]; roomTypes: Row[]; staffing: Row[]; boundaries: string[]; categories: string[] };
export type State = { config: Configuration; employees: Row[]; rooms: Row[]; reporting: Row[]; availability: Row[]; passon: Row[]; checks: Row[]; training: Row[]; discipline: Row[]; schedule: Row[]; boards: Row[]; snapshots: Row[]; activity: Row[]; published: boolean; sample: boolean; week: string; feedback: Row[] };
export const uid = () => crypto.randomUUID();
export const today = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Chicago', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
export const defaults = (): Configuration => ({
  name: 'The Linden House', timezone: 'America/Chicago', boardPosition: 'attendant',
  departments: [{ id:'fo', name:'Front Office' }, { id:'hk', name:'Housekeeping' }, { id:'gs', name:'Guest Services' }],
  positions: [{ id:'agent', name:'Guest Service Agent', department:'fo' }, { id:'supervisor', name:'Front Office Supervisor', department:'fo' }, { id:'attendant', name:'Room Attendant', department:'hk' }, { id:'inspector', name:'Housekeeping Supervisor', department:'hk' }, { id:'bell', name:'Bellperson', department:'gs' }],
  shifts: [{ id:'am', name:'Morning', start:'07:00', end:'15:30', hours:8 }, { id:'mid', name:'Mid', start:'10:00', end:'18:30', hours:8 }, { id:'pm', name:'Evening', start:'15:00', end:'23:30', hours:8 }, { id:'night', name:'Overnight', start:'23:00', end:'07:30', hours:8 }],
  roomTypes: [{ id:'king', name:'Classic King', score:1 }, { id:'queen', name:'Double Queen', score:1.25 }, { id:'suite', name:'Garden Suite', score:2 }],
  staffing: [{ id:'req-am', position:'agent', shift:'am', count:2 }, { id:'req-pm', position:'agent', shift:'pm', count:2 }, { id:'req-night', position:'agent', shift:'night', count:1 }],
  boundaries:['07:00','15:00','23:00'], categories:['Guest Follow-Up','Guest Issue','Operational Issue','Room Issue','VIP / Arrival','Group / Event','Staffing Note','Pending Task','FYI','Critical / Emergency'],
});
export function monday(date = today()) { const d = new Date(date+'T12:00:00'); d.setDate(d.getDate()-((d.getDay()+6)%7)); return localDate(d); }
const localDate = (d: Date) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
export function days(start: string, n=7) { return Array.from({length:n},(_,i)=>{const d=new Date(start+'T12:00:00'); d.setDate(d.getDate()+i); return localDate(d);}); }
export function seed(): State {
  const config=defaults(); const day=today();
  const employees: Row[] = [
    {id:'e1',name:'Jamie Chen',position:'supervisor',department:'fo',qualifications:['agent','supervisor'],preferred:'am',hire:'2021-04-12',hours:40,active:true},
    {id:'e2',name:'Alex Morgan',position:'agent',department:'fo',qualifications:['agent'],preferred:'am',hire:'2022-08-01',hours:40,active:true},
    {id:'e3',name:'Sam Rivera',position:'agent',department:'fo',qualifications:['agent'],preferred:'pm',hire:'2023-01-15',hours:40,active:true},
    {id:'e4',name:'Taylor Brooks',position:'agent',department:'fo',qualifications:['agent'],preferred:'night',hire:'2022-03-08',hours:40,active:true},
    {id:'e5',name:'Jordan Lee',position:'agent',department:'fo',qualifications:['agent'],preferred:'pm',hire:'2024-06-02',hours:40,active:true},
    {id:'e6',name:'Casey Adams',position:'agent',department:'fo',qualifications:['agent'],preferred:'am',hire:'2024-11-14',hours:40,active:true},
    {id:'e7',name:'Morgan Ellis',position:'agent',department:'fo',qualifications:['agent'],preferred:'night',hire:'2025-02-20',hours:40,active:true},
    {id:'e8',name:'Sofia Martinez',position:'attendant',department:'hk',qualifications:['attendant'],preferred:'am',hire:'2021-08-08',hours:40,active:true},
    {id:'e9',name:'Emma Wilson',position:'attendant',department:'hk',qualifications:['attendant'],preferred:'am',hire:'2022-11-16',hours:40,active:true},
    {id:'e10',name:'Lily Thompson',position:'attendant',department:'hk',qualifications:['attendant'],preferred:'am',hire:'2023-05-24',hours:40,active:true},
    {id:'e11',name:'Noah Patel',position:'inspector',department:'hk',qualifications:['inspector'],preferred:'am',hire:'2020-02-01',hours:40,active:true},
    {id:'e12',name:'Avery Davis',position:'bell',department:'gs',qualifications:['bell'],preferred:'mid',hire:'2024-01-15',hours:32,active:true},
  ];
  const rooms: Row[] = Array.from({length:24},(_,i)=>({id:'r'+i,number:String((i<12?200:300)+(i%12)+1),type:i%6===0?'suite':i%3===0?'queen':'king',floor:i<12?2:3,flag:i%7===0?'Early arrival':i%5===0?'Stayover':'Departure',score:i%6===0?2:i%3===0?1.25:1}));
  const passon: Row[] = [
    {id:'p1',subject:'Early arrival · Garden Suite',description:'Arrival expected around noon. Coordinate with housekeeping and let the front desk know when the suite is ready.',category:'VIP / Arrival',room:'301',priority:'High',status:'Open',owner:'e1',due:day+'T12:00',created:day+'T08:15',history:[]},
    {id:'p2',subject:'Follow up on yesterday’s noise concern',description:'Check in after breakfast to confirm the room move resolved the concern. Keep the follow-up personal and brief.',category:'Guest Follow-Up',room:'208',priority:'High',status:'Open',owner:'e2',due:day+'T10:30',created:day+'T07:40',history:[]},
    {id:'p3',subject:'Meeting group · luggage storage',description:'Eight bags expected at the bell desk before 11 AM. Group departs at 4 PM.',category:'Group / Event',room:'',priority:'Normal',status:'In progress',owner:'e12',due:day+'T11:00',created:day+'T08:00',history:[]},
    {id:'p4',subject:'Check reading light after room service',description:'Engineering completed the repair. Confirm the light is working during the room check.',category:'Room Issue',room:'305',priority:'Normal',status:'Open',owner:'e11',due:day+'T14:00',created:day+'T08:35',history:[]},
    {id:'p5',subject:'Lobby coffee station restocked',description:'Morning stock complete. Spare cups are in the service cupboard.',category:'FYI',room:'',priority:'Low',status:'Completed',owner:'e2',due:'',created:day+'T07:10',completed:day+'T08:00',history:[{at:day+'T08:00',by:'Alex Morgan',text:'Station checked and ready.'}]},
  ];
  const state: State={ config, employees, rooms, reporting:employees.filter(e=>e.department==='fo'&&e.id!=='e1').map(e=>({id:'report-'+e.id,employee:e.id,targetType:'position',target:'supervisor'})), availability:[],passon,checks:[{id:'c1',room:'201',inspector:'e11',result:'Pass',notes:'Ready for arrival.',date:day+'T09:15',status:'Complete'},{id:'c2',room:'204',inspector:'e11',result:'Pass with correction',notes:'Replace one towel before release.',date:day+'T09:30',status:'Recheck required'},{id:'c3',room:'302',inspector:'e11',result:'Pass',notes:'All set.',date:day+'T09:45',status:'Complete'}],training:[{id:'t1',employee:'e2',subject:'Confident service recovery conversations',description:'Practice acknowledging the concern and explaining the next step clearly.',expected:'Use the acknowledge, act, follow-up approach.',response:'Practiced two examples together.',due:day,status:'Follow-up due',history:[],date:day}],discipline:[],schedule:[],boards:[],snapshots:[],activity:[{id:'a1',action:'Morning shift started',at:day+'T07:00',by:'Jamie Chen'},{id:'a2',action:'Room 201 passed inspection',at:day+'T09:15',by:'Noah Patel'},{id:'a3',action:'Housekeeping board prepared',at:day+'T08:30',by:'Noah Patel'}],published:false,sample:true,week:monday(),feedback:[] };
  state.schedule=generateSchedule(state).assignments; state.boards=balanceBoard(state); return state;
}
export function managementGraph(employees: Row[], reporting: Row[]) {
  const graph=new Map<string,string[]>();
  for(const e of employees) graph.set(e.id,reporting.filter(r=>r.employee===e.id).flatMap(r=>r.targetType==='employee'?[r.target]:employees.filter(p=>p.position===r.target&&p.active!==false).map(p=>p.id)));
  const visiting=new Set<string>(),visited=new Set<string>();
  function visit(id:string) { if(visiting.has(id)) throw new Error('Reporting relationships would create a circular management path.'); if(visited.has(id))return;visiting.add(id);for(const parent of graph.get(id)||[]) {if(!graph.has(parent))throw new Error('Reporting target does not exist.');visit(parent);}visiting.delete(id);visited.add(id); }
  graph.forEach((_,id)=>visit(id)); return graph;
}
export function lineage(employee:string,employees:Row[],reporting:Row[]) {const graph=managementGraph(employees,reporting);const result=new Set<string>();const walk=(id:string)=>{for(const p of graph.get(id)||[]){if(!result.has(p)){result.add(p);walk(p);}}};walk(employee);return [...result];}
function shiftStart(date:string,s:Row) {return new Date(date+'T'+s.start+':00').getTime();}
function shiftEnd(date:string,s:Row) {const start=shiftStart(date,s); let end=new Date(date+'T'+s.end+':00').getTime();if(end<=start)end+=86400000;return end;}
export function assignmentError(state:State, employee:Row, date:string, shift:Row, position:string, existing:Row[],ignore?:string) {
  if(employee.active===false || !(employee.qualifications||[employee.position]).includes(position))return 'Employee is not qualified for this position.';
  if(state.availability.some(a=>a.employee===employee.id&&a.date===date&&(!a.shift||a.shift===shift.id)))return 'Employee is unavailable for this shift.';
  const start=shiftStart(date,shift),end=shiftEnd(date,shift);
  for(const a of existing.filter(a=>a.employee===employee.id&&a.id!==ignore)) {const s=state.config.shifts.find(s=>s.id===a.shift);if(!s)continue;const otherStart=shiftStart(a.date,s),otherEnd=shiftEnd(a.date,s);if(start<otherEnd&&end>otherStart)return 'This overlaps another assignment.';if(a.date===date)return 'Employee already has a shift on this start date.';if(start>=otherEnd&&start-otherEnd<11*3600000||otherStart>=end&&otherStart-end<11*3600000)return 'Less than 11 hours between shifts.';}
  return null;
}
export function generateSchedule(state:State) {
  const assignments:Row[]=[];const warnings:string[]=[];const hours:Record<string,number>={};let required=0;
  for(const date of days(state.week))for(const rule of state.config.staffing){const shift=state.config.shifts.find(s=>s.id===rule.shift);if(!shift)continue;for(let n=0;n<rule.count;n++){required++;const candidates=state.employees.filter(e=>!assignmentError(state,e,date,shift,rule.position,assignments)&& (hours[e.id]||0)+shift.hours<=Number(e.hours||40));candidates.sort((a,b)=>((a.preferred===shift.id?-10:0)+(hours[a.id]||0)/4)-((b.preferred===shift.id?-10:0)+(hours[b.id]||0)/4)||String(a.hire).localeCompare(String(b.hire)));const employee=candidates[0];if(!employee){warnings.push(`${date}: ${shift.name} needs ${state.config.positions.find(p=>p.id===rule.position)?.name||rule.position}.`);continue;}assignments.push({id:uid(),employee:employee.id,position:rule.position,date,shift:shift.id});hours[employee.id]=(hours[employee.id]||0)+shift.hours;}}
  return {assignments,warnings,coverage:required?Math.round(assignments.length/required*100):100};
}
export function balanceBoard(state:State):Row[] {
  const attendants=state.employees.filter(e=>e.active!==false&&(e.qualifications||[e.position]).includes(state.config.boardPosition));
  // Also recognize configurable attendant positions through existing board participants.
  const eligible=attendants;
  const result=state.boards.filter(b=>b.locked&&eligible.some(e=>e.id===b.employee)&&state.rooms.some(r=>r.id===b.room&&r.flag!=='DND')).map(b=>({...b}));
  const totals:Record<string,number>={};eligible.forEach(e=>totals[e.id]=result.filter(b=>b.employee===e.id).reduce((sum,b)=>sum+Number(state.rooms.find(r=>r.id===b.room)?.score??1),0));
  for(const room of [...state.rooms].filter(r=>r.flag!=='DND'&&!result.some(b=>b.room===r.id)).sort((a,b)=>b.score-a.score||a.floor-b.floor)){const candidates=[...eligible].sort((a,b)=>totals[a.id]-totals[b.id] || result.filter(r=>r.employee===b.id&&state.rooms.find(x=>x.id===r.room)?.floor===room.floor).length-result.filter(r=>r.employee===a.id&&state.rooms.find(x=>x.id===r.room)?.floor===room.floor).length);const e=candidates[0];if(e){result.push({id:uid(),room:room.id,employee:e.id,locked:false,status:state.boards.find(b=>b.room===room.id)?.status||'To clean'});totals[e.id]+=Number(room.score??1);}}
  return result;
}
export const importTypes:Record<string,{key:keyof State|keyof Configuration,config?:boolean,required:string[],example:Record<string,unknown>}>= {
  employees:{key:'employees',required:['id','name','department','position'],example:{id:'EMP-014',name:'Jamie Chen',department:'fo',position:'agent',qualifications:['agent'],hire:'2024-01-01',hours:40,active:true}},
  departments:{key:'departments',config:true,required:['id','name'],example:{id:'fo',name:'Front Office'}},positions:{key:'positions',config:true,required:['id','name','department'],example:{id:'agent',name:'Guest Service Agent',department:'fo'}},
  rooms:{key:'rooms',required:['id','number','type','floor','score'],example:{id:'ROOM-201',number:'201',type:'king',floor:2,score:1,flag:'Departure'}},
  roomTypes:{key:'roomTypes',config:true,required:['id','name','score'],example:{id:'king',name:'Classic King',score:1}},
  reporting:{key:'reporting',required:['id','employee','targetType','target'],example:{id:'REL-014',employee:'e2',targetType:'position',target:'supervisor'}},
  availability:{key:'availability',required:['id','employee','date'],example:{id:'AV-014',employee:'e2',date:today(),shift:'am'}},
  shifts:{key:'shifts',config:true,required:['id','name','start','end','hours'],example:{id:'am',name:'Morning',start:'07:00',end:'15:30',hours:8}},
  staffing:{key:'staffing',config:true,required:['id','position','shift','count'],example:{id:'REQ-014',position:'agent',shift:'am',count:2}},
};
export function validateImport(type:string,input:unknown,state:State):Row[] {
  const schema=importTypes[type];if(!schema)throw new Error('Unknown import type.');if(!Array.isArray(input)||!input.length)throw new Error('Supply a non-empty JSON array.');if(input.length>5000)throw new Error('Import up to 5,000 records at a time.');const ids=new Set<string>();
  for(const [i,r] of input.entries()){if(!r||typeof r!=='object'||Array.isArray(r))throw new Error(`Record ${i+1} must be an object.`);for(const field of schema.required){if(r[field]===undefined||r[field]===null||r[field]==='')throw new Error(`Record ${i+1}: ${field} is required.`);}if(typeof r.id!=='string'||ids.has(r.id))throw new Error(`Record ${i+1}: use a unique text ID.`);ids.add(r.id);
    for(const f of ['name','number','department','position','type','employee','targetType','target','shift','date','start','end'])if(r[f]!==undefined&&typeof r[f]!=='string')throw new Error(`Record ${i+1}: ${f} must be text.`);
    for(const f of ['score','floor','hours','count'])if(r[f]!==undefined&&(typeof r[f]!=='number'||!Number.isFinite(r[f])||r[f]<0))throw new Error(`Record ${i+1}: ${f} must be a non-negative number.`);
    if(r.qualifications!==undefined&&(!Array.isArray(r.qualifications)||r.qualifications.some((q:unknown)=>typeof q!=='string')))throw new Error(`Record ${i+1}: qualifications must be an array of position IDs.`);
    if(r.active!==undefined&&typeof r.active!=='boolean')throw new Error(`Record ${i+1}: active must be true or false.`);
    for(const f of ['start','end'])if(r[f]!==undefined&&!/^([01]\d|2[0-3]):[0-5]\d$/.test(r[f]))throw new Error(`Record ${i+1}: ${f} must use HH:MM.`);
    if(r.date!==undefined&&!/^\d{4}-\d{2}-\d{2}$/.test(r.date))throw new Error(`Record ${i+1}: date must use YYYY-MM-DD.`);
    if(type==='staffing'&&!Number.isInteger(r.count))throw new Error(`Record ${i+1}: staffing count must be a whole number.`);
    const refs:Record<string,Row[]>={department:state.config.departments,position:state.config.positions,type:state.config.roomTypes,employee:state.employees,shift:state.config.shifts};for(const [field,rows] of Object.entries(refs))if(r[field]!==undefined&&!rows.some(x=>x.id===r[field]))throw new Error(`Record ${i+1}: unknown ${field} ID ${r[field]}.`);
    if(r.qualifications?.some((q:string)=>!state.config.positions.some(p=>p.id===q)))throw new Error(`Record ${i+1}: unknown qualification.`);
    if(type==='reporting'&&!['position','employee'].includes(r.targetType))throw new Error(`Record ${i+1}: targetType must be position or employee.`);
    if(type==='reporting'&&!(r.targetType==='position'?state.config.positions:state.employees).some(x=>x.id===r.target))throw new Error(`Record ${i+1}: unknown reporting target.`);
  }
  if(type==='reporting')managementGraph(state.employees,mergeRows(state.reporting,input));return input;
}
export function mergeRows(current:Row[],incoming:Row[]) {const map=new Map(current.map(r=>[r.id,r]));incoming.forEach(r=>map.set(r.id,{...map.get(r.id),...r}));return [...map.values()];}
