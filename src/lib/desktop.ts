export function isDesktop(): boolean {
  return typeof window !== "undefined" && window.desktop?.isDesktop === true;
}

export function onMarkLost(callback: () => void): () => void {
  if (typeof window === "undefined" || !window.desktop) {
    return () => {};
  }
  return window.desktop.onMarkLost(callback);
}

export async function setAlwaysOnTop(flag: boolean): Promise<void> {
  await window.desktop?.setAlwaysOnTop(flag);
}

export async function getAlwaysOnTop(): Promise<boolean> {
  return (await window.desktop?.getAlwaysOnTop()) ?? false;
}
