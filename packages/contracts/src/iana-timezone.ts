/** STEP6A3 D3: named IANA identifiers, including database links such as UTC.
 * Offset literals are not tenant IANA identifiers. No normalization or default.
 */
export function isIanaTimezone(value: unknown): value is string {
  if (typeof value !== "string" || value.length < 1 || value.length > 64 || /^[+-]/.test(value)) return false;
  try { new Intl.DateTimeFormat("en", { timeZone: value }); return true; }
  catch { return false; }
}
