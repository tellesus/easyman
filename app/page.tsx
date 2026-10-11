import Marketing from './marketing';
import {redirect} from 'next/navigation';
import type {Metadata} from 'next';
export const metadata:Metadata={title:'EasyMan — Hotel operations, made calmer',description:'Scheduling, daily housekeeping boards, room inspections, coaching and shift handovers in one privacy-focused hotel operations workspace.',alternates:{canonical:'https://easyman.app/'},openGraph:{title:'EasyMan — A calmer shift starts here.',description:'A thoughtful workspace for the people who keep a hotel moving.',url:'https://easyman.app/',siteName:'EasyMan',type:'website'}};
export default async function Home({searchParams}:{searchParams:Promise<Record<string,string|string[]|undefined>>}) {
  const params=await searchParams,legacy=new URLSearchParams();
  for(const name of ['property','join'])if(typeof params[name]==='string')legacy.set(name,params[name]);
  if(legacy.size)redirect('/app?'+legacy.toString());
  return <Marketing/>;
}
