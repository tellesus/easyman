import {assignmentError,effectiveShift,generateSchedule,days,monday,uid,type Row,type State} from './domain';
import {validDay} from './housekeeping';
import {ensureStaffingWeek,splitDaysWarning,isManagerCoverage} from './staffing';
import {zonedInstant} from './time';
type Can=(capability:string,subject?:string)=>boolean;
export function generateAuthorizedSchedule(state:State,dates:string[],can:Can){
  const employees=state.employees.filter(e=>can('Scheduling.Edit',e.id)&&can('Availability.View',e.id));
  if(!employees.length&&!can('Scheduling.Edit',''))throw new Error('No employees are within both scheduling and availability scope.');
  state=can('Scheduling.Edit','')?ensureStaffingWeek(state):state;
  const protectedIds=state.schedule.filter(a=>isManagerCoverage(a)||!employees.some(e=>e.id===a.employee)).map(a=>a.id);
  const result=generateSchedule({...state,employees},dates,{fixedAssignmentIds:protectedIds});
  return {result,next:{...state,schedule:[...state.schedule.filter(a=>!dates.includes(a.date)||protectedIds.includes(a.id)),...result.assignments],published:false,publishedWeeks:(state.publishedWeeks||[]).filter(w=>w!==state.week),publications:state.publications?.map(p=>employees.some(e=>e.id===p.employee)||p.id===''&&can('Scheduling.Edit','')?{...p,publishedWeeks:p.publishedWeeks.filter((w:string)=>w!==state.week)}:p)}};
}
export function manualAssignment(state:State,prior:Row,form:FormData,can:Can){
  const value=(key:string)=>String(form.get(key)||'').trim(),employee=state.employees.find(e=>e.id===value('employee')),template=state.config.shifts.find(s=>s.id===value('shift'));
  const manager=value('employee')==='@manager';
  if((!manager&&!employee)||!template||template.active===false||!validDay(value('date'))||!state.config.positions.some(p=>p.id===value('position')&&p.active!==false))throw new Error('Choose a valid employee, position, date and shift.');
  if(manager?!can('Scheduling.Edit',''):!can('Scheduling.Edit',employee!.id)||!can('Availability.View',employee!.id))throw new Error('This edit requires scheduling authority and availability access.');
  if(prior.id&&!can('Scheduling.Edit',prior.employee||''))throw new Error('This edit requires scheduling authority for the original assignment.');
  const row:Row={id:prior.id||uid(),employee:manager?'':employee!.id,coverage:manager?'manager':'employee',date:value('date'),shift:template.id,position:value('position'),start:undefined,end:undefined,hours:undefined,override:undefined};
  if(form.get('customTimes')==='on'){
    const start=value('start'),end=value('end'),hours=Number(value('hours'));
    if(!/^([01]\d|2[0-3]):[0-5]\d$/.test(start)||!/^([01]\d|2[0-3]):[0-5]\d$/.test(end)||!value('hours')||!Number.isFinite(hours)||hours<0||hours>24)throw new Error('Enter valid start/end times and scheduled hours between 0 and 24.');
    Object.assign(row,{start,end,hours});
  }
  if(manager)return row;
  const shift=effectiveShift(state,row)!,hard=assignmentError(state,employee!,row.date,shift,row.position,state.schedule,prior.id,0);
  if(hard)throw new Error(hard);
  const warnings=manualAssignmentWarnings(state,row,prior.id);
  if(warnings.length){if(form.get('overrideWarnings')!=='on'||!value('overrideReason'))throw new Error(warnings.join(' ')+' Review the warning and provide a reason to override.');row.override={warnings,reason:value('overrideReason').slice(0,500),at:new Date().toISOString()};}
  return row;
}
export function manualAssignmentWarnings(state:State,row:Row,ignore?:string){
  const employee=state.employees.find(e=>e.id===row.employee),shift=effectiveShift(state,row);if(!employee||!shift||!validDay(row.date)||!/^([01]\d|2[0-3]):[0-5]\d$/.test(shift.start)||!/^([01]\d|2[0-3]):[0-5]\d$/.test(shift.end)||shift.hours===''||!Number.isFinite(Number(shift.hours)))return [];
  const warnings:string[]=[],week=days(monday(row.date)),total=state.schedule.filter(a=>a.employee===row.employee&&a.id!==ignore&&week.includes(a.date)).reduce((sum,a)=>sum+Number(effectiveShift(state,a)?.hours??0),Number(shift.hours)),max=Number(employee.maxHours??state.config.maxWeeklyHours??40);
  if(total>max)warnings.push(total+' scheduled hours exceeds the '+max+'-hour weekly maximum.');
  const overtime=Number(state.config.overtimeHours??40);if(total>overtime)warnings.push(total+' scheduled hours exceeds the '+overtime+'-hour overtime threshold.');
  const split=splitDaysWarning(state,row,ignore);if(split)warnings.push(split);
  try{const zone=state.config.timezone,start=zonedInstant(row.date,shift.start,zone),end=zonedInstant(shift.end<=shift.start?days(row.date,2)[1]:row.date,shift.end,zone),minimum=Number(state.config.minRestHours??11);
    for(const a of state.schedule.filter(a=>a.employee===row.employee&&a.id!==ignore)){const other=effectiveShift(state,a);if(!other)continue;const otherStart=zonedInstant(a.date,other.start,zone),otherEnd=zonedInstant(other.end<=other.start?days(a.date,2)[1]:a.date,other.end,zone);const rest=start>=otherEnd?(start-otherEnd)/3600000:otherStart>=end?(otherStart-end)/3600000:null;
      if(rest!==null&&rest<minimum)warnings.push(`Less than ${minimum} hours between shifts: ${Number(rest.toFixed(2))} hours of rest next to ${a.date} ${other.start}–${other.end}.`);
    }
  }catch(error:any){warnings.push(error.message||'Choose valid shift times.');}
  return warnings;
}
export function manualAssignmentBlocker(state:State,row:Row,ignore?:string){
  const employee=state.employees.find(e=>e.id===row.employee),shift=effectiveShift(state,row);
  if(!employee||!shift||!validDay(row.date)||!/^([01]\d|2[0-3]):[0-5]\d$/.test(shift.start)||!/^([01]\d|2[0-3]):[0-5]\d$/.test(shift.end))return null;
  try{return assignmentError(state,employee,row.date,shift,row.position,state.schedule,ignore,0);}catch{return 'Choose valid shift times.';}
}
