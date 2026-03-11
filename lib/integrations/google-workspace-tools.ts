import { Buffer } from 'node:buffer';
import { getGoogleAccessToken } from '@/lib/integrations/google-workspace-auth';

type GoogleFileRef = {
  id: string;
  url: string;
};

type GoogleWorkspaceResult = GoogleFileRef & {
  kind: 'document' | 'presentation' | 'drive_file' | 'gmail_draft';
};

type SlidePayload = {
  title: string;
  bullets: string[];
  speakerNotes?: string;
};

function baseUrl(kind: GoogleWorkspaceResult['kind'], id: string) {
  switch (kind) {
    case 'document':
      return `https://docs.google.com/document/d/${id}/edit`;
    case 'presentation':
      return `https://docs.google.com/presentation/d/${id}/edit`;
    case 'gmail_draft':
      return `https://mail.google.com/mail/u/0/#drafts?compose=${id}`;
    default:
      return `https://drive.google.com/file/d/${id}/view`;
  }
}

async function googleFetch<T>(
  userId: string,
  url: string,
  init?: RequestInit,
): Promise<T> {
  const token = await getGoogleAccessToken(userId);
  const res = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
  });

  if (!res.ok) {
    throw new Error(`Google API request failed (${res.status}): ${await res.text()}`);
  }

  if (res.status === 204) {
    return {} as T;
  }

  return (await res.json()) as T;
}

export async function ensureDriveFolder(
  userId: string,
  folderName: string,
): Promise<GoogleFileRef> {
  const query = encodeURIComponent(
    `mimeType = 'application/vnd.google-apps.folder' and name = '${folderName.replace(/'/g, "\\'")}' and trashed = false`,
  );
  const existing = await googleFetch<{ files?: Array<{ id: string; name: string }> }>(
    userId,
    `https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name)`,
  );
  const folderId = existing.files?.[0]?.id;
  if (folderId) {
    return {
      id: folderId,
      url: baseUrl('drive_file', folderId),
    };
  }

  const created = await googleFetch<{ id: string }>(
    userId,
    'https://www.googleapis.com/drive/v3/files',
    {
      method: 'POST',
      body: JSON.stringify({
        name: folderName,
        mimeType: 'application/vnd.google-apps.folder',
      }),
    },
  );

  return {
    id: created.id,
    url: baseUrl('drive_file', created.id),
  };
}

export async function createGoogleDoc(params: {
  userId: string;
  title: string;
  body: string;
}): Promise<GoogleWorkspaceResult> {
  const { userId, title, body } = params;
  const folder = await ensureDriveFolder(userId, 'AgentPilot Exports');
  const doc = await googleFetch<{ documentId: string }>(
    userId,
    'https://docs.googleapis.com/v1/documents',
    {
      method: 'POST',
      body: JSON.stringify({ title }),
    },
  );

  await googleFetch(
    userId,
    `https://docs.googleapis.com/v1/documents/${doc.documentId}:batchUpdate`,
    {
      method: 'POST',
      body: JSON.stringify({
        requests: [
          {
            insertText: {
              location: { index: 1 },
              text: `${body}\n`,
            },
          },
        ],
      }),
    },
  );

  await googleFetch(
    userId,
    `https://www.googleapis.com/drive/v3/files/${doc.documentId}?addParents=${folder.id}&fields=id`,
    { method: 'PATCH', body: JSON.stringify({}) },
  );

  return {
    kind: 'document',
    id: doc.documentId,
    url: baseUrl('document', doc.documentId),
  };
}

