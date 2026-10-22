import {test,expect,type Page} from '@playwright/test';
import {NORMATIVE_LIBRARY} from '../packages/contracts/src/normative-library.js';
const id=(n:number)=>'018f47f2-6170-7000-8000-'+String(n).padStart(12,'0');
const now='2026-10-22T00:00:00.000Z';
const all=[...new Set(NORMATIVE_LIBRARY.registry.new_operations.filter(o=>o.context==='TENANT').map(o=>o.permission).concat(NORMATIVE_LIBRARY.matrices.types.flatMap(d=>d.required_source_permissions)))];
const version={knowledge_version_id:id(3),knowledge_item_id:id(4),version_number:'1',content_hash:'a'.repeat(64),content_language:'es',lifecycle_state:'published',effective_from:now,effective_to:null,published_at:now,superseded_by_id:null,links:[],content:{comprender:{text:'Guía sintética para comprender.',citations:[]},implementar:{text:'Guía sintética para implementar.',citations:[]},demostrar:{text:'Guía sintética para demostrar.',citations:[]}},content_access:'body_available',content_restriction:null,publication_authority:'editorial'};
async function isolated(page:Page,permissions=all){
 const calls:URL[]=[];let second=false;
 await page.addInitScript(()=>{sessionStorage.setItem('tcdx.access_token','isolated-fixture');});
 await page.route('**/*',async route=>{
  const url=new URL(route.request().url());
  if(url.origin==='http://127.0.0.1:4182'&&!url.pathname.startsWith('/api/')){await route.continue();return;}
  // Every API request is intercepted; an unexpected destination is aborted, never sent.
  calls.push(url);const path=url.pathname;
  if(path==='/api/v1/access/me'){await route.fulfill({json:{available_tenant_contexts:[1,2].map(n=>({tenant_id:id(n),tenant_display_name:'Empresa sintética '+n,tenant_membership_id:id(n+10),membership_state:'active',effective_role_codes:['GRC_MANAGER']})),effective_platform_role_codes:[]}});return;}
  if(path==='/api/v2/auth/me/authorization'){
   const tenant=route.request().headers()['x-tcdx-tenant-id']??null;
   second=tenant===id(2);
   await route.fulfill({json:{evaluated_at:now,platform_permissions:[],tenant_permissions:tenant?{tenant_id:tenant,default_timezone:'America/Santiago',permissions:Object.fromEntries((second?[]:permissions).map(p=>[p,[{scope_kind:'tenant'}]]))}:null}});return;
  }
  if(!path.startsWith('/api/v1/')){await route.abort();return;}
  if(second){await route.fulfill({status:403,json:{code:'TCDX.AUTHORIZATION.DENIED',message:'denied fixture',correlation_id:id(9),retryable:false}});return;}
  if(path.startsWith('/api/v1/matrices/')){
   const d=NORMATIVE_LIBRARY.matrices.types.find(d=>path.endsWith('/'+d.matrix_type));
   expect(d).toBeDefined();for(const filter of d!.required_filters)expect(url.searchParams.has(filter)).toBe(true);
   await route.fulfill({json:{matrix_type:d!.matrix_type,as_of:url.searchParams.get('as_of'),rows:[],columns:[],cells:[],next_row_cursor:null,next_column_cursor:null,next_cell_cursor:null,authorization_notice:'Sólo información autorizada; no se exponen conteos de objetos fuera de alcance.',snapshot_fingerprint:'a'.repeat(64),read_at:now,temporal_semantics:d!.temporal_semantics}});return;
  }
  if(path==='/api/v1/knowledge-versions'){await route.fulfill({json:{items:[version],next_cursor:null}});return;}
  if(path==='/api/v1/knowledge-versions/'+id(3)){await route.fulfill({headers:{etag:'"'+'a'.repeat(64)+'"'},json:{operation_id:'knowledgeVersionGet',status:'completed',correlation_id:id(9),resource_id:id(3),result:version}});return;}
  if(['/api/v1/knowledge-sources','/api/v1/knowledge-items'].includes(path)){await route.fulfill({json:{items:[],next_cursor:null}});return;}
  if(path==='/api/v1/framework-version-references'){await route.fulfill({json:{items:[5,6].map(n=>({framework_version_id:id(n),framework_code:'SYNTHETIC-'+n,framework_name:'Marco sintético '+n,edition:'2026',version_number:1,selectable:true,access_mode:'official'})),page:{has_more:false,next_cursor:null}}});return;}
  await route.fulfill({json:{items:[],page:{has_more:false,next_cursor:null}}});
 });
 // Selecting a real fixture context is done via the canonical session storage, before the app loads.
 await page.addInitScript(tenant=>sessionStorage.setItem('tcdx.tenant_id',tenant),id(1));
 return calls;
}
test('compiled shell mounts content and removes it on denied tenant switch',async({page},info)=>{
 const calls=await isolated(page);await page.goto('/normas?tab=contenido');
 await page.getByRole('button',{name:'Versión 1 · Publicada',exact:true}).click();
 for(const name of ['COMPRENDER','IMPLEMENTAR','DEMOSTRAR'])await expect(page.getByRole('heading',{name,exact:true})).toBeVisible();
 await expect(page.getByRole('navigation',{name:'Biblioteca Normativa'})).toBeVisible();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await page.screenshot({path:info.outputPath('library-shell.png'),fullPage:true});
 const beforeSwitch=calls.filter(u=>u.pathname.includes('knowledge')).length;
 const viewport=page.viewportSize();
 if(!await page.getByLabel('Empresa activa').isVisible())await page.setViewportSize({width:1280,height:800});
 await page.getByLabel('Empresa activa').selectOption(id(2));
 if(viewport)await page.setViewportSize(viewport);
 await expect(page.getByRole('heading',{name:'COMPRENDER',exact:true})).toHaveCount(0);
 expect(calls.filter(u=>u.pathname.includes('knowledge'))).toHaveLength(beforeSwitch);
});
test('all six full matrices use published API and preserve empty/authorization notices',async({page},info)=>{
 const calls=await isolated(page);
 for(const d of NORMATIVE_LIBRARY.matrices.types){
  await page.goto('/normas?tab=matrices&'+new URLSearchParams({matrix:d.matrix_type,as_of:now,source_framework_version_id:id(5),target_framework_version_id:id(6)}));
  await expect(page.getByText('Sin relaciones autorizadas para esta selección.')).toBeVisible();
  await expect(page.getByText('Sólo información autorizada; no se exponen conteos de objetos fuera de alcance.')).toBeVisible();
  expect(calls.some(u=>u.pathname.endsWith('/matrices/'+d.matrix_type))).toBe(true);
 }
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await page.screenshot({path:info.outputPath('full-matrix-shell.png'),fullPage:true});
});
test('dashboard mini navigates to same full matrix without Risk or export activation',async({page},info)=>{
 const calls=await isolated(page);await page.goto('/?matrix=issues_actions&as_of='+now);
 await expect(page.getByText('Sin relaciones autorizadas para esta selección.')).toBeVisible();
 const mini=calls.find(u=>u.pathname.endsWith('/matrices/issues_actions'));expect(mini?.searchParams.get('row_limit')).toBe('3');
 await page.screenshot({path:info.outputPath('mini-matrix-shell.png'),fullPage:true});
 await page.getByRole('link',{name:'Abrir matriz completa'}).click();
 await expect(page.getByRole('heading',{name:'Matrices y homologación',exact:true})).toBeVisible();
 await expect(page.getByText('Sin relaciones autorizadas para esta selección.')).toBeVisible();
 expect(calls.filter(u=>u.pathname.endsWith('/matrices/issues_actions')).at(-1)?.searchParams.has('row_limit')).toBe(false);
});
test('direct protected routes with no grants expose no library operations or content',async({page})=>{
 const calls=await isolated(page,[]);await page.goto('/normas?tab=contenido');
 await expect(page.getByRole('heading',{name:'Biblioteca normativa y contexto empresarial'})).toHaveCount(0);
 await page.goto('/biblioteca-plataforma');await expect(page.getByRole('heading',{name:'Biblioteca editorial de plataforma'})).toHaveCount(0);
 expect(calls.some(u=>u.pathname.includes('knowledge')||u.pathname.includes('/matrices/'))).toBe(false);
});
