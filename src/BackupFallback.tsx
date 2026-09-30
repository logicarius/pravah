import {useState,useRef} from 'react';
import type {Workspace} from './types';
export default function BackupFallback({workspace,onRestore}:{workspace:Workspace;onRestore:(text:string)=>void}){
 const [text,setText]=useState('');const output=useRef<HTMLTextAreaElement>(null);
 return <details className="card backup-fallback"><summary>Backup text alternative</summary><div className="padded"><p>If this browser blocks file downloads or the file picker, copy and restore your backup here.</p><p>{workspace.briefs.length} briefs · {workspace.decisions.length} decisions · {workspace.followups.length} follow-ups</p><label>Current backup text<textarea ref={output} readOnly value={JSON.stringify(workspace,null,2)} rows={5}/></label><button className="secondary" onClick={()=>{output.current?.focus();output.current?.select()}}>Select backup text</button><form onSubmit={e=>{e.preventDefault();onRestore(text)}}><label>Paste backup to restore<textarea required maxLength={5000000} value={text} onChange={e=>setText(e.target.value)} rows={5}/></label><button type="submit">Restore backup text</button></form></div></details>
}
