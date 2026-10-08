import pg from '/Users/andresbarouh/repos/tcdx-grc/node_modules/pg/lib/index.js';
import { loadCatalogV11, materializeCatalogV11 } from '/Users/andresbarouh/repos/tcdx-grc/apps/backend/dist/regulatory/catalog-v1.1.js';
import { newUuidV7 } from '/Users/andresbarouh/repos/tcdx-grc/apps/backend/dist/uuid.js';
if(process.env.DATABASE_HOST!=='127.0.0.1'||process.env.DATABASE_PORT!=='55432'||process.env.TCDX_ISOLATED_REBUILD!=='true')throw new Error('LOCAL_ONLY');
const db=new pg.Client({host:process.env.DATABASE_HOST,port:55432,database:'tcdx-grc',user:process.env.DATABASE_USER,password:process.env.DATABASE_PASSWORD,ssl:false});await db.connect();
try {const actor=newUuidV7();await db.query("INSERT INTO iam.user_identities(user_identity_id,identity_key,display_name,lifecycle_state) VALUES($1,$2,'Local catalog fixture','active')",[actor,'local-catalog:'+actor]);const result=await materializeCatalogV11(db,loadCatalogV11('data/regulatory/catalogs/tcdx-unified-compliance-control-catalog/v1.1'),actor);console.log(JSON.stringify({catalogFixture:'PASS',...result}));}finally{await db.end();}
