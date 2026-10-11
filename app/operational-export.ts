import {permits,type Member} from './access';
import {directory} from './team-crypto';
import {type State} from './domain';
type Kind='schedule'|'board';
export function canExportOperational(state:State,member:Member|null,kind:Kind){
  if(!member)return true;
  const dir=directory(state),view=kind==='schedule'?'Scheduling.View':'HousekeepingBoards.View';
  return ['' ,...state.employees.map(e=>e.id),...(kind==='schedule'?state.schedule:state.boards).map(r=>r.employee||'')].some(subject=>permits(member,view,subject,dir)&&permits(member,'OperationalData.Export',subject,dir));
}
export function prepareOperationalExport(state:State,member:Member|null,kind:Kind):State{
  if(!canExportOperational(state,member,kind))throw new Error('Your account does not have export permission for this data.');
  const copy=structuredClone(state);if(!member)return copy;
  const dir=directory(state),view=kind==='schedule'?'Scheduling.View':'HousekeepingBoards.View',allowed=(subject:string)=>permits(member,view,subject,dir)&&permits(member,'OperationalData.Export',subject,dir);
  copy.employees=copy.employees.filter(e=>allowed(e.id));
  if(kind==='schedule'){copy.schedule=copy.schedule.filter(a=>allowed(a.employee));copy.publications=copy.publications?.filter(p=>allowed(p.employee));copy.published=copy.publications?.length?copy.publications.every(p=>p.publishedWeeks.includes(copy.week)):copy.published;}
  else{copy.boards=copy.boards.filter(b=>allowed(b.employee||''));if(!allowed(''))copy.rooms=copy.rooms.filter(r=>copy.boards.some(b=>b.room===r.id));}
  return copy;
}
