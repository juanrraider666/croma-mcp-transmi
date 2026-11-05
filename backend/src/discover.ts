import "dotenv/config";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

const apiKey = process.env.CROMA_API_KEY;
if (!apiKey) {
  console.error("CROMA_API_KEY missing");
  process.exit(1);
}

const transport = new StreamableHTTPClientTransport(new URL("https://api.croma.run/mcp"), {
  requestInit: {
    headers: { Authorization: `Bearer ${apiKey}` },
  },
});

const client = new Client({ name: "anden-discover", version: "1.0.0" });
await client.connect(transport);

const listed = await client.listTools();
const tools = listed.tools.filter((tool) => tool.name.startsWith("transmilenio_"));

console.log(
  JSON.stringify(
    tools.map((tool) => ({
      name: tool.name,
      description: tool.description,
      inputSchema: tool.inputSchema,
    })),
    null,
    2,
  ),
);

await client.close();
