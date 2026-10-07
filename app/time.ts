// Convert a hotel wall-clock time to an instant without using the workstation's time zone.
export function zonedInstant(date:string,time:string,zone:string):number {
  const [year,month,day]=date.split('-').map(Number),[hour,minute]=time.split(':').map(Number);
  const desired=Date.UTC(year,month-1,day,hour,minute);let candidate=desired;
  const format=new Intl.DateTimeFormat('en-CA',{timeZone:zone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'});
  const wall=(instant:number)=>{const parts=format.formatToParts(new Date(instant));const get=(type:string)=>Number(parts.find(p=>p.type===type)?.value);return Date.UTC(get('year'),get('month')-1,get('day'),get('hour'),get('minute'));};
  for(let i=0;i<4;i++){const delta=desired-wall(candidate);if(!delta)return candidate;candidate+=delta;}
  throw new Error(`${date} ${time} does not exist in ${zone} because of a daylight-saving change. Choose another time.`);
}
export function dateTimeISO(local:string,zone:string){if(!local)return '';const [date,time]=local.split('T');return new Date(zonedInstant(date,time,zone)).toISOString();}

export function localDateTime(iso:string,zone:string){const parts=new Intl.DateTimeFormat('en-CA',{timeZone:zone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(new Date(iso));const get=(name:string)=>parts.find(p=>p.type===name)?.value;return `${get('year')}-${get('month')}-${get('day')}T${get('hour')}:${get('minute')}`;}
