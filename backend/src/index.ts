import cors from "cors";
import express from "express";
import { config } from "./config.js";
import { errorHandler } from "./http/errors.js";
import { api } from "./routes/api.js";

const app = express();

app.use(cors({ origin: true }));
app.use("/api", api);
app.use(errorHandler);

app.listen(config.port, () => {
  console.log(`Andén API en http://localhost:${config.port}`);
});
