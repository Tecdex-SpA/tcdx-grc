import { describe, expect, it } from "vitest";
import { tenantUserOnboardingInput, onboardingUuid } from "./tenant-user-onboarding.js";
import { newUuidV7 } from "../uuid.js";
const valid = () => ({ user_identity_id: newUuidV7(),tenant_role_codes: ["VIEWER","EVIDENCE_OWNER"],reason: "Verified person access" });
describe("Central Platform onboarding closed input",()=>{
  it("canonicalizes codes and reason while preserving canonical target identity",()=>{
    const input=valid();expect(tenantUserOnboardingInput({...input,reason:' Verified access '})).toEqual({...input,tenant_role_codes:['EVIDENCE_OWNER','VIEWER'],reason:'Verified access'});
    expect(tenantUserOnboardingInput({...input,tenant_role_codes:[]})).toMatchObject({tenant_role_codes:[]});
  });
  it.each(['email','username','tenant_id','actor_id','identity_key','issuer','subject','password','credentials','bootstrap','subscription','role_id'])("rejects unauthorized %s input",field=>{
    expect(()=>tenantUserOnboardingInput({...valid(),[field]:'forbidden'})).toThrow();
  });
  it.each([undefined,null,[],{}, {user_identity_id:newUuidV7()}, {...valid(),reason:' '}, {...valid(),reason:'x'.repeat(2001)},
    {...valid(),tenant_role_codes:['VIEWER','VIEWER']}, {...valid(),tenant_role_codes:[' ']}, {...valid(),tenant_role_codes:[1]},
    {...valid(),user_identity_id:'person@example.test'}, {...valid(),user_identity_id:'person.user'}])("rejects malformed or incomplete input %#",input=>{
    expect(()=>tenantUserOnboardingInput(input)).toThrow();
  });
  it.each([undefined,'person@example.test','username','00000000-0000-4000-8000-000000000001'])("requires explicit canonical UUIDv7 target %#",id=>{
    expect(()=>onboardingUuid(id)).toThrow();
  });
});
