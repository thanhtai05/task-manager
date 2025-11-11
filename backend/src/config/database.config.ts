import mongoose from "mongoose";
import path from "path";
import fs from "fs";
import { config } from "./app.config";
import { MongoMemoryReplSet } from "mongodb-memory-server";

// Add IPv4 normalization for localhost URIs to avoid ::1 issues
const normalizeLocalUri = (uri: string) => {
  try {
    const u = new URL(uri);
    if (u.hostname === "localhost") {
      u.hostname = "127.0.0.1";
      return u.toString();
    }
  } catch {}
  return uri;
};

const connectDatabase = async () => {
  try {
    if (config.MONGO_URI) {
      const uri = normalizeLocalUri(config.MONGO_URI);
      await mongoose.connect(uri);
      console.log("Connected to Mongo database");
      return;
    }
    throw new Error("No MONGO_URI provided");
  } catch (error: any) {
    console.log("Error connecting to Mongo database:", error?.message || error);

    // Try IPv4 fallback if user provided a localhost URI
    if (config.MONGO_URI && config.MONGO_URI.includes("localhost")) {
      try {
        const ipv4Uri = config.MONGO_URI.replace("localhost", "127.0.0.1");
        await mongoose.connect(ipv4Uri);
        console.log("Connected to Mongo via IPv4 fallback (127.0.0.1)");
        return;
      } catch (err: any) {
        console.log("IPv4 fallback failed:", err?.message || err);
      }
    }

    const useMemory =
      config.NODE_ENV === "development" || process.env.MONGO_USE_MEMORY === "true";
    if (useMemory) {
      console.log("Starting in-memory MongoDB Replica Set for development...");
      const memoryPort = Number(process.env.MONGO_MEMORY_PORT || 27017);
      const dbPathEnv = process.env.MONGO_MEMORY_DBPATH;
      const dbPath = dbPathEnv ? path.resolve(process.cwd(), dbPathEnv) : undefined;
      if (dbPath && !fs.existsSync(dbPath)) {
        fs.mkdirSync(dbPath, { recursive: true });
      }
      const replset = await MongoMemoryReplSet.create({
        replSet: { count: 1, storageEngine: "wiredTiger" },
        instanceOpts: [{ port: memoryPort, dbPath }],
      });
      const uri = replset.getUri("task_manager");
      await mongoose.connect(uri);
      console.log(`Connected to in-memory MongoDB (Replica Set) on 127.0.0.1:${memoryPort}${dbPath ? ` with dbPath ${dbPath}` : ""} using DB 'task_manager'`);
      return;
    }
    process.exit(1);
  }
};

export default connectDatabase;
