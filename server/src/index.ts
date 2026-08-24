import express from "express";
import cors from "cors";
import { config } from "./config.js";
import { dynastiesRouter } from "./routes/dynasties.js";
import { turnRouter } from "./routes/turn.js";

const app = express();
app.use(cors({ origin: config.corsOrigins }));
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ ok: true, aiEnabled: Boolean(config.anthropicApiKey) });
});

app.use("/dynasties", dynastiesRouter);
app.use("/turn", turnRouter);

app.listen(config.port, () => {
  console.log(`Dynasty server listening on :${config.port}`);
});
