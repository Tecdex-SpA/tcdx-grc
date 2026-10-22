# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: normative-library-code-composition.spec.ts >> compiled shell mounts content and removes it on denied tenant switch
- Location: e2e/normative-library-code-composition.spec.ts:38:1

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: locator.click: Test timeout of 30000ms exceeded.
Call log:
  - waiting for getByRole('button', { name: 'Versión 1 · Publicado', exact: true })

```

# Page snapshot

```yaml
- generic [ref=e3]:
  - complementary [ref=e4]:
    - generic [ref=e5]:
      - img "Tecdex" [ref=e6]
      - generic [ref=e7]: GRC
    - navigation "Navegación principal" [ref=e8]:
      - button "Panel principal" [ref=e9] [cursor=pointer]
      - button "Normas" [ref=e16] [cursor=pointer]
      - button "Cumplimiento" [ref=e21] [cursor=pointer]
      - button "Requisitos" [ref=e26] [cursor=pointer]
      - button "Controles" [ref=e31] [cursor=pointer]
      - button "Evidencias" [ref=e35] [cursor=pointer]
      - button "Acciones" [ref=e40] [cursor=pointer]
    - generic [ref=e45]:
      - strong [ref=e46]: Tecdex GRC
      - generic [ref=e47]: Gobernanza y cumplimiento
  - generic [ref=e48]:
    - banner [ref=e49]:
      - button "Abrir navegación" [ref=e50] [cursor=pointer]: ☰
      - generic [ref=e51]:
        - generic [ref=e52]: Buscar
        - searchbox "Buscar" [ref=e53]
      - generic [ref=e54]:
        - generic [ref=e55]: U
        - button "Cerrar sesión" [ref=e56] [cursor=pointer]
    - main [ref=e57]:
      - generic [ref=e59]:
        - paragraph [ref=e60]: Espacio operativo
        - heading "Biblioteca Normativa" [level=1] [ref=e61]
        - paragraph [ref=e62]: Registros vigentes dentro de tu alcance autorizado.
      - navigation "Biblioteca Normativa" [ref=e63]:
        - button "Fuentes y ediciones" [ref=e64] [cursor=pointer]
        - button "Contenido editorial y contexto" [ref=e65] [cursor=pointer]
        - button "Personalización y aprobación" [ref=e66] [cursor=pointer]
        - button "Matrices y homologación" [ref=e67] [cursor=pointer]
      - region "Biblioteca normativa" [ref=e68]:
        - heading "Biblioteca normativa y contexto empresarial" [level=2] [ref=e69]
        - generic [ref=e70]:
          - text: Buscar metadatos
          - searchbox "Buscar metadatos" [ref=e71]
        - group [ref=e72]:
          - generic "Registrar procedencia" [ref=e73]
        - region "Fuentes de procedencia" [ref=e74]:
          - heading "Fuentes de procedencia" [level=3] [ref=e75]
          - status [ref=e76]: Sin registros autorizados para esta selección.
        - region "Contenido editorial y contextual" [ref=e77]:
          - heading "Contenido editorial y contextual" [level=3] [ref=e78]
          - status [ref=e79]: Sin registros autorizados para esta selección.
        - region "Ediciones de contenido" [ref=e80]:
          - heading "Ediciones de contenido" [level=3] [ref=e81]
          - list [ref=e82]:
            - listitem [ref=e83]:
              - button "Versión 1 · Publicada" [ref=e84] [cursor=pointer]
