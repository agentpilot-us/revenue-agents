import { generateText } from 'ai';

export type GenerateImageInput = {
  prompt: string;
  modelId?: string;
  aspectRatio?: string;
};

export type GeneratedImageAsset = {
  assetKind: 'image';
  base64: string;
  mimeType: string;
  filename: string;
  promptUsed: string;
  aspectRatio?: string;
};

function requireGatewayKey() {
  if (!process.env.AI_GATEWAY_API_KEY) {
    throw new Error(
      'AI Gateway image generation requires AI_GATEWAY_API_KEY.',
    );
  }
}

function extensionForMimeType(mimeType: string): string {
  const subtype = mimeType.split('/')[1];
  if (!subtype) return 'png';
  return subtype === 'jpeg' ? 'jpg' : subtype;
}

export async function generateImageAsset({
  prompt,
  modelId = process.env.GATEWAY_IMAGE_MODEL ?? 'google/gemini-3-pro-image',
  aspectRatio,
}: GenerateImageInput): Promise<GeneratedImageAsset> {
  requireGatewayKey();

  const ratioLine = aspectRatio?.trim()
    ? `\n\nAspect ratio requirement: ${aspectRatio.trim()}`
    : '';
  const promptUsed = `${prompt.trim()}${ratioLine}`;
  const result = await generateText({
    model: modelId,
    prompt: promptUsed,
  });

  const imageFile = result.files.find((file) =>
    file.mediaType?.startsWith('image/'),
  );

  if (!imageFile?.uint8Array) {
    throw new Error('The AI Gateway image model did not return an image file.');
  }

  const mimeType = imageFile.mediaType ?? 'image/png';
  const extension = extensionForMimeType(mimeType);

  return {
    assetKind: 'image',
    base64: Buffer.from(imageFile.uint8Array).toString('base64'),
    mimeType,
    filename: `generated-image.${extension}`,
    promptUsed,
    aspectRatio: aspectRatio?.trim() || undefined,
  };
}
