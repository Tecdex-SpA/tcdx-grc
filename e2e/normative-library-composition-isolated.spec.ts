import {test,expect} from '@playwright/test';
test('connected Knowledge reads exact canonical API and clears content across denied tenant context',async({page},info)=>{
 const remote:string[]=[];page.on('request',r=>{if(!r.url().startsWith('http://127.0.0.1:4178/'))remote.push(r.url());});
 const id=(n:number)=>'018f47f2-6170-7000-8000-'+n.toString(16).padStart(12,'0');
 const section={text:'Contenido sintético de prueba aislada. No es norma ni licencia.',citations:[]};
 await page.route('**/api/v1/knowledge-versions/*',async route=>{
  if(route.request().headers()['x-tcdx-tenant-id']!==id(1)){await route.fulfill({status:403,contentType:'application/json',body:JSON.stringify({code:'TCDX.AUTHORIZATION.DENIED',message:'Denied fixture',correlation_id:id(5),retryable:false})});return;}
  await route.fulfill({status:200,contentType:'application/json',headers:{etag:'"'+'a'.repeat(64)+'"'},body:JSON.stringify({operation_id:'knowledgeVersionGet',status:'completed',correlation_id:id(5),resource_id:id(3),result:{knowledge_version_id:id(3),knowledge_item_id:id(4),version_number:'1',content_hash:'a'.repeat(64),content_language:'es',lifecycle_state:'published',effective_from:'2026-10-20T12:00:00Z',effective_to:null,published_at:'2026-10-20T12:00:00Z',superseded_by_id:null,links:[],content:{comprender:section,implementar:section,demostrar:section},content_access:'body_available',content_restriction:null,publication_authority:'editorial'}})});
 });
 await page.goto('/normative-library-composition.test.html');for(const name of ['COMPRENDER','IMPLEMENTAR','DEMOSTRAR'])await expect(page.getByRole('heading',{name,exact:true})).toBeVisible();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await page.screenshot({path:info.outputPath('connected-library.png'),fullPage:true});
 const button=page.getByRole('button',{name:'Cambiar contexto de test'});await button.focus();await page.keyboard.press('Enter');await expect(page.getByRole('alert')).toBeVisible();await expect(page.getByRole('heading',{name:'COMPRENDER',exact:true})).toHaveCount(0);expect(remote).toEqual([]);
});
