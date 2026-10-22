# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: b04-contextual-resolution.spec.ts >> published periodicity vocabulary is understandable and saved through the same B04 command
- Location: e2e/b04-contextual-resolution.spec.ts:65:1

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: locator.evaluate: Test timeout of 30000ms exceeded.
Call log:
  - waiting for getByLabel('Valor propuesto', { exact: true })

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
      - generic [ref=e50]:
        - generic [ref=e51]: Buscar
        - searchbox "Buscar" [ref=e52]
      - generic [ref=e53]:
        - generic [ref=e54]: Empresa
        - combobox "Empresa activa" [ref=e55]:
          - option "Empresa sintética" [selected]
      - generic [ref=e56]:
        - generic [ref=e57]: U
        - generic [ref=e58]:
          - strong [ref=e59]: Usuario autorizado
          - generic "Responsable GRC" [ref=e60]: Empresa sintética · Responsable GRC
        - button "Cerrar sesión" [ref=e61] [cursor=pointer]
    - main [ref=e62]:
      - generic [ref=e64]:
        - paragraph [ref=e65]: Espacio operativo
        - heading "Biblioteca Normativa" [level=1] [ref=e66]
        - paragraph [ref=e67]: Registros vigentes dentro de tu alcance autorizado.
      - navigation "Biblioteca Normativa" [ref=e68]:
        - button "Personalización y aprobación" [ref=e69] [cursor=pointer]
      - region "Personalización y aprobación gerencial" [ref=e70]:
        - heading "Personalización y aprobación gerencial" [level=2] [ref=e71]
        - paragraph [ref=e72]: Actividades operativas, evidencias recomendadas, periodicidad y confirmación operativa. Una aprobación no sustituye el cumplimiento normativo.
        - generic [ref=e74]:
          - generic [ref=e75]:
            - generic [ref=e76]:
              - generic [ref=e77]:
                - text: Buscar control
                - searchbox "Buscar control" [ref=e78]
              - button "Buscar" [ref=e79] [cursor=pointer]
            - generic [ref=e80]: Control de la organización
            - combobox "Control de la organización" [ref=e81]:
              - option "Selecciona una opción"
              - option "CTRL-A · Control sintético A · Activo" [selected]
              - option "CTRL-B · Control sintético B · Activo"
          - generic [ref=e82]:
            - generic [ref=e83]: Versión de control
            - combobox "Versión de control" [ref=e84]:
              - option "Selecciona una opción"
              - option "CTRL-A · Control sintético A · Activo · v1" [selected]
        - region "Crear propuesta de ajuste" [ref=e85]:
          - heading "Nueva propuesta de ajuste" [level=3] [ref=e86]
          - group [ref=e88]:
            - generic [ref=e89]:
              - text: Parámetro a personalizar
              - combobox "Parámetro a personalizar" [ref=e90]:
                - option "Selecciona un parámetro"
                - option "Actividades operativas · versión 1"
                - option "Evidencias recomendadas · versión 1"
                - option "Periodicidad · versión 1" [selected]
                - option "Nivel de confirmación operativa · versión 1"
            - paragraph [ref=e91]: La propuesta modifica la orientación operativa de esta empresa y conserva la fuente y los mínimos normativos.
            - generic [ref=e92]:
              - text: Valor propuesto
              - combobox "Valor propuesto" [ref=e93]:
                - option "Selecciona una periodicidad" [selected]
                - option "Continua"
                - option "Diaria"
                - option "Semanal"
                - option "Mensual"
                - option "Trimestral"
                - option "Semestral"
                - option "Anual"
                - option "Ante un evento"
            - generic [ref=e94]:
              - generic [ref=e95]: Vigente desde
              - textbox "Vigente desde" [ref=e96]
              - generic [ref=e97]: "Hora local de la empresa: America/Santiago"
            - generic [ref=e98]:
              - generic [ref=e99]: Vigente hasta
              - textbox "Vigente hasta" [ref=e100]
              - generic [ref=e101]: "Hora local de la empresa: America/Santiago"
            - generic [ref=e102]:
              - text: Fundamento de la propuesta
              - textbox "Fundamento de la propuesta" [ref=e103]
            - button "Guardar propuesta" [ref=e104] [cursor=pointer]
