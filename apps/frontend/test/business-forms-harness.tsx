// Local browser-component fixture only. This entry is not part of the production build.
import React,{useState} from 'react';
import {createRoot} from 'react-dom/client';
import {CreateDrawer,DetailDrawer,modules,availableWorkflowActions} from '../src/core-grc.js';
import {businessForms} from '../src/business-forms.js';
import {ApiClient} from '../src/api-client.js';
import {TenantTimezoneContext} from '../src/tenant-timezone.js';
import '../src/styles.css';
const params=new URLSearchParams(location.search),form=businessForms.find(f=>f.id===params.get('form'))!;
const definition=modules.find(module=>module.id===form.module)!;
const id='018f47f2-6170-7bd0-9d43-12f644a2b111';
const api=new ApiClient(location.origin,{getAccessToken:async()=> 'component-test-only',clearSession:async()=>{}},()=>({tenantId:id}));
api.uploadEvidenceFile=async()=> '018f47f2-6170-7bd0-9d43-12f644a2b113'; // Stub only the already-accepted STEP6A3 transfer pipeline.
const suffix=form.path.split(':').at(-1),isCreate=!form.path.includes('{id}');
const states=['draft','submitted','not_assessed','in_progress','assessed','planned','completed','reviewed','under_review','approved','open','triaged','remediation_in_progress','pending_verification','pending','in_review'];
const state=states.find(lifecycle_state=>availableWorkflowActions(definition,{lifecycle_state,versions:[{lifecycle_state}]}).some(a=>a.suffix===suffix));
const identity:Record<string,Record<string,unknown>>={
 cumplimiento:{applicability_decision:'applicable',applicability_version:1},
 requisitos:{result_status:'insufficient_data',domain_conclusion:'insufficient_evidence'},
 soa:{title:'Declaración de aplicabilidad de prueba',soa_version:1},
 controles:{control_code:'CTL-COMPONENT',name:'Control de prueba'},
 'evaluaciones-control':{result_status:'insufficient_data',domain_conclusion:'insufficient_evidence'},
 pruebas:{test_code:'TEST-COMPONENT'},
 'solicitudes-evidencia':{request_code:'SOL-COMPONENT',control_id:id},
 evidencias:{evidence_code:'EV-COMPONENT',versions:[{evidence_version_id:id,row_version:3,lifecycle_state:state}]},
 retencion:{policy_code:'RET-COMPONENT',policy_kind:'tenant_policy',version_number:1,is_mandatory:false},
 issues:{issue_code:'HALL-COMPONENT',title:'Hallazgo de prueba'},
 acciones:{action_code:'ACC-COMPONENT',title:'Acción de prueba'}
};
const row={ [definition.idField]:id,row_version:3,lifecycle_state:state,...identity[definition.id],contract_provenance:[] };
(window as any).__formRow=row;
function Harness(){const [open,setOpen]=useState(false),[result,setResult]=useState('');return <TenantTimezoneContext.Provider value="America/Santiago"><button onClick={()=>{setOpen(true);setResult('');}}>Abrir formulario</button><p role="status">{result}</p>{open&&(isCreate?<CreateDrawer api={api} definition={definition} close={()=>setOpen(false)} completed={()=>{setResult('Operación completada');setOpen(false);}}/>:<DetailDrawer api={api} definition={definition} row={row} allowAction={a=>params.get('deny')!=='yes'&&a.suffix===suffix} close={()=>setOpen(false)} completed={()=>{setResult('Operación completada');setOpen(false);}}/>)}</TenantTimezoneContext.Provider>;}
createRoot(document.getElementById('root')!).render(<Harness/>);
