/** Commercial presentation only; provider, realm and client identifiers stay technical. */
export const brandNames = {
  product: "Tecdex GRC",
  managedIdentity: "Tecdex Managed Identity"
} as const;

export function BrandLogo() {
  return <img src="/tecdex-logo-light.svg" alt="Tecdex"/>;
}
