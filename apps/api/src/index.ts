import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { env } from "./lib/env.js";
import { authOptional } from "./lib/auth.js";
import { authRouter } from "./routes/auth.js";
import { adminRouter } from "./routes/admin.js";
import { tasksRouter } from "./routes/tasks.js";

const app = express();

const allowedOrigins: (string | RegExp)[] = [/^http:\/\/localhost:\d+$/];
if (process.env.CORS_ORIGIN) {
  allowedOrigins.push(...process.env.CORS_ORIGIN.split(",").map((o) => o.trim()));
}

app.use(
  cors({
    origin: allowedOrigins,
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

