import { z } from "zod";

const schema = z.object({
  API_PORT: z.coerce.number().default(4000),
  SESSION_SECRET: z.string().min(10).default("change_me_in_prod"),
});

export const env = schema.parse({
  API_PORT: process.env.API_PORT ?? process.env.PORT,
  SESSION_SECRET: process.env.SESSION_SECRET,
});

