/**
 * Exa MCP runtime client — connects to Exa's MCP HTTP endpoint
 * at runtime so the chat agent can use Exa search, company research,
 * people search, and crawling tools directly.
 *
 * Uses AI SDK's createMCPClient with HTTP transport.
 * The client is created per-request and closed in onFinish.
 *
 * Exa MCP endpoint: https://mcp.exa.ai/mcp
 * Websets MCP endpoint: https://websetsmcp.exa.ai/mcp
 */

import { createMCPClient, type MCPClient } from '@ai-sdk/mcp';
import type { Tool } from 'ai';

const EXA_MCP_BASE = 'https://mcp.exa.ai/mcp';

const EXA_TOOL_SET = [
  'web_search_advanced_exa',
  'company_research_exa',
  'people_search_exa',
  'crawling_exa',
].join(',');

/**
 * Create a new Exa MCP client. Caller is responsible for closing it
 * (typically in streamText's onFinish callback).
 */
export async function createExaMCPClient(): Promise<MCPClient | null> {
  const apiKey = process.env.EXA_API_KEY ?? process.env.EXASEARCH_API_KEY;
  if (!apiKey) return null;

  try {
    const client = await createMCPClient({
      transport: {
        type: 'sse',
        url: `${EXA_MCP_BASE}?tools=${EXA_TOOL_SET}`,
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
      },
    });
    return client;
  } catch (err) {
    console.error('Failed to create Exa MCP client:', err);
    return null;
  }
}

/**
 * Get Exa tools from an MCP client, ready for use with streamText/generateText.
 * Returns an empty record if the client is null.
 */
export async function getExaTools(
  client: MCPClient | null
): Promise<Record<string, Tool>> {
  if (!client) return {};
  try {
    return await client.tools() as Record<string, Tool>;
  } catch (err) {
    console.error('Failed to get Exa MCP tools:', err);
    return {};
  }
}
