'use client';
import { useState } from 'react';
import { uid, today, type Row, type State } from './domain';

const weekdays=['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
export default function AvailabilityEditor({rows,state,disabled}:{rows:Row[];state:State;disabled:boolean}){
  const [rules,setRules]=useState<Row[]>(()=>rows.map(row=>({...row})));
  const update=(id:string,values:Partial<Row>)=>setRules(current=>current.map(row=>row.id===id?{...row,...values}:row));
  return <fieldset className="availability-editor wide" disabled={disabled}>
    <legend>Additional availability rules</legend>
    <p className="field-hint">Use date ranges or limit an unavailable period to particular shifts or positions. Existing imported rules stay here when other profile details change.</p>
    <input type="hidden" name="advancedAvailability" value={JSON.stringify(rules)}/>
    {rules.map((row,index)=>{
      const kind=row.date?'date':row.from||row.to?'range':'weekdays';
      return <section className="availability-rule" key={row.id} aria-label={'Availability rule '+(index+1)}>
        <div className="form-grid">
          <label className="field wide"><span>Unavailable period</span><select value={kind} onChange={event=>{const value=event.target.value,period:Partial<Row>={date:undefined,from:undefined,to:undefined,weekdays:undefined};if(value==='date')period.date=today(state.config.timezone);else if(value==='range'){period.from=today(state.config.timezone);period.to=period.from;}else period.weekdays=[0];update(row.id,period);}}><option value="date">One date</option><option value="range">Date range</option><option value="weekdays">Recurring weekdays</option></select></label>
          {kind==='date'&&<label className="field wide"><span>Unavailable date</span><input type="date" required value={row.date||''} onInput={event=>update(row.id,{date:event.currentTarget.value})} onChange={event=>update(row.id,{date:event.target.value})}/></label>}
          {kind==='range'&&<><label className="field"><span>From date</span><input type="date" required value={row.from||''} onInput={event=>update(row.id,{from:event.currentTarget.value})} onChange={event=>update(row.id,{from:event.target.value})}/></label><label className="field"><span>Through date</span><input type="date" required min={row.from||undefined} value={row.to||''} onInput={event=>update(row.id,{to:event.currentTarget.value})} onChange={event=>update(row.id,{to:event.target.value})}/></label></>}
          {kind==='weekdays'&&<label className="field wide"><span>Unavailable weekdays</span><select multiple value={(row.weekdays||[]).map(String)} onChange={event=>update(row.id,{weekdays:[...event.target.selectedOptions].map(option=>Number(option.value))})}>{weekdays.map((day,i)=><option value={i} key={day}>{day}</option>)}</select></label>}
          <label className="field"><span>Applies to shift</span><select value={row.shift||''} onChange={event=>update(row.id,{shift:event.target.value||undefined})}><option value="">All shifts</option>{state.config.shifts.map(shift=><option key={shift.id} value={shift.id}>{shift.name}</option>)}</select></label>
          <label className="field"><span>Applies to position</span><select value={row.position||''} onChange={event=>update(row.id,{position:event.target.value||undefined})}><option value="">All qualified positions</option>{state.config.positions.map(position=><option key={position.id} value={position.id}>{position.name}</option>)}</select></label>
          <label className="field wide"><span>Reason (optional)</span><input maxLength={2000} value={row.reason||''} onChange={event=>update(row.id,{reason:event.target.value||undefined})}/></label>
        </div>
        <button type="button" className="danger-text" onClick={()=>setRules(current=>current.filter(rule=>rule.id!==row.id))}>Remove this availability rule</button>
      </section>;
    })}
    {!rules.length&&<p className="field-hint">No additional restrictions.</p>}
    <button type="button" className="secondary" onClick={()=>setRules(current=>[...current,{id:uid(),from:today(state.config.timezone),to:today(state.config.timezone)}])}>Add availability rule</button>
  </fieldset>;
}
