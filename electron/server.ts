import http from "node:http";
import net from "node:net";
import path from "node:path";

import { utilityProcess } from "electron";

const SERVER_READY_TIMEOUT_MS = 15_000;
const SERVER_POLL_INTERVAL_MS = 100;

export type NextServerHandle = {
  port: number;
  kill: () => void;
};

function getFreePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      if (address === null || typeof address === "string") {
        server.close(() => reject(new Error("Could not allocate a port")));
        return;
      }
      const { port } = address;
      server.close(() => resolve(port));
    });
  });
}

function pingServer(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const request = http.get(
      { host: "127.0.0.1", port, path: "/", timeout: 1_000 },
      (response) => {
        response.resume();
        resolve(true);
      },
    );
    request.on("error", () => resolve(false));
    request.on("timeout", () => {
      request.destroy();
      resolve(false);
    });
  });
}

function waitForServer(port: number): Promise<void> {
  const deadline = Date.now() + SERVER_READY_TIMEOUT_MS;

  return new Promise((resolve, reject) => {
    const poll = async () => {
      if (await pingServer(port)) {
        resolve();
        return;
      }
      if (Date.now() > deadline) {
        reject(new Error("The bundled app server did not start in time."));
        return;
      }
      setTimeout(poll, SERVER_POLL_INTERVAL_MS);
    };
    void poll();
  });
}

export async function startNextServer(
  serverDir: string,
): Promise<NextServerHandle> {
  const port = await getFreePort();

  const child = utilityProcess.fork(path.join(serverDir, "server.js"), [], {
    cwd: serverDir,
    stdio: "pipe",
    env: {
      ...process.env,
      PORT: String(port),
      HOSTNAME: "127.0.0.1",
      NODE_ENV: "production",
    },
  });

  child.stdout?.on("data", (data: Buffer) => {
    console.log(`[next] ${data.toString().trimEnd()}`);
  });
  child.stderr?.on("data", (data: Buffer) => {
    console.error(`[next] ${data.toString().trimEnd()}`);
  });

  await waitForServer(port);

  return {
    port,
    kill: () => {
      child.kill();
    },
  };
}