```

# Test source

```ts
  1  | import {test,expect,type Page} from '@playwright/test';
  2  | import {contextualFixture,tenant,control,otherControl,fixtureId,now} from '../apps/backend/src/configuration/control-definition-references.test-support.js';
  3  | async function isolated(page:Page){
  4  |  const fixture=contextualFixture();const requests:{path:string;body:unknown}[]=[];
  5  |  await page.addInitScript(id=>{sessionStorage.setItem('tcdx.access_token','b04-isolated');sessionStorage.setItem('tcdx.tenant_id',id);},tenant);
  6  |  await page.route('**/*',async route=>{
  7  |   const req=route.request(),url=new URL(req.url()),path=url.pathname;
  8  |   if(url.origin==='http://127.0.0.1:4184'&&!path.startsWith('/api/')){await route.continue();return;}
  9  |   if(!path.startsWith('/api/')){await route.abort();return;}
  10 |   if(path==='/api/v1/access/me'){await route.fulfill({json:{available_tenant_contexts:[{tenant_id:tenant,tenant_display_name:'Empresa sintética',tenant_membership_id:fixtureId(5),membership_state:'active',effective_role_codes:['GRC_MANAGER']}],effective_platform_role_codes:[]}});return;}
  11 |   if(path==='/api/v2/auth/me/authorization'){await route.fulfill({json:{evaluated_at:now,platform_permissions:[],tenant_permissions:{tenant_id:tenant,default_timezone:'America/Santiago',permissions:Object.fromEntries(['configuration.configuration_override.create','controls.control.read'].map(p=>[p,[{scope_kind:'tenant'}]]))}}});return;}
  12 |   const parent=(n:number)=>({control_id:fixtureId(n),tenant_id:tenant,ownership_class:'TENANT_OWNED',control_code:n===30?'CTRL-A':'CTRL-B',name:n===30?'Control sintético A':'Control sintético B',lifecycle_state:'active'});
  13 |   if(path==='/api/v1/controls'){await route.fulfill({json:{items:[parent(30),parent(31)],page:{has_more:false,next_cursor:null}}});return;}
  14 |   if(path==='/api/v1/controls/'+fixtureId(30)||path==='/api/v1/controls/'+fixtureId(31)){const n=path.endsWith(fixtureId(30))?30:31;await route.fulfill({json:{...parent(n),versions:[{control_id:fixtureId(n),control_version_id:n===30?control:otherControl,tenant_id:tenant,version_number:1,lifecycle_state:'active'}]}});return;}
  15 |   if(path.endsWith('/configuration-definition-references')||path==='/api/v1/configuration-overrides'){
  16 |    const body=req.method()==='POST'?req.postDataJSON():undefined;requests.push({path,body});
  17 |    // Actual canonical Fastify composition, actor resolution, policy, SQL and command functions.
  18 |    // The only persistence substitute is the isolated SQL executor fixture; no DB/network exists.
  19 |    const response=await fixture.app.inject({method:req.method() as 'GET'|'POST',url:path+url.search,headers:req.headers(),...(body?{payload:body}:{})});
  20 |    await route.fulfill({status:response.statusCode,contentType:'application/json',headers:{'cache-control':'no-store'},body:response.body});return;
  21 |   }
  22 |   await route.abort();
  23 |  });
  24 |  return {...fixture,requests};
  25 | }
  26 | async function selectControl(page:Page,n=30){
  27 |  await page.getByLabel('Control de la organización',{exact:true}).selectOption(fixtureId(n));
  28 |  await page.getByLabel('Versión de control',{exact:true}).selectOption(n===30?control:otherControl);
  29 | }
  30 | async function fillProposal(page:Page,id:string){
  31 |  await page.getByLabel('Parámetro a personalizar').selectOption(id);
  32 |  const valueField=page.getByLabel('Valor propuesto',{exact:true});
> 33 |  if(await valueField.evaluate(el=>el.tagName==='SELECT'))await valueField.selectOption('monthly');else await valueField.fill('Propuesta sintética del navegador');
     |                      ^ Error: locator.evaluate: Test timeout of 30000ms exceeded.
  34 |  await page.getByLabel('Vigente desde',{exact:true}).fill('2026-10-23T09:00');
  35 |  await page.getByLabel('Vigente hasta',{exact:true}).fill('2026-12-23T09:00');
  36 |  await page.getByLabel('Fundamento de la propuesta').fill('Validación aislada del flujo B04.');
  37 | }
  38 | test('creates initial B04 using real canonical handlers without Platform or override-read permission',async({page},info)=>{
  39 |  const f=await isolated(page);try{
  40 |   await page.goto('/normas?tab=ajustes');await selectControl(page);
  41 |   await expect(page.getByLabel('Parámetro a personalizar')).toBeVisible();
  42 |   await fillProposal(page,f.state.definitions[0]!.configuration_definition_id);
  43 |   expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  44 |   await page.screenshot({path:info.outputPath('b04-create-form.png'),fullPage:true});
  45 |   await page.getByRole('button',{name:'Guardar propuesta',exact:true}).click();
  46 |   await expect(page.getByText('Propuesta guardada como borrador.',{exact:false})).toBeVisible();
  47 |   expect(f.state.overrides).toHaveLength(1);expect(f.state.overrides[0]).toMatchObject({configuration_definition_id:f.state.definitions[0]!.configuration_definition_id,tenant_id:tenant,lifecycle_state:'draft'});
  48 |   expect(f.state.statements.filter(q=>q.sql.includes('INSERT INTO ops_audit.audit_events'))).toHaveLength(1);
  49 |  }finally{await f.app.close();}
  50 | });
  51 | test('control change clears prior Definition/value and backend checks new target',async({page})=>{
  52 |  const f=await isolated(page);try{await page.goto('/normas?tab=ajustes');await selectControl(page);await fillProposal(page,f.state.definitions[0]!.configuration_definition_id);await selectControl(page,31);await expect(page.getByLabel('Parámetro a personalizar')).toHaveValue('');await expect(page.getByLabel('Valor propuesto',{exact:true})).toHaveCount(0);await expect(page.getByRole('button',{name:'Guardar propuesta',exact:true})).toBeDisabled();expect(f.requests.some(r=>r.path.includes(otherControl))).toBe(true);expect(f.state.overrides).toHaveLength(0);}finally{await f.app.close();}
  53 | });
  54 | test('stale Definition is rejected by write and selection invalidated automatically',async({page})=>{
  55 |  const f=await isolated(page);try{await page.goto('/normas?tab=ajustes');await selectControl(page);await fillProposal(page,f.state.definitions[0]!.configuration_definition_id);f.state.definitions[0]!.lifecycle_state='draft';await page.getByRole('button',{name:'Guardar propuesta',exact:true}).click();await expect(page.getByRole('alert')).toContainText('El parámetro seleccionado ya no está disponible');await expect(page.getByLabel('Parámetro a personalizar')).toHaveValue('');expect(f.state.overrides).toHaveLength(0);expect(f.state.statements.some(q=>q.sql.includes('INSERT INTO ops_audit.audit_events'))).toBe(false);}finally{await f.app.close();}
  56 | });
  57 | test('empty, denied and dependency errors remain explicit and cannot submit',async({page})=>{
  58 |  const f=await isolated(page);try{
  59 |   f.state.definitions=[];await page.goto('/normas?tab=ajustes');await selectControl(page);await expect(page.getByText('No hay parámetros publicados disponibles para este control.')).toBeVisible();await expect(page.getByRole('button',{name:'Guardar propuesta',exact:true})).toHaveCount(0);
  60 |   f.state.allowed=false;await selectControl(page,31);await expect(page.getByRole('alert')).toContainText('No tienes autorización');
  61 |   f.state.allowed=true;f.state.definitions=(await import('../apps/backend/src/configuration/control-definition-references.test-support.js')).definitionFixture();f.state.missingRules=true;await page.getByRole('button',{name:'Volver a consultar parámetros'}).click();await expect(page.getByRole('alert')).toContainText('No fue posible consultar');expect(f.state.overrides).toHaveLength(0);
  62 |  }finally{await f.app.close();}
  63 | });
  64 | 
  65 | test('published periodicity vocabulary is understandable and saved through the same B04 command',async({page})=>{
  66 |  const f=await isolated(page);try{await page.goto('/normas?tab=ajustes');await selectControl(page);const definition=f.state.definitions.find(d=>d.configuration_code==='control_operational_frequency')!;await fillProposal(page,definition.configuration_definition_id);await expect(page.getByRole('option',{name:'Mensual',exact:true})).toHaveCount(1);await page.getByRole('button',{name:'Guardar propuesta',exact:true}).click();await expect(page.getByText('Propuesta guardada como borrador.',{exact:false})).toBeVisible();expect(f.state.overrides[0]!.text_value).toBe('monthly');}finally{await f.app.close();}
  67 | });
  68 | 
```