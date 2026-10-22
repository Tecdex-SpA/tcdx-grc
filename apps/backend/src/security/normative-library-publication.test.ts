import {describe,it,expect,vi} from 'vitest';
import type {Kysely} from 'kysely';
import type {FoundationDatabase} from '../database.js';
import type {ApplicationTokenService} from './application-token.js';
import {IamPublicationService} from './iam-publication.js';
import {configureQaIamPublication} from './iam-publication-runtime.js';
import type {BackendConfig} from '../config.js';
import {prepareLibraryDefinitions,prepareLibraryPublication} from './normative-library-publication.js';
import {newUuidV7} from '../uuid.js';

describe('explicit library publication reuses the private IAM boundary',()=>{
 it('is disabled by default and cannot authenticate or open a transaction without an exact configuration',async()=>{
  const authenticateMachine=vi.fn(),transaction=vi.fn();
  const service=new IamPublicationService({transaction} as unknown as Kysely<FoundationDatabase>,{authenticateMachine} as unknown as ApplicationTokenService,{} as never,vi.fn());
  await expect(service.publishNormativeLibrary(newUuidV7())).rejects.toMatchObject({statusCode:403});
  expect(authenticateMachine).not.toHaveBeenCalled();expect(transaction).not.toHaveBeenCalled();
 });
 it('requires fresh authenticated machine authority before opening the publisher transaction',async()=>{
  const transaction=vi.fn(),authenticateMachine=vi.fn().mockRejectedValue(Error('SYNTHETIC_AUTH_DENIED'));
  const p=await prepareLibraryPublication(process.cwd(),{tenantIds:[],effectiveFrom:'2026-10-01T00:00:00Z',effectiveTo:'2026-12-01T00:00:00Z'});
  const service=new IamPublicationService({transaction} as unknown as Kysely<FoundationDatabase>,{authenticateMachine} as unknown as ApplicationTokenService,{} as never,async()=>'synthetic-only');
  await expect(service.publishNormativeLibrary(newUuidV7(),p)).rejects.toThrow('SYNTHETIC_AUTH_DENIED');expect(transaction).not.toHaveBeenCalled();
 });
 it('does not permit partial activation configuration or a library configuration without the canonical publisher',async()=>{
  for(const env of [{TCDX_LIBRARY_PUBLICATION_ROOT:process.cwd()},{TCDX_LIBRARY_PUBLICATION_ROOT:process.cwd(),TCDX_LIBRARY_PUBLICATION_INPUT_FILE:'unused',TCDX_LIBRARY_PUBLICATION_INPUT_SHA256:'a'.repeat(64)}])
   await expect(configureQaIamPublication({} as never,{} as never,{} as BackendConfig,env)).rejects.toThrow('INCOMPLETE_LIBRARY_PUBLICATION_CONFIGURATION');
  expect(await configureQaIamPublication({} as never,{} as never,{} as BackendConfig,{})).toBeUndefined();
 });
 it('prepares exactly the four normalized rule references with approved NULL defaults and no physical IDs',()=>{
  const prepared=prepareLibraryDefinitions();expect(prepared).toHaveLength(4);
  expect(new Set(prepared.map(d=>d.descriptor.configuration_code)).size).toBe(4);
  for(const row of prepared){expect(row.descriptor.default_text_value).toBeNull();expect(row.validation_rule.operator).toBe('contract_schema');expect(row).not.toHaveProperty('configuration_definition_id');}
 });
});
