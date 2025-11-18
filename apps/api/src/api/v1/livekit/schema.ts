import { z } from "zod";

export const createSessionSchema = z.object({
  agentId: z.string().min(1),
  isTest: z.boolean().optional().default(true),
});
