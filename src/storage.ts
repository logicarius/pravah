import type {Workspace,Brief,Analysis} from './types';
import {data,config,money} from './data';
export const emptyWorkspace=():Workspace=>({version:1,briefs:[],decisions:[],followups:[]});
const key='pravah-workspace-v1';
const isString=(x:unknown)=>typeof x==='string';
const validDate=(x:string)=>/^\d{4}-\d{2}-\d{2}$/.test(x)&&Number.isFinite(Date.parse(x))&&new Date(x+'T00:00:00Z').toISOString().slice(0,10)===x;
export function validateWorkspace(raw:unknown):Workspace {
 const w=raw as Workspace;
 if(!w||w.version!==1||!Array.isArray(w.briefs)||!Array.isArray(w.decisions)||!Array.isArray(w.followups))throw Error('This file is not a supported PRAVAH backup.');
 if(w.briefs.length+w.decisions.length+w.followups.length>10000)throw Error('Backup is too large for this local workspace.');
 const ids=new Set<string>();const unique=(id:string)=>{if(!isString(id)||!id||ids.has(id))throw Error('Backup contains duplicate or invalid record IDs.');ids.add(id)};
 for(const b of w.briefs){unique(b.id);if(![b.projectId,b.projectName,b.cutoff,b.created,b.datasetVersion,b.configVersion,b.target].every(isString)||!b.snapshot)throw Error('A brief is incomplete.');const s=b.snapshot;if(![s.status,s.queue,s.method,s.delay,s.cost,s.window,s.owner,s.action,s.change].every(isString)||!Array.isArray(s.path)||!s.path.every(isString)||!Array.isArray(s.limitations)||!s.limitations.every(isString)||!Number.isFinite(s.population)||s.population<0||!Array.isArray(s.checks)||!s.checks.every(c=>isString(c.name)&&isString(c.detail)&&['Pass','Fail','Unknown'].includes(c.state)))throw Error('A brief snapshot is invalid.');}
 for(const d of w.decisions){unique(d.id);if(![d.briefId,d.action,d.owner,d.due,d.rationale,d.created].every(isString)||!w.briefs.some(b=>b.id===d.briefId))throw Error('A decision is invalid or refers to a missing brief.');}
 for(const f of w.followups){unique(f.id);if(![f.decisionId,f.note,f.observed,f.created].every(isString)||!w.decisions.some(d=>d.id===f.decisionId))throw Error('A follow-up is invalid or refers to a missing decision.');}
 for(const b of w.briefs){if(!validDate(b.cutoff)||(b.target&&!validDate(b.target))||!Number.isFinite(Date.parse(b.created)))throw Error('A brief contains invalid dates.');}
 for(const d of w.decisions){const b=w.briefs.find(b=>b.id===d.briefId)!;if(!d.action.trim()||!d.owner.trim()||!d.rationale.trim()||!validDate(d.due)||d.due<b.cutoff||!Number.isFinite(Date.parse(d.created)))throw Error('A decision needs an owner, rationale and valid due date.');}
 for(const f of w.followups){const d=w.decisions.find(d=>d.id===f.decisionId)!;const b=w.briefs.find(b=>b.id===d.briefId)!;if(!f.note.trim()||!validDate(f.observed)||f.observed<b.cutoff||!Number.isFinite(Date.parse(f.created)))throw Error('A follow-up contains an invalid observation date or note.');}
 return w;
}
export function readWorkspace(){const raw=localStorage.getItem(key);return raw?validateWorkspace(JSON.parse(raw)):emptyWorkspace()}
export function writeWorkspace(w:Workspace){validateWorkspace(w);localStorage.setItem(key,JSON.stringify(w))}
export function download(value:unknown,name:string){const url=URL.createObjectURL(new Blob([JSON.stringify(value,null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000)}
export const windowText=(a:Analysis)=>a.slack==null?(a.crossEarly===0?'Threshold already breached':'No blocker-specific estimate'):a.slack<=0?'No modeled slack':`${a.slack.toFixed(1)} months to begin action`;
export function makeBrief(a:Analysis,change:string):Brief{return {id:crypto.randomUUID(),projectId:a.project.id,projectName:a.project.name,cutoff:a.cutoff,created:new Date().toISOString(),datasetVersion:data.version,configVersion:config.version,target:a.feasibility.target,snapshot:{status:a.status,queue:a.queue,method:a.method,delay:a.scenarios.length?`${Math.round(a.scenarios[0].delay)}–${Math.round(a.scenarios[2].delay)} days`:'Not available',cost:a.scenarios.length?`${money(a.scenarios[0].exposure)} – ${money(a.scenarios[2].exposure)}`:'Not available',window:windowText(a),path:a.pathNodes,checks:a.feasibility.checks,population:a.population,limitations:a.limitations,owner:a.intervention?.owner??'Owner/action needs clarification',action:a.intervention?'Convene the responsible authority and confirm a dated resolution plan.':'Review the evidence and assign the next review action.',change}}}
export function mergeWorkspace(current:Workspace,incoming:Workspace,copyConflicts:boolean){
 validateWorkspace(current);validateWorkspace(incoming);
 const out:Workspace=JSON.parse(JSON.stringify(current));const maps=new Map<string,string>();
 const globalIds=new Set([...current.briefs,...current.decisions,...current.followups].map(x=>x.id));
 for(const type of ['briefs','decisions','followups'] as const){for(const item of incoming[type]){
  const copy=JSON.parse(JSON.stringify(item));
  if(type==='decisions')copy.briefId=maps.get(copy.briefId)??copy.briefId;
  if(type==='followups')copy.decisionId=maps.get(copy.decisionId)??copy.decisionId;
  const existing=(out[type] as {id:string}[]).find(x=>x.id===item.id);
  if(existing&&JSON.stringify(existing)===JSON.stringify(copy)){maps.set(item.id,item.id);continue;}
  if(globalIds.has(item.id)){
   if(!existing)throw Error('An incoming ID conflicts with a different record type.');
   if(!copyConflicts){maps.set(item.id,item.id);continue;}
   copy.id=crypto.randomUUID();
  }
  maps.set(item.id,copy.id);globalIds.add(copy.id);(out[type] as unknown[]).push(copy);
 }}return validateWorkspace(out);
}

