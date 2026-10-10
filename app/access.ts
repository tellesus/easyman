import { managementGraph, lineage, type Row } from './domain';
export type Scope = { type: 'property'|'department'|'position'|'employees'|'lineage'|'direct'; ids?: string[] };
export type Grant = { capability: string; scope: Scope };
export type Directory = { employees: Row[]; reporting: Row[] };
export type Member = { userId: string; email: string; employeeId: string; status: string; grants: Grant[]; publicKey: JsonWebKey };
export type Resource = { id: string; propertyId?:string; aadVersion?:number; field: string; subject: string; revision: number; ciphertext: string; iv: string; wrapped: Record<string,string> };
export const fields: Record<string,{read:string;write:string}> = {
  config:{read:'Property.View',write:'Property.Configure'},employees:{read:'Employees.View',write:'Employees.Manage'},rooms:{read:'Rooms.View',write:'Property.Configure'},reporting:{read:'Employees.View',write:'Property.Configure'},
  passon:{read:'ShiftLog.View',write:'ShiftLog.Edit'},checks:{read:'RoomChecks.View',write:'RoomChecks.Perform'},boards:{read:'HousekeepingBoards.View',write:'HousekeepingBoards.Assign'},
  housekeepingDays:{read:'HousekeepingBoards.View',write:'HousekeepingBoards.Assign'},
  schedule:{read:'Scheduling.View',write:'Scheduling.Edit'},availability:{read:'Availability.View',write:'Scheduling.Edit'},preferences:{read:'Availability.View',write:'Scheduling.Edit'},employeePrivate:{read:'Employees.PrivateView',write:'Employees.Manage'},
  training:{read:'Training.View',write:'Training.Edit'},discipline:{read:'Discipline.View',write:'Discipline.Edit'},publication:{read:'Scheduling.View',write:'Scheduling.Publish'},
  snapshots:{read:'ShiftLog.ViewArchive',write:'ShiftLog.Handoff'},scheduleArchives:{read:'Scheduling.View',write:'Scheduling.Publish'},activity:{read:'ShiftLog.View',write:'ShiftLog.Create'},feedback:{read:'Feedback.Self',write:'Feedback.Self'},
};
export function permits(member: Pick<Member,'status'|'grants'|'employeeId'|'userId'>,capability:string,subject:string,directory:Directory):boolean {
  if(member.status!=='active')return false;
  return member.grants.some(g=>{
    if(g.capability!=='*'&&g.capability!==capability)return false;
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
export function profileGrants(profile:string,scope:Scope={type:'property'}):Grant[]{
  const operational=['Property.View','Employees.View','Rooms.View','ShiftLog.View','ShiftLog.Edit','ShiftLog.Create','ShiftLog.ViewArchive','ShiftLog.Handoff','RoomChecks.View','RoomChecks.Perform'];
  const manager=['Scheduling.View','Scheduling.Edit','Scheduling.Publish','Availability.View','HousekeepingBoards.View','HousekeepingBoards.Assign','Training.View','Training.Edit','OperationalData.Export'];
  const capabilities=profile==='Administrator'?['*']:profile==='Manager'?[...operational,...manager]:profile==='Supervisor'?[...operational,'Scheduling.View','HousekeepingBoards.View','HousekeepingBoards.Assign'] : operational;
  return capabilities.map(capability=>({capability,scope:['Property.View','Rooms.View','ShiftLog.View','ShiftLog.Edit','ShiftLog.Create','ShiftLog.ViewArchive','ShiftLog.Handoff','RoomChecks.View','RoomChecks.Perform'].includes(capability)?{type:'property'}:scope}));
}
export function validateGrants(value:unknown):Grant[]{
  if(!Array.isArray(value)||value.length>100)throw new Error('Use an array of at most 100 capability grants.');
  for(const g of value){if(!g||typeof g.capability!=='string'||!/^([A-Za-z]+\.[A-Za-z]+|\*)$/.test(g.capability)||!g.scope||!['property','department','position','employees','lineage','direct'].includes(g.scope.type)||g.scope.ids!==undefined&&(!Array.isArray(g.scope.ids)||g.scope.ids.length>1000||g.scope.ids.some((id:unknown)=>typeof id!=='string')))throw new Error('Invalid capability or scope.');}
  return value;
}
