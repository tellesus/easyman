import { managementGraph, lineage, type Row } from './domain';
export type Scope = { type: 'property'|'department'|'position'|'employees'|'lineage'|'direct'; ids?: string[] };
export type Grant = { capability: string; scope: Scope };
export type Directory = { employees: Row[]; reporting: Row[] };
export type Member = { userId: string; email: string; employeeId: string; status: string; grants: Grant[]; publicKey: JsonWebKey };
export type Resource = { id: string; propertyId?:string; aadVersion?:number; snapshotExcludeAfter?:string|null; publicationWeeks?:string[]; field: string; subject: string; revision: number; ciphertext: string; iv: string; wrapped: Record<string,string> };
export const fields: Record<string,{read:string;write:string}> = {
  config:{read:'Property.View',write:'Property.Configure'},employees:{read:'Employees.View',write:'Employees.Manage'},rooms:{read:'Rooms.View',write:'Property.Configure'},reporting:{read:'Employees.View',write:'Property.Configure'},
  passon:{read:'ShiftLog.View',write:'ShiftLog.Edit'},checks:{read:'RoomChecks.View',write:'RoomChecks.Perform'},boards:{read:'HousekeepingBoards.View',write:'HousekeepingBoards.Assign'},
  housekeepingDays:{read:'HousekeepingBoards.View',write:'HousekeepingBoards.Assign'},
  schedule:{read:'Scheduling.View',write:'Scheduling.Edit'},staffingWeeks:{read:'Scheduling.View',write:'Scheduling.Edit'},availability:{read:'Availability.View',write:'Scheduling.Edit'},preferences:{read:'Availability.View',write:'Scheduling.Edit'},employeePrivate:{read:'Employees.PrivateView',write:'Employees.Manage'},
  training:{read:'Training.View',write:'Training.Edit'},discipline:{read:'Discipline.View',write:'Discipline.Edit'},publication:{read:'Scheduling.View',write:'Scheduling.Publish'},
  snapshots:{read:'ShiftLog.ViewArchive',write:'ShiftLog.Handoff'},scheduleArchives:{read:'Scheduling.View',write:'Scheduling.Publish'},activity:{read:'ShiftLog.View',write:'ShiftLog.Create'},feedback:{read:'Feedback.Self',write:'Feedback.Self'},
};
export function permits(member: Pick<Member,'status'|'grants'|'employeeId'|'userId'>,capability:string,subject:string,directory:Directory):boolean {
  if(member.status!=='active')return false;
  return member.grants.some(g=>{
    if(g.capability!=='*'&&g.capability!==capability&&!(capability==='Scheduling.View'&&g.capability==='Scheduling.Published'))return false;
    if(g.scope.type==='property')return true;
    const employee=directory.employees.find(e=>e.id===subject);
    if(g.scope.type==='employees')return (g.scope.ids||[]).includes(subject);
    if(!employee)return false;
    if(g.scope.type==='department')return (employee.departments||[employee.department]).some((id:string)=>(g.scope.ids||[]).includes(id));
    if(g.scope.type==='position')return (g.scope.ids||[]).includes(employee.position);
    if(!member.employeeId)return false;
    if(g.scope.type==='direct')return (managementGraph(directory.employees,directory.reporting).get(subject)||[]).includes(member.employeeId);
    return lineage(subject,directory.employees,directory.reporting).includes(member.employeeId);
  });
}
export function canReadResource(member:Member,record:Pick<Resource,'field'|'subject'>,directory:Directory){
  if(!fields[record.field]||!permits(member,fields[record.field].read,record.subject,directory))return false;
  // Published-only staff receive immutable published copies, never the live draft.
  if(record.field==='schedule')return member.grants.some(g=>(g.capability==='*'||g.capability==='Scheduling.View')&&permits({...member,grants:[g]},'Scheduling.View',record.subject,directory));
  return true;
}
export function staffGrants(employeeId:string,options:{boards?:'none'|'assigned'|'property';log?:boolean;schedule?:boolean}):Grant[]{
  if(!employeeId)throw Error('Associate an employee before assigning staff access.');
  const own:Scope={type:'employees',ids:[employeeId]},property:Scope={type:'property'};
  const grants:Grant[]=[{capability:'Property.View',scope:property},{capability:'Employees.View',scope:own}];
  if(options.schedule)grants.push({capability:'Scheduling.Published',scope:own});
  if(options.boards&&options.boards!=='none')grants.push({capability:'Rooms.View',scope:property},{capability:'HousekeepingBoards.View',scope:options.boards==='property'?property:own});
  if(options.log)for(const capability of ['ShiftLog.View','ShiftLog.Create','ShiftLog.Edit'])grants.push({capability,scope:property});
  return grants;
}
export function validateDelegation(actor:Member,grants:Grant[],directory:Directory){
  if(actor.grants.some(g=>g.capability==='*'&&g.scope.type==='property'))return;
  for(const grant of grants){if(grant.capability==='*'||grant.capability==='Users.Manage'||grant.capability==='Property.Configure'||grant.capability.startsWith('Employees.Private')||grant.capability.startsWith('Discipline.'))throw Error('Only a full administrator can assign that authority.');
    const cap=grant.capability==='Scheduling.Published'?'Scheduling.View':grant.capability;
    if(grant.scope.type==='property'){if(!actor.grants.some(g=>(g.capability==='*'||g.capability===cap)&&g.scope.type==='property'))throw Error('You cannot grant access beyond your own authority.');}
    else{if(!['employees','department','position'].includes(grant.scope.type))throw Error('A full administrator must assign management scopes.');for(const id of grant.scope.ids||[]){const subjects=grant.scope.type==='employees'?[id]:directory.employees.filter(e=>grant.scope.type==='position'?e.position===id:(e.departments||[e.department]).includes(id)).map(e=>e.id);if(!subjects.length||subjects.some(id=>!permits(actor,cap,id,directory)))throw Error('You cannot grant access beyond your own authority.');}}
  }
}
// Editing may only remove authenticated publication weeks. Adding one still
// requires Publish; ciphertext alone cannot establish a safe downgrade.
export function permitsResourceWrite(member:Member,record:Pick<Resource,'field'|'subject'|'aadVersion'|'publicationWeeks'>,previous:Resource|undefined,directory:Directory){
  if(permits(member,fields[record.field].write,record.subject,directory))return true;
  return record.field==='publication'&&record.aadVersion===3&&Array.isArray(record.publicationWeeks)&&permits(member,'Scheduling.Edit',record.subject,directory)&&record.publicationWeeks.every(week=>previous?.publicationWeeks?.includes(week));
}
const fieldLabels:Record<string,string>={config:'property settings',employees:'employee profiles',rooms:'rooms',reporting:'reporting lines',passon:'pass-ons',checks:'room checks',boards:'housekeeping assignments',housekeepingDays:'housekeeping day setup',schedule:'shifts',staffingWeeks:'staffing needs',availability:'availability',preferences:'scheduling preferences',employeePrivate:'private employee details',training:'training records',discipline:'discipline records',snapshots:'snapshots',scheduleArchives:'schedule history',feedback:'feedback'};
// Explains a save in which some edits were withheld because the account may not write those record types.
export function withheldMessage(withheld:string[]){return 'Not saved: your account does not have permission to change '+withheld.map(f=>fieldLabels[f]||f).join(', ')+'. Those changes show on this screen only and will be gone after a reload. Everything else was saved.';}
export function profileGrants(profile:string,scope:Scope={type:'property'}):Grant[]{
  const operational=['Property.View','Employees.View','Rooms.View','ShiftLog.View','ShiftLog.Edit','ShiftLog.Create','ShiftLog.ViewArchive','ShiftLog.Handoff','RoomChecks.View','RoomChecks.Perform'];
  const manager=['Users.Manage','Scheduling.View','Scheduling.Edit','Scheduling.Publish','Availability.View','HousekeepingBoards.View','HousekeepingBoards.Assign','Training.View','Training.Edit','OperationalData.Export'];
  const capabilities=profile==='Administrator'?['*']:profile==='Manager'?[...operational,...manager]:profile==='Supervisor'?[...operational,'Scheduling.View','HousekeepingBoards.View','HousekeepingBoards.Assign'] : operational;
  return capabilities.map(capability=>({capability,scope:['Property.View','Rooms.View','ShiftLog.View','ShiftLog.Edit','ShiftLog.Create','ShiftLog.ViewArchive','ShiftLog.Handoff','RoomChecks.View','RoomChecks.Perform'].includes(capability)?{type:'property'}:scope}));
}
export function validateGrants(value:unknown):Grant[]{
  if(!Array.isArray(value)||value.length>100)throw new Error('Use an array of at most 100 capability grants.');
  for(const g of value){if(!g||typeof g.capability!=='string'||!/^([A-Za-z]+\.[A-Za-z]+|\*)$/.test(g.capability)||!g.scope||!['property','department','position','employees','lineage','direct'].includes(g.scope.type)||g.scope.ids!==undefined&&(!Array.isArray(g.scope.ids)||g.scope.ids.length>1000||g.scope.ids.some((id:unknown)=>typeof id!=='string')))throw new Error('Invalid capability or scope.');}
  return value;
}
