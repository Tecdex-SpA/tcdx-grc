import { readFileSync, writeFileSync, realpathSync } from 'node:fs';
import { createRequire } from 'node:module';
import { createHash } from 'node:crypto';
const require = createRequire(new URL('../../packages/contracts/package.json', import.meta.url));
const { parse } = require('yaml');
const { Ajv2020 } = require('ajv/dist/2020.js');
const addFormats = require('ajv-formats');
const standalone = require('ajv/dist/standalone/index.js');
const viteRequire = createRequire(realpathSync(new URL('../../apps/frontend/node_modules/vite/package.json', import.meta.url)));
const { rolldown } = await import(viteRequire.resolve('rolldown'));
const root = new URL('../../', import.meta.url);
function csv(source) {
  const rows=[]; let row=[],field='',quoted=false;
  for(let i=0;i<source.length;i++) { const c=source[i];
    if(c==='"') { if(quoted&&source[i+1]==='"'){field+='"';i++;}else quoted=!quoted; }
    else if(!quoted&&(c===','||c==='\n')) {row.push(field);field='';if(c==='\n'){rows.push(row);row=[];}}
    else if(c!=='\r') field+=c;
  }
  if(field||row.length){row.push(field);rows.push(row);}
  const headers=rows.shift();return rows.filter(r=>r.length===headers.length).map(r=>Object.fromEntries(headers.map((h,i)=>[h,r[i]])));
}
const source='docs/executable-contracts/02_OPENAPI_BASE_CONTRACT.yaml';
const bytes=readFileSync(new URL(source,root),'utf8'), api=parse(bytes);
const forms=csv(readFileSync(new URL('docs/phase6a/STEP_6A2/07_BUSINESS_FORM_DESIGN_MATRIX.csv',root),'utf8')).map(row=>{
  const entry=Object.entries(api.paths).flatMap(([path,methods])=>Object.entries(methods).map(([method,op])=>({path,method,op}))).find(x=>x.op?.operationId===row.CANONICAL_OPERATION);
  if(!entry)throw new Error(`Missing ${row.CANONICAL_OPERATION}`);
  const schema=entry.op.requestBody.content['application/json'].schema.$ref.split('/').at(-1);
  if(schema!==row.REQUEST_SCHEMA)throw new Error(`Schema mismatch ${row.FORM_ID}`);
  return {id:row.FORM_ID,module:row.SCREEN,operation:row.CANONICAL_OPERATION,schema,title:row.BUSINESS_TITLE,resultState:/→\s*([a-z_]+)/u.exec(row.BUSINESS_PURPOSE)?.[1]??null,path:entry.path,method:entry.method,permission:entry.op['x-tcdx-permission'].replaceAll('`',''),source:'docs/phase6a/STEP_6A2/07_BUSINESS_FORM_DESIGN_MATRIX.csv',fields:row.FIELD_IDS};
});
const schemas={};
function collect(name){if(schemas[name])return;const s=api.components.schemas[name];if(!s)throw new Error(name);schemas[name]=s;function walk(v){if(!v||typeof v!=='object')return;if(v.$ref)collect(v.$ref.split('/').at(-1));Object.values(v).forEach(walk);}walk(s);}
forms.forEach(f=>collect(f.schema));
const ajv=new Ajv2020({strict:false,allErrors:true,code:{source:true,esm:true},validateFormats:true});addFormats(ajv);
ajv.addSchema({$id:'urn:tcdx:business-forms',components:{schemas}});
const exports=Object.fromEntries([...new Set(forms.map(f=>f.schema))].map(n=>[n,`urn:tcdx:business-forms#/components/schemas/${n}`]));
let code=standalone(ajv,exports).replace(/require\("([^"]+)"\)/g,(_,id)=>`require(${JSON.stringify(require.resolve(id))})`);
const bundle=await rolldown({input:'virtual:validators',plugins:[{name:'form-validators',resolveId(id){if(id==='virtual:validators')return id;},load(id){if(id==='virtual:validators')return code;}}],logLevel:'silent'});
const {output}=await bundle.generate({format:'esm',minify:true});await bundle.close();
const assets={source,sha256:createHash('sha256').update(bytes).digest('hex'),forms,schemas};
const files={
 'apps/frontend/src/business-form-contracts.generated.json':JSON.stringify(assets,null,2)+'\n',
 'apps/frontend/src/business-form-validators.generated.js':'// Generated from published OpenAPI using Ajv; do not edit.\n'+output[0].code,
 'apps/frontend/src/business-form-validators.generated.d.ts':'// Generated validators; no runtime schema compilation.\nexport type ValidationError = { instancePath: string; schemaPath?: string; keyword: string; params: Record<string, unknown> };\nexport type Validator = { (value: unknown): boolean; errors?: ValidationError[] | null };\n'+Object.keys(exports).map(n=>`export const ${n}: Validator;`).join('\n')+'\n'
};
for(const [path,text]of Object.entries(files)){const url=new URL(path,root);if(process.argv.includes('--check')){if(readFileSync(url,'utf8')!==text)throw new Error(`Stale ${path}`);}else writeFileSync(url,text);}
console.log(`BUSINESS_FORM_ASSETS=PASS forms=${forms.length} schemas=${Object.keys(schemas).length}`);
