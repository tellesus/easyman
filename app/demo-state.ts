import {seed,today,days,generateSchedule,type State,type Row} from './domain';
import {applyDaySetup,updateDayTask,housekeepingDay} from './housekeeping';
import {zonedInstant} from './time';
import {includePassonInSnapshot} from './passon-snapshot';

export function demoExampleFiles(state:State,date:string){
  const rooms=state.rooms.filter(r=>r.active!==false).slice(0,12).map((r,i)=>({roomNumber:String(r.number),service:i%3===0?'stayover':'departure'}));
  const report=['FICTIONAL PMS REPORT — DEMO ONLY','The Linden House · '+date,'Room | Service',...rooms.map(r=>r.roomNumber+' | '+(r.service==='departure'?'Checkout':'Stayover')),'No guest or reservation information is included.'].join('\n');
  const data={format:'easyman-housekeeping-day-v1',date,rooms,unmatched:[]};
  return {report,json:JSON.stringify(data,null,2),invalidJson:JSON.stringify({...data,unmatched:[{roomNumber:'9O9',service:'departure',reason:'Fictional ambiguous room identifier: review or exclude.'}]},null,2)};
}
export function createDemoState():State{
  let s=seed();const day=today(s.config.timezone),now=Date.now();
  s.config={...s.config,name:'The Linden House · Demo',sample:true};s.sample=true;
  s.rooms.push({id:'demo-room-007',number:'007',floor:1,type:'king',score:1,flag:'Stayover'});
  s.employees=s.employees.map(e=>({...e,splitDaysOffOK:e.id==='e5'}));
  s.boards=[];s.housekeepingDays=[];
  s=applyDaySetup(s,day,s.rooms.map((r,i)=>({roomNumber:String(r.number),service:i%4===0?'stayover':'departure'})),true,['e8','e9','e10']);
  s=updateDayTask(s,day,'r0',{status:'Clean'});s=updateDayTask(s,day,'r5',{flagOverride:'DND',locked:false,active:false,employee:''});
  s.schedule=generateSchedule(s).assignments;
  const previous=days(day,1)[0];const priorDay=new Date(previous+'T12:00:00Z');priorDay.setUTCDate(priorDay.getUTCDate()-1);const yesterday=priorDay.toISOString().slice(0,10);
  const boundaries=[yesterday,day].flatMap(date=>s.config.boundaries.map(time=>zonedInstant(date,time,s.config.timezone))).filter(t=>t<=now);
  const boundary=Math.max(...boundaries),iso=(ms:number)=>new Date(ms).toISOString();
  s.passon=s.passon.map((p,i)=>({...p,ownerName:s.employees.find(e=>e.id===p.owner)?.name,created:iso(boundary-(5+i)*3600000),due:p.status==='Completed'?'':iso(now+(i===1?-1:2+i)*3600000),...(p.status==='Completed'?{completed:iso(boundary-2*3600000)}:{}),history:[{at:iso(boundary-3600000),by:'Demo manager',text:p.status==='Completed'?'Fictional task completed before this example capture.':'Fictional handover note: the next step and owner have been recorded.'}]}));
  s.passon.push({id:'demo-older-completed',subject:'Yesterday’s service cupboard check',description:'Fictional completed task demonstrating the 12-hour snapshot cutoff.',category:'FYI',priority:'Low',status:'Completed',owner:'e1',ownerName:'Jamie Chen',created:iso(boundary-20*3600000),completed:iso(boundary-14*3600000),history:[]});
  const frozen=s.passon.filter(p=>includePassonInSnapshot(p,iso(boundary),s.config.timezone));
  s.snapshots=[{id:'demo-example-handover',type:'shift',boundary:iso(boundary),at:iso(boundary),demo:true,automatic:false,policy:{version:1,timezone:s.config.timezone},items:structuredClone(frozen)}];
  s.passon[0].history.push({at:iso(now),by:'Demo manager',text:'Fictional update after the example capture. Open the snapshot to compare the frozen notes.'});
  s.checks=s.checks.map((c,i)=>({...c,date:iso(now-(3-i)*3600000),attendant:housekeepingDay(s,day).boards.find(b=>s.rooms.find(r=>r.id===b.room)?.number===c.room)?.employee||'e8',failureCategory:c.status==='Recheck required'?'Linen':''}));
  s.training=s.training.map(t=>({...t,date:day,due:days(day,3)[2],history:[{at:iso(now-2*3600000),by:'Demo manager',text:'Fictional coaching conversation recorded.'}]}));
  s.discipline=[{id:'demo-discipline',employee:'e3',subject:'Fictional example: end-of-shift checklist',description:'Demo only. Discuss a missed checklist entry and agree on a reminder for the next shift.',expected:'Complete and initial the checklist before handing over.',response:'The fictional employee agreed to use a reminder.',acknowledgment:'Acknowledged',status:'Open',manager:'Demo manager',date:day,due:days(day,4)[3],history:[{at:iso(now-3600000),by:'Demo manager',text:'Fictional record created; no real incident or employee is represented.'}]}];
  s.activity=[{id:'demo-prepared',action:'Fictional daily roster and room plan prepared',by:'Demo manager',at:iso(now-1800000)},...s.activity.map((a,i)=>({...a,at:iso(now-(i+1)*3600000)}))];
  s.feedback=[];return s;
}

export type DemoRuntime={kind:'demo';load:()=>State;save:(value:State)=>void;read:()=>State};
export function createDemoRuntime():DemoRuntime{
  let value:State|undefined;
  const load=()=>{value??=createDemoState();return structuredClone(value);};
  return {kind:'demo',load,save(next){value=structuredClone(next);},read:load};
}
