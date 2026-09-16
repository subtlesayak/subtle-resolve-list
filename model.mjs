export const TASKS = { captions:'Captions & dialogue', color:'Color & film looks', fusion:'Fusion & animation', workflow:'Workflow & automation', media:'Media & delivery', audio:'Audio', development:'Development', learning:'Learning & references', hardware:'Hardware', linux:'Linux setup' };
export const LEVELS = { documented:'Source documented', creator:'Creator confirmed', tested:'Community tested', unknown:'Not established' };
export const EVIDENCE_FIELDS = [
 {key:'platforms',label:'Platforms',known:e=>e.platforms.length>0},
 {key:'resolve',label:'Resolve version',known:e=>e.requirements.resolve.length>0},
 {key:'editions',label:'Resolve edition',known:e=>e.requirements.editions.length>0},
 {key:'architectures',label:'Architecture',known:e=>e.requirements.architectures.length>0},
 {key:'processing',label:'Processing',known:e=>e.requirements.processing!=='unknown'},
 {key:'version',label:'Tool version',known:e=>Boolean(e.version.version)||e.version.kind==='not-applicable'},
 {key:'installation',label:'Installation',known:e=>Boolean(e.requirements.installation)},
];
export function evidenceCoverage(entry) {
 const fields=EVIDENCE_FIELDS.map(field=>({key:field.key,label:field.label,known:field.known(entry),evidence:entry.evidence.filter(item=>item.field===field.key||item.field===field.label.toLowerCase())}));
 return {total:fields.length,established:fields.filter(field=>field.known).length,fields};
}
export const DEFAULTS = { q:'', task:'', platform:'', edition:'Free', resolve:'', access:'', processing:'', pricing:'', architecture:'', evidence:'', official:'', sort:'name', mode:'all' };
export const UNFILTERED = {...DEFAULTS,edition:''};
export const MAX_COMPARE = 3;
const GENERIC_COMPARE_KINDS = new Set(['other','reference','guide','directory']);
export function comparableResources(a,b) {
 if(!a||!b||a.id===b.id)return false;
 const kindA=String(a.kind||'').toLowerCase(),kindB=String(b.kind||'').toLowerCase();
 if(kindA===kindB&&!GENERIC_COMPARE_KINDS.has(kindA))return true;
 const tasksA=new Set(a.tasks||[]);
 return a.category&&a.category===b.category&&(b.tasks||[]).some(task=>tasksA.has(task));
}
export function comparisonCompatible(entry,selected) {
 return selected.length===0||selected.every(other=>comparableResources(entry,other));
}
export function relatedResources(entry,entries,limit=3) {
 return entries.filter(other=>other.id!==entry.id).map(other=>({entry:other,score:(other.kind===entry.kind&&!GENERIC_COMPARE_KINDS.has(String(entry.kind||'').toLowerCase())?5:0)+(other.category===entry.category?3:0)+((other.tasks||[]).some(task=>(entry.tasks||[]).includes(task))?2:0)})).filter(item=>item.score>0).sort((a,b)=>b.score-a.score||a.entry.name.localeCompare(b.entry.name)).slice(0,limit).map(item=>item.entry);
}
export function comparisonFromUrl(search) {
 const raw=String(search).match(/(?:^|[?&])compare=([^&]*)/)?.[1]||'';
 let decoded='';
 try { decoded=decodeURIComponent(raw); } catch { decoded=raw; }
 return [...new Set(decoded.split(',').map(value=>value.trim()).filter(Boolean))].slice(0,MAX_COMPARE);
}
export function comparisonToUrl(ids) { return ids.slice(0,MAX_COMPARE).join(','); }
export function compareVersions(a,b) { const x=String(a).split('.').map(Number), y=String(b).split('.').map(Number); for(let i=0;i<Math.max(x.length,y.length);i++){const d=(x[i]||0)-(y[i]||0);if(d)return Math.sign(d);}return 0; }
export function matchesVersion(entry,version,edition) { const ranges=entry.requirements.resolve;const inheritFree=edition==='Studio'&&!ranges.some(r=>r.edition==='Studio');return ranges.some(r=>(!r.edition||!edition||r.edition===edition||(inheritFree&&r.edition==='Free'))&&(!r.min||compareVersions(version,r.min)>=0)&&(!r.max||compareVersions(version,r.max)<=0)); }
export function normalizeSearch(value) {
 return String(value).normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase()
 .replace(/\bb\s*&\s*w\b/g,'black white')
 .replace(/[^a-z0-9]+/g,' ')
 .replace(/\bcolours?\b/g,'color').replace(/\bcolors\b/g,'color')
 .replace(/\b(?:fujifilm|fujicolor|fujichrome)\b/g,'fuji')
 .replace(/\b(?:captions|captioning|subtitles|subtitle|subtitling)\b/g,'caption')
 .replace(/\b(?:dctls)\b/g,'dctl').replace(/\bluts\b/g,'lut')
 .replace(/\b(?:black and white|monochrome)\b/g,'black white')
 .replace(/\bnoise reduction\b/g,'denoise')
 .trim().replace(/\s+/g,' ');
}
const searchIndexes=new WeakMap();
function searchIndex(entry){
 let index=searchIndexes.get(entry);
 if(index===undefined){index=normalizeSearch([entry.name,entry.creator,entry.description,...(entry.tags||[])].join(' '));searchIndexes.set(entry,index);}
 return index;
}
export function searchScore(entry, query) {
 const normalized=normalizeSearch(query);
 if(!normalized) return 0;
 const name=normalizeSearch(entry.name), creator=normalizeSearch(entry.creator), description=normalizeSearch(entry.description), tags=(entry.tags||[]).map(normalizeSearch);
 const words=normalized.split(' ').filter(Boolean), all=value=>words.every(word=>value.includes(word));
 let score=0;
 if(name===normalized) score+=120;
 else if(name.includes(normalized)) score+=100;
 if(tags.some(tag=>tag===normalized)) score+=50;
 else if(tags.some(tag=>all(tag))) score+=40;
 if(all(description)) score+=20;
 if(all(creator)) score+=10;
 return score;
}
export function filterEntries(entries,state) {
 const words=normalizeSearch(state.q||'').split(/\s+/).filter(Boolean);
 return entries.filter(e=>{
  if(state.official==='hide'&&e.official)return false;
  if(words.length){const searchable=searchIndex(e);if(!words.every(w=>searchable.includes(w)))return false;}
  if(state.mode==='tested'&&!e.recommended)return false;
  if(state.task&&!e.tasks.includes(state.task))return false;
  if(state.platform&&!e.platforms.includes(state.platform))return false;
  if(state.edition==='Free'&&e.requirements.editions.length&&!e.requirements.editions.includes('Free'))return false;
  if(state.resolve&&!matchesVersion(e,state.resolve,state.edition))return false;
  if(state.architecture&&!e.requirements.architectures.includes(state.architecture))return false;
  if(state.processing&&e.requirements.processing!==state.processing)return false;
  if(state.pricing&&e.requirements.pricing!==state.pricing)return false;
  if(state.access&&e.accessGroup!==state.access)return false;
  if(state.evidence==='documented'&&!e.evidence.some(x=>x.level==='documented'))return false;
  if(state.evidence==='creator'&&!e.evidence.some(x=>x.level==='creator'))return false;
  if(state.evidence==='tested'&&!e.evidence.some(x=>x.level==='tested'))return false;
  if(state.evidence==='unknown'&&!e.unknownFields.length)return false;
  return true;
 });
}
export const REQUIREMENT_FILTERS = ['platform','edition','resolve','access','processing','evidence','pricing','architecture'];

