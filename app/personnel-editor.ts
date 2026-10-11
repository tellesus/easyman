import {uid,type Row,type State} from './domain';
import {dateTimeISO} from './time';
export function personnelRecord(state:State,kind:'training'|'discipline',prior:Row,form:FormData,actor:string,can:(c:string,s?:string)=>boolean){
  const value=(key:string)=>String(form.get(key)||'').trim(),employee=prior.employee||value('employee');
  if(!state.employees.some(e=>e.id===employee)||!can(kind==='training'?'Training.Edit':'Discipline.Edit',employee))throw new Error('This employee is outside your authority scope.');
  const acknowledgment=kind==='discipline'?(form.has('acknowledgment')?value('acknowledgment'):prior.acknowledgment||'Pending'):undefined;
  if(kind==='discipline'&&!['Pending','Acknowledged','Declined'].includes(acknowledgment!))throw new Error('Choose a valid acknowledgment state.');
  return {id:prior.id||uid(),employee,subject:value('subject'),description:value('description'),expected:value('expected'),response:value('response'),action:value('action'),policy:value('policy'),incidentAt:kind==='discipline'?dateTimeISO(value('incidentAt'),state.config.timezone):undefined,witnesses:value('witnesses'),hr:value('hr'),acknowledgment,due:value('due'),date:prior.date||new Date().toISOString(),manager:prior.manager||actor,status:prior.status||'Open',history:prior.id?[...(prior.history||[]),{at:new Date().toISOString(),by:actor,text:'Record revised',snapshot:{...prior,history:undefined,module:undefined},previousStatus:prior.status,status:prior.status}]:[]};
}
