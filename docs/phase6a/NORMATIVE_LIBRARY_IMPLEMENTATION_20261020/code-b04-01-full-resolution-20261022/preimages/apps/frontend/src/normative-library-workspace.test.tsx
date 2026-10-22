import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {describe,it,expect,vi} from 'vitest';
import type {CurrentPrincipalAuthorization} from '@tcdx-grc/contracts';
import {NORMATIVE_LIBRARY} from '@tcdx-grc/contracts/normative-library';
import {ApiClient} from './api-client.js';
import {KnowledgeWorkspace, MatrixWorkspace, ControlAdjustments, libraryOperationAllowed} from './normative-library-workspace.js';
const id='018f47f2-6170-7000-8000-000000000001';
const api=new ApiClient('http://127.0.0.1',{getAccessToken:async()=>null,clearSession:async()=>{}},()=>({tenantId:id}));
const auth=(permissions:string[],tenant=id):CurrentPrincipalAuthorization=>({evaluated_at:'2026-10-22T00:00:00Z',platform_permissions:[],tenant_permissions:{tenant_id:tenant,default_timezone:'America/Santiago',permissions:Object.fromEntries(permissions.map(p=>[p,[{scope_kind:'tenant' as const}]]))}});
describe('mounted normative surfaces, presentation authorization remains default DENY',()=>{
 it('rejects absent authorization, foreign tenant, Platform/Tenant context confusion and unknown operations',()=>{
  for(const op of NORMATIVE_LIBRARY.registry.new_operations){
   expect(libraryOperationAllowed({api,authorization:null},op.operation_id)).toBe(false);
   expect(libraryOperationAllowed({api,authorization:auth([op.permission],'foreign')},op.operation_id)).toBe(false);
  }
  expect(libraryOperationAllowed({api,authorization:auth(['knowledge.knowledge_item.read'])},'platformKnowledgeVersionList')).toBe(false);
  expect(libraryOperationAllowed({api,authorization:auth(['knowledge.knowledge_item.read'])},'notPublished')).toBe(false);
 });
 it('does not render controls, metadata, matrices or write forms without permission',()=>{
  for(const Component of [KnowledgeWorkspace,MatrixWorkspace,ControlAdjustments]){
   const html=renderToStaticMarkup(<Component api={api} authorization={null}/>);
   expect(html).toContain('Consulta no disponible');expect(html).not.toContain('<form');expect(html).not.toContain('<select');
  }
 });
 it('exposes only matrix types with the full intersection of entry and source permissions',()=>{
  for(const d of NORMATIVE_LIBRARY.matrices.types){
   const permissions=[d.additional_entry_permission,...d.required_source_permissions];
   const html=renderToStaticMarkup(<MatrixWorkspace api={api} authorization={auth(permissions)}/>);
   expect(html).toContain('value="'+d.matrix_type+'"');
   const partial=renderToStaticMarkup(<MatrixWorkspace api={api} authorization={auth(permissions.filter(p=>p!=='reporting.matrix.read'))}/>);
   expect(partial).toContain('Consulta no disponible');
  }
 });
 it('mounts the same matrix reader as a small dashboard window with a protected full-view link',()=>{
  const html=renderToStaticMarkup(<MatrixWorkspace api={api} authorization={auth(['reporting.matrix.read','remediation.issue.read','remediation.action.read'])} mini/>);
  expect(html).toContain('Matrices del dashboard');expect(html).toContain('/normas?tab=matrices');expect(html).toContain('row_limit=3');expect(html).toContain('column_limit=3');expect(html).not.toContain('export');
 });
 it('keeps initial adjustment creation explicitly blocked instead of accepting a manual Definition ID',()=>{
  const html=renderToStaticMarkup(<ControlAdjustments api={api} authorization={auth(['configuration.configuration_override.read'])}/>);
  expect(html).toContain('creación de ajustes aún no está disponible');expect(html).not.toContain('configuration_definition_id');
 });
});
