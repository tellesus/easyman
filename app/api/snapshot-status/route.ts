import { response,user,session,endpoint,property,member,requirePermit } from '../../team-server';
import { propertySnapshotStatus } from '../../snapshot-server';
export async function GET(request:Request){return endpoint(async()=>{const u=await user(),id=new URL(request.url).searchParams.get('property')||u.userId;await session(request,u,id);const p=await property(id),m=await member(id,u.userId);requirePermit(m,'ShiftLog.ViewArchive','',p);return response(await propertySnapshotStatus(id));});}
