import { useEffect, useId, useRef, useState } from "react";
import { ApiClient, ApiProblem } from "./api-client.js";

export const centralOnboardingCode="platform.tenant_user.onboard";
const membershipRead="platform.membership.read",tenantRead="platform.tenant.read",roleRead="platform.role.read";
type Page<T>={items:T[];page:{has_more:boolean;next_cursor:string|null}};
export type CompanyOption={tenant_id:string;display_name:string;tenant_code:string;lifecycle_state:string};
export type TenantRoleOption={role_id:string;role_code:string;name:string;tenant_id:string;ownership_class:string;lifecycle_state:string};
export type CompanyAccess={tenant_membership_id:string;tenant_id:string;user_identity_id:string;membership_state:string;joined_at:string;ended_at:string|null;
  tenant:{display_name:string;tenant_code:string;lifecycle_state:string};
  roles:{membership_role_id:string;role_id:string;role_code:string;role_name:string;scope_kind:string;valid_from:string;valid_to:string|null;etag:string}[]};
export type CentralProgress={tenant_id:string;user_identity_id:string;membership_id:string;completed_roles:{role_code:string;membership_role_id:string}[];pending_role_codes:string[]};
async function allPages<T>(api:ApiClient,path:string,signal?:AbortSignal):Promise<T[]>{
  const result:T[]=[],seen=new Set<string>();let cursor:string|null=null;
  do{
    const url=path+(cursor?`${path.includes('?')?'&':'?'}page%5Bcursor%5D=${encodeURIComponent(cursor)}`:'');
    const page:Page<T>=await api.platformGet(url,{cache:'no-store',...(signal?{signal}:{})});
    if(!Array.isArray(page.items)||!page.page||typeof page.page.has_more!=='boolean')throw Error('INVALID_PAGE');
    result.push(...page.items);cursor=page.page.has_more?page.page.next_cursor:null;
    if(page.page.has_more&&(!cursor||seen.has(cursor)))throw Error('INVALID_CURSOR');if(cursor)seen.add(cursor);
  }while(cursor);return result;
}
export async function loadCompanyOptions(api:ApiClient,signal?:AbortSignal){
  const rows=await allPages<CompanyOption>(api,'/api/v1/platform/tenants',signal);
  if(rows.some(r=>!r.tenant_id||typeof r.display_name!=='string'||typeof r.tenant_code!=='string'))throw Error('INVALID_COMPANY');
  return rows.filter(r=>r.lifecycle_state==='active');
}
export async function loadCompanyTenantRoles(api:ApiClient,tenantId:string,signal?:AbortSignal){
  const rows=await allPages<TenantRoleOption>(api,`/api/v1/roles?tenant_id=${encodeURIComponent(tenantId)}`,signal);
  const result=rows.filter(r=>r.ownership_class==='TENANT_OWNED'&&r.tenant_id===tenantId&&r.lifecycle_state==='published');
  if(result.some(r=>!r.role_code||!r.role_id||!r.name||['PLATFORM_ADMIN','PLATFORM_SUPPORT'].includes(r.role_code))
    ||new Set(result.map(r=>r.role_code)).size!==result.length)throw Error('INVALID_TENANT_CATALOG');
  return result;
}
export async function loadCompanyAccess(api:ApiClient,userId:string,signal?:AbortSignal){
  const rows=await allPages<CompanyAccess>(api,`/api/v1/platform/user-identities/${encodeURIComponent(userId)}/tenant-access`,signal);
  if(rows.some(row=>row.user_identity_id!==userId||!row.tenant_id||!row.tenant_membership_id||!row.tenant||!Array.isArray(row.roles)
    ||row.roles.some(r=>['PLATFORM_ADMIN','PLATFORM_SUPPORT'].includes(r.role_code)||!r.etag||!r.membership_role_id)))throw Error('INVALID_COMPANY_ACCESS');
  return rows;
}
function progressFrom(value:unknown,tenantId:string,userId:string):CentralProgress{
  const row=value as CentralProgress;
  if(!row||row.tenant_id!==tenantId||row.user_identity_id!==userId||!row.membership_id||!Array.isArray(row.completed_roles)||!Array.isArray(row.pending_role_codes))throw Error('INVALID_ONBOARDING_RESULT');
  return row;
}
export class CentralTenantUserIntent{
  readonly key=crypto.randomUUID();readonly codes:readonly string[];progress:CentralProgress|null=null;completed=false;private busy=false;
  constructor(readonly tenantId:string,readonly userId:string,codes:readonly string[],readonly reason:string){this.codes=[...codes].sort();}
  async run(api:ApiClient):Promise<CentralProgress>{
    if(this.busy)throw Error('INTENT_IN_PROGRESS');this.busy=true;
    try{
      const value=progressFrom(await api.platformPost(`/api/v1/platform/tenants/${encodeURIComponent(this.tenantId)}/users:onboard`,{
        user_identity_id:this.userId,tenant_role_codes:[...this.codes],reason:this.reason},this.key),this.tenantId,this.userId);
      if(value.pending_role_codes.length||value.completed_roles.length!==this.codes.length
        ||value.completed_roles.some(r=>!this.codes.includes(r.role_code)||!r.membership_role_id))throw Error('INCOMPLETE_RECEIPT');
      this.progress=value;this.completed=true;return value;
    }catch(error){
      if(error instanceof ApiProblem&&error.problem.details?.tenant_user_onboarding_progress){
        this.progress=progressFrom(error.problem.details.tenant_user_onboarding_progress,this.tenantId,this.userId);
      }throw error;
    }finally{this.busy=false;}
  }
}
export function companyAccessError(error:unknown){
  if(error instanceof ApiProblem){
    if(error.status===403)return 'La incorporación requiere permisos vigentes y CORE_PLATFORM habilitado para esta empresa. Revisa su suscripción.';
    if(error.status===401)return 'La sesión terminó. Inicia sesión nuevamente.';
    if(error.status===404)return 'La empresa, identidad o rol no está disponible. Actualiza la lectura.';
    if(error.status===409)return 'Existe un conflicto con el estado actual. Actualiza y continúa la misma incorporación.';
    if(error.status===400||error.status===422)return 'Revisa la empresa, los roles y el motivo ingresados.';
  }return 'No se pudo confirmar el resultado. Actualiza el estado y continúa la misma incorporación.';
}

