// OpenAI Realtime transcription — client-safe types, constants, and helpers.

// Streaming model: emits partial deltas so the in-progress caption line
// renders while someone speaks. (whisper-1 would only send completed
// segments — text lands in a lump after each pause.)
export const DEFAULT_TRANSCRIBE_MODEL = "gpt-4o-mini-transcribe";
export const DEFAULT_TRANSCRIBE_LANGUAGE = "en";

// The transcription session config is bound to the ephemeral client secret,
// so the URL carries no params. (Fallback if the server ever rejects this:
// append ?intent=transcription.)
export const REALTIME_WSS_URL = "wss://api.openai.com/v1/realtime";

export type RealtimeSecretResponse = {
  value: string;
  expiresAt: number;
  model: string;
};

// Browsers can't set an Authorization header on a WebSocket; the realtime
// endpoint reads the ephemeral secret from this subprotocol instead (the
// same mechanism openai-js uses; ek_ secrets are sanctioned for browsers).
export function realtimeSubprotocols(clientSecret: string): string[] {
  return ["realtime", `openai-insecure-api-key.${clientSecret}`];
}

const BASE64_CHUNK_BYTES = 8192;

export function pcm16ToBase64(samples: Int16Array): string {
  const bytes = new Uint8Array(
    samples.buffer,
    samples.byteOffset,
    samples.byteLength,
  );
  let binary = "";
  for (let offset = 0; offset < bytes.length; offset += BASE64_CHUNK_BYTES) {
    binary += String.fromCharCode(
      ...bytes.subarray(offset, offset + BASE64_CHUNK_BYTES),
    );
  }
  return btoa(binary);
}
