import {describe,expect,it} from 'vitest';
import {loadConfig} from './config.js';
import {postgresPoolConfig} from './database.js';
const certificate='docs/phase6a/NORMATIVE_LIBRARY_IMPLEMENTATION_20261020/qa-adoption-verify-full-20261021/QA_ADMINISTRATIVE_PUBLIC_CERT.pem';
describe('QA backend verified database identity',()=>{
 it('requires an explicit approved CA for verify-full',()=>{
  expect(()=>loadConfig({DATABASE_USER:'fixture',DATABASE_SSL_MODE:'verify-full'})).toThrow('DATABASE_SSL_ROOT_CERT');
 });
 it('preserves logical certificate identity while connecting to the literal address',()=>{
  const c=loadConfig({DATABASE_USER:'fixture',DATABASE_HOST:'db-tecdex',DATABASE_HOSTADDR:'192.168.2.40',DATABASE_SSL_MODE:'verify-full',DATABASE_SSL_ROOT_CERT:certificate});
  expect(postgresPoolConfig(c)).toMatchObject({host:'192.168.2.40',ssl:{rejectUnauthorized:true,servername:'db-tecdex',ca:expect.stringContaining('BEGIN CERTIFICATE')}});
 });
 it('rejects address overrides with an unverified mode or a nonliteral address',()=>{
  expect(()=>loadConfig({DATABASE_USER:'fixture',DATABASE_HOSTADDR:'192.168.2.40',DATABASE_SSL_MODE:'no-verify'})).toThrow('requires verify-full');
  const c=loadConfig({DATABASE_USER:'fixture',DATABASE_HOSTADDR:'unapproved.example',DATABASE_SSL_MODE:'verify-full',DATABASE_SSL_ROOT_CERT:certificate});
  expect(()=>postgresPoolConfig(c)).toThrow('literal address');
 });
});
