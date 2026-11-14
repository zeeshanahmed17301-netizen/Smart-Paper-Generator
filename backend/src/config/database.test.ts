import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  connect: vi.fn().mockResolvedValue(undefined),
  dnsServers: ["192.0.2.1", "192.0.2.2"],
  setServers: vi.fn(),
}));

vi.mock("node:dns", () => ({
  setServers: mocks.setServers,
}));

vi.mock("mongoose", () => ({
  default: {
    connect: mocks.connect,
  },
}));

vi.mock("./env.js", () => ({
  env: {
    MONGODB_DNS_SERVERS: mocks.dnsServers,
    MONGODB_URI: "mongodb://example.test/papers",
  },
}));

import mongoose from "mongoose";
import { setServers } from "node:dns";
import { connectToDatabase } from "./database.js";

describe("database connection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("sets the configured DNS servers before connecting", async () => {
    await connectToDatabase();

    expect(setServers).toHaveBeenCalledWith(mocks.dnsServers);
    expect(mongoose.connect).toHaveBeenCalledWith("mongodb://example.test/papers");
    expect(setServers.mock.invocationCallOrder[0]).toBeLessThan(
      vi.mocked(mongoose.connect).mock.invocationCallOrder[0],
    );
  });
});