export async function createGoogleSlides(params: {
  userId: string;
  title: string;
  slides: SlidePayload[];
}): Promise<GoogleWorkspaceResult> {
  const { userId, title, slides } = params;
  const folder = await ensureDriveFolder(userId, 'AgentPilot Exports');
  const presentation = await googleFetch<{ presentationId: string }>(
    userId,
    'https://slides.googleapis.com/v1/presentations',
    {
      method: 'POST',
      body: JSON.stringify({ title }),
    },
  );

  const requests = slides.flatMap((slide, index) => {
    const slideId = `slide_${index + 1}`;
    const titleId = `title_${index + 1}`;
    const bodyId = `body_${index + 1}`;
    const bulletsText = slide.bullets.map((bullet) => `• ${bullet}`).join('\n');
    return [
      {
        createSlide: {
          objectId: slideId,
          insertionIndex: index,
          slideLayoutReference: { predefinedLayout: 'TITLE_AND_BODY' },
        },
      },
      {
        insertText: {
          objectId: titleId,
          text: slide.title,
        },
      },
      {
        insertText: {
          objectId: bodyId,
          text: [bulletsText, slide.speakerNotes ? `\n\nSpeaker notes:\n${slide.speakerNotes}` : '']
            .filter(Boolean)
            .join(''),
        },
      },
    ];
  });

  // Fallback safer route: replace placeholders on default first slide if any requests fail.
  await googleFetch(
    userId,
    `https://slides.googleapis.com/v1/presentations/${presentation.presentationId}:batchUpdate`,
    {
      method: 'POST',
      body: JSON.stringify({ requests }),
    },
  ).catch(async () => {
    const fallbackRequests = slides.flatMap((slide, index) => {
      const slideId = `fallback_slide_${index + 1}`;
      const titleBoxId = `fallback_title_${index + 1}`;
      const bodyBoxId = `fallback_body_${index + 1}`;
      return [
        {
          createSlide: {
            objectId: slideId,
            insertionIndex: index,
            slideLayoutReference: { predefinedLayout: 'BLANK' },
          },
        },
        {
          createShape: {
            objectId: titleBoxId,
            shapeType: 'TEXT_BOX',
            elementProperties: {
              pageObjectId: slideId,
              size: { height: { magnitude: 60, unit: 'PT' }, width: { magnitude: 650, unit: 'PT' } },
              transform: { scaleX: 1, scaleY: 1, translateX: 40, translateY: 30, unit: 'PT' },
            },
          },
        },
        {
          insertText: {
            objectId: titleBoxId,
            text: slide.title,
          },
        },
        {
          createShape: {
            objectId: bodyBoxId,
            shapeType: 'TEXT_BOX',
            elementProperties: {
              pageObjectId: slideId,
              size: { height: { magnitude: 360, unit: 'PT' }, width: { magnitude: 650, unit: 'PT' } },
              transform: { scaleX: 1, scaleY: 1, translateX: 40, translateY: 110, unit: 'PT' },
            },
          },
        },
        {
          insertText: {
            objectId: bodyBoxId,
            text: slide.bullets.map((bullet) => `• ${bullet}`).join('\n'),
          },
        },
      ];
    });

    await googleFetch(
      userId,
      `https://slides.googleapis.com/v1/presentations/${presentation.presentationId}:batchUpdate`,
      {
        method: 'POST',
        body: JSON.stringify({ requests: fallbackRequests }),
      },
    );
  });

  await googleFetch(
    userId,
    `https://www.googleapis.com/drive/v3/files/${presentation.presentationId}?addParents=${folder.id}&fields=id`,
    { method: 'PATCH', body: JSON.stringify({}) },
  );

  return {
    kind: 'presentation',
    id: presentation.presentationId,
    url: baseUrl('presentation', presentation.presentationId),
  };
}

export async function uploadDriveHtmlFile(params: {
  userId: string;
  title: string;
  html: string;
}): Promise<GoogleWorkspaceResult> {
  const folder = await ensureDriveFolder(params.userId, 'AgentPilot Exports');
  const token = await getGoogleAccessToken(params.userId);
  const metadata = {
    name: `${params.title}.html`,
    parents: [folder.id],
  };
  const boundary = `agentpilot-${Date.now()}`;
  const body = [
    `--${boundary}`,
    'Content-Type: application/json; charset=UTF-8',
    '',
    JSON.stringify(metadata),
    `--${boundary}`,
    'Content-Type: text/html',
    '',
    params.html,
    `--${boundary}--`,
    '',
  ].join('\r\n');

  const res = await fetch(
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': `multipart/related; boundary=${boundary}`,
      },
      body,
    },
  );
  if (!res.ok) {
    throw new Error(`Drive upload failed: ${await res.text()}`);
  }
  const json = (await res.json()) as { id: string };
  return {
    kind: 'drive_file',
    id: json.id,
    url: baseUrl('drive_file', json.id),
  };
}

export async function createGmailDraft(params: {
  userId: string;
  to: string;
  subject: string;
  body: string;
}): Promise<GoogleWorkspaceResult> {
  const mime = [
    `To: ${params.to}`,
    `Subject: ${params.subject}`,
    'Content-Type: text/plain; charset="UTF-8"',
    '',
    params.body,
  ].join('\r\n');
  const raw = Buffer.from(mime)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');

  const result = await googleFetch<{ id: string; message?: { id: string } }>(
    params.userId,
    'https://gmail.googleapis.com/gmail/v1/users/me/drafts',
    {
      method: 'POST',
      body: JSON.stringify({
        message: { raw },
      }),
    },
  );

  const draftId = result.id || result.message?.id;
  if (!draftId) {
    throw new Error('Gmail draft created but no draft id was returned.');
  }

  return {
    kind: 'gmail_draft',
    id: draftId,
    url: baseUrl('gmail_draft', draftId),
  };
}
