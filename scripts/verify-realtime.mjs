// End-to-end verification of the realtime transcription pipeline without a
// browser microphone: mint an ephemeral secret via the app's API route,
// generate real speech with OpenAI TTS, stream it over the realtime
// WebSocket, and assert transcription events arrive.
//
// Preconditions: `npm run dev` running on :3000, OPENAI_API_KEY in .env,
// Node >= 22 (global WebSocket, fetch).

import { readFileSync } from "node:fs";

const APP_URL = process.env.APP_URL ?? "http://localhost:3000";
const REALTIME_WSS_URL = "wss://api.openai.com/v1/realtime";
const SPOKEN_TEXT = "The quarterly report is due on Friday.";
const EXPECTED_WORD = "friday";
const TIMEOUT_MS = 60_000;
const SAMPLES_PER_CHUNK = 2400; // 100ms at 24kHz

function apiKeyFromEnvFile() {
  if (process.env.OPENAI_API_KEY) return process.env.OPENAI_API_KEY;
  try {
    const match = readFileSync(new URL("../.env", import.meta.url), "utf8")
      .split("\n")
      .map((line) => line.trim().replace(/^export\s+/, ""))
      .find((line) => line.startsWith("OPENAI_API_KEY="));
    return match
      ?.slice("OPENAI_API_KEY=".length)
      .trim()
      .replace(/^["']|["']$/g, "");
  } catch {
    return undefined;
  }
}

function fail(message) {
  console.error(`✗ ${message}`);
  process.exit(1);
}

const timeout = setTimeout(() => fail("Timed out after 60s"), TIMEOUT_MS);

// 1. Mint an ephemeral secret through the app route.
const secretResponse = await fetch(`${APP_URL}/api/realtime-secret`, {
  method: "POST",
});
if (!secretResponse.ok) {
  fail(`/api/realtime-secret returned ${secretResponse.status}`);
}
const secret = await secretResponse.json();
if (!secret.value?.startsWith("ek_")) {
  fail(`secret value does not look ephemeral: ${String(secret.value).slice(0, 6)}…`);
}
console.log(`✓ minted ephemeral secret (model ${secret.model}, expires ${new Date(secret.expiresAt).toISOString()})`);

// 2. Generate real speech as 24kHz mono PCM16.
const apiKey = apiKeyFromEnvFile();
if (!apiKey) fail("No OPENAI_API_KEY available for TTS generation");
const ttsResponse = await fetch("https://api.openai.com/v1/audio/speech", {
  method: "POST",
  headers: {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    model: "gpt-4o-mini-tts",
    voice: "alloy",
    input: SPOKEN_TEXT,
    response_format: "pcm",
  }),
});
if (!ttsResponse.ok) fail(`TTS request failed: ${ttsResponse.status}`);
const pcmBytes = new Uint8Array(await ttsResponse.arrayBuffer());
console.log(`✓ generated ${pcmBytes.length} bytes of 24kHz PCM speech`);

// 3. Connect the realtime WebSocket with the ephemeral secret.
const ws = new WebSocket(REALTIME_WSS_URL, [
  "realtime",
  `openai-insecure-api-key.${secret.value}`,
]);

const eventTypesSeen = new Set();
let sawDelta = false;

ws.addEventListener("open", () => {
  console.log("✓ websocket open");
});

ws.addEventListener("error", () => fail("websocket error"));
ws.addEventListener("close", (event) => {
  if (!eventTypesSeen.has("conversation.item.input_audio_transcription.completed")) {
    fail(`websocket closed early (code ${event.code})`);
  }
});

function base64Chunk(bytes) {
  return Buffer.from(bytes).toString("base64");
}

async function streamAudio() {
  const bytesPerChunk = SAMPLES_PER_CHUNK * 2;
  for (let offset = 0; offset < pcmBytes.length; offset += bytesPerChunk) {
    ws.send(
      JSON.stringify({
        type: "input_audio_buffer.append",
        audio: base64Chunk(pcmBytes.subarray(offset, offset + bytesPerChunk)),
      }),
    );
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  // ~1.5s of silence so server VAD ends the turn.
  const silence = new Uint8Array(bytesPerChunk);
  for (let i = 0; i < 15; i++) {
    ws.send(
      JSON.stringify({
        type: "input_audio_buffer.append",
        audio: base64Chunk(silence),
      }),
    );
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  console.log("✓ finished streaming audio + silence");
}

ws.addEventListener("message", (message) => {
  const event = JSON.parse(message.data);
  eventTypesSeen.add(event.type);

  switch (event.type) {
    case "session.created": {
      const sessionType = event.session?.type;
      console.log(`✓ session.created (session.type = ${sessionType})`);
      if (sessionType !== "transcription") {
        fail(`expected a transcription session, got ${sessionType}`);
      }
      void streamAudio();
      break;
    }
    case "conversation.item.input_audio_transcription.delta":
      if (!sawDelta) {
        sawDelta = true;
        console.log("✓ first transcription delta received");
      }
      break;
    case "conversation.item.input_audio_transcription.completed": {
      const transcript = event.transcript ?? "";
      console.log(`✓ completed transcript: "${transcript}"`);
      console.log(`  events seen: ${[...eventTypesSeen].join(", ")}`);
      if (!transcript.toLowerCase().includes(EXPECTED_WORD)) {
        fail(`transcript does not mention "${EXPECTED_WORD}"`);
      }
      console.log("✓ PASS — realtime transcription pipeline works end to end");
      clearTimeout(timeout);
      ws.close(1000);
      process.exit(0);
      break;
    }
    case "error":
      console.error("server error event:", event.error);
      break;
    default:
      break;
  }
});
