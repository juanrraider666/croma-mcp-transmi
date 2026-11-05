import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { config } from "../config.js";
import { CromaError, readToolPayload } from "../domain/normalize.js";
import type { ToolResult } from "../domain/types.js";

let client: Client | null = null;
let opening: Promise<Client> | null = null;
let toolNames: { names: string[]; expires: number } | null = null;

const REQUIRED_TOOLS = [
  "transmilenio_routes_search",
  "transmilenio_route",
  "transmilenio_vehicles",
  "transmilenio_stop_arrivals",
  "transmilenio_alerts",
];

function resetClient(): void {
  const current = client;
  client = null;
  toolNames = null;
  if (current) void current.close().catch(() => undefined);
}

async function openClient(): Promise<Client> {
  const transport = new StreamableHTTPClientTransport(new URL(config.mcpUrl), {
    requestInit: {
      headers: { Authorization: `Bearer ${config.apiKey}` },
    },
  });
  const next = new Client({ name: "anden", version: "1.0.0" });
  await next.connect(transport);
  client = next;
  return next;
}

async function getClient(): Promise<Client> {
  if (client) return client;
  if (!opening) {
    opening = openClient().finally(() => {
      opening = null;
    });
  }
  try {
    return await opening;
  } catch (error) {
    resetClient();
    throw error;
  }
}

async function invoke(name: string, args: Record<string, unknown>): Promise<unknown> {
  const mcp = await getClient();
  const result = (await mcp.callTool({ name, arguments: args })) as ToolResult;
  return readToolPayload(result);
}

export async function callCromaTool(name: string, args: Record<string, unknown>): Promise<unknown> {
  try {
    return await invoke(name, args);
  } catch (error) {
    if (error instanceof CromaError) throw error;
    resetClient();
    try {
      return await invoke(name, args);
    } catch (retryError) {
      if (retryError instanceof CromaError) throw retryError;
      resetClient();
      throw new CromaError("No hay conexión con los datos de TransMilenio.");
    }
  }
}

export async function connectionStatus(): Promise<{ connected: boolean; missing: string[]; message?: string }> {
  try {
    if (!toolNames || toolNames.expires <= Date.now()) {
      const mcp = await getClient();
      const listed = await mcp.listTools();
      toolNames = {
        names: listed.tools.map((tool) => tool.name),
        expires: Date.now() + 5 * 60_000,
      };
    }
    const missing = REQUIRED_TOOLS.filter((name) => !toolNames?.names.includes(name));
    return {
      connected: missing.length === 0,
      missing,
      message: missing.length === 0 ? undefined : "Faltan herramientas de TransMilenio.",
    };
  } catch {
    resetClient();
    return {
      connected: false,
      missing: REQUIRED_TOOLS,
      message: "Sin conexión con los datos de TransMilenio.",
    };
  }
}
