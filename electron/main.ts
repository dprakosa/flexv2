import path from "node:path";

import {
  BrowserWindow,
  app,
  desktopCapturer,
  dialog,
  globalShortcut,
  ipcMain,
  session,
  shell,
} from "electron";

import { startNextServer, type NextServerHandle } from "./server";

const isDev = process.env.ELECTRON_DEV === "1";

let mainWindow: BrowserWindow | null = null;
let serverHandle: NextServerHandle | null = null;

function setupDisplayMediaHandler() {
  session.defaultSession.setDisplayMediaRequestHandler(
    async (_request, callback) => {
      try {
        const sources = await desktopCapturer.getSources({
          types: ["screen"],
        });

        if (!sources[0]) {
          callback({});
          return;
        }

        callback({
          video: sources[0],
          // Loopback system audio is unsupported on Linux; requesting it
          // there fails the whole capture, so the stream stays video-only.
          audio: process.platform === "linux" ? undefined : "loopback",
        });
      } catch {
        callback({});
      }
    },
    { useSystemPicker: false },
  );
}

function createWindow(appUrl: string) {
  mainWindow = new BrowserWindow({
    width: 1100,
    height: 760,
    minWidth: 720,
    minHeight: 560,
    autoHideMenuBar: true,
    backgroundColor: "#ffffff",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    void shell.openExternal(url);
    return { action: "deny" };
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
  });

  void mainWindow.loadURL(appUrl);
}

function registerShortcuts() {
  globalShortcut.register("CommandOrControl+Shift+L", () => {
    mainWindow?.webContents.send("desktop:mark-lost");
  });
}

function registerIpcHandlers() {
  ipcMain.handle("desktop:set-always-on-top", (_event, flag: boolean) => {
    mainWindow?.setAlwaysOnTop(Boolean(flag), "floating");
  });

  ipcMain.handle(
    "desktop:get-always-on-top",
    () => mainWindow?.isAlwaysOnTop() ?? false,
  );
}

async function resolveAppUrl(): Promise<string> {
  if (isDev) {
    return process.env.ELECTRON_DEV_URL ?? "http://localhost:3000";
  }

  serverHandle = await startNextServer(
    path.join(process.resourcesPath, "next"),
  );
  return `http://127.0.0.1:${serverHandle.port}`;
}

const hasSingleInstanceLock = app.requestSingleInstanceLock();

if (!hasSingleInstanceLock) {
  app.quit();
} else {
  app.on("second-instance", () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) {
        mainWindow.restore();
      }
      mainWindow.focus();
    }
  });

  app
    .whenReady()
    .then(async () => {
      setupDisplayMediaHandler();
      registerIpcHandlers();

      const appUrl = await resolveAppUrl();
      createWindow(appUrl);
      registerShortcuts();

      app.on("activate", () => {
        if (BrowserWindow.getAllWindows().length === 0) {
          createWindow(appUrl);
        }
      });
    })
    .catch((error: unknown) => {
      dialog.showErrorBox(
        "Failed to start",
        error instanceof Error ? error.message : String(error),
      );
      app.quit();
    });

  app.on("window-all-closed", () => {
    app.quit();
  });

  app.on("before-quit", () => {
    serverHandle?.kill();
    serverHandle = null;
  });

  app.on("will-quit", () => {
    globalShortcut.unregisterAll();
  });
}
