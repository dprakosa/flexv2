import {
  AutoProcessor,
  AutoTokenizer,
  CLIPTextModelWithProjection,
  CLIPVisionModelWithProjection,
  RawImage,
  type PreTrainedTokenizer,
  type Processor,
} from "@xenova/transformers";

// Small/fast CLIP variant — runs locally via ONNX, no API key, no hosted cost.
const MODEL_ID = "Xenova/clip-vit-base-patch32";

type ClipPipeline = {
  tokenizer: PreTrainedTokenizer;
  processor: Processor;
  textModel: CLIPTextModelWithProjection;
  visionModel: CLIPVisionModelWithProjection;
};

let pipelinePromise: Promise<ClipPipeline> | null = null;

function loadPipeline(): Promise<ClipPipeline> {
  pipelinePromise ??= (async () => ({
    tokenizer: await AutoTokenizer.from_pretrained(MODEL_ID),
    processor: await AutoProcessor.from_pretrained(MODEL_ID),
    textModel: await CLIPTextModelWithProjection.from_pretrained(MODEL_ID),
    visionModel: await CLIPVisionModelWithProjection.from_pretrained(MODEL_ID),
  }))();
  return pipelinePromise;
}

function cosineSimilarity(a: Float32Array, b: Float32Array): number {
  let dot = 0;
  let magA = 0;
  let magB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    magA += a[i] * a[i];
    magB += b[i] * b[i];
  }
  return dot / (Math.sqrt(magA) * Math.sqrt(magB));
}

async function embedText(text: string): Promise<Float32Array> {
  const { tokenizer, textModel } = await loadPipeline();
  const inputs = tokenizer(text, { padding: true, truncation: true });
  const { text_embeds } = await textModel(inputs);
  return text_embeds.data as Float32Array;
}

async function embedImage(imageUrl: string): Promise<Float32Array | undefined> {
  const { processor, visionModel } = await loadPipeline();

  try {
    const image = await RawImage.fromURL(imageUrl);
    const inputs = await processor(image);
    const { image_embeds } = await visionModel(inputs);
    return image_embeds.data as Float32Array;
  } catch (error) {
    console.error("[clip] failed to embed candidate image:", imageUrl, error);
    return undefined;
  }
}

export type ClipCandidate = { imageUrl: string; sourceUrl: string };
export type ClipScoredCandidate = ClipCandidate & { score: number };

// Ranks candidates by how well each image actually matches the query text,
// using local CLIP embeddings — no external API call, no key required.
// Candidates whose image can't be fetched/decoded are dropped, not scored 0
// (a fetch failure isn't evidence of irrelevance).
export async function rankCandidatesByClipSimilarity(
  query: string,
  candidates: ClipCandidate[],
): Promise<ClipScoredCandidate[]> {
  const queryEmbedding = await embedText(query);

  const scored = await Promise.all(
    candidates.map(async (candidate) => {
      const imageEmbedding = await embedImage(candidate.imageUrl);
      if (!imageEmbedding) return undefined;
      return { ...candidate, score: cosineSimilarity(queryEmbedding, imageEmbedding) };
    }),
  );

  return scored
    .filter((entry): entry is ClipScoredCandidate => entry !== undefined)
    .sort((a, b) => b.score - a.score);
}
