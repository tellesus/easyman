import { mergeRows, managementGraph, validateImport, uid, type Row, type State } from './domain';
import {invalidateWeek,isOvernight} from './staffing';
import {effectiveShift,today,monday} from './domain';

// Simple controls edit only rules they can represent. Richer imported rules stay
// separate so a profile or checkbox edit cannot silently discard them.
export const simpleUnavailableDate = (row:Row) => !!row.date && Object.keys(row).every(key=>['id','employee','date'].includes(key));
export const simpleUnavailableWeekdays = (row:Row) => Array.isArray(row.weekdays) && Object.keys(row).every(key=>['id','employee','weekdays'].includes(key));
export function saveEmployeeProfile(state:State, original:Row, data:FormData, rights:{scheduling:boolean;configuration:boolean}) {
  const val=(key:string)=>String(data.get(key)||'').trim(),id=original.id||uid();
  const employee:Row={...original,id,name:val('name'),department:val('department'),departments:[...new Set([val('department'),...data.getAll('departments').map(String)])],position:val('position'),active:val('active')==='true',qualifications:[...new Set([val('position'),...data.getAll('qualifications').map(String)])]};
  if(rights.scheduling)Object.assign(employee,{hire:val('hire'),preferred:val('preferred'),splitDaysOffOK:data.has('splitDaysOffOK'),overnightOK:data.has('overnightOK'),hours:Number(val('hours'))});
  const employees=mergeRows(state.employees,[employee]);
  let reporting=state.reporting,availability=state.availability;
  if(rights.configuration){
    const targets=JSON.parse(val('reporting')||'[]');
    if(!Array.isArray(targets))throw new Error('Reporting relationships must be an array.');
    const prior=state.reporting.filter(row=>row.employee===id);
    const reports:Row[]=targets.map((t:any)=>prior.find(row=>row.targetType===t.targetType&&row.target===t.target)||{id:uid(),employee:id,targetType:t.targetType,target:t.target});
    const replacements=new Map(reports.map(row=>[row.id,row]));
    reporting=state.reporting.flatMap(row=>row.employee!==id?[row]:replacements.has(row.id)?[replacements.get(row.id)!]:[]);
    reporting.push(...reports.filter(row=>!state.reporting.some(old=>old.id===row.id)));
    if(reports.length)validateImport('reporting',reports,{...state,employees,reporting:[]});
  }
  managementGraph(employees,reporting);
  if(rights.scheduling){
    const prior=state.availability.filter(row=>row.employee===id);
    const dates=[...new Set(val('unavailable').split(',').map(date=>date.trim()).filter(Boolean))];
    const weekdays=[...new Set(data.getAll('unavailableWeekdays').map(Number))];
    const advanced=data.has('advancedAvailability')?JSON.parse(val('advancedAvailability')||'[]'):prior.filter(row=>!simpleUnavailableDate(row)&&!simpleUnavailableWeekdays(row));
    if(!Array.isArray(advanced))throw new Error('Additional availability rules must be a JSON array.');
    const rows:Row[]=[...dates.map(date=>prior.find(row=>simpleUnavailableDate(row)&&row.date===date)||{id:uid(),employee:id,date}),...(weekdays.length?[prior.find(row=>simpleUnavailableWeekdays(row)&&JSON.stringify([...row.weekdays].sort())===JSON.stringify([...weekdays].sort()))||{id:uid(),employee:id,weekdays}]:[]),...advanced.map(row=>({...row,id:row.id||uid(),employee:id}))];
    if(rows.length)validateImport('availability',rows,{...state,employees});
    if(rows.some(row=>state.availability.some(other=>other.id===row.id&&other.employee!==id)))throw new Error('An availability ID belongs to another employee.');
    const replacements=new Map(rows.map(row=>[row.id,row]));
    availability=state.availability.flatMap(row=>row.employee!==id?[row]:replacements.has(row.id)?[replacements.get(row.id)!]:[]);
    availability.push(...rows.filter(row=>!state.availability.some(old=>old.id===row.id)));
  }
  let next={...state,employees,reporting,availability};
  if(original.overnightOK===true&&employee.overnightOK!==true){for(const a of state.schedule.filter(a=>a.employee===id&&a.date>=today(state.config.timezone)&&effectiveShift(state,a)&&isOvernight(effectiveShift(state,a)!)))next=invalidateWeek(next,monday(a.date));}
  return next;
}
