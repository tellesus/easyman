import { getChatGPTUser } from '../chatgpt-auth';
import {APP_VERSION} from '../version';
import { body } from '../team-server';
import { captureDueSnapshots, snapshotStatus } from '../snapshot-server';
const tools=[
  {name:'capture_shift_snapshots',description:'Preserve all due encrypted pass-on snapshots at exact configured shift boundaries, including missed boundaries. Runs for properties owned by the signed-in caller; never decrypts hotel records. Returns the number captured. Safe to repeat.',inputSchema:{type:'object',properties:{},additionalProperties:false}},
  {name:'snapshot_status',description:'Read snapshot counts, latest boundary and last successful background check for properties owned by the signed-in caller. Does not capture snapshots or return hotel record contents.',inputSchema:{type:'object',properties:{},additionalProperties:false}},
];
export async function POST(request:Request){
  let message:any;try{message=await body(request,16000);}catch(e){if(e instanceof Response)return e;throw e;}
  if(!message||typeof message!=='object'||Array.isArray(message))return Response.json({error:'Invalid request.'},{status:400});
  const id=message.id??null;
  const reply=(result:unknown)=>Response.json({jsonrpc:'2.0',id,result},{headers:{'Cache-Control':'no-store'}});
  if(message.method==='server/discover')return reply({supportedVersions:['2026-07-28'],capabilities:{tools:{}}});
  if(message.method==='initialize')return reply({protocolVersion:message.params?.protocolVersion==='2026-07-28'?'2026-07-28':'2024-11-05',capabilities:{tools:{}},serverInfo:{name:'EasyMan',version:APP_VERSION}});
  if(message.method==='notifications/initialized')return new Response(null,{status:202});
  if(message.method==='tools/list')return reply({tools});
  if(message.method==='tools/call'){
    const user=await getChatGPTUser();if(!user)return Response.json({error:'Signed-in owner identity required.'},{status:401});
    const args=message.params?.arguments??{};
    if(!args||typeof args!=='object'||Array.isArray(args)||Object.keys(args).length)return reply({isError:true,content:[{type:'text',text:'This operation does not accept arguments.'}]});
    try{
      const name=message.params?.name;
      if(!tools.some(t=>t.name===name))return Response.json({jsonrpc:'2.0',id,error:{code:-32601,message:'Tool not found.'}});
      const result=name==='capture_shift_snapshots'?await captureDueSnapshots(user.userId,new Date(),'background'):await snapshotStatus(user.userId);
      return reply({content:[{type:'text',text:JSON.stringify(result)}],structuredContent:result});
    }catch{return reply({isError:true,content:[{type:'text',text:'Snapshot operation failed. Retry later and check the background task.'}]});}
  }
  return Response.json({jsonrpc:'2.0',id,error:{code:-32601,message:'Method not found.'}});
}
