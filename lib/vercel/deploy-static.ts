/**
 * Deploy static files to Vercel using the REST API (no CLI).
 * Used by the chat deploy tools to publish sales/landing pages.
 */

const VERCEL_API = 'https://api.vercel.com';

export type DeployStaticParams = {
  /** Project name (URL-safe; becomes *.vercel.app subdomain) */
  name: string;
  /** File path -> content (utf-8). e.g. { 'index.html': '<html>...' } */
  files: Record<string, string>;
  /** Optional: deploy to this project ID */
  projectId?: string;
  /** Optional: team ID for the token */
  teamId?: string;
};

export type DeployStaticResult = {
  url?: string;
  deploymentId?: string;
  readyState?: string;
  error?: string;
};

export async function deployStaticPage(
  params: DeployStaticParams
): Promise<DeployStaticResult> {
  const token = process.env.VERCEL_ACCESS_TOKEN;
  if (!token) {
    return { error: 'VERCEL_ACCESS_TOKEN is not set' };
  }

  const { name, files, projectId, teamId } = params;
  const filesArray = Object.entries(files).map(([file, data]) => ({
    file,
    data,
    encoding: 'utf-8' as const,
  }));

  const query = new URLSearchParams();
  if (teamId) query.set('teamId', teamId);
  // Required for new projects: allow Vercel to create project with auto-detection (static)
  query.set('skipAutoDetectionConfirmation', '1');

  const url = `${VERCEL_API}/v13/deployments?${query.toString()}`;
  const projectName = name.replace(/[^a-z0-9-]/gi, '-').toLowerCase().slice(0, 100);
  const body: Record<string, unknown> = {
    name: projectName,
    files: filesArray,
    // Required for new projects: minimal static project settings
    projectSettings: {
      framework: null,
      buildCommand: null,
      devCommand: null,
      installCommand: null,
      outputDirectory: null,
    },
  };
  if (projectId) body.project = projectId;

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      const errMsg = data.error?.message ?? data.message ?? res.statusText;
      return { error: `Vercel API error: ${errMsg}` };
    }

    const deploymentUrl =
      data.url ??
      data.alias?.[0] ??
      (data.id ? `https://${data.id}.vercel.app` : undefined);
    return {
      url: deploymentUrl,
      deploymentId: data.id,
      readyState: data.readyState,
    };
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Deployment failed';
    return { error: message };
  }
}
