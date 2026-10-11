import { monday } from './domain';
import type { Resource } from './access';

export function validPublicationMetadata(record:Resource) {
  if(record.aadVersion!==3)return record.publicationWeeks===undefined;
  const weeks=record.publicationWeeks;
  return record.field==='publication'&&Array.isArray(weeks)&&weeks.length<=1000&&new Set(weeks).size===weeks.length&&weeks.every(week=>typeof week==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(week)&&Number.isFinite(Date.parse(week))&&new Date(week+'T00:00:00Z').toISOString().slice(0,10)===week&&monday(week)===week);
}
