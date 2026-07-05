export type DesktopBridge = {
  isDesktop: boolean;
  onMarkLost: (callback: () => void) => () => void;
  setAlwaysOnTop: (flag: boolean) => Promise<void>;
  getAlwaysOnTop: () => Promise<boolean>;
};

declare global {
  interface Window {
    desktop?: DesktopBridge;
  }
}

export {};
