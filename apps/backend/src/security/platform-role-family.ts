// Rector42 -> executable24/OpenAPI PlatformRoleCode. This defines the functional
// family only; publication/baseline eligibility always comes from iam.roles.
export const platformRoleFamilyCodes = ["PLATFORM_ADMIN", "PLATFORM_SUPPORT"] as const;
export const platformRoleFamily = new Set<string>(platformRoleFamilyCodes);
