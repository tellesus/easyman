import Workspace from '../workspace';
import {requireChatGPTUser} from '../chatgpt-auth';
import type {Metadata} from 'next';
export const metadata:Metadata={title:'Workspace — EasyMan',robots:{index:false,follow:false}};
export const dynamic='force-dynamic';
export default async function Application({searchParams}:{searchParams:Promise<Record<string,string|string[]|undefined>>}) {
  const params=await searchParams,query=new URLSearchParams();
  for(const name of ['property','join'])if(typeof params[name]==='string')query.set(name,params[name]);
  const user=await requireChatGPTUser('/app'+(query.size?'?'+query.toString():''));
  return <Workspace user={{id:user.userId,name:user.displayName,email:user.email}}/>;
}
