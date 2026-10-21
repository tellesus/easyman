import Login from '../login-ui';
import {safeAccountReturn} from '../account-server';
export const metadata={title:'Sign in — EasyMan',robots:{index:false,follow:false}};
export const dynamic='force-dynamic';
export default async function LoginPage({searchParams}:{searchParams:Promise<Record<string,string|string[]|undefined>>}){const params=await searchParams;return <Login returnTo={safeAccountReturn(params.returnTo)}/>;}
