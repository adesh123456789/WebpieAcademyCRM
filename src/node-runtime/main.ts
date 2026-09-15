import { createServer } from "node:http";
import { join } from "node:path";
import { toNodeHandler } from "@/lib/node/http-adapter";
import { createNodeApi } from "@/lib/node/node-api";
import { SqliteNodeStore } from "@/lib/node/sqlite-store";
import { OfflineSession } from "@/lib/node/offline-session";
import { makeNodeTransport } from "@/lib/node/transport";

/**
 * EDGE-001 - the Windows Academic Node process. A thin wrapper: everything
 * that matters (offline capture, local scoring, the durable store, signed
 * sync) already exists as a tested library (`src/lib/node/**`) - this file
 * only wires it to a real port and a background sync timer.
 *
 * Run with `npm run node:start` (via `tsx`, no separate build step for dev).
 * Packaging this into a distributable Windows executable/installer - a
 * signed update manifest + rollback path, a system-tray presence, and
 * running as an actual Windows service rather than a foreground process -
 * is still open; see the EDGE-001 handoff for what that needs.
 *
 * Config is env-only, matching the rest of this repo's convention:
 *   NODE_PORT             - local API port (default 4173)
 *   NODE_DATA_DIR          - where node.sqlite lives (default ./node-data)
 *   NODE_CLOUD_BASE_URL    - the cloud this node syncs against
 *   NODE_ENCRYPTION_KEY    - required; seals the pairing token at rest
 *   NODE_SYNC_INTERVAL_MS  - background auto-sync cadence (default 60000)
 */

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`${name} is required`);
  return v;
}

async function main() {
  const port = Number(process.env.NODE_PORT || "4173");
  const dataDir = process.env.NODE_DATA_DIR || "./node-data";
  const cloudBaseUrl = (process.env.NODE_CLOUD_BASE_URL || "http://localhost:3000").replace(/\/$/, "");
  const encryptionKey = requireEnv("NODE_ENCRYPTION_KEY");
  const syncIntervalMs = Number(process.env.NODE_SYNC_INTERVAL_MS || "60000");

  const store = new SqliteNodeStore(join(dataDir, "node.sqlite"), { encryptionKey });
  const session = new OfflineSession(store, { path: dataDir });
  const api = createNodeApi({ store, session, cloudBaseUrl });

  const server = createServer(toNodeHandler(api));
  await new Promise<void>((resolve) => server.listen(port, resolve));
  const pairing = store.getPairing();
  console.log(
    `Academic Node listening on http://localhost:${port} (cloud: ${cloudBaseUrl}) - ${
      pairing ? `paired as ${pairing.nodeId}` : "not paired - POST /pair to begin"
    }`,
  );

  // Best-effort background sync: never lets a failed cloud round-trip crash
  // the process - the node stays useful offline regardless.
  const timer = setInterval(async () => {
    const p = store.getPairing();
    if (!p) return;
    try {
      const transport = makeNodeTransport({ baseUrl: cloudBaseUrl, pairingToken: p.token });
      const result = await session.reconnect({ pull: transport.pull, push: transport.push });
      if (result.pulled || result.delivered.length) {
        console.log(`[sync] pulled ${result.pulled}, delivered ${result.delivered.length}, retained ${result.retained}`);
      }
    } catch (err) {
      console.error("[sync] background sync failed:", (err as Error).message);
    }
  }, syncIntervalMs);
  timer.unref(); // never keeps the process alive on its own

  const shutdown = (signal: string) => {
    console.log(`\nAcademic Node shutting down (${signal})`);
    clearInterval(timer);
    server.close(() => {
      store.close();
      process.exit(0);
    });
  };
  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));
}

main().catch((err) => {
  console.error("Academic Node failed to start:", err);
  process.exit(1);
});
