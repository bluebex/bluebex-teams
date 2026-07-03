import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { env } from "./lib/env.js";
import { authOptional } from "./lib/auth.js";
import { authRouter } from "./routes/auth.js";
import { adminRouter } from "./routes/admin.js";
import { tasksRouter } from "./routes/tasks.js";

const app = express();

app.use(
  cors({
    origin: [/^http:\/\/localhost:\d+$/],
    credentials: true,
  }),
);
app.use(express.json());
app.use(cookieParser());
app.use(authOptional);

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

app.use("/auth", authRouter);
app.use("/admin", adminRouter);
app.use("/tasks", tasksRouter);

app.listen(env.API_PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`API listening on http://localhost:${env.API_PORT}`);
});