```

# Test source

```ts
  1  | import {test,expect,type Page} from '@playwright/test';
  2  | import {NORMATIVE_LIBRARY} from '../packages/contracts/src/normative-library.js';
  3  | const id=(n:number)=>'018f47f2-6170-7000-8000-'+String(n).padStart(12,'0');
  4  | const now='2026-10-22T00:00:00.000Z';
  5  | const all=[...new Set(NORMATIVE_LIBRARY.registry.new_operations.filter(o=>o.context==='TENANT').map(o=>o.permission).concat(NORMATIVE_LIBRARY.matrices.types.flatMap(d=>d.required_source_permissions)))];
  6  | const version={knowledge_version_id:id(3),knowledge_item_id:id(4),version_number:'1',content_hash:'a'.repeat(64),content_language:'es',lifecycle_state:'published',effective_from:now,effective_to:null,published_at:now,superseded_by_id:null,links:[],content:{comprender:{text:'Guía sintética para comprender.',citations:[]},implementar:{text:'Guía sintética para implementar.',citations:[]},demostrar:{text:'Guía sintética para demostrar.',citations:[]}},content_access:'body_available',content_restriction:null,publication_authority:'editorial'};
  7  | async function isolated(page:Page,permissions=all){
  8  |  const calls:URL[]=[];let second=false;
  9  |  await page.addInitScript(()=>{sessionStorage.setItem('tcdx.access_token','isolated-fixture');});
  10 |  await page.route('**/*',async route=>{
  11 |   const url=new URL(route.request().url());
  12 |   if(url.origin==='http://127.0.0.1:4182'&&!url.pathname.startsWith('/api/')){await route.continue();return;}
  13 |   // Every API request is intercepted; an unexpected destination is aborted, never sent.
  14 |   calls.push(url);const path=url.pathname;
  15 |   if(path==='/api/v1/access/me'){await route.fulfill({json:{available_tenant_contexts:[1,2].map(n=>({tenant_id:id(n),tenant_display_name:'Empresa sintética '+n,tenant_membership_id:id(n+10),membership_state:'active',effective_role_codes:['GRC_MANAGER']})),effective_platform_role_codes:[]}});return;}
  16 |   if(path==='/api/v2/auth/me/authorization'){
  17 |    const tenant=route.request().headers()['x-tcdx-tenant-id']??null;
  18 |    second=tenant===id(2);
  19 |    await route.fulfill({json:{evaluated_at:now,platform_permissions:[],tenant_permissions:tenant?{tenant_id:tenant,default_timezone:'America/Santiago',permissions:Object.fromEntries((second?[]:permissions).map(p=>[p,[{scope_kind:'tenant'}]]))}:null}});return;
  20 |   }
  21 |   if(!path.startsWith('/api/v1/')){await route.abort();return;}
  22 |   if(second){await route.fulfill({status:403,json:{code:'TCDX.AUTHORIZATION.DENIED',message:'denied fixture',correlation_id:id(9),retryable:false}});return;}
  23 |   if(path.startsWith('/api/v1/matrices/')){
  24 |    const d=NORMATIVE_LIBRARY.matrices.types.find(d=>path.endsWith('/'+d.matrix_type));
  25 |    expect(d).toBeDefined();for(const filter of d!.required_filters)expect(url.searchParams.has(filter)).toBe(true);
  26 |    await route.fulfill({json:{matrix_type:d!.matrix_type,as_of:url.searchParams.get('as_of'),rows:[],columns:[],cells:[],next_row_cursor:null,next_column_cursor:null,next_cell_cursor:null,authorization_notice:'Sólo información autorizada; no se exponen conteos de objetos fuera de alcance.',snapshot_fingerprint:'a'.repeat(64),read_at:now,temporal_semantics:d!.temporal_semantics}});return;
  27 |   }
  28 |   if(path==='/api/v1/knowledge-versions'){await route.fulfill({json:{items:[version],next_cursor:null}});return;}
  29 |   if(path==='/api/v1/knowledge-versions/'+id(3)){await route.fulfill({headers:{etag:'"'+'a'.repeat(64)+'"'},json:{operation_id:'knowledgeVersionGet',status:'completed',correlation_id:id(9),resource_id:id(3),result:version}});return;}
  30 |   if(['/api/v1/knowledge-sources','/api/v1/knowledge-items'].includes(path)){await route.fulfill({json:{items:[],next_cursor:null}});return;}
  31 |   if(path==='/api/v1/framework-version-references'){await route.fulfill({json:{items:[],page:{has_more:false,next_cursor:null}}});return;}
  32 |   await route.fulfill({json:{items:[],page:{has_more:false,next_cursor:null}}});
  33 |  });
  34 |  // Selecting a real fixture context is done via the canonical session storage, before the app loads.
  35 |  await page.addInitScript(tenant=>sessionStorage.setItem('tcdx.tenant_id',tenant),id(1));
  36 |  return calls;
  37 | }
  38 | test('compiled shell mounts content and removes it on denied tenant switch',async({page},info)=>{
  39 |  const calls=await isolated(page);await page.goto('/normas?tab=contenido');
> 40 |  await page.getByRole('button',{name:'Versión 1 · Publicado',exact:true}).click();
     |                                                                           ^ Error: locator.click: Test timeout of 30000ms exceeded.
  41 |  for(const name of ['COMPRENDER','IMPLEMENTAR','DEMOSTRAR'])await expect(page.getByRole('heading',{name,exact:true})).toBeVisible();
  42 |  await expect(page.getByRole('navigation',{name:'Biblioteca Normativa'})).toBeVisible();
  43 |  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  44 |  await page.screenshot({path:info.outputPath('library-shell.png'),fullPage:true});
  45 |  await page.getByLabel('Empresa activa').selectOption(id(2));
  46 |  await expect(page.getByRole('heading',{name:'COMPRENDER',exact:true})).toHaveCount(0);
  47 |  expect(calls.filter(u=>u.pathname.includes('knowledge')&&u.searchParams.get('tenant_id')===id(2))).toEqual([]);
  48 | });
  49 | test('all six full matrices use published API and preserve empty/authorization notices',async({page},info)=>{
  50 |  const calls=await isolated(page);
  51 |  for(const d of NORMATIVE_LIBRARY.matrices.types){
  52 |   await page.goto('/normas?tab=matrices&'+new URLSearchParams({matrix:d.matrix_type,as_of:now,source_framework_version_id:id(5),target_framework_version_id:id(6)}));
  53 |   await expect(page.getByText('Sin relaciones autorizadas para esta selección.')).toBeVisible();
  54 |   await expect(page.getByText('Sólo información autorizada; no se exponen conteos de objetos fuera de alcance.')).toBeVisible();
  55 |   expect(calls.some(u=>u.pathname.endsWith('/matrices/'+d.matrix_type))).toBe(true);
  56 |  }
  57 |  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  58 |  await page.screenshot({path:info.outputPath('full-matrix-shell.png'),fullPage:true});
  59 | });
  60 | test('dashboard mini navigates to same full matrix without Risk or export activation',async({page},info)=>{
  61 |  const calls=await isolated(page);await page.goto('/?matrix=issues_actions&as_of='+now);
  62 |  await expect(page.getByText('Sin relaciones autorizadas para esta selección.')).toBeVisible();
  63 |  const mini=calls.find(u=>u.pathname.endsWith('/matrices/issues_actions'));expect(mini?.searchParams.get('row_limit')).toBe('3');
  64 |  await page.screenshot({path:info.outputPath('mini-matrix-shell.png'),fullPage:true});
  65 |  await page.getByRole('link',{name:'Abrir matriz completa'}).click();
  66 |  await expect(page.getByRole('heading',{name:'Matrices y homologación',exact:true})).toBeVisible();
  67 |  await expect(page.getByText('Sin relaciones autorizadas para esta selección.')).toBeVisible();
  68 |  expect(calls.filter(u=>u.pathname.endsWith('/matrices/issues_actions')).at(-1)?.searchParams.has('row_limit')).toBe(false);
  69 | });
  70 | test('direct protected routes with no grants expose no library operations or content',async({page})=>{
  71 |  const calls=await isolated(page,[]);await page.goto('/normas?tab=contenido');
  72 |  await expect(page.getByRole('heading',{name:'Biblioteca normativa y contexto empresarial'})).toHaveCount(0);
  73 |  await page.goto('/biblioteca-plataforma');await expect(page.getByRole('heading',{name:'Biblioteca editorial de plataforma'})).toHaveCount(0);
  74 |  expect(calls.some(u=>u.pathname.includes('knowledge')||u.pathname.includes('/matrices/'))).toBe(false);
  75 | });
  76 | 
```