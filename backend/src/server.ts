import { app } from "./app.js";
import { connectToDatabase } from "./config/database.js";
import { env } from "./config/env.js";

async function startServer(): Promise<void> {
  await connectToDatabase();
  app.listen(env.PORT, () => {
    console.info(`API listening on http://localhost:${env.PORT}`);
  });
}

startServer().catch((error: unknown) => {
  console.error("Unable to start the API server:", error);
  process.exitCode = 1;
});
