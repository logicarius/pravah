import {data,config,money} from '../data';
import type {Project,Stage,Reference,Analysis,Baseline,Event,Dataset} from '../types';
export const days=(a:string,b:string)=>(Date.parse(a)-Date.parse(b))/86400000;
export const addDays=(s:string,n:number)=>new Date(Date.parse(s)+Math.round(n)*86400000).toISOString().slice(0,10);
export function quantile(v:number[],p:number){if(!v.length)return null;const a=[...v].sort((x,y)=>x-y),i=(a.length-1)*p,l=Math.floor(i);return a[l]+(a[Math.ceil(i)]-a[l])*(i-l)}
export const stageFor=(p:number|null|undefined):Stage|null=>p==null||p>=100?null:p<10?'Mobilization':p<40?'Early execution':p<75?'Mid execution':p<95?'Late execution':'Commissioning';
export const eventAt=(e:Event[],t:string)=>e.filter(x=>x.available<=t&&x.date<=t).sort((a,b)=>a.date.localeCompare(b.date)).at(-1);
export const baselineAt=(p:Project,t:string)=>p.baselines.filter(b=>b.available<=t&&b.approved<=t).sort((a,b)=>a.approved.localeCompare(b.approved)).at(-1);
const duration=(b:Baseline)=>days(b.finish,b.start);
const contiguous=(dates:string[])=>dates.every((d,i)=>i===0||(new Date(d).getUTCFullYear()*12+new Date(d).getUTCMonth())-(new Date(dates[i-1]).getUTCFullYear()*12+new Date(dates[i-1]).getUTCMonth())===1);
export function references(p:Project,t:string,stage:Stage|null,db:Dataset=data){
 const target=baselineAt(p,t);const empty={refs:[] as Reference[],relaxation:'Insufficient comparable projects'};
 if(!target||target.cost<=0||duration(target)<=0||(!stage&&p.life!=='Proposed'))return empty;
 const pool=db.projects.filter(x=>x.id!==p.id&&x.sector===p.sector&&x.life==='Completed'&&x.outcome&&x.outcome.available<=t&&x.outcome.finish<=t).map(x=>{
  const l=x.landmarks.find(y=>y.stage===stage&&y.available<=t&&y.date<=t);const b=p.life==='Proposed'?x.baselines[0]:x.baselines.find(b=>b.id===l?.baselineId);
  if(!b||b.available>t||b.approved>t||b.cost<=0||duration(b)<=0||(p.life!=='Proposed'&&(!l||l.velocity==null||l.velocity<=0||l.remaining<=0)))return null;
  return {x,b,l};
 }).filter(x=>x!==null);
 let candidates=pool.filter(x=>x.x.scope===p.scope&&x.x.terrain===p.terrain),relaxation='Sector, stage, scope & terrain';
 if(candidates.length<5){candidates=pool.filter(x=>x.x.scope===p.scope);relaxation='Terrain relaxed · sector, stage & scope retained'}
 if(candidates.length<5){candidates=pool;relaxation='Scope & terrain relaxed · sector × stage retained'}
 if(candidates.length<5)return empty;
 candidates.sort((a,b)=>Math.abs(Math.log(a.b.cost/target.cost))-Math.abs(Math.log(b.b.cost/target.cost))||Math.abs(duration(a.b)-duration(target))-Math.abs(duration(b.b)-duration(target))||a.x.id.localeCompare(b.x.id));
 return {relaxation,refs:candidates.slice(0,15).map(({x,b,l})=>({id:x.id,duration:days(x.outcome!.finish,x.outcome!.start),remaining:l?l.remaining*duration(target)/duration(b):null,velocity:l?.velocity??null}))};
}
export function hasCycle(edges:{from:string;to:string}[]){const active=new Set<string>(),done=new Set<string>();function visit(n:string):boolean{if(active.has(n))return true;if(done.has(n))return false;active.add(n);for(const e of edges.filter(e=>e.from===n))if(visit(e.to))return true;active.delete(n);done.add(n);return false}return edges.some(e=>visit(e.from))}
export function analyze(p:Project,cutoff:string,targetInput='',db:Dataset=data):Analysis {
 const baseline=baselineAt(p,cutoff);
 if(!baseline||baseline.cost<=0||duration(baseline)<=0)throw Error('No valid approved baseline is available at this cutoff.');
 const reports=p.reports.filter(r=>r.date<=cutoff&&r.available<=cutoff).sort((a,b)=>a.date.localeCompare(b.date));const report=reports.at(-1);
 const current=!!report&&report.date===cutoff&&report.progress!=null&&Number.isFinite(report.progress)&&report.progress>=0&&report.progress<100;
 const stage=stageFor(report?.progress);const {refs,relaxation}=references(p,cutoff,stage,db);
 const limitations:string[]=[];const original=p.baselines[0];
 const rows=reports.map(r=>{const b=baselineAt(p,r.date);return {date:r.date,actual:r.progress,planned:b?.plan.find(x=>x.date===r.date)?.progress??null,delay:b&&r.finish?Math.max(0,days(r.finish,b.finish)):null,cost:b&&r.estimate!=null&&r.estimate>=r.spending?(r.estimate/b.cost-1)*100:null}});
 const recent=rows.slice(-3),last=rows.at(-1),shortfall=last?.actual!=null&&last?.planned!=null?last.planned-last.actual:null;
 const reportedDelay=report?.finish?Math.max(0,days(report.finish,baseline.finish)):null,originalDelay=report?.finish?Math.max(0,days(report.finish,original.finish)):null;
 const overrun=report?.estimate!=null&&report.estimate>=report.spending?(report.estimate/baseline.cost-1)*100:null;
 const baselineChanged=recent.length>0&&p.baselines.some(b=>b.available>recent[0].date&&b.available<=cutoff);
 const trendOK=current&&recent.length===3&&contiguous(recent.map(r=>r.date))&&!baselineChanged;
 if(baselineChanged)limitations.push('Baseline changed within the trend window; affected deterioration trends are suppressed.');
 if(!current&&p.life==='Executing')limitations.push(report?.progress===100?'Awaiting completion confirmation.':'Current-month physical progress is missing. Current trajectory and forecasts are suppressed.');
 if(refs.length<5&&p.life!=='Completed')limitations.push('Fewer than five eligible sector × stage references. Reference-based outputs are unavailable.');
 const brr=p.life==='Proposed'&&refs.length>=5?duration(baseline)/quantile(refs.map(r=>r.duration),.5)!:null;
 const historicalMedian=quantile(refs.map(r=>r.duration),.5);
 let method='Not available';const scenarios:Analysis['scenarios']=[];const four=reports.slice(-4);
 const correction=four.some((r,i)=>i>0&&r.progress!=null&&four[i-1].progress!=null&&r.progress<four[i-1].progress!);
 if(correction)limitations.push('A negative physical-progress correction invalidates this trend.');
 if(current&&!correction&&p.life==='Executing'){
  const gains=four.length===4&&contiguous(four.map(r=>r.date))&&four.every(r=>r.progress!=null)?four.slice(1).map((r,i)=>r.progress!-four[i].progress!):[];
  let months:number[]=[];
  if(gains.length===3&&gains.every(g=>g>config.minVelocity)){method='Recent progress · constant-rate scenarios';months=[Math.max(...gains),quantile(gains,.5)!,Math.min(...gains)].map(rate=>(100-report!.progress!)/rate)}
  else if(refs.length>=5){method='Historical comparison · matched stage';months=[.25,.5,.75].map(q=>quantile(refs.map(r=>r.remaining!).filter(x=>x!=null),q)!);limitations.push('Historical fallback does not fully account for current stalled work.')}
  if(months.some(m=>!Number.isFinite(m)||m>1200)){months=[];method='Not estimable';limitations.push('The projected duration exceeds the useful demonstration range.');}
  const validCost=report!.estimate!=null&&report!.estimate>=report!.spending&&reportedDelay!=null;
  months.forEach((m,i)=>{const finish=addDays(cutoff,m*30.44),delay=Math.max(0,days(finish,baseline.finish));const extra=validCost?baseline.cost*config.costRates[i]*Math.max(0,(delay-reportedDelay!)/30.44):null;const final=extra!=null?report!.estimate!+extra:null;scenarios.push({name:['Faster','Central','Slower'][i],months:m,finish,delay,extraCost:extra,finalCost:final,exposure:final!=null?Math.max(0,final-baseline.cost):null})});
 }
 if(report?.estimate!=null&&report.estimate<report.spending)limitations.push('Reported final cost is below spending; cost and funding checks are suppressed.');
 const activeBlockers=p.blockers.filter(b=>b.available<=cutoff&&b.opened<=cutoff&&eventAt(b.events,cutoff)?.status==='open');
 const blockers:Analysis['blockers']=activeBlockers.map(b=>{const valid=b.minDays!=null&&b.maxDays!=null&&b.estimateDate<=cutoff&&addDays(b.estimateDate,b.maxDays)>=cutoff;return {blocker:b,owner:db.organizations.find(o=>o.id===b.ownerId)?.name??'Owner not assigned',min:valid?Math.max(0,days(addDays(b.estimateDate,b.minDays!),cutoff)):null,max:valid?Math.max(0,days(addDays(b.estimateDate,b.maxDays!),cutoff)):null,milestone:p.milestones.find(m=>m.id===b.milestoneId),earlySlack:null,lateSlack:null}});
 const intervention=blockers.filter(b=>b.blocker.critical&&b.blocker.ownerId&&b.milestone?.critical).sort((a,b)=>a.milestone!.due.localeCompare(b.milestone!.due)||a.blocker.id.localeCompare(b.blocker.id))[0];
 let status:Analysis['status']=p.life==='Proposed'?'Proposed':p.life==='Completed'?'Completed':'Unassessed';
 const seven=reports.slice(-7);const stranded=current&&seven.length===7&&contiguous(seven.map(r=>r.date))&&seven.every(r=>r.progress!=null)&&seven.every((r,i)=>!i||r.progress!>=seven[i-1].progress!)&&seven[6].progress!-seven[0].progress!<=1&&blockers.some(b=>b.blocker.critical&&days(cutoff,b.blocker.opened)>=180);
 const worsening=(values:(number|null)[],threshold:number)=>values.length===3&&values.every(v=>v!=null)&&values[1]!>values[0]!&&values[2]!>values[1]!&&values[2]!-values[0]!>=threshold;
 const shortfalls=recent.map(r=>r.actual!=null&&r.planned!=null?r.planned-r.actual:null);
 const domains=trendOK?[worsening(shortfalls,5),worsening(recent.map(r=>r.delay),30),worsening(recent.map(r=>r.cost),5)].filter(Boolean).length:0;
 if(p.life==='Executing'&&current&&!correction){if(stranded)status='Stranded';else if(domains>=2)status='Deteriorating';else if((reportedDelay??0)>30||(scenarios[1]?.delay??0)>30)status='Delayed';else if(trendOK&&shortfalls.every(x=>x!=null)&&recent.every(r=>r.cost!=null&&r.delay!=null)&&shortfall!=null&&shortfall<10&&overrun!=null&&overrun<25&&scenarios[1]&&scenarios[1].delay<=30&&!blockers.some(b=>b.blocker.critical&&b.milestone&&b.milestone.due<cutoff))status='On Track';}
 if(p.life==='Executing'&&seven.length<7)limitations.push('Six-month inactivity check unavailable for this review.');
 let crossEarly:number|null=null,crossLate:number|null=null,timing='No sustained worsening trend',partialTiming=false;
 const breached=current&&((reportedDelay!=null&&reportedDelay>=180)||(overrun!=null&&overrun>=25));
 if(breached){crossEarly=0;crossLate=0;timing='Critical threshold already breached'}
 else if(trendOK){const times:{fast:number;slow:number}[]=[];for(const [v,threshold] of [[recent.map(r=>r.delay),180],[recent.map(r=>r.cost),25]] as [(number|null)[],number][]){if(v.some(x=>x==null)){partialTiming=true;continue}const a=v[1]!-v[0]!,b=v[2]!-v[1]!;if(a>0&&b>0)times.push({fast:(threshold-v[2]!)/Math.max(a,b),slow:(threshold-v[2]!)/Math.min(a,b)})}
  if(times.length){const e=Math.min(...times.map(t=>t.fast)),l=Math.min(...times.map(t=>t.slow));crossEarly=e<=12?Math.max(0,e):null;crossLate=l<=12?Math.max(0,l):null;timing=crossEarly==null?'Not reached within the 12-month scenario':crossLate==null?'Later crossing beyond 12-month horizon':'Threshold crossing scenario';}
 }else timing=current?'Insufficient consistent trend history':'Current report unavailable';
 partialTiming ||= reportedDelay==null||overrun==null;
 blockers.forEach(b=>{b.earlySlack=crossEarly!=null&&b.max!=null?crossEarly-b.max/30.44:null;b.lateSlack=crossLate!=null&&b.min!=null?crossLate-b.min/30.44:null});
 const slacks=blockers.filter(b=>b.blocker.critical&&b.blocker.ownerId&&b.earlySlack!=null).map(b=>b.earlySlack!);const slack=slacks.length?Math.min(...slacks):null;
 let queue:Analysis['queue']='Needs evidence';if(breached||(slack!=null&&slack<=0))queue='Immediate review';else if(!partialTiming&&slack!=null&&!blockers.some(b=>b.blocker.critical&&(b.max==null||!b.blocker.ownerId)))queue=slack<=3?'Early action':'Routine review';
 const target=targetInput|| (baseline.finish>cutoff?baseline.finish:'');const targetMonths=target>cutoff?days(target,cutoff)/30.44:null;
 const required=current&&targetMonths?(100-report!.progress!)/targetMonths:null;const benchmark=refs.length>=5?quantile(refs.map(r=>r.velocity).filter((x):x is number=>x!=null&&x>0),.75):null;
 const costValid=current&&report?.estimate!=null&&report.estimate>=report.spending;
 const need=costValid?Math.max(0,report!.estimate!-report!.spending):null;
 const available=costValid&&targetMonths?Math.max(0,report!.released-report!.spending)+report!.commitments.filter(c=>c.available<=cutoff&&c.due<=target).reduce((s,c)=>s+c.amount,0):null;
 const critical=blockers.filter(b=>b.blocker.critical);
 const checks:Analysis['feasibility']['checks']=[{name:'Required work rate',state:required==null||benchmark==null?'Unknown':required<=benchmark?'Pass':'Fail',detail:required==null?'A current report and future recovery target are needed.':`${required.toFixed(3)} points/month required · reference P75 ${benchmark?.toFixed(3)??'unavailable'}`},{name:'Critical blockers',state:!current||!targetMonths?'Unknown':critical.some(b=>b.max!=null&&addDays(cutoff,b.max)>target)?'Fail':critical.some(b=>b.max==null||!b.blocker.ownerId)?'Unknown':'Pass',detail:!critical.length?'No open critical blockers.':`${critical.length} open · maximum resolution dates checked against target`},{name:'Funding coverage',state:need==null||available==null?'Unknown':available>=need?'Pass':'Fail',detail:need==null?'Consistent spending and final-cost estimate needed.':`${money(need)} remaining need · ${money(available)} available by target`}];
 const feasibility={target,label:!targetMonths?'Needs target date':checks.some(c=>c.state==='Fail')?'Challenging':checks.some(c=>c.state==='Unknown')?'Needs evidence':'Supported',checks};
 const warnings:Analysis['warnings']=[];
 for(let i=1;i<rows.length;i++){const a=rows[i-1],b=rows[i];if(contiguous([a.date,b.date])&&a.actual!=null&&a.planned!=null&&b.actual!=null&&b.planned!=null&&a.planned-a.actual>=10&&b.planned-b.actual>=10&&!warnings.some(w=>w.kind==='Progress'))warnings.push({title:'Physical progress fell at least 10 points behind plan',date:a.date,detected:b.date,kind:'Progress'});if(i>=2){const window=rows.slice(i-2,i+1);if(contiguous(window.map(x=>x.date))&&worsening(window.map(x=>x.delay),30)&&!p.baselines.some(x=>x.available>window[0].date&&x.available<=b.date)&&!warnings.some(w=>w.kind==='Schedule'))warnings.push({title:'Reported schedule delay increased by at least 30 days',date:window[1].date,detected:b.date,kind:'Schedule'});}}
 for(const m of p.milestones){const ev=eventAt(m.events,cutoff);if(m.critical&&ev&&ev.status!=='complete'&&days(cutoff,m.due)>=30)warnings.push({title:`${m.title} is overdue`,date:addDays(m.due,30),detected:ev.available>addDays(m.due,30)?ev.available:addDays(m.due,30),kind:'Milestone'});}
 warnings.sort((a,b)=>a.date.localeCompare(b.date));
 const edges=p.dependencies.filter(e=>e.available<=cutoff&&e.blocking),cycle=hasCycle(edges);const pathNodes:string[]=[];
 if(intervention&&edges.some(e=>e.from===intervention.blocker.id&&e.to===intervention.milestone?.id)){pathNodes.push(intervention.blocker.title,intervention.milestone!.title)}
 if(shortfall!=null&&shortfall>=10)pathNodes.push(`Progress ${shortfall.toFixed(1)} points behind plan`);if(reportedDelay!=null&&reportedDelay>0)pathNodes.push(`${Math.round(reportedDelay)} days reported delay`);if(scenarios[2]?.exposure!=null&&scenarios[2].exposure!>0)pathNodes.push(`${money(scenarios[2].exposure)} slower-scenario exposure`);
 const communities=db.communities.filter(c=>p.links.some(l=>l.communityId===c.id));const clusters=new Set(p.links.flatMap(l=>{const c=communities.find(x=>x.id===l.communityId);return c?[`${l.service}:${Math.floor(c.lat/.5)}:${Math.floor(c.lon/.5)}`]:[]})).size;
 return {project:p,cutoff,baseline,report,current,stage,status,queue,method,scenarios,references:refs,relaxation,brr,historicalMedian,shortfall,reportedDelay,originalDelay,overrun,crossEarly,crossLate,timing,partialTiming,blockers,slack,intervention,feasibility,warnings,limitations,population:communities.reduce((s,c)=>s+c.population,0),underserved:communities.filter(c=>c.underserved).length,communities,clusters,rows,cycle,pathNodes:pathNodes.slice(0,6),omitted:Math.max(0,pathNodes.length-6)};
}

