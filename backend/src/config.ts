import "dotenv/config";

const apiKey = process.env.CROMA_API_KEY?.trim();

if (!apiKey) {
  throw new Error("Falta CROMA_API_KEY en el entorno del backend.");
}

const port = Number(process.env.PORT ?? 8787);

export const config = {
  apiKey,
  port: Number.isFinite(port) ? port : 8787,
  mcpUrl: "https://api.croma.run/mcp",
};
