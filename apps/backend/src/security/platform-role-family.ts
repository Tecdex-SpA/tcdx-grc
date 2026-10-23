import data from '../regulatory/runtime-bindings-contract.generated.json' with {type:'json'};
// Effective P1 successor: same canonical role definitions and assignment service.
export const platformRoleFamilyCodes:readonly string[] = ["PLATFORM_ADMIN", "PLATFORM_SUPPORT",...data.contract.global_content_roles];
export const platformRoleFamily = new Set<string>(platformRoleFamilyCodes);

// These roles have no tenant assignment meaning; content roles remain canonical in both explicit scopes.
export const platformExclusiveRoleCodes:readonly string[] = ["PLATFORM_ADMIN", "PLATFORM_SUPPORT"];
export const platformExclusiveRoles = new Set<string>(platformExclusiveRoleCodes);
