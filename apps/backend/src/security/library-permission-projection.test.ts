import {describe,it,expect} from 'vitest';
import {NORMATIVE_LIBRARY} from '@tcdx-grc/contracts/normative-library';
import {permissionProjectionCatalog} from './permission-projection-catalog.generated.js';

describe('effective Library permission presentation projection',()=>{
 it.each(NORMATIVE_LIBRARY.permissions.catalogue_delta)('projects only approved contexts for $code',permission=>{
  expect(permissionProjectionCatalog[permission.code]).toEqual({
   capabilities:[permission.capability],
   scopes:['platform','tenant'].filter(scope=>permission.contract_grants.some(grant=>grant.scope===scope))
  });
 });
 it('does not infer Platform matrix or tenant managed-identity authority',()=>{
  expect(permissionProjectionCatalog['reporting.matrix.read']?.scopes).toEqual(['tenant']);
  expect(permissionProjectionCatalog['platform.managed_identity.administer']?.scopes).toEqual(['platform']);
 });
});
