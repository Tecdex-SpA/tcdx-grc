import {test,expect} from '@playwright/test';
test('isolated matrix and editorial content preserve semantics, keyboard and responsive layout',async({page},info)=>{
 const remote:string[]=[];page.on('request',request=>{if(!request.url().startsWith('http://127.0.0.1:4178/'))remote.push(request.url());});
 await page.goto('/normative-library.test.html');
 await expect(page.getByRole('heading',{name:'Biblioteca — prueba aislada'})).toBeVisible();
 for(const name of ['COMPRENDER','IMPLEMENTAR','DEMOSTRAR'])await expect(page.getByRole('heading',{name,exact:true})).toBeVisible();
 const relation=page.getByRole('button',{name:'Apoya · Pendiente'});await relation.focus();await page.keyboard.press('Enter');await expect(page.getByRole('heading',{name:'Trazabilidad'})).toBeVisible();await page.getByRole('button',{name:'Cerrar detalle'}).click();await expect(page.getByRole('heading',{name:'Trazabilidad'})).toHaveCount(0);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
 await page.screenshot({path:`docs/phase6a/NORMATIVE_LIBRARY_IMPLEMENTATION_20261020/evidence/library-${info.project.name}.png`,fullPage:true});expect(remote).toEqual([]);
});
