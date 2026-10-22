import {useEffect,useState} from 'react';
import {ApiProblem} from './api-client.js';
import type {ApiClient} from './api-client.js';
import {callLibrary,type LibraryCall} from './normative-library-client.js';
import {KnowledgeContentView} from './normative-library.js';
export function useLibraryRead(api:ApiClient,call:Pick<LibraryCall,'operationId'|'params'|'query'>,revision=0){
 const context=JSON.stringify([api.currentTenantId(),call,revision]);
 const [state,setState]=useState<{context:string;status:'loading'|'error'|'ready';body?:unknown;etag?:string|null;httpStatus?:number}>({context,status:'loading'});
 useEffect(()=>{const controller=new AbortController();setState({context,status:'loading'});void callLibrary(api,{...call,signal:controller.signal}).then(result=>{if(!controller.signal.aborted)setState({context,status:'ready',...result});}).catch(error=>{if(!controller.signal.aborted)setState({context,status:'error',...(error instanceof ApiProblem?{httpStatus:error.status}:{})});});return()=>controller.abort();},[api,context]);
 return state.context===context?state:{context,status:'loading' as const};
}
/** Prepared connection to the existing approved content presentation; no new navigation/module activation. */
export function ConnectedKnowledgeContent({api,versionId,platform=false}:{api:ApiClient;versionId:string;platform?:boolean}){
 const state=useLibraryRead(api,{operationId:platform?'platformKnowledgeVersionGet':'knowledgeVersionGet',params:{id:versionId}});
 if(state.status==='loading')return <p role="status">Cargando contenido autorizado…</p>;
 if(state.status==='error')return <p role="alert">Contenido no disponible con el acceso o las dependencias actuales.</p>;
 return <KnowledgeContentView projection={(state.body as {result:unknown}).result}/>;
}
