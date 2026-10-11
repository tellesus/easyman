export function unavailable():never{throw new Error('Persistent storage and server operations are unavailable in the public demo.');}
export const loadTeam=unavailable,saveTeam=unavailable,provisionHistorical=unavailable,openResource=unavailable;
