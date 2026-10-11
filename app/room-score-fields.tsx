'use client';
import {useState} from 'react';
import {type State} from './domain';
import {roomTypeScore} from './room-defaults';

export default function RoomScoreFields({state}:{state:State}){
  const types=state.config.roomTypes.filter(t=>t.active!==false),[type,setType]=useState(types[0]?.id||''),[override,setOverride]=useState(false),[score,setScore]=useState(String(roomTypeScore(state,types[0]?.id||'')));
  return <><label className="field"><span>Room type</span><select name="type" value={type} required onChange={e=>{setType(e.target.value);if(!override)setScore(String(roomTypeScore(state,e.target.value)));}}>{types.map(t=><option key={t.id} value={t.id}>{t.name}</option>)}</select></label><div className="field"><label className="field"><span>Workload points</span><input name="score" type="number" min={0} max={1000} step={0.25} value={score} required onInput={e=>{setScore(e.currentTarget.value);setOverride(true);}} onChange={e=>{setScore(e.target.value);setOverride(true);}}/></label><small>Room-type default: {roomTypeScore(state,type)}. An entered override stays with this room.</small><button className="text-button" type="button" onClick={()=>{setScore(String(roomTypeScore(state,type)));setOverride(false);}}>Use room-type default</button></div></>;
}
