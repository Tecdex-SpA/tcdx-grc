// Test-only immutable-snapshot reconciliation; no product runtime import.
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
export function publishedInitialSourceDelta():string[]{
 const root='docs/executable-contracts/amendments/STEP_6A3_INITIAL_SOURCE_v1.11/';
 const receipt=JSON.parse(readFileSync(root+'CONTRACT_PUBLICATION_RECEIPT.json','utf8')) as {status:string;files:{path:string;sha256:string}[]};assert.equal(receipt.status,'PUBLISHED_LOCAL_EFFECTIVE');
 const archive=readFileSync(root+'snapshots/02_OPENAPI_BASE_CONTRACT.yaml','utf8');const ref=receipt.files.find(f=>f.path==='docs/executable-contracts/02_OPENAPI_BASE_CONTRACT.yaml');assert(ref);assert.equal(createHash('sha256').update(archive).digest('hex'),ref.sha256);
 const ids=(text:string)=>[...text.matchAll(/^\s+operationId:\s+(\w+)\s*$/gm)].map(m=>m[1]!);
 const before=new Set(ids(readFileSync(root+'predecessor-snapshots/02_OPENAPI_BASE_CONTRACT.yaml','utf8')));const added=ids(archive).filter(id=>!before.has(id));assert.deepEqual(added,['retentionApplicabilityBindInitialSource']);return added;
}
