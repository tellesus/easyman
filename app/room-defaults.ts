import { type State } from './domain';

export function roomTypeScore(state:State,type:string){
  const score=state.config.roomTypes.find(t=>t.id===type)?.score;
  return typeof score==='number'&&Number.isFinite(score)&&score>=0?score:1;
}
