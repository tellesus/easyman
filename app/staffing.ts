import {days,monday,uid,staffingApplies,type State,type Row} from './domain';

export const isManagerCoverage=(row:Row)=>row.coverage==='manager'&&row.employee==='';
export const isOvernight=(shift:Row)=>shift.overnight===true||shift.end<=shift.start;
export function overnightCorrections(state:State,employeeId?:string){
  const current=new Intl.DateTimeFormat('en-CA',{timeZone:state.config.timezone,year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
  return state.schedule.filter(a=>a.date>=current&&(!employeeId||a.employee===employeeId)&&!isManagerCoverage(a)&&state.employees.find(e=>e.id===a.employee)?.overnightOK!==true).filter(a=>{const template=state.config.shifts.find(s=>s.id===a.shift);return template&&isOvernight({...template,start:a.start??template.start,end:a.end??template.end});});
}
export function requirementsForDate(state:State,date:string):Row[]{
  const saved=state.staffingWeeks?.find(w=>w.week===monday(date));
  if(saved)return saved.requirements.filter((r:Row)=>r.date===date);
  const counts=new Map<string,Row>();
  for(const rule of state.config.staffing.filter(r=>staffingApplies(r,date,state.config))){
    const key=rule.position+':'+rule.shift,prior=counts.get(key);
    counts.set(key,{id:key,date,position:rule.position,shift:rule.shift,count:Number(rule.count)+(prior?.count||0)});
  }
  return [...counts.values()];
}
export function weekRequirements(state:State,week=state.week){return days(week).flatMap(date=>requirementsForDate(state,date));}
export function ensureStaffingWeek(state:State,week=state.week):State{
  if(state.staffingWeeks?.some(w=>w.week===week))return state;
  return {...state,staffingWeeks:[...(state.staffingWeeks||[]),{id:week,week,requirements:structuredClone(weekRequirements(state,week))}]};
}
export function validateStaffingWeek(state:State,row:Row){
  if(row.id!==row.week||!/^\d{4}-\d{2}-\d{2}$/.test(row.week)||!Number.isFinite(Date.parse(row.week))||new Date(row.week+'T00:00:00Z').toISOString().slice(0,10)!==row.week||monday(row.week)!==row.week||!Array.isArray(row.requirements)||row.requirements.length>10000)throw Error('Invalid staffing week.');
  const seen=new Set<string>();
  for(const r of row.requirements){const key=[r.date,r.position,r.shift].join(':');if(!days(row.week).includes(r.date)||!state.config.positions.some(p=>p.id===r.position)||!state.config.shifts.some(s=>s.id===r.shift)||!Number.isInteger(r.count)||r.count<0||r.count>100||seen.has(key))throw Error('Staffing needs must use valid dates, positions, shifts and whole numbers from 0 to 100.');seen.add(key);}
}
export function invalidateWeek(state:State,week:string):State{
  const publishedWeeks=(state.publishedWeeks||[]).filter(w=>w!==week);
  return {...state,publishedWeeks,published:publishedWeeks.includes(state.week),publications:state.publications?.map(p=>({...p,publishedWeeks:p.publishedWeeks.filter((w:string)=>w!==week)}))};
}
export function saveStaffingNeeds(state:State,position:string,counts:Record<string,number>,mode:'week'|'defaults',can:(cap:string,subject?:string)=>boolean):State{
  if(!can(mode==='defaults'?'Property.Configure':'Scheduling.Edit',''))throw Error('Property-wide authority is required to edit staffing needs.');
  if(!state.config.positions.some(p=>p.id===position&&p.active!==false))throw Error('Choose an active position.');
  const requirements=days(state.week).flatMap((date,i)=>state.config.shifts.filter(s=>s.active!==false).map(shift=>({id:date+':'+position+':'+shift.id,date,position,shift:shift.id,count:counts[i+':'+shift.id]})));
  validateStaffingWeek(state,{id:state.week,week:state.week,requirements});
  if(mode==='defaults')return {...state,config:{...state.config,staffing:[...state.config.staffing.filter(r=>r.position!==position),...requirements.map((r,i)=>({id:'default-'+uid(),position,shift:r.shift,count:r.count,weekdays:[new Date(r.date+'T12:00:00Z').getUTCDay()]}))]}};
  const frozen=ensureStaffingWeek(state),row=frozen.staffingWeeks!.find(w=>w.week===state.week)!;
  const next={...row,requirements:[...row.requirements.filter((r:Row)=>r.position!==position),...requirements]};
  if(JSON.stringify(next.requirements)===JSON.stringify(row.requirements))return frozen;
  return invalidateWeek({...frozen,staffingWeeks:frozen.staffingWeeks!.map(w=>w.id===next.id?next:w)},state.week);
}
export function resetStaffingWeek(state:State,can:(cap:string,subject?:string)=>boolean){
  if(!can('Scheduling.Edit',''))throw Error('Property-wide scheduling authority is required.');
  return invalidateWeek(ensureStaffingWeek({...state,staffingWeeks:state.staffingWeeks?.filter(w=>w.week!==state.week)}),state.week);
}
export function scheduleGaps(state:State,dates=days(state.week)):Row[]{
  return dates.flatMap(date=>requirementsForDate(state,date).flatMap(r=>{
    const assigned=state.schedule.filter(a=>a.date===date&&a.position===r.position&&a.shift===r.shift).length;
    return assigned<r.count?[{...r,missing:r.count-assigned,assigned}]:[];
  }));
}
export function splitDaysWarning(state:State,row:Row,ignore?:string){
  const e=state.employees.find(e=>e.id===row.employee);if(!e||e.splitDaysOffOK===true)return null;
  const week=days(monday(row.date)),prior=state.schedule.filter(a=>a.employee===row.employee&&a.id!==ignore);
  const isolated=(rows:Row[])=>{const off=week.map(d=>!rows.some(a=>a.date===d));return off.filter(Boolean).length>=2?off.filter((v,i)=>v&&!off[i-1]&&!off[i+1]).length:0;};
  return isolated([...prior,row])>isolated(prior)?'This assignment splits days off; this employee has not agreed to split days off.':null;
}
export function publishSchedule(state:State,can:(cap:string,subject?:string)=>boolean,at=new Date().toISOString()):State{
  if(overnightCorrections(state).some(a=>days(state.week).includes(a.date)&&can('Scheduling.Publish',a.employee)))throw Error('Correct assignments for employees who are not approved for overnight shifts before publishing.');
  const frozen=can('Scheduling.Publish','')?ensureStaffingWeek(state):state;
  const subjects=[...frozen.employees.filter(e=>can('Scheduling.Publish',e.id)&&frozen.schedule.some(a=>a.employee===e.id&&days(frozen.week).includes(a.date))).map(e=>e.id),...(can('Scheduling.Publish','')?['']:[])];
  if(!subjects.length)throw Error('No schedule is within your publication authority.');
  const publications=[...(frozen.publications||[])];const snapshots=[...frozen.snapshots];
  for(const subject of subjects){const id=subject,prior=publications.find(p=>p.id===id),record={id,employee:subject,...(subject===''?{scope:'property'}:{}),publishedWeeks:[...new Set([...(prior?.publishedWeeks||[]),frozen.week])]};
    const index=publications.findIndex(p=>p.id===id);if(index<0)publications.push(record);else publications[index]=record;
    snapshots.unshift({id:uid(),employee:subject,type:'schedule',boundary:'publication-'+at,at,items:structuredClone(frozen.schedule.filter(a=>a.employee===subject&&days(frozen.week).includes(a.date))),shifts:structuredClone(frozen.config.shifts),requirements:subject===''?structuredClone(weekRequirements(frozen)):undefined,week:frozen.week});
  }
  return {...frozen,publications,snapshots,published:true,publishedWeeks:[...new Set([...(frozen.publishedWeeks||[]),frozen.week])]};
}
