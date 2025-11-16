import {
  pgTable,
  text,
  timestamp,
  uuid,
  jsonb,
  integer,
  real,
} from "drizzle-orm/pg-core";

export const voiceAgents = pgTable("voice_agents", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id").notNull(),
  name: text("name").notNull(),
  description: text("description"),
  instructions: text("instructions").notNull(),
  llmProvider: text("llm_provider").$type<"openai">().default("openai"),
  llmModel: text("llm_model").notNull(),
  llmTemperature: real("llm_temperature").default(0.7),
  llmMaxTokens: integer("llm_max_tokens").default(1000),
  sttProvider: text("stt_provider").$type<"deepgram">().default("deepgram"),
  sttModel: text("stt_model").default("nova-3"),
  sttLanguage: text("stt_language").default("en"),
  ttsProvider: text("tts_provider").$type<"elevenlabs">().default("elevenlabs"),
  ttsVoice: text("tts_voice").notNull(),
  ttsModel: text("tts_model"),
  targetLatency: integer("target_latency").default(1000),
  livekitAgentName: text("livekit_agent_name"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const agentSessions = pgTable("agent_sessions", {
  id: uuid("id").primaryKey().defaultRandom(),
  agentId: uuid("agent_id").references(() => voiceAgents.id, {
    onDelete: "cascade",
  }),
  sessionId: text("session_id").notNull(),
  roomName: text("room_name"),
  userId: text("user_id"),

  status: text("status")
    .$type<"active" | "completed" | "failed" | "terminated">()
    .default("active"),

  avgLatency: integer("avg_latency"),
  totalDuration: integer("total_duration"),
  messageCount: integer("message_count").default(0),
  errorCount: integer("error_count").default(0),
  metadata: jsonb("metadata").$type<Record<string, unknown>>(),
  startedAt: timestamp("started_at").defaultNow(),
  endedAt: timestamp("ended_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const agentMessages = pgTable("agent_messages", {
  id: uuid("id").primaryKey().defaultRandom(),
  sessionId: uuid("session_id").references(() => agentSessions.id, {
    onDelete: "cascade",
  }),

  role: text("role").$type<"user" | "assistant" | "system">().notNull(),
  content: text("content").notNull(),
  audioUrl: text("audio_url"),
  latency: integer("latency"),
  processingTime: integer("processing_time"),
  sttData: jsonb("stt_data").$type<Record<string, unknown>>(),
  llmData: jsonb("llm_data").$type<Record<string, unknown>>(),
  ttsData: jsonb("tts_data").$type<Record<string, unknown>>(),
  metadata: jsonb("metadata").$type<Record<string, unknown>>(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const agentAnalytics = pgTable("agent_analytics", {
  id: uuid("id").primaryKey().defaultRandom(),
  agentId: uuid("agent_id").references(() => voiceAgents.id, {
    onDelete: "cascade",
  }),

  date: timestamp("date").notNull(),
  totalSessions: integer("total_sessions").default(0),
  totalDuration: integer("total_duration").default(0),
  totalMessages: integer("total_messages").default(0),
  avgLatency: real("avg_latency"),
  llmCost: real("llm_cost").default(0),
  sttCost: real("stt_cost").default(0),
  ttsCost: real("tts_cost").default(0),
  totalCost: real("total_cost").default(0),
  errorRate: real("error_rate").default(0),
  interruptionRate: real("interruption_rate").default(0),
  avgSessionDuration: real("avg_session_duration").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type VoiceAgent = typeof voiceAgents.$inferSelect;
export type NewVoiceAgent = typeof voiceAgents.$inferInsert;
export type AgentSession = typeof agentSessions.$inferSelect;
export type NewAgentSession = typeof agentSessions.$inferInsert;
export type AgentMessage = typeof agentMessages.$inferSelect;
export type NewAgentMessage = typeof agentMessages.$inferInsert;
export type AgentAnalytics = typeof agentAnalytics.$inferSelect;
export type NewAgentAnalytics = typeof agentAnalytics.$inferInsert;
