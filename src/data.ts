import raw from './data/dataset.json';
import type {Dataset} from './types';
export const data=raw as Dataset;
export const sectors=[...new Set(data.projects.map(p=>p.sector))];
export const config={version:'demo-rules-2.3',delayThreshold:180,costThreshold:25,costRates:[.00125,.0025,.005],monthDays:30.44,minReferences:5,maxReferences:15,minVelocity:.25};
export const compactMoney=(v:number)=>v>=1e12?`₹${(v/1e12).toLocaleString('en-IN',{maximumFractionDigits:2})} lakh cr`:money(v);
export const money=(v:number|null|undefined)=>v==null?'Not available':`₹${(v/1e7).toLocaleString('en-IN',{maximumFractionDigits:1})} cr`;
export const num=(v:number)=>v.toLocaleString('en-IN');
export const prettyDate=(v:string)=>new Date(v+'T00:00:00Z').toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric',timeZone:'UTC'});
