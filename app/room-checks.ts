import {uid,type Row,type State} from './domain';
import {dateTimeISO,localDateTime} from './time';
export type CheckFilters={room?:string;inspector?:string;attendant?:string;category?:string;result?:string;from?:string;to?:string;search?:string};
export function filterRoomChecks(state:State,filters:CheckFilters){return state.checks.filter(c=>{
  const date=localDateTime(c.date,state.config.timezone).slice(0,10);
  return (!filters.room||c.room===filters.room)&&(!filters.inspector||c.inspector===filters.inspector)&&(!filters.attendant||c.attendant===filters.attendant)&&(!filters.category||c.failureCategory===filters.category)&&(!filters.result||c.result===filters.result||c.status===filters.result)&&(!filters.from||date>=filters.from)&&(!filters.to||date<=filters.to)&&(!filters.search||[c.room,c.notes,c.failureCategory,state.employees.find(e=>e.id===c.inspector)?.name,state.employees.find(e=>e.id===c.attendant)?.name].join(' ').toLowerCase().includes(filters.search.toLowerCase()));
}).sort((a,b)=>String(b.date).localeCompare(String(a.date)));}
export function saveRoomCheck(state:State,form:FormData,parent:string|undefined,can:(c:string,s?:string)=>boolean){
  const value=(key:string)=>String(form.get(key)||'').trim();
  if(!can('RoomChecks.Perform',''))throw new Error('Room-check recording requires inspection access.');
  if(!state.rooms.some(r=>String(r.number)===value('room'))||!state.employees.some(e=>e.id===value('inspector'))||value('attendant')&&!state.employees.some(e=>e.id===value('attendant')))throw new Error('Choose valid room, inspector and attendant references.');
  if(!['Pass','Pass with correction','Fail'].includes(value('result'))||!value('notes'))throw new Error('Choose a result and record inspection notes.');
  if(parent&&!state.checks.some(c=>c.id===parent&&c.room===value('room')))throw new Error('The original inspection must exist for this room.');
  const date=value('checkedAt')?dateTimeISO(value('checkedAt'),state.config.timezone):new Date().toISOString();if(!date||!Number.isFinite(new Date(date).getTime()))throw new Error('Choose a valid inspection date and time.');
  const record:Row={id:uid(),room:value('room'),inspector:value('inspector'),attendant:value('attendant'),result:value('result'),failureCategory:value('result')==='Pass'?'':value('failureCategory').slice(0,120),notes:value('notes').slice(0,4000),date,status:value('result')==='Pass'?'Complete':'Recheck required',parent};
  return {...state,checks:[record,...state.checks.map(c=>c.id===parent?{...c,status:'Rechecked'}:c)]};
}
