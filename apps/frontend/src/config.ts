export type FrontendEnvironment = Record<string, string | undefined>;

export function frontendConfig(environment: FrontendEnvironment) {
  const apiOrigin = environment.VITE_API_ORIGIN ?? "https://grc-bk.tcdx.int";
  const parsed = new URL(apiOrigin);
  if (parsed.protocol !== "https:" && parsed.hostname !== "localhost" && parsed.hostname !== "127.0.0.1") {
    throw new Error("Frontend API origin must use HTTPS outside local development");
  }
  return { apiOrigin: parsed.origin };
}
