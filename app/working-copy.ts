import {mergeRows,monday,type Row,type State} from './domain';
import {validDay} from './housekeeping';
import {validateStaffingWeek} from './staffing';

const requiredFields=['employees','rooms','passon','checks','training','discipline','schedule','boards','snapshots','availability','reporting'] as const;
export function validateWorkingCopy(copy:any){
  if(!copy||typeof copy!=='object'||!copy.config)throw new Error('Choose a complete EasyMan working copy.');
  for(const field of requiredFields)if(!Array.isArray(copy[field])||copy[field].length>10000||copy[field].some((row:any)=>!row||typeof row.id!=='string'))throw new Error('Invalid '+field+' records.');
  if(copy.staffingWeeks!==undefined){if(!Array.isArray(copy.staffingWeeks)||copy.staffingWeeks.length>10000||new Set(copy.staffingWeeks.map((w:Row)=>w.id)).size!==copy.staffingWeeks.length)throw Error('Invalid staffing weeks.');for(const row of copy.staffingWeeks)validateStaffingWeek(copy,row);}
  if(copy.housekeepingDays!==undefined){
    if(!Array.isArray(copy.housekeepingDays)||copy.housekeepingDays.length>10000)throw new Error('Invalid housekeeping day records.');
    const dates=new Set<string>();
    for(const day of copy.housekeepingDays){
      if(!day||typeof day.id!=='string'||!validDay(day.date)||dates.has(day.date)||!Array.isArray(day.items)||!Array.isArray(day.catalog)||day.items.length>10000||day.catalog.length>10000)throw new Error('Invalid or duplicate housekeeping day.');
      dates.add(day.date);const rooms=new Set<string>();
      if(day.attendantIds!==undefined&&(!Array.isArray(day.attendantIds)||day.attendantIds.length>10000||new Set(day.attendantIds).size!==day.attendantIds.length||day.attendantIds.some((id:any)=>typeof id!=='string'||!copy.employees.some((e:Row)=>e.id===id))))throw new Error('Invalid housekeeping attendant roster.');
      for(const item of day.items){if(!item||typeof item.room!=='string'||rooms.has(item.room)||!['departure','stayover'].includes(item.service)||!day.catalog.some((r:Row)=>r.id===item.room))throw new Error('Invalid housekeeping service selection.');rooms.add(item.room);}
      if(day.catalog.some((r:any)=>!r||typeof r.id!=='string'||typeof r.number!=='string'))throw new Error('Invalid housekeeping room catalog.');
    }
  }
  const tasks=new Set<string>();for(const task of copy.boards){const id=(task.date||'legacy')+':'+task.room;if(typeof task.room!=='string'||task.date&&!validDay(task.date)||tasks.has(id))throw new Error('Invalid or duplicate housekeeping task.');tasks.add(id);}
}

export function restoreWorkingCopy(current:State,copy:State,actor:string,at=new Date().toISOString()):State {
  validateWorkingCopy(copy);
  const restored:State={...current,config:copy.config,sample:copy.sample===true};
  restored.staffingWeeks=mergeRows(current.staffingWeeks||[],copy.staffingWeeks||[]);
  for(const field of ['employees','rooms','passon','checks','schedule','availability','reporting'] as const)restored[field]=mergeRows(current[field],copy[field]);
  // Current immutable captures win when the same snapshot is present in both copies.
  restored.snapshots=mergeRows(copy.snapshots,current.snapshots);
  const plans=new Map((current.housekeepingDays||[]).map(day=>[day.date,day]));
  for(const day of copy.housekeepingDays||[])plans.set(day.date,day);
  restored.housekeepingDays=[...plans.values()];
  // Physical room/date identity stays stable even if a task was recreated after backup.
  const tasks=new Map(current.boards.map(task=>[(task.date||'legacy')+':'+task.room,task]));
  for(const task of copy.boards)tasks.set((task.date||'legacy')+':'+task.room,task);
  const restoredDates=new Set((copy.housekeepingDays||[]).map(day=>day.date));
  restored.boards=[...tasks.values()].map(task=>{
    if(!restoredDates.has(task.date))return task;
    const service=plans.get(task.date)?.items.find((item:Row)=>item.room===task.room)?.service||'none';
    return {...task,service,active:service!=='none'&&task.flagOverride!=='DND'&&task.status!=='DND'};
  });
  for(const field of ['training','discipline'] as const)restored[field]=mergeRows(current[field],copy[field].map(row=>{const previous=current[field].find(p=>p.id===row.id);return previous?{...row,history:[...(previous.history||[]),{at,by:actor,text:'Working-copy restoration',snapshot:{...previous,history:undefined}}]}:row;}));
  // A changed live schedule becomes a draft; its immutable publication remains intact.
  const changedWeeks=new Set(copy.schedule.filter(row=>JSON.stringify(current.schedule.find(prior=>prior.id===row.id))!==JSON.stringify(row)).map(row=>monday(row.date)));
  for(const row of copy.staffingWeeks||[])if(JSON.stringify(current.staffingWeeks?.find(w=>w.id===row.id))!==JSON.stringify(row))changedWeeks.add(row.week);
  if(JSON.stringify(current.config.shifts)!==JSON.stringify(copy.config.shifts))for(const row of restored.schedule)changedWeeks.add(monday(row.date));
  if(changedWeeks.size){restored.publishedWeeks=(current.publishedWeeks||(current.published?[current.week]:[])).filter(week=>!changedWeeks.has(week));restored.published=restored.publishedWeeks.includes(current.week);restored.publications=current.publications?.map(p=>({...p,publishedWeeks:p.publishedWeeks.filter((week:string)=>!changedWeeks.has(week))}));}
  return restored;
}