export function ManagedIdentityTenantAccess({api,userId,permissions,authorizeFresh,intents,optional=false,onBusyChange,onEditingChange}:{
  api:ApiClient;userId:string;permissions:ReadonlySet<string>;authorizeFresh(code:string):Promise<boolean>;intents:Map<string,CentralTenantUserIntent>;
  optional?:boolean;onBusyChange(busy:boolean):void;onEditingChange(editing:boolean):void;
}){
  const canRead=permissions.has(membershipRead),canAdd=[centralOnboardingCode,tenantRead,roleRead,membershipRead].every(code=>permissions.has(code));
  const canRevoke=canRead&&permissions.has('platform.role.assign');
  const [items,setItems]=useState<CompanyAccess[]>([]),[companies,setCompanies]=useState<CompanyOption[]>([]),[roles,setRoles]=useState<TenantRoleOption[]>([]);
  const [loading,setLoading]=useState(canRead),[catalogLoading,setCatalogLoading]=useState(false),[readReady,setReadReady]=useState(false),[catalogReady,setCatalogReady]=useState(false);
  const [open,setOpen]=useState(false),[tenantId,setTenantId]=useState(''),[codes,setCodes]=useState<string[]>([]),[reason,setReason]=useState('');
  const [busy,setBusy]=useState(false),[message,setMessage]=useState(''),[intent,setIntent]=useState<CentralTenantUserIntent|null>(intents.get(userId)??null);
  const [revoke,setRevoke]=useState<{member:CompanyAccess;role:CompanyAccess['roles'][number];key:string;reason:string;confirmed:boolean;submitted:boolean}|null>(null);
  const guard=useRef(false),mounted=useRef(true),epoch=useRef(0),field=useRef<HTMLSelectElement>(null),trigger=useRef<HTMLElement|null>(null),addButton=useRef<HTMLButtonElement>(null);
  const callbacks=useRef({onBusyChange,onEditingChange});callbacks.current={onBusyChange,onEditingChange};const labelId=useId(),feedbackId=useId(),companyLabelId=useId();
  useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;epoch.current++;callbacks.current.onBusyChange(false);callbacks.current.onEditingChange(false);};},[]);
  async function read(signal?:AbortSignal){
    if(!canRead)return false;setLoading(true);
    try{const current=await loadCompanyAccess(api,userId,signal);if(signal?.aborted||!mounted.current)return false;setItems(current);setReadReady(true);return current;}
    catch(error){if(!signal?.aborted&&mounted.current){setReadReady(false);setMessage(companyAccessError(error));}return false;}
    finally{if(!signal?.aborted&&mounted.current)setLoading(false);}
  }
  useEffect(()=>{const controller=new AbortController();if(canRead)void read(controller.signal);else{setItems([]);setReadReady(false);setOpen(false);}return()=>controller.abort();},[api,userId,canRead]);
  useEffect(()=>{if(open)field.current?.focus();callbacks.current.onEditingChange(open||!!revoke);},[open,revoke]);
  async function begin(event:React.MouseEvent<HTMLButtonElement>,company?:CompanyAccess){
    if(!canAdd||guard.current)return;trigger.current=event.currentTarget;setMessage('');setOpen(true);
    const current=intents.get(userId)??null;setIntent(current);setTenantId(current?.tenantId??company?.tenant_id??'');setCodes(current?[...current.codes]:[]);setReason(current?.reason??'');
    try{setCompanies(await loadCompanyOptions(api));}catch(error){setCompanies([]);setMessage(companyAccessError(error));}
  }
  useEffect(()=>{
    const current=++epoch.current,controller=new AbortController();setRoles([]);setCatalogReady(false);
    if(!open||!tenantId||!canAdd)return()=>controller.abort();setCatalogLoading(true);
    void loadCompanyTenantRoles(api,tenantId,controller.signal).then(value=>{
      if(current===epoch.current&&!controller.signal.aborted){setRoles(value);setCatalogReady(true);}
    }).catch(error=>{if(current===epoch.current&&!controller.signal.aborted)setMessage(companyAccessError(error));})
      .finally(()=>{if(current===epoch.current&&!controller.signal.aborted)setCatalogLoading(false);});
    return()=>controller.abort();
  },[api,tenantId,open,canAdd]);
  function finish(){if(guard.current)return;setOpen(false);setRevoke(null);requestAnimationFrame(()=>{if(trigger.current?.isConnected)trigger.current.focus();else addButton.current?.focus();});}
  async function submit(event:React.FormEvent){
    event.preventDefault();if(!canAdd||guard.current||!readReady||!tenantId||!catalogReady||!reason.trim())return;
    const pending=intent??new CentralTenantUserIntent(tenantId,userId,codes,reason.trim());
    if(!intent){intents.set(userId,pending);setIntent(pending);}guard.current=true;setBusy(true);callbacks.current.onBusyChange(true);setMessage('');
    try{
      for(const code of [centralOnboardingCode,tenantRead,roleRead,membershipRead])if(!await authorizeFresh(code))throw new ApiProblem({code:'TCDX.AUTHORIZATION.DENIED',message:'Denied',correlation_id:'',retryable:false},403);
      await pending.run(api);const current=await read();
      const member=current&&current.find(row=>row.tenant_id===pending.tenantId&&row.tenant_membership_id===pending.progress?.membership_id);
      if(!member||member.membership_state!=='active'||pending.codes.some(code=>!member.roles.some(r=>r.role_code===code&&r.scope_kind==='tenant'))){setMessage('El servidor confirmó la incorporación, pero su lectura sigue pendiente. Actualiza el acceso sin repetir la provisión.');return;}
      setMessage('Usuario incorporado. Acceso y roles confirmados desde el servidor.');intents.delete(userId);setIntent(null);setOpen(false);requestAnimationFrame(()=>{if(trigger.current?.isConnected)trigger.current.focus();else addButton.current?.focus();});
    }catch(error){
      await read();setMessage((pending.progress?'Usuario incorporado. Algunos roles quedaron pendientes. ':'Identidad disponible. Acceso a empresa pendiente. ')+companyAccessError(error));
    }finally{guard.current=false;setBusy(false);callbacks.current.onBusyChange(false);}
  }
  async function refresh(){
    if(guard.current||!canRead)return;guard.current=true;setBusy(true);callbacks.current.onBusyChange(true);
    try{
      const current=await read();
      if(current&&intent?.completed){const member=current.find(m=>m.tenant_membership_id===intent.progress?.membership_id);
        if(member&&intent.codes.every(code=>member.roles.some(r=>r.role_code===code&&r.scope_kind==='tenant'))){intents.delete(userId);setIntent(null);setOpen(false);setMessage('Acceso y roles confirmados desde el servidor.');}}
      if(current&&revoke){const member=current.find(m=>m.tenant_membership_id===revoke.member.tenant_membership_id);
        if(member&&!member.roles.some(r=>r.membership_role_id===revoke.role.membership_role_id)){setRevoke(null);setMessage('Revocación confirmada desde el servidor.');}}
    }finally{guard.current=false;setBusy(false);callbacks.current.onBusyChange(false);}
  }
  async function submitRevoke(event:React.FormEvent){
    event.preventDefault();if(!revoke||guard.current||!canRevoke||!revoke.reason.trim())return;guard.current=true;setBusy(true);callbacks.current.onBusyChange(true);setMessage('');
    try{
      if(!await authorizeFresh('platform.role.assign'))throw Error('PERMISSION_EXPIRED');
      if(!revoke.confirmed){
        if(!await authorizeFresh(membershipRead))throw Error('PERMISSION_EXPIRED');
        const current=await loadCompanyAccess(api,userId);
        const member=current.find(m=>m.tenant_id===revoke.member.tenant_id&&m.tenant_membership_id===revoke.member.tenant_membership_id);
        if(!member)throw Error('MEMBERSHIP_UNAVAILABLE');
        if(!member.roles.some(r=>r.membership_role_id===revoke.role.membership_role_id)){setItems(current);setRevoke(null);setMessage('El rol ya no está vigente, confirmado desde el servidor.');return;}
        setRevoke({...revoke,submitted:true});
        await api.request(`/api/v1/role-assignments/${encodeURIComponent(revoke.role.membership_role_id)}:revoke?tenant_id=${encodeURIComponent(revoke.member.tenant_id)}`,{
          method:'POST',headers:{'Idempotency-Key':revoke.key,'If-Match':`"${revoke.role.etag}"`},body:JSON.stringify({reason:revoke.reason.trim()})},{tenantContext:'omit'});
        setRevoke({...revoke,confirmed:true});}
      const current=await read();const member=current&&current.find(m=>m.tenant_membership_id===revoke.member.tenant_membership_id);
      if(member&&!member.roles.some(r=>r.membership_role_id===revoke.role.membership_role_id)){setRevoke(null);setMessage('Rol de empresa revocado. Estado confirmado desde el servidor.');}
      else setMessage('La revocación fue confirmada, pero la lectura sigue pendiente. Actualiza el acceso.');
    }catch(error){setMessage(companyAccessError(error));await read();}finally{guard.current=false;setBusy(false);callbacks.current.onBusyChange(false);}
  }
  const currentMember=items.find(m=>m.tenant_id===tenantId);
  return <section className="platform-role-workspace" aria-labelledby={labelId} aria-busy={busy}>
    <h3 id={labelId}>Acceso a empresas{optional?' (opcional)':''}</h3><p>Incorpora esta identidad a una empresa y administra sus roles en esa empresa.</p>
    {!canRead?<p>La lectura requiere el permiso efectivo de acceso a empresas.</p>:<>
      {loading&&<p role="status">Cargando acceso a empresas…</p>}
      {readReady&&(items.length?<ul className="platform-role-list" aria-label="Empresas de esta identidad">{items.map(member=><li key={member.tenant_membership_id}>
        <div><strong>{member.tenant.display_name}</strong><span>{member.tenant.tenant_code}</span><span>Membresía {member.membership_state==='active'&&!member.ended_at?'activa':member.membership_state}</span>
          {member.roles.length?<ul aria-label={`Roles de ${member.tenant.display_name}`}>{member.roles.map(role=><li key={role.membership_role_id}><span>{role.role_name}</span>
            {canRevoke&&<button type="button" className="link-button" disabled={busy||open||!!revoke} aria-label={`Revocar rol de empresa ${role.role_name}`} onClick={event=>{
              trigger.current=event.currentTarget;setRevoke({member,role,key:crypto.randomUUID(),reason:'',confirmed:false,submitted:false});}}>Revocar</button>}</li>)}</ul>:<small>Sin roles activos.</small>}
        </div>{canAdd&&<button type="button" className="button secondary" disabled={busy||open||!!revoke} onClick={event=>void begin(event,member)}>Administrar roles de {member.tenant.display_name}</button>}
      </li>)}</ul>:<p>Esta identidad no tiene acceso a empresas.</p>)}
      <button type="button" className="button secondary" disabled={busy} onClick={()=>void refresh()}>Actualizar acceso a empresas</button>
    </>}
    {canAdd&&!open&&!revoke&&<button ref={addButton} type="button" className="button primary" disabled={busy||!readReady} onClick={event=>void begin(event)}>Agregar acceso a empresa</button>}
    {message&&<p id={feedbackId} role="alert" aria-label="Resultado de acceso a empresas">{message}</p>}
    {intent&&!open&&<p>Acceso pendiente. Abre «Agregar acceso a empresa» para continuar la misma incorporación.</p>}
    {open&&canAdd&&<form className="mi-form" aria-describedby={message?feedbackId:undefined} onSubmit={event=>void submit(event)}>
      <label><span id={companyLabelId}>Empresa</span><select aria-labelledby={companyLabelId} ref={field} required value={tenantId} disabled={busy||!!intent} onChange={event=>{setTenantId(event.target.value);setCodes([]);setMessage('');}}>
        <option value="">Sin asociar a empresa</option>{companies.map(company=><option key={company.tenant_id} value={company.tenant_id}>{company.display_name} · {company.tenant_code}</option>)}</select></label>
      {currentMember&&<p>Esta identidad ya tiene una membresía en esta empresa. Se conservarán sus roles actuales.</p>}
      {tenantId&&<>{catalogLoading?<p role="status">Cargando roles de empresa…</p>:catalogReady&&<fieldset disabled={busy||!!intent}><legend>Roles de esta empresa</legend>
        {roles.length?roles.map(role=><label className="onboarding-choice" key={role.role_id}><input type="checkbox" checked={codes.includes(role.role_code)} onChange={event=>setCodes(current=>event.target.checked?[...current,role.role_code]:current.filter(code=>code!==role.role_code))}/>
          <span>{role.name}<small>{role.role_code}</small></span></label>):<p>No hay roles publicados para esta empresa. No se inicializarán automáticamente.</p>}</fieldset>}</>}
      <label>Motivo de incorporación<textarea required maxLength={2000} value={reason} disabled={busy||!!intent} onChange={event=>setReason(event.target.value)}/></label>
      {intent?.progress&&<p>Usuario incorporado. Roles pendientes: {intent.progress.pending_role_codes.map(code=>roles.find(r=>r.role_code===code)?.name??code).join(', ')||'confirmación final'}.</p>}
      <button type="submit" className="button primary" disabled={busy||!readReady||!tenantId||!catalogReady||!reason.trim()||intent?.completed}>{busy?'Incorporando…':intent?'Continuar incorporación pendiente':'Incorporar a empresa'}</button>
      <button type="button" className="button secondary" disabled={busy} onClick={finish}>Cerrar acceso a empresa</button>
    </form>}
    {revoke&&<form className="mi-form" onSubmit={event=>void submitRevoke(event)}><h4>Revocar {revoke.role.role_name} de {revoke.member.tenant.display_name}</h4>
      <label>Motivo de revocación<textarea required maxLength={2000} value={revoke.reason} disabled={busy||revoke.confirmed||revoke.submitted} onChange={event=>setRevoke({...revoke,reason:event.target.value})}/></label>
      <button className="button primary" disabled={busy||!revoke.reason.trim()||revoke.confirmed}>Confirmar revocación de rol de empresa</button>
      <button type="button" className="button secondary" disabled={busy} onClick={finish}>Cancelar revocación</button></form>}
  </section>;
}
