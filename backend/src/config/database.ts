import { setServers } from "node:dns";
import mongoose from "mongoose";
import { env } from "./env.js";

export async function connectToDatabase(): Promise<void> {
  if (env.MONGODB_DNS_SERVERS) {
    setServers(env.MONGODB_DNS_SERVERS);
  }

  await mongoose.connect(env.MONGODB_URI);
  console.info("Connected to MongoDB.");
}
