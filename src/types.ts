export type Life = 'Completed'|'Executing'|'Proposed';
export type Stage = 'Mobilization'|'Early execution'|'Mid execution'|'Late execution'|'Commissioning';
export type Status = 'On Track'|'Delayed'|'Deteriorating'|'Stranded'|'Unassessed'|'Proposed'|'Completed';
export type Queue = 'Immediate review'|'Early action'|'Routine review'|'Needs evidence';
export interface Jurisdiction {id:string;name:string;lat:number;lon:number;kind:'State'|'UT'}
export interface Organization {id:string;name:string;kind:'agency'|'contractor'|'authority'}
export interface Baseline {id:string;available:string;approved:string;start:string;finish:string;cost:number;plan:{date:string;progress:number}[]}
export interface Commitment {id:string;amount:number;due:string;available:string}
export interface Report {date:string;available:string;progress:number|null;spending:number;estimate:number|null;finish:string|null;released:number;commitments:Commitment[]}
export interface Event {date:string;available:string;status:'open'|'closed'|'blocked'|'complete'|'pending';actual?:string}
export interface Milestone {id:string;title:string;due:string;critical:boolean;events:Event[]}
export interface Blocker {id:string;title:string;milestoneId:string;ownerId:string|null;opened:string;available:string;critical:boolean;estimateDate:string;minDays:number|null;maxDays:number|null;events:Event[]}
export interface Dependency {id:string;from:string;to:string;relation:string;blocking:boolean;available:string}
export interface Landmark {stage:Stage;date:string;available:string;progress:number;velocity:number|null;remaining:number;baselineId:string}
export interface Community {id:string;jurisdictionId:string;lat:number;lon:number;population:number;underserved:boolean;services:string[]}
export interface ServiceLink {communityId:string;service:string;benefit:string}
export interface Project {id:string;name:string;jurisdictionId:string;sector:string;scope:'Small'|'Medium'|'Large';terrain:'Plain'|'Hilly'|'Mixed';life:Life;agencyId:string;contractorId:string;lat:number;lon:number;baselines:Baseline[];reports:Report[];milestones:Milestone[];blockers:Blocker[];dependencies:Dependency[];landmarks:Landmark[];outcome?:{start:string;finish:string;cost:number;available:string};links:ServiceLink[]}
export interface Dataset {version:string;seed:number;jurisdictions:Jurisdiction[];organizations:Organization[];communities:Community[];projects:Project[];fixtures:Record<string,string>}
export interface Scenario {name:string;months:number;finish:string;delay:number;extraCost:number|null;finalCost:number|null;exposure:number|null}
export interface Reference {id:string;duration:number;remaining:number|null;velocity:number|null}
export interface BlockerView {blocker:Blocker;owner:string;min:number|null;max:number|null;milestone:Milestone|undefined;earlySlack:number|null;lateSlack:number|null}
export interface Analysis {project:Project;cutoff:string;baseline:Baseline;report:Report|undefined;current:boolean;stage:Stage|null;status:Status;queue:Queue;method:string;scenarios:Scenario[];references:Reference[];relaxation:string;brr:number|null;historicalMedian:number|null;shortfall:number|null;reportedDelay:number|null;originalDelay:number|null;overrun:number|null;crossEarly:number|null;crossLate:number|null;timing:string;partialTiming:boolean;blockers:BlockerView[];slack:number|null;intervention:BlockerView|undefined;feasibility:{label:string;checks:{name:string;state:'Pass'|'Fail'|'Unknown';detail:string}[];target:string};warnings:{title:string;date:string;detected:string;kind:string}[];limitations:string[];population:number;underserved:number;communities:Community[];clusters:number;rows:{date:string;actual:number|null;planned:number|null;delay:number|null;cost:number|null}[];cycle:boolean;pathNodes:string[];omitted:number}
export interface Brief {id:string;projectId:string;projectName:string;cutoff:string;created:string;datasetVersion:string;configVersion:string;target:string;snapshot:{status:string;queue:string;method:string;delay:string;cost:string;window:string;path:string[];checks:Analysis['feasibility']['checks'];population:number;limitations:string[];owner:string;action:string;change:string}}
export interface Decision {id:string;briefId:string;action:string;owner:string;due:string;rationale:string;created:string}
export interface Followup {id:string;decisionId:string;note:string;observed:string;created:string}
export interface Workspace {version:1;briefs:Brief[];decisions:Decision[];followups:Followup[]}
