import Workspace from '../workspace';
import StaffWorkspace from '../staff-workspace';
import Waiting from '../account-waiting';
import {getAccountUser,accountMemberships} from '../account-server';
import {redirect} from 'next/navigation';
import type {Metadata} from 'next';
export const metadata:Metadata={title:'Workspace — EasyMan',robots:{index:false,follow:false}};
export const dynamic='force-dynamic';
export default async function Application({searchParams}:{searchParams:Promise<Record<string,string|string[]|undefined>>}) {
  const params=await searchParams,query=new URLSearchParams();
  for(const name of ['property','join'])if(typeof params[name]==='string')query.set(name,params[name]);
  const account=await getAccountUser();if(!account)redirect('/login?returnTo='+encodeURIComponent('/app'+(query.size?'?'+query:'')));
  const user={id:account.userId,name:account.displayName,email:account.email,provider:account.provider};
  const memberships=await accountMemberships(user.id),requested=query.get('property'),membership=memberships.find(m=>m.propertyId===requested)||(!requested?memberships.find(m=>m.status==='active'&&m.grants.length):undefined);
  if(params.access==='1')return <Waiting user={user} showAccess/>;
  if(query.get('join')||!membership||membership.status!=='active'||!membership.grants.length||account.provider==='password'&&!membership.employeeId)return <Waiting user={user} join={query.get('join')||undefined}/>;
  if(!requested)redirect('/app?property='+encodeURIComponent(membership.propertyId));
  const full=membership.grants.some(g=>['*','Users.Manage','Property.Configure','Scheduling.Edit','HousekeepingBoards.Assign','Training.View','Discipline.View'].includes(g.capability));
  return full?<Workspace user={user}/>:<StaffWorkspace user={user}/>;
}
