// Desktop dev launcher: reuses a running `next dev` (Next allows only one
// dev server per project) or starts its own, then opens Electron against it.
import { spawn } from "node:child_process";
import http from "node:http";

const PORT = 3000;
const URL = `http://localhost:${PORT}`;
const READY_TIMEOUT_MS = 30_000;

function ping() {
  return new Promise((resolve) => {
    const request = http.get(URL, (response) => {
      response.resume();
      resolve(true);
    });
    request.on("error", () => resolve(false));
    request.setTimeout(1_000, () => {
      request.destroy();
      resolve(false);
    });
  });
}

async function waitForServer() {
  const deadline = Date.now() + READY_TIMEOUT_MS;
  while (Date.now() < deadline) {
    if (await ping()) return;
    await new Promise((resolve) => setTimeout(resolve, 300));
  }
  throw new Error(`next dev did not become ready on ${URL}`);
}

let devServer = null;

if (await ping()) {
  console.log(`[dev-desktop] Reusing dev server at ${URL}`);
} else {
  console.log("[dev-desktop] Starting next dev...");
  devServer = spawn("npx", ["next", "dev", "-p", String(PORT)], {
    stdio: "inherit",
  });
  await waitForServer();
}

const electron = spawn("npx", ["electron", "."], {
  stdio: "inherit",
  env: {
    ...process.env,
    ELECTRON_DEV: "1",
    ELECTRON_DEV_URL: URL,
    // Ubuntu 24.04+ restricts unprivileged user namespaces and the SUID
    // sandbox helper needs root setup; dev runs unsandboxed instead.
    ...(process.platform === "linux" ? { ELECTRON_DISABLE_SANDBOX: "1" } : {}),
  },
});

electron.on("exit", (code) => {
  if (devServer) devServer.kill();
  process.exit(code ?? 0);
});
