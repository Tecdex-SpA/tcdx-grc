import { buildApp } from "./app.js";
import { loadConfig } from "./config.js";
import { createDatabase, databaseReady } from "./database.js";

const config = loadConfig(process.env);
const database = createDatabase(config);
const app = buildApp(() => databaseReady(database));

let shuttingDown = false;

async function shutdown(signal: string): Promise<void> {
  if (shuttingDown) return;
  shuttingDown = true;

  app.log.info({ signal }, "shutdown requested");

  try {
    await app.close();
  } finally {
    await database.destroy();
  }
}

process.once("SIGTERM", () => {
  void shutdown("SIGTERM").finally(() => process.exit(0));
});

process.once("SIGINT", () => {
  void shutdown("SIGINT").finally(() => process.exit(0));
});

try {
  await app.listen({
    host: "0.0.0.0",
    port: config.port
  });
} catch (error) {
  await database.destroy();
  throw error;
}
