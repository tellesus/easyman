import { zonedInstant } from './time';
import {requirementsForDate,isOvernight,splitDaysWarning,isManagerCoverage} from './staffing';
export type Row = { id: string; [key: string]: any };
export type Configuration = { name: string; timezone: string; boardPosition: string; sample?: boolean; minRestHours?: number; maxWeeklyHours?: number; overtimeHours?: number; departments: Row[]; positions: Row[]; shifts: Row[]; roomTypes: Row[]; staffing: Row[]; boundaries: string[]; categories: string[] };
export type State = { config: Configuration; employees: Row[]; rooms: Row[]; reporting: Row[]; availability: Row[]; passon: Row[]; checks: Row[]; training: Row[]; discipline: Row[]; schedule: Row[]; staffingWeeks?:Row[]; boards: Row[]; housekeepingDays?: Row[]; housekeepingDate?: string; snapshots: Row[]; activity: Row[]; published: boolean; publishedWeeks?: string[]; publications?: Row[]; sample: boolean; week: string; feedback: Row[] };
export const uid = () => crypto.randomUUID();
export const today = (timezone='America/Chicago') => new Intl.DateTimeFormat('en-CA', { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
export const defaults = (): Configuration => ({
  name: 'The Linden House', timezone: 'America/Chicago', boardPosition: 'attendant',
  departments: [{ id:'fo', name:'Front Office' }, { id:'hk', name:'Housekeeping' }, { id:'gs', name:'Guest Services' }],
  positions: [{ id:'agent', name:'Guest Service Agent', department:'fo' }, { id:'supervisor', name:'Front Office Supervisor', department:'fo' }, { id:'attendant', name:'Room Attendant', department:'hk' }, { id:'inspector', name:'Housekeeping Supervisor', department:'hk' }, { id:'bell', name:'Bellperson', department:'gs' }],
  shifts: [{ id:'am', name:'Morning', start:'07:00', end:'15:30', hours:8 }, { id:'mid', name:'Mid', start:'10:00', end:'18:30', hours:8 }, { id:'pm', name:'Evening', start:'15:00', end:'23:30', hours:8 }, { id:'night', name:'Overnight', overnight:true, start:'23:00', end:'07:30', hours:8 }],
  roomTypes: [{ id:'king', name:'Classic King', score:1 }, { id:'queen', name:'Double Queen', score:1.25 }, { id:'suite', name:'Garden Suite', score:2 }],
  staffing: [{ id:'req-am', position:'agent', shift:'am', count:2 }, { id:'req-pm', position:'agent', shift:'pm', count:2 }, { id:'req-night', position:'agent', shift:'night', count:1 }],
  boundaries:['07:00','15:00','23:00'], categories:['Guest Follow-Up','Guest Issue','Operational Issue','Room Issue','VIP / Arrival','Group / Event','Staffing Note','Pending Task','FYI','Critical / Emergency'],
});
export function monday(date = today()) { const d = new Date(date+'T12:00:00Z'); d.setUTCDate(d.getUTCDate()-((d.getUTCDay()+6)%7)); return localDate(d); }
const localDate = (d: Date) => `${d.getUTCFullYear()}-${String(d.getUTCMonth()+1).padStart(2,'0')}-${String(d.getUTCDate()).padStart(2,'0')}`;
export function days(start: string, n=7) { return Array.from({length:n},(_,i)=>{const d=new Date(start+'T12:00:00Z'); d.setUTCDate(d.getUTCDate()+i); return localDate(d);}); }
export function seed(): State {
  const config=defaults(); const day=today();
  const employees: Row[] = [
    {id:'e1',name:'Jamie Chen',position:'supervisor',department:'fo',qualifications:['agent','supervisor'],preferred:'am',hire:'2021-04-12',hours:40,active:true},
    {id:'e2',name:'Alex Morgan',position:'agent',department:'fo',qualifications:['agent'],preferred:'am',hire:'2022-08-01',hours:40,active:true},
    {id:'e3',name:'Sam Rivera',position:'agent',department:'fo',qualifications:['agent'],preferred:'pm',hire:'2023-01-15',hours:40,active:true},
    {id:'e4',name:'Taylor Brooks',position:'agent',department:'fo',qualifications:['agent'],preferred:'night',overnightOK:true,hire:'2022-03-08',hours:40,active:true},
    {id:'e5',name:'Jordan Lee',position:'agent',department:'fo',qualifications:['agent'],preferred:'pm',hire:'2024-06-02',hours:40,active:true},
    {id:'e6',name:'Casey Adams',position:'agent',department:'fo',qualifications:['agent'],preferred:'am',hire:'2024-11-14',hours:40,active:true},
    {id:'e7',name:'Morgan Ellis',position:'agent',department:'fo',qualifications:['agent'],preferred:'night',overnightOK:true,hire:'2025-02-20',hours:40,active:true},
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
function shiftStart(date:string,s:Row,zone:string) {return zonedInstant(date,s.start,zone,true);}
function shiftEnd(date:string,s:Row,zone:string) {return zonedInstant(s.end<=s.start?days(date,2)[1]:date,s.end,zone,true);}
// An employee with no qualification list is qualified for their own position; an empty list means qualified for nothing.
export const positionsOf=(e:Row):string[]=>e.qualifications||[e.position];
export const friendlyDay=(date:string)=>new Intl.DateTimeFormat('en-US',{weekday:'short',month:'short',day:'numeric',timeZone:'UTC'}).format(new Date(date+'T12:00:00Z'));
function rowsByEmployee(rows:Row[]){const map=new Map<string,Row[]>();for(const a of rows){const list=map.get(a.employee);if(list)list.push(a);else map.set(a.employee,[a]);}return map;}
export function effectiveShift(state:State,assignment:Row):Row|undefined{const template=state.config.shifts.find(s=>s.id===assignment.shift);return template?{...template,start:assignment.start??template.start,end:assignment.end??template.end,hours:assignment.hours??template.hours}:undefined;}
export function assignmentError(state:State, employee:Row, date:string, shift:Row, position:string, existing:Row[],ignore?:string,minRest=state.config.minRestHours??11) {
  if(state.config.positions.find(p=>p.id===position)?.active===false||shift.active===false)return 'The position or shift is disabled.';
  if(employee.active===false || !positionsOf(employee).includes(position))return 'Employee is not qualified for this position.';
  if(isOvernight(shift)&&employee.overnightOK!==true)return 'Employee is not approved to work overnight shifts.';
  const endDate=shift.end<=shift.start&&shift.end!=='00:00'?days(date,2)[1]:date;const matchesDate=(a:Row,day:string)=>a.date===day||Array.isArray(a.weekdays)&&a.weekdays.includes(new Date(day+'T12:00:00Z').getUTCDay())||a.from&&a.to&&day>=a.from&&day<=a.to;if(state.availability.some(a=>a.employee===employee.id&&(matchesDate(a,date)||!a.shift&&matchesDate(a,endDate))&&(!a.shift||a.shift===shift.id)&&(!a.position||a.position===position)))return 'Employee is unavailable for this shift.';
  const start=shiftStart(date,shift,state.config.timezone),end=shiftEnd(date,shift,state.config.timezone);
  for(const a of existing.filter(a=>a.employee===employee.id&&a.id!==ignore)) {const s=effectiveShift(state,a);if(!s)continue;const otherStart=shiftStart(a.date,s,state.config.timezone),otherEnd=shiftEnd(a.date,s,state.config.timezone);if(start<otherEnd&&end>otherStart)return 'This overlaps another assignment.';if(a.date===date)return 'Employee already has a shift on this start date.';if(start>=otherEnd&&start-otherEnd<minRest*3600000||otherStart>=end&&otherStart-end<minRest*3600000)return `Less than ${minRest} hours between shifts.`;}
  return null;
}
export function invalidateAssignmentPublications(state:State,previous:Row|undefined,next:Row){
  const affected=[previous,next].filter((row):row is Row=>!!row);
  const weeks=new Set(affected.map(row=>monday(row.date)));
  const publishedWeeks=(state.publishedWeeks||[]).filter(week=>!weeks.has(week));
  return {...state,publishedWeeks,published:publishedWeeks.includes(state.week),publications:state.publications?.map(publication=>({...publication,publishedWeeks:publication.publishedWeeks.filter((week:string)=>!affected.some(row=>(row.employee===publication.employee||publication.id==='')&&monday(row.date)===week))}))};
}
export function staffingApplies(rule:Row,date:string,config:Configuration){return rule.active!==false&&config.positions.some(p=>p.id===rule.position&&p.active!==false)&&config.shifts.some(s=>s.id===rule.shift&&s.active!==false)&&(!rule.weekdays?.length||rule.weekdays.includes(new Date(date+'T12:00:00Z').getUTCDay()))&&(!rule.from||date>=rule.from)&&(!rule.to||date<=rule.to);}
// Why a required shift has nobody, in plain words: what rules out each qualified person.
export function gapReason(state:State,date:string,shiftId:string,position:string,schedule:Row[]=state.schedule):string {
  const shift=state.config.shifts.find(s=>s.id===shiftId),role=state.config.positions.find(p=>p.id===position);
  if(!shift||!role)return 'This shift or position no longer exists in Property settings.';
  if(shift.active===false||role.active===false)return 'This shift or position is switched off in Property settings.';
  const qualified=state.employees.filter(e=>e.active!==false&&positionsOf(e).includes(position));
  if(!qualified.length)return 'No active employee is qualified as '+role.name+'.';
  const week=days(monday(date)),mine=rowsByEmployee(schedule),tally:Record<string,number>={};
  for(const e of qualified){
    const rows=mine.get(e.id)||[];let why:string|null;
    try{why=assignmentError(state,e,date,shift,position,rows);}catch{why='busy';}
    const worked=rows.filter(a=>week.includes(a.date)).reduce((sum,a)=>sum+Number(effectiveShift(state,a)?.hours??0),0);
    const key=why?(/overnight/.test(why)?'overnight':/unavailable/.test(why)?'unavailable':'busy'):worked+(Number(shift.hours)||0)>Number(e.maxHours??state.config.maxWeeklyHours??40)?'hours':'free';
    tally[key]=(tally[key]||0)+1;
  }
  const parts=[tally.overnight&&tally.overnight+' not approved for overnight shifts',tally.unavailable&&tally.unavailable+' unavailable',tally.busy&&tally.busy+' already working or resting',tally.hours&&tally.hours+' at the weekly hour limit'].filter(Boolean);
  const free=tally.free?(tally.free===1?'1 qualified person can':tally.free+' qualified people can')+' still be assigned by hand.':'';
  return [parts.length?'Of '+qualified.length+' qualified: '+parts.join(', ')+'.':'',free].filter(Boolean).join(' ');
}
export function scheduleQuality(state:State,dates=days(state.week)) {
  let required=0,filled=0;const warnings:string[]=[];
  for(const date of dates)for(const rule of requirementsForDate(state,date)){required+=rule.count;const count=state.schedule.filter(a=>a.date===date&&a.shift===rule.shift&&a.position===rule.position).length;filled+=Math.min(rule.count,count);if(count<rule.count){const missing=rule.count-count;warnings.push(friendlyDay(date)+': '+missing+' more '+(missing===1?'person':'people')+' needed for '+(state.config.shifts.find(s=>s.id===rule.shift)?.name||'a removed shift')+' ('+(state.config.positions.find(p=>p.id===rule.position)?.name||'a removed position')+'). '+gapReason(state,date,rule.shift,rule.position));}}
  const week=days(state.week),rows=state.schedule.filter(a=>week.includes(a.date)),hours:Record<string,number>={};for(const a of rows)hours[a.employee]=(hours[a.employee]||0)+Number(effectiveShift(state,a)?.hours??0);
  const relevant=state.employees.filter(e=>e.active!==false&&(rows.some(a=>a.employee===e.id)||state.config.staffing.some(r=>positionsOf(e).includes(r.position))));
  const hourWarnings=relevant.filter(e=>e.hours!==undefined&&Math.abs((hours[e.id]||0)-Number(e.hours))>.001).map(e=>e.name+': '+(hours[e.id]||0)+' scheduled / '+e.hours+' desired hours.');
  const constraintWarnings:string[]=[];for(const e of relevant)if((hours[e.id]||0)>Number(state.config.overtimeHours??40))constraintWarnings.push(e.name+': '+hours[e.id]+' hours exceeds the '+(state.config.overtimeHours??40)+'-hour overtime threshold.');for(const e of relevant){const max=Number(e.maxHours??state.config.maxWeeklyHours??40);if((hours[e.id]||0)>max)constraintWarnings.push(e.name+': '+hours[e.id]+' hours exceeds the '+max+'-hour weekly maximum.');}
  const mine=rowsByEmployee(state.schedule);
  for(const a of rows){if(isManagerCoverage(a))continue;const e=state.employees.find(e=>e.id===a.employee),shift=effectiveShift(state,a);if(!e||!shift)continue;const reason=assignmentError(state,e,a.date,shift,a.position,mine.get(a.employee)||[],a.id);if(reason)constraintWarnings.push(e.name+' · '+friendlyDay(a.date)+': '+reason);const split=splitDaysWarning(state,a,a.id);if(split)constraintWarnings.push(e.name+' · '+friendlyDay(a.date)+': '+split);}
  const preferences=rows.filter(a=>state.employees.find(e=>e.id===a.employee)?.preferred),preferred=preferences.filter(a=>state.employees.find(e=>e.id===a.employee)?.preferred===a.shift).length;
  return {coverage:required?Math.round(filled/required*100):100,preferenceSatisfaction:preferences.length?Math.round(preferred/preferences.length*100):100,warnings,hourWarnings,constraintWarnings};
}
export function generateSchedule(state:State,selectedDates=days(state.week),options:{fixedAssignmentIds?:string[]}={}) {
  const protectedIds=new Set(options.fixedAssignmentIds||[]),fixed=state.schedule.filter(a=>!selectedDates.includes(a.date)||protectedIds.has(a.id)),assignments:Row[]=[],hours:Record<string,number>={};
  const week=days(state.week),length=(shift:Row)=>Number(shift.hours)||0;
  for(const a of fixed.filter(a=>week.includes(a.date)))hours[a.employee]=(hours[a.employee]||0)+Number(effectiveShift(state,a)?.hours??0);
  // The eligibility rules only read a person's own shifts, so those are kept per person instead of rescanning the whole week.
  const mine=rowsByEmployee(fixed),rowsOf=(id:string)=>mine.get(id)||[],slots=new Map<string,number>(),slot=(date:string,shift:string,position:string)=>date+'|'+shift+'|'+position;
  for(const a of fixed)slots.set(slot(a.date,a.shift,a.position),(slots.get(slot(a.date,a.shift,a.position))||0)+1);
  const maxHours=(e:Row)=>Number(e.maxHours??state.config.maxWeeklyHours??40),target=(e:Row)=>Number(e.hours??40);
  const rank=(e:Row,shift:Row,date:string)=>{const current=hours[e.id]||0;return 2*(Math.abs(current+length(shift)-target(e))-Math.abs(current-target(e)))+(e.preferred===shift.id?-3:0)+(Array.isArray(e.preferredWeekdays)&&e.preferredWeekdays.includes(new Date(date+'T12:00:00Z').getUTCDay())?-1:0)+current/100;};
  const order=(shift:Row,date:string)=>(a:Row,b:Row)=>rank(a,shift,date)-rank(b,shift,date)||String(a.hire||'9999-12-31').localeCompare(String(b.hire||'9999-12-31'))||a.id.localeCompare(b.id);
  // Whether a person can take a shift, optionally supposing some of their generated shifts are handed to someone else first.
  let effort=0;const canTake=(e:Row,date:string,shift:Row,position:string,without:Row[]=[])=>++effort>0&&(hours[e.id]||0)-without.reduce((sum,row)=>sum+length(effectiveShift(state,row)!),0)+length(shift)<=maxHours(e)&&!assignmentError(state,e,date,shift,position,without.length?rowsOf(e.id).filter(a=>!without.includes(a)):rowsOf(e.id));
  const best=(date:string,shift:Row,position:string,skip?:Set<string>)=>state.employees.filter(e=>!skip?.has(e.id)&&canTake(e,date,shift,position)).sort(order(shift,date))[0];
  const add=(e:Row,date:string,shift:Row,position:string)=>{const row:Row={id:uid(),employee:e.id,position,date,shift:shift.id};assignments.push(row);if(mine.has(e.id))mine.get(e.id)!.push(row);else mine.set(e.id,[row]);hours[e.id]=(hours[e.id]||0)+length(shift);slots.set(slot(date,shift.id,position),(slots.get(slot(date,shift.id,position))||0)+1);};
  for(const date of selectedDates)for(const rule of requirementsForDate(state,date)){const shift=state.config.shifts.find(s=>s.id===rule.shift);if(!shift)continue;for(let n=slots.get(slot(date,rule.shift,rule.position))||0;n<rule.count;n++){const employee=best(date,shift,rule.position);if(!employee)continue;add(employee,date,shift,rule.position);}}
  // Coverage repair. A gap is often left because the one person who could fill it was already given a shift
  // that someone else could work. Hand that shift over and move them, following a short chain of hand-overs if needed.
  // The search is capped so a very large team still gets its draft promptly.
  // Only generated rows move; protected work counts towards coverage and hours but is never reassigned.
  const generated=new Set<Row>(),movable=(id:string)=>rowsOf(id).filter(a=>generated.has(a));
  const hand=(row:Row,to:Row)=>{const shift=effectiveShift(state,row)!;mine.set(row.employee,rowsOf(row.employee).filter(a=>a!==row));hours[row.employee]=(hours[row.employee]||0)-length(shift);row.employee=to.id;if(mine.has(to.id))mine.get(to.id)!.push(row);else mine.set(to.id,[row]);hours[to.id]=(hours[to.id]||0)+length(shift);};
  // A move that turns out to be half-possible is undone, so a failed attempt never leaves a shift uncovered.
  const mark=()=>({owners:assignments.map(a=>a.employee),hours:{...hours}});
  const rewind=(saved:{owners:string[];hours:Record<string,number>})=>{assignments.forEach((a,i)=>{a.employee=saved.owners[i];});for(const id of Object.keys(hours))delete hours[id];Object.assign(hours,saved.hours);mine.clear();for(const a of [...fixed,...assignments]){if(mine.has(a.employee))mine.get(a.employee)!.push(a);else mine.set(a.employee,[a]);}};
  // Finds someone to take over a generated shift, if need be by first passing one of their own shifts on.
  // Nobody in held may be given more work: they are part of the move being arranged.
  const release=(row:Row,depth:number,held:Set<string>):boolean=>{
    const shift=effectiveShift(state,row)!,direct=best(row.date,shift,row.position,held);
    if(direct){hand(row,direct);return true;}
    if(!depth||effort>400000)return false;
    for(const e of state.employees.filter(e=>!held.has(e.id)).sort(order(shift,row.date)))for(const other of movable(e.id)){
      if((other.date===row.date&&other.shift===row.shift&&other.position===row.position)||!canTake(e,row.date,shift,row.position,[other]))continue;
      if(!release(other,depth-1,new Set([...held,e.id])))continue;
      hand(row,e);return true;
    }
    return false;
  };
  for(const date of selectedDates)for(const rule of requirementsForDate(state,date)){
    const shift=state.config.shifts.find(s=>s.id===rule.shift);if(!shift)continue;
    while((slots.get(slot(date,rule.shift,rule.position))||0)<rule.count){
      assignments.forEach(a=>generated.add(a));
      const free=best(date,shift,rule.position);if(free){add(free,date,shift,rule.position);continue;}
      let repaired=false;
      for(const employee of [...state.employees].sort(order(shift,date))){
        // Usually one shift has to be handed over; sometimes two, when rest rules tie a second shift to the first.
        const own=movable(employee.id).filter(a=>!(a.date===date&&a.shift===rule.shift&&a.position===rule.position));
        for(const moved of [...own.map(a=>[a]),...own.flatMap((a,i)=>own.slice(i+1).map(b=>[a,b]))]){
          if(!canTake(employee,date,shift,rule.position,moved))continue;
          const saved=mark(),held=new Set([employee.id]);
          if(!moved.every(row=>release(row,2,held))){rewind(saved);continue;}
          add(employee,date,shift,rule.position);repaired=true;break;
        }
        if(repaired)break;
      }
      if(!repaired)break;
    }
  }
  keepDaysOffTogether(state,fixed,assignments);
  return {assignments,...scheduleQuality({...state,schedule:[...fixed,...assignments]},selectedDates)};
}
// Swap generated assignments only: coverage, weekly hours and fixed days stay intact.
// Split-day consent removes this employee's penalty, without forcing split days off.
function keepDaysOffTogether(state:State, fixed:Row[], assignments:Row[]) {
  const week=days(state.week), employees=new Map(state.employees.map(e=>[e.id,e])),shifts=new Map(state.config.shifts.map(s=>[s.id,s])),mine=rowsByEmployee([...fixed,...assignments]);
  const isolatedDays=(employee:Row, rows:Row[])=>{
    if(employee.splitDaysOffOK===true)return 0;
    const worked=new Set(rows.map(a=>a.date));
    const off=week.map(date=>!worked.has(date));
    if(off.filter(Boolean).length<2)return 0;
    return off.filter((value,i)=>value&&!off[i-1]&&!off[i+1]).length;
  };
  for(let pass=0;pass<assignments.length;pass++) {
    let improved=false;
    for(let i=0;i<assignments.length&&!improved;i++)for(let j=i+1;j<assignments.length;j++) {
      const a=assignments[i],b=assignments[j];
      if(a.employee===b.employee||a.date===b.date)continue;
      const first=employees.get(a.employee),second=employees.get(b.employee);
      const firstShift=shifts.get(a.shift),secondShift=shifts.get(b.shift);
      if(!first||!second||!firstShift||!secondShift||firstShift.hours!==secondShift.hours)continue;
      const firstRows=mine.get(a.employee)||[],secondRows=mine.get(b.employee)||[],before=isolatedDays(first,firstRows)+isolatedDays(second,secondRows);
      if(!before)continue;
      const firstAfter=[...firstRows.filter(row=>row!==a),{...b,employee:a.employee}],secondAfter=[...secondRows.filter(row=>row!==b),{...a,employee:b.employee}];
      if(isolatedDays(first,firstAfter)+isolatedDays(second,secondAfter)>=before)continue;
      if(assignmentError(state,second,a.date,firstShift,a.position,secondAfter,a.id)||assignmentError(state,first,b.date,secondShift,b.position,firstAfter,b.id))continue;
      mine.set(first.id,[...firstRows.filter(row=>row!==a),b]);mine.set(second.id,[...secondRows.filter(row=>row!==b),a]);
      [a.employee,b.employee]=[b.employee,a.employee];improved=true;break;
    }
    if(!improved)break;
  }
}
export function balanceBoard(state:State):Row[] {
  const eligible=state.employees.filter(e=>e.active!==false&&positionsOf(e).includes(state.config.boardPosition)),eligibleIds=new Set(eligible.map(e=>e.id));
  const taskByRoom=new Map<string,Row>();for(const b of state.boards)if(!taskByRoom.has(b.room))taskByRoom.set(b.room,b);
  const effectiveRooms:Row[]=state.rooms.filter(r=>r.active!==false&&r.service!=='none').map(r=>{const task=taskByRoom.get(r.id);return {...r,score:task?.scoreOverride??r.score,flag:task?.flagOverride||r.flag};});
  const roomById=new Map(effectiveRooms.map(r=>[r.id,r])),floorOf=new Map(state.rooms.map(r=>[r.id,r.floor]));
  const points=(room?:Row)=>{const value=Number(room?.score??1);return Number.isFinite(value)?value:1;};
  const dormant=state.boards.filter(b=>roomById.get(b.room)?.flag==='DND').map(b=>({...b,active:false,status:b.status==='Clean'?'Clean':'DND'}));
  const result=state.boards.filter(b=>b.active!==false&&b.locked&&eligibleIds.has(b.employee)&&roomById.has(b.room)&&roomById.get(b.room)!.flag!=='DND').map(b=>({...b}));
  const totals:Record<string,number>={},counts:Record<string,number>={},onFloor=new Map<string,number>(),floorKey=(id:string,floor:unknown)=>id+'|'+floor;
  eligible.forEach(e=>{totals[e.id]=0;counts[e.id]=0;});
  const tally=(id:string,room?:Row)=>{totals[id]+=points(room);counts[id]++;const key=floorKey(id,room?floorOf.get(room.id):undefined);onFloor.set(key,(onFloor.get(key)||0)+1);};
  for(const b of result)tally(b.employee,roomById.get(b.room));
  const placed=new Set(result.map(b=>b.room));
  for(const room of effectiveRooms.filter(r=>r.flag!=='DND'&&!placed.has(r.id)).sort((a,b)=>points(b)-points(a)||a.floor-b.floor)) {
    // Lightest workload first. A room worth no points adds no workload, so those are shared out by room count instead;
    // otherwise they would all land on whoever happened to be lightest. Ties go to whoever already has rooms on the floor.
    const weightless=points(room)<=0,near=(id:string)=>onFloor.get(floorKey(id,room.floor))||0;
    const e=[...eligible].sort((a,b)=>(weightless?counts[a.id]-counts[b.id]||totals[a.id]-totals[b.id]:totals[a.id]-totals[b.id]||counts[a.id]-counts[b.id])||near(b.id)-near(a.id))[0];
    if(e){const prior=taskByRoom.get(room.id);result.push({...prior,id:prior?.id||uid(),room:room.id,employee:e.id,active:true,locked:false,status:prior?.status==='DND'?'To clean':prior?.status||'To clean'});tally(e.id,room);}
  }
  return [...result,...dormant];
}
export const importTypes:Record<string,{key:keyof State|keyof Configuration,config?:boolean,required:string[],example:Record<string,unknown>}>= {
  employees:{key:'employees',required:['id','name','department','position'],example:{id:'EMP-014',name:'Jamie Chen',department:'fo',position:'agent',qualifications:['agent'],hire:'2024-01-01',hours:40,splitDaysOffOK:false,overnightOK:false,active:true}},
  departments:{key:'departments',config:true,required:['id','name'],example:{id:'fo',name:'Front Office'}},positions:{key:'positions',config:true,required:['id','name','department'],example:{id:'agent',name:'Guest Service Agent',department:'fo'}},
  rooms:{key:'rooms',required:['id','number','type','floor','score'],example:{id:'ROOM-201',number:'201',type:'king',floor:2,score:1,flag:'Departure'}},
  roomTypes:{key:'roomTypes',config:true,required:['id','name','score'],example:{id:'king',name:'Classic King',score:1}},
  reporting:{key:'reporting',required:['id','employee','targetType','target'],example:{id:'REL-014',employee:'e2',targetType:'position',target:'supervisor'}},
  availability:{key:'availability',required:['id','employee'],example:{id:'AV-014',employee:'e2',date:today(),shift:'am'}},
  shifts:{key:'shifts',config:true,required:['id','name','start','end','hours'],example:{id:'am',name:'Morning',start:'07:00',end:'15:30',hours:8}},
  staffing:{key:'staffing',config:true,required:['id','position','shift','count'],example:{id:'REQ-014',position:'agent',shift:'am',count:2}},
};
export function validateImport(type:string,input:unknown,state:State):Row[] {
  const allowed:Record<string,string[]>={employees:['id','name','department','departments','position','qualifications','hire','hours','maxHours','preferred','preferredWeekdays','splitDaysOffOK','overnightOK','active'],departments:['id','name','active'],positions:['id','name','department','active'],rooms:['id','number','type','floor','zone','score','flag','active'],roomTypes:['id','name','score','active'],reporting:['id','employee','targetType','target'],availability:['id','employee','date','shift','position','weekdays','from','to','reason'],shifts:['id','name','start','end','hours','overnight','active'],staffing:['id','position','shift','count','weekdays','from','to','active']};
  const schema=importTypes[type];if(!schema)throw new Error('Unknown import type.');if(!Array.isArray(input)||!input.length)throw new Error('Supply a non-empty JSON array.');if(input.length>5000)throw new Error('Import up to 5,000 records at a time.');const ids=new Set<string>();
  for(const [i,r] of input.entries()){if(r&&typeof r==='object'&&Object.keys(r).some(k=>!allowed[type].includes(k)))throw new Error(`Record ${i+1}: unknown field. Use only the published import schema.`);if(Object.keys(r||{}).length>50||Object.keys(r||{}).some(k=>['__proto__','constructor','prototype'].includes(k)))throw new Error('Unexpected import fields.');if(!r||typeof r!=='object'||Array.isArray(r))throw new Error(`Record ${i+1} must be an object.`);for(const field of schema.required){if(r[field]===undefined||r[field]===null||r[field]==='')throw new Error(`Record ${i+1}: ${field} is required.`);}if(typeof r.id!=='string'||ids.has(r.id))throw new Error(`Record ${i+1}: use a unique text ID.`);ids.add(r.id);
    for(const f of ['name','number','department','position','type','employee','targetType','target','shift','date','start','end'])if(r[f]!==undefined&&typeof r[f]!=='string')throw new Error(`Record ${i+1}: ${f} must be text.`);
    for(const f of ['score','floor','hours','maxHours','count'])if(r[f]!==undefined&&(typeof r[f]!=='number'||!Number.isFinite(r[f])||r[f]<0))throw new Error(`Record ${i+1}: ${f} must be a non-negative number.`);
    if(Object.values(r).some(v=>typeof v==='string'&&v.length>2000))throw new Error(`Record ${i+1}: text is too long.`);
    if(r.qualifications!==undefined&&(!Array.isArray(r.qualifications)||r.qualifications.some((q:unknown)=>typeof q!=='string')))throw new Error(`Record ${i+1}: qualifications must be an array of position IDs.`);
    if(type==='employees'&&Array.isArray(r.qualifications)&&!r.qualifications.length)throw new Error(`Record ${i+1}: qualifications is empty, which would leave this employee unable to work any position. List at least one position ID, or leave the field out to use their own position.`);
    for(const field of ['active','splitDaysOffOK','overnightOK','overnight'])if(r[field]!==undefined&&typeof r[field]!=='boolean')throw new Error(`Record ${i+1}: ${field} must be true or false.`);
    for(const f of ['start','end'])if(r[f]!==undefined&&!/^([01]\d|2[0-3]):[0-5]\d$/.test(r[f]))throw new Error(`Record ${i+1}: ${f} must use HH:MM.`);
    if(r.date!==undefined&&!validCalendarDate(r.date))throw new Error(`Record ${i+1}: date must use YYYY-MM-DD.`);
    for(const field of ['hire','from','to'])if(r[field]&&!validCalendarDate(r[field]))throw new Error(`Record ${i+1}: invalid ${field} date.`);if(r.from&&r.to&&r.from>r.to)throw new Error(`Record ${i+1}: date range is reversed.`);if(r.weekdays!==undefined&&(!Array.isArray(r.weekdays)||r.weekdays.some((d:unknown)=>!Number.isInteger(d)||Number(d)<0||Number(d)>6)))throw new Error(`Record ${i+1}: weekdays must be numbers from 0 (Sunday) to 6 (Saturday).`);if(type==='availability'&&!r.date&&!r.weekdays?.length&&!(r.from&&r.to))throw new Error(`Record ${i+1}: provide a date, weekdays, or date range.`);if(r.departments!==undefined&&(!Array.isArray(r.departments)||r.departments.some((d:string)=>!state.config.departments.some(x=>x.id===d))))throw new Error(`Record ${i+1}: unknown department affiliation.`);
    if(type==='staffing'&&(!Number.isInteger(r.count)||r.count>100))throw new Error(`Record ${i+1}: staffing count must be a whole number.`);
    const refs:Record<string,Row[]>={department:state.config.departments,position:state.config.positions,type:state.config.roomTypes,employee:state.employees,shift:state.config.shifts};for(const [field,rows] of Object.entries(refs))if(r[field]!==undefined&&!rows.some(x=>x.id===r[field]))throw new Error(`Record ${i+1}: unknown ${field} ID ${r[field]}.`);
    if(r.qualifications?.some((q:string)=>!state.config.positions.some(p=>p.id===q)))throw new Error(`Record ${i+1}: unknown qualification.`);
    if(type==='reporting'&&!['position','employee'].includes(r.targetType))throw new Error(`Record ${i+1}: targetType must be position or employee.`);
    if(type==='reporting'&&!(r.targetType==='position'?state.config.positions:state.employees).some(x=>x.id===r.target))throw new Error(`Record ${i+1}: unknown reporting target.`);
  }
  if(type==='rooms'){const numbers=new Set<string>();for(const room of mergeRows(state.rooms,input as Row[]).filter(r=>r.active!==false)){const number=String(room.number).trim();if(numbers.has(number))throw new Error('Room number '+number+' would belong to more than one active room. Give each active room its own number, or mark the old one inactive.');numbers.add(number);}}
  if(type==='reporting')managementGraph(state.employees,mergeRows(state.reporting,input));return input;
}
export function mergeRows(current:Row[],incoming:Row[]) {const map=new Map(current.map(r=>[r.id,r]));incoming.forEach(r=>map.set(r.id,{...map.get(r.id),...r}));return [...map.values()];}

export function invalidateChangedShiftPublications(previous:State,next:State):State {
  const signature=(shift:Row|undefined)=>shift?JSON.stringify([shift.name,shift.start,shift.end,Number(shift.hours),shift.active!==false,shift.overnight===true]):'';
  const ids=new Set([...previous.config.shifts,...next.config.shifts].map(shift=>shift.id));
  const changed=new Set([...ids].filter(id=>previous.config.timezone!==next.config.timezone||signature(previous.config.shifts.find(s=>s.id===id))!==signature(next.config.shifts.find(s=>s.id===id))));
  if(!changed.size)return next;
  const weeks=new Set(next.schedule.filter(row=>changed.has(row.shift)).map(row=>monday(row.date)));
  if(!weeks.size)return next;
  const publishedWeeks=(next.publishedWeeks||(next.published?[next.week]:[])).filter(week=>!weeks.has(week));
  return {...next,publishedWeeks,published:publishedWeeks.includes(next.week),publications:next.publications?.map(p=>({...p,publishedWeeks:(p.publishedWeeks||[]).filter((week:string)=>!weeks.has(week))}))};
}

function validCalendarDate(value:string){try{return /^\d{4}-\d{2}-\d{2}$/.test(value)&&new Date(value+'T00:00:00Z').toISOString().slice(0,10)===value;}catch{return false;}}
