import { z } from "zod";

export const createAgentSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  instructions: z.string().min(1),
  llmTemperature: z.number().min(0).max(2).optional(),
  llmMaxTokens: z.number().min(1).max(10000).optional(),
  sttLanguage: z.string().optional(),
});

export const updateAgentSchema = createAgentSchema.partial();

export const querySchema = z.object({
  page: z.string().transform(Number).pipe(z.number().min(1)).default(1),
  limit: z
    .string()
    .transform(Number)
    .pipe(z.number().min(1).max(100))
    .default(20),
  search: z.string().optional(),
  provider: z.enum(["openai"]).optional(),
});
