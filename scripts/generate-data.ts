import {writeFileSync} from 'node:fs';
import type {Dataset,Project,Jurisdiction,Stage} from '../src/types';
let seed=42; const rand=()=>{seed=(Math.imul(1664525,seed)+1013904223)>>>0;return seed/4294967296};
const day=86400000, date=(n:number)=>new Date(n).toISOString().slice(0,10), add=(s:string,d:number)=>date(Date.parse(s)+d*day);
const places:[string,number,number][]=[['Andhra Pradesh',16.5062,80.648],['Arunachal Pradesh',27.0844,93.6053],['Assam',26.1445,91.7362],['Bihar',25.5941,85.1376],['Chhattisgarh',21.2514,81.6296],['Goa',15.4909,73.8278],['Gujarat',23.0225,72.5714],['Haryana',28.4595,77.0266],['Himachal Pradesh',31.1048,77.1734],['Jharkhand',23.3441,85.3096],['Karnataka',12.2958,76.6394],['Kerala',10.5276,76.2144],['Madhya Pradesh',23.2599,77.4126],['Maharashtra',18.5204,73.8567],['Manipur',24.817,93.9368],['Meghalaya',25.5788,91.8933],['Mizoram',23.7271,92.7176],['Nagaland',25.6751,94.1086],['Odisha',20.2961,85.8245],['Punjab',30.901,75.8573],['Rajasthan',26.9124,75.7873],['Sikkim',27.3314,88.6138],['Tamil Nadu',11.0168,76.9558],['Telangana',17.385,78.4867],['Tripura',23.8315,91.2868],['Uttar Pradesh',26.8467,80.9462],['Uttarakhand',30.3165,78.0322],['West Bengal',22.5726,88.3639],['Andaman & Nicobar Islands',11.6234,92.7265],['Chandigarh',30.7333,76.7794],['Dadra & Nagar Haveli and Daman & Diu',20.3974,72.8328],['Delhi',28.6139,77.209],['Jammu & Kashmir',34.0837,74.7973],['Ladakh',34.1526,77.5771],['Lakshadweep',10.5667,72.6417],['Puducherry',11.9416,79.8083]];
const sectors=['Roads & Bridges','Railways','Urban Transit','Power','Water & Sanitation','Irrigation','Healthcare','Education'];
const names=['Regional bridge & access corridor','Freight connectivity link','City mobility corridor','Regional grid reinforcement','Integrated water supply network','Irrigation and canal rehabilitation','Regional hospital expansion','Public learning campus'];
const ranges=[[50,5000,12,72],[200,15000,24,120],[500,25000,24,120],[100,12000,18,96],[20,4000,12,72],[50,8000,18,96],[20,2000,12,60],[10,1000,9,48]];
const stages:Stage[]=['Mobilization','Early execution','Mid execution','Late execution','Commissioning'];
const dates=['2026-02-28','2026-03-31','2026-04-30','2026-05-31','2026-06-30','2026-07-31','2026-08-31'];
const jurisdictions:Jurisdiction[]=places.map(([name,lat,lon],j)=>({id:`J${j+1}`,name,lat,lon,kind:j<28?'State':'UT'}));
const data:Dataset={version:'pravah-national-1.0',seed:42,jurisdictions,organizations:[],communities:[],projects:[],fixtures:{}};
for(const [j,loc] of jurisdictions.entries()){
  for(const kind of ['agency','contractor','authority'] as const)data.organizations.push({id:`SYN-${kind}-${j}`,name:`${['Samarth Works Office','Nirmaan Engineering Collective','Regional Clearance Desk'][['agency','contractor','authority'].indexOf(kind)]} ${j+1}`,kind});
  for(let c=0;c<10;c++)data.communities.push({id:`C${j}-${c}`,jurisdictionId:loc.id,lat:loc.lat,lon:loc.lon,population:3000+Math.floor(rand()*24000),underserved:c%3!==0,services:[sectors[c%8],sectors[(c+2)%8]]});
  for(let k=0;k<20;k++){
    const n=j*20+k+1,id=`PRV-${String(n).padStart(4,'0')}`,completed=k<10,proposed=k>=18,profile=k-10;
    const si=completed?(j*10+k)%8:(j+k-10)%8,r=ranges[si];
    const cost=Math.round((r[0]+rand()**2*(r[1]-r[0]))*1e7),months=Math.round(r[2]+rand()*(r[3]-r[2]));
    const finish=completed?add('2025-11-30',-Math.floor(rand()*500)):proposed?add('2026-10-01',months*30.44):'2027-01-31';
    const start=add(finish,-months*30.44);
    const p:Project={id,name:`${names[si]} · ${loc.name}`,jurisdictionId:loc.id,sector:sectors[si],scope:['Small','Medium','Large'][n%3] as Project['scope'],terrain:['Plain','Hilly','Mixed'][n%3] as Project['terrain'],life:completed?'Completed':proposed?'Proposed':'Executing',agencyId:`SYN-agency-${j}`,contractorId:`SYN-contractor-${j}`,lat:loc.lat,lon:loc.lon,baselines:[{id:`${id}-B1`,available:completed?add(start,-30):'2026-01-01',approved:completed?add(start,-30):'2026-01-01',start,finish,cost,plan:[]}],reports:[],milestones:[],blockers:[],dependencies:[],landmarks:[],links:[]};
    if(completed){
      const actualFinish=add(finish,Math.floor(rand()*300)),actualStart=start,actualMonths=(Date.parse(actualFinish)-Date.parse(actualStart))/day/30.44;
      p.outcome={start:actualStart,finish:actualFinish,cost:Math.round(cost*(1+rand()*.35)),available:add(actualFinish,2)};
      // Ensure every historical outcome predates the review windows.
      if(p.outcome.available>'2026-06-01'){const shift=(Date.parse(p.outcome.available)-Date.parse('2026-06-01'))/day;p.outcome.finish=add(p.outcome.finish,-shift);p.outcome.start=add(p.outcome.start,-shift);p.outcome.available='2026-06-01';p.baselines[0].start=add(start,-shift);p.baselines[0].finish=add(finish,-shift);p.baselines[0].available=add(start,-shift-30);p.baselines[0].approved=p.baselines[0].available;}
      p.landmarks=stages.map((stage,s)=>{const progress=[5,25,58,85,97][s];const landmark=add(p.outcome!.start,actualMonths*30.44*progress/100);return {stage,date:landmark,available:landmark,progress,velocity:Number((100/actualMonths*(.8+rand()*.4)).toFixed(2)),remaining:(Date.parse(p.outcome!.finish)-Date.parse(landmark))/day/30.44,baselineId:p.baselines[0].id};});
    } else if(!proposed){
      const base=profile===2?40+(j%5)*3:18+(j%5)*4;
      for(let t=0;t<7;t++){
        const gains=profile===0?[0,6,11,15,17,18,18.5]:profile===1?[0,3,6,9,12,15,18]:profile===2?[0,6,12,18,24,30,36]:profile===3?[0,.1,.2,.3,.4,.5,.6]:profile===4?[0,1,2,4,9,16,24]:[0,4,8,12,16,20,24];
        const progress=Number((base+gains[t]).toFixed(1));
        const planned=profile===0?base+t*7:profile===3?base+t*6:profile===4?base+12+t*3:progress+(profile===1?7:2);
        p.baselines[0].plan.push({date:dates[t],progress:Math.min(98,planned)});
        const delay=profile===0?30+t*25:profile===1?90:profile===2?0:profile===3?210+t*8:profile===4?180-t*20:profile===6?45:10;
        const ratio=profile===0?1.03+t*.032:profile===3?1.30+t*.015:profile===4?1.20-t*.015:profile===6?1.15:1.02;
        const spending=Math.round(cost*progress/100*.92);
        p.reports.push({date:dates[t],available:dates[t],progress:profile===5&&t===6?null:progress,spending,estimate:Math.round(cost*ratio),finish:add(finish,delay),released:Math.round(cost*(profile===6?.28:.65)),commitments:profile===6?[]:[{id:`${id}-F1`,amount:Math.round(cost*.6),due:'2026-11-01',available:'2026-01-01'}]});
      }
      if(profile===7){const b={...p.baselines[0],id:`${id}-B2`,available:'2026-08-15',approved:'2026-08-15',finish:'2027-07-31',cost:Math.round(cost*1.15),plan:p.baselines[0].plan.map(x=>({...x,progress:Math.max(0,x.progress-4)}))};p.baselines.push(b);}
    }
    for(let m=0;m<6;m++){
      const due=completed?add(p.outcome!.start,(m+1)*(Date.parse(p.outcome!.finish)-Date.parse(p.outcome!.start))/day/6):['2026-01-15','2026-05-01','2026-07-01','2026-10-01','2026-12-01','2027-01-31'][m];
      p.milestones.push({id:`${id}-M${m+1}`,title:['Mobilization','Land & access handover','Civil works package','Systems installation','Safety review','Commissioning'][m],due,critical:m===1||m===2||m===5,events:completed?[{date:due,available:due,status:'complete',actual:due}]:[{date:'2026-01-01',available:'2026-01-01',status:m===0?'complete':m===1&&[0,3,4].includes(profile)?'blocked':'pending',actual:m===0?'2026-01-01':undefined}]});
    }
    if(!completed&&!proposed&&[0,3,4].includes(profile)){
      const b={id:`${id}-A1`,title:profile===3?'Land handover pending':'Environmental clearance pending',milestoneId:`${id}-M2`,ownerId:`SYN-authority-${j}`,opened:'2025-12-01',available:'2026-01-01',critical:true,estimateDate:'2026-07-01',minDays:90,maxDays:150,events:[{date:'2025-12-01',available:'2026-01-01',status:'open' as const}]};
      p.blockers.push(b);p.dependencies.push({id:`${id}-D1`,from:b.id,to:b.milestoneId,relation:'Approval blocks milestone',blocking:true,available:'2026-01-01'});
      if(profile===4){p.blockers[0].events.push({date:'2026-07-15',available:'2026-07-15',status:'closed'});p.milestones[1].events.push({date:'2026-07-15',available:'2026-07-15',status:'complete',actual:'2026-07-15'});}
    }
    for(let c=0;c<3;c++)p.links.push({communityId:`C${j}-${(k+c)%10}`,service:sectors[si],benefit:`Improved ${['year-round connectivity','freight access','public transport access','power reliability','water service coverage','irrigation coverage','healthcare capacity','learning facilities'][si]} on completion.`});
    if(!completed&&!proposed){for(let m=1;m<6;m++){if(p.blockers.some(b=>b.milestoneId===p.milestones[m].id))continue;const threshold=[0,10,40,75,95,100][m];const hit=p.reports.find(r=>r.progress!=null&&r.progress>=threshold);if(hit)p.milestones[m].events.push({date:hit.date,available:hit.available,status:'complete',actual:hit.date});}}
    data.projects.push(p);
  }
}
data.fixtures={deteriorating:'PRV-0011',delayed:'PRV-0012',healthy:'PRV-0013',stranded:'PRV-0014',recovery:'PRV-0015',missing:'PRV-0016',funding:'PRV-0017',revision:'PRV-0018',proposal:'PRV-0019'};
const linked=data.projects.find(p=>p.id==='PRV-0031')!;
linked.dependencies.push({id:'CROSS-1',from:'PRV-0011',to:linked.milestones[2].id,relation:'Upstream access corridor enables civil works',blocking:true,available:'2026-06-01'});
writeFileSync(new URL('../src/data/dataset.json',import.meta.url),JSON.stringify(data));
console.log(`Synthetic demonstration data: ${data.projects.length} projects, ${data.jurisdictions.length} jurisdictions, ${data.communities.length} communities.`);
