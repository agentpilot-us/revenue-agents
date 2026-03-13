import { experimental_generateVideo as generateVideo } from 'ai';

export type GenerateVideoInput = {
  prompt: string;
  modelId?: string;
  aspectRatio?: string;
  durationSeconds?: number;
};

export type GeneratedVideoAsset = {
  assetKind: 'video';
  base64: string;
  mimeType: string;
  filename: string;
  promptUsed: string;
  aspectRatio?: string;
  durationSeconds?: number;
};

function requireGatewayKey() {
  if (!process.env.AI_GATEWAY_API_KEY) {
    throw new Error(
      'AI Gateway video generation requires AI_GATEWAY_API_KEY.',
    );
  }
}

function clampDuration(durationSeconds?: number): number | undefined {
  if (!durationSeconds || Number.isNaN(durationSeconds)) return undefined;
  return Math.min(Math.max(Math.round(durationSeconds), 4), 8);
}

function toAspectRatio(value?: string): `${number}:${number}` | undefined {
  if (!value) return undefined;
  return /^\d+:\d+$/.test(value) ? (value as `${number}:${number}`) : undefined;
}

export async function generateVideoAsset({
  prompt,
  modelId = process.env.GATEWAY_VIDEO_MODEL ?? 'google/veo-3.1-generate-001',
  aspectRatio,
  durationSeconds,
}: GenerateVideoInput): Promise<GeneratedVideoAsset> {
  requireGatewayKey();

  const promptUsed = prompt.trim();
  const resolvedDuration = clampDuration(durationSeconds);
  const result = await generateVideo({
    model: modelId,
    prompt: promptUsed,
    aspectRatio: toAspectRatio(aspectRatio?.trim()),
    duration: resolvedDuration,
  });

  const video = result.videos?.[0];
  if (!video?.uint8Array) {
    throw new Error('The AI Gateway video model did not return a video file.');
  }

  const mimeType = video.mediaType ?? 'video/mp4';
  const extension = mimeType.split('/')[1] || 'mp4';

  return {
    assetKind: 'video',
    base64: Buffer.from(video.uint8Array).toString('base64'),
    mimeType,
    filename: `generated-video.${extension}`,
    promptUsed,
    aspectRatio: aspectRatio?.trim() || undefined,
    durationSeconds: resolvedDuration,
  };
}
