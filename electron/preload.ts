import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("desktop", {
  isDesktop: true,
  onMarkLost: (callback: () => void) => {
    const listener = () => callback();
    ipcRenderer.on("desktop:mark-lost", listener);
    return () => {
      ipcRenderer.removeListener("desktop:mark-lost", listener);
    };
  },
  setAlwaysOnTop: (flag: boolean): Promise<void> =>
    ipcRenderer.invoke("desktop:set-always-on-top", flag),
  getAlwaysOnTop: (): Promise<boolean> =>
    ipcRenderer.invoke("desktop:get-always-on-top"),
});
