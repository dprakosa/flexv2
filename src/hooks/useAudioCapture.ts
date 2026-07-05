"use client";

import { useCallback, useState } from "react";

import { isDesktop } from "@/lib/desktop";

export type AudioCaptureSource = "tab" | "file" | null;

export function useAudioCapture() {
  const [source, setSource] = useState<AudioCaptureSource>(null);
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [micStream, setMicStream] = useState<MediaStream | null>(null);
  const [file, setFile] = useState<File | null>(null);

  const stopCapture = useCallback(() => {
    stream?.getTracks().forEach((track) => track.stop());
    micStream?.getTracks().forEach((track) => track.stop());
    setStream(null);
    setMicStream(null);
    setFile(null);
    setSource(null);
    setError(null);
    setWarning(null);
  }, [stream, micStream]);

  const startTabCapture = useCallback(async () => {
    setError(null);
    setWarning(null);

    try {
      const mediaStream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: true,
      });

      setStream(mediaStream);
      setSource("tab");

      if (mediaStream.getAudioTracks().length === 0) {
        setWarning("Screen only — no system audio on this platform");
      }

      mediaStream.getVideoTracks()[0]?.addEventListener("ended", () => {
        mediaStream.getTracks().forEach((track) => track.stop());
        setStream(null);
        setFile(null);
        setSource(null);
      });

      return mediaStream;
    } catch (err) {
      const message = isDesktop()
        ? "Screen capture failed — check screen-recording permissions"
        : err instanceof Error
          ? err.message
          : "Tab audio capture failed";
      setError(message);
      throw err;
    }
  }, []);

  const startMicFallback = useCallback(async (options?: { isFallback?: boolean }) => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      setMicStream(mediaStream);
      if (options?.isFallback !== false) {
        setWarning("No system audio — using your microphone instead");
      }
      return mediaStream;
    } catch (err) {
      const name = err instanceof DOMException ? err.name : "";
      const message =
        name === "NotAllowedError" || name === "PermissionDeniedError"
          ? "Microphone access denied — allow the microphone to get live captions"
          : name === "NotFoundError"
            ? "No microphone found"
            : "Microphone capture failed";
      setError(message);
      throw new Error(message);
    }
  }, []);

  const startFileCapture = useCallback(async (selectedFile: File) => {
    setError(null);
    setFile(selectedFile);
    setSource("file");
    return selectedFile;
  }, []);

  return {
    source,
    error,
    warning,
    stream,
    file,
    startTabCapture,
    startMicFallback,
    startFileCapture,
    stopCapture,
  };
}