// Counts ignore the facet being edited so users can broaden that facet again.
export function facetCounts(entries, state, key, values) {
 const candidates=filterEntries(entries,{...state,[key]:''});
 return Object.fromEntries(values.map(value => [value, filterEntries(candidates, {...state, [key]:value}).length]));
}

export function adaptTaskSelection(entries, state) {
 const scope = {...UNFILTERED, task:state.task, official:state.official};
 const next = {...state}, cleared = [];
 // Preserve search, sorting and mode. Requirements are retained in setup order
 // only when they still describe at least one resource in the new task.
 for(const key of REQUIREMENT_FILTERS) {
  if(!state[key]) continue;
  const candidate = {...scope, [key]:state[key]};
  if(filterEntries(entries, candidate).length) scope[key] = state[key];
  else if(key!=='edition') { next[key] = ''; cleared.push(key); }
 }
 return {state:next, cleared};
}

export function recoveryOptions(entries, state) {
 if(filterEntries(entries,state).length || state.mode==='tested') return [];
 const options = [...REQUIREMENT_FILTERS,'q','official','task'].filter(key=>state[key]).map(key=>({
  key, patch:{[key]:key==='edition'?'Studio':''}, count:filterEntries(entries,{...state,[key]:key==='edition'?'Studio':''}).length
 })).filter(option=>option.count>0).sort((a,b)=>a.count-b.count);
 if(options.length) return options.slice(0,3);
 const taskOnly = {...DEFAULTS,task:state.task,official:state.official,sort:state.sort,mode:state.mode};
 const count = filterEntries(entries,taskOnly).length;
 if(count) return [{key:'taskOnly',patch:taskOnly,count}];
 return [{key:'clear',patch:{...DEFAULTS,sort:state.sort},count:filterEntries(entries,DEFAULTS).length}];
}
export function sortEntries(entries,key='name',query='') {
 const cmp=(a,b)=>a.localeCompare(b,'en',{sensitivity:'base'}),time=x=>Number.isFinite(Date.parse(x))?Date.parse(x):0;
 return [...entries].sort((a,b)=>Number(b.official)-Number(a.official)||(key==='relevance'?searchScore(b,query)-searchScore(a,query):key==='updated'?time(b.releaseDate)-time(a.releaseDate):key==='activity'?time(b.activityDate)-time(a.activityDate):key==='stars'?(b.stars??-1)-(a.stars??-1):key==='creator'?cmp(a.creator,b.creator):key==='type'?cmp(a.category,b.category):0)||cmp(a.name,b.name)||cmp(a.id,b.id));
}
export function relativeDate(value,now=new Date()) {if(!value||!Number.isFinite(Date.parse(value)))return 'Unknown';const days=Math.max(0,Math.floor((+now-Date.parse(value))/86400000));if(!days)return 'Today';const [n,unit]=days<7?[days,'day']:days<30?[Math.floor(days/7),'week']:days<365?[Math.floor(days/30),'month']:[Math.floor(days/365),'year'];return `${n} ${unit}${n===1?'':'s'} back`;}
export function versionText(v) {if(v.kind==='not-applicable')return 'Not applicable';if(!v.version)return 'Version unknown';if(v.kind==='commit')return 'Revision '+v.version.slice(0,12);return v.version+(v.kind==='prerelease'?' (prerelease)':'');}
export function stateFromUrl(search) {const p=new URLSearchParams(search);const s={...DEFAULTS};for(const k of Object.keys(s))if(p.has(k))s[k]=p.get(k).slice(0,250);if(!['Free','Studio'].includes(s.edition))s.edition='Free';return {state:s};}
export function stateToUrl(state) {const p=new URLSearchParams();for(const [k,v]of Object.entries(state))if(k in DEFAULTS&&v!==DEFAULTS[k]&&v)p.set(k,v);return p.toString();}
