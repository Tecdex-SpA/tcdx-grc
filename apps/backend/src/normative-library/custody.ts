import type { Client } from 'minio';
import { FoundationError } from '../errors.js';
import { newUuidV7 } from '../uuid.js';
import { knowledgeArtifact, verifyArtifact, validateKnowledgeWrite } from './knowledge.js';
import type { KnowledgeWrite } from '@tcdx-grc/contracts/normative-library';

export interface KnowledgeCustody {
  prepare(versionId:string,body:KnowledgeWrite):Promise<{contentRef:string;contentHash:string}>;
  read(versionId:string,contentRef:string,contentHash:string):Promise<Omit<KnowledgeWrite,'rationale'>>;
}
/** Uses the existing private versioned/encrypted object store. No new bucket or public URLs. */
export class MinioKnowledgeCustody implements KnowledgeCustody {
  constructor(private readonly client:Client,private readonly bucket:string,private readonly maxBytes:number){}
  private failure():never {throw new FoundationError('TCDX.DEPENDENCY.UNAVAILABLE','Knowledge custody unavailable',503,true);}
  async prepare(versionId:string,body:KnowledgeWrite){
    validateKnowledgeWrite(body);if(!/^[a-f0-9]{8}-[a-f0-9]{4}-7[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/.test(versionId))this.failure();
    const artifact=knowledgeArtifact(body);if(!Number.isSafeInteger(this.maxBytes)||this.maxBytes<1||artifact.bytes.length>this.maxBytes)this.failure();
    try {
      const encryption=await this.client.getBucketEncryption(this.bucket);
      const algorithm=encryption?.ServerSideEncryptionConfiguration?.Rule?.ApplyServerSideEncryptionByDefault?.SSEAlgorithm;
      if(algorithm!=='AES256'||(await this.client.getBucketVersioning(this.bucket)).Status!=='Enabled')this.failure();
      const key='knowledge/'+versionId+'/'+newUuidV7()+'.json';
      const object=await this.client.putObject(this.bucket,key,artifact.bytes,artifact.bytes.length,{'Content-Type':'application/json; charset=utf-8','X-Amz-Meta-Sha256':artifact.hash});
      if(!object.versionId||object.versionId==='null')this.failure();
      const contentRef=JSON.stringify({key,version:object.versionId});
      // Verify actual immutable object bytes before referencing them in PostgreSQL.
      await this.readBytes(versionId,contentRef,artifact.hash);
      return {contentRef,contentHash:artifact.hash};
    }catch(error){if(error instanceof FoundationError)throw error;return this.failure();}
  }
  private async readBytes(versionId:string,contentRef:string,hash:string){
    try {
      const reference=JSON.parse(contentRef) as {key:string;version:string};
      if(Object.keys(reference).sort().join(',')!=='key,version'||typeof reference.version!=='string'||!reference.version||reference.version==='null'||typeof reference.key!=='string'||!reference.key.startsWith('knowledge/'+versionId+'/')||!/^knowledge\/[a-f0-9-]{36}\/[a-f0-9-]{36}\.json$/.test(reference.key))this.failure();
      const stream=await this.client.getObject(this.bucket,reference.key,{versionId:reference.version});const parts:Buffer[]=[];let size=0;
      for await(const raw of stream){const part=Buffer.from(raw as Uint8Array);size+=part.length;if(size>this.maxBytes){stream.destroy();this.failure();}parts.push(part);}
      const bytes=Buffer.concat(parts);verifyArtifact(bytes,hash);return bytes;
    }catch(error){if(error instanceof FoundationError)throw error;return this.failure();}
  }
  async read(versionId:string,contentRef:string,contentHash:string):Promise<Omit<KnowledgeWrite,'rationale'>>{
    const bytes=await this.readBytes(versionId,contentRef,contentHash);
    try {
      const artifact=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes)) as Omit<KnowledgeWrite,'rationale'>;
      // Rationale belongs to AuditEvent, not the content artifact; validation uses an internal validation-only reason.
      const {effective_to:to,...fields}=artifact;
      const body=validateKnowledgeWrite({...fields,...(to===null?{}:{effective_to:to}),rationale:'Lectura de artefacto inmutable'});
      if(knowledgeArtifact(body).hash!==contentHash)this.failure();const {rationale:_validationOnly,...stored}=body;return stored;
    }catch(error){if(error instanceof FoundationError)throw error;return this.failure();}
  }
}
