CREATE TABLE "agent_analytics" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"agent_id" uuid,
	"date" timestamp NOT NULL,
	"total_sessions" integer DEFAULT 0,
	"total_duration" integer DEFAULT 0,
	"total_messages" integer DEFAULT 0,
	"avg_latency" real,
	"llm_cost" real DEFAULT 0,
	"stt_cost" real DEFAULT 0,
	"tts_cost" real DEFAULT 0,
	"total_cost" real DEFAULT 0,
	"error_rate" real DEFAULT 0,
	"interruption_rate" real DEFAULT 0,
	"avg_session_duration" real DEFAULT 0,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "agent_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid,
	"role" text NOT NULL,
	"content" text NOT NULL,
	"audio_url" text,
	"latency" integer,
	"processing_time" integer,
	"stt_data" jsonb,
	"llm_data" jsonb,
	"tts_data" jsonb,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "agent_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"agent_id" uuid,
	"session_id" text NOT NULL,
	"room_name" text,
	"user_id" text,
	"status" text DEFAULT 'active',
	"avg_latency" integer,
	"total_duration" integer,
	"message_count" integer DEFAULT 0,
	"error_count" integer DEFAULT 0,
	"metadata" jsonb,
	"started_at" timestamp DEFAULT now(),
	"ended_at" timestamp,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "voice_agents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"instructions" text NOT NULL,
	"is_active" boolean DEFAULT true,
	"status" text DEFAULT 'draft',
	"llm_provider" text DEFAULT 'cerebras',
	"llm_model" text NOT NULL,
	"llm_temperature" real DEFAULT 0.7,
	"llm_max_tokens" integer DEFAULT 1000,
	"llm_settings" jsonb,
	"stt_provider" text DEFAULT 'deepgram',
	"stt_model" text DEFAULT 'nova-3',
	"stt_language" text DEFAULT 'en',
	"stt_settings" jsonb,
	"tts_provider" text DEFAULT 'elevenlabs',
	"tts_voice" text NOT NULL,
	"tts_model" text,
	"tts_settings" jsonb,
	"audio_settings" jsonb DEFAULT '{"sampleRate":48000,"channels":1,"frameLength":20,"noiseFilter":true,"echoCancellation":true}'::jsonb,
	"turn_detection" text DEFAULT 'vad',
	"vad_settings" jsonb,
	"allow_interruptions" boolean DEFAULT true,
	"min_interruption_duration" real DEFAULT 0.5,
	"resume_false_interruption" boolean DEFAULT true,
	"false_interruption_timeout" real DEFAULT 1,
	"preemptive_generation" boolean DEFAULT true,
	"min_endpointing_delay" real DEFAULT 0.5,
	"max_endpointing_delay" real DEFAULT 3,
	"max_tool_steps" integer DEFAULT 3,
	"user_away_timeout" real DEFAULT 15,
	"session_timeout" integer DEFAULT 3600,
	"function_calls" jsonb DEFAULT '{"enabled":false,"tools":[]}'::jsonb,
	"background_audio" jsonb DEFAULT '{"enabled":false}'::jsonb,
	"target_latency" integer DEFAULT 1000,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "agent_analytics" ADD CONSTRAINT "agent_analytics_agent_id_voice_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."voice_agents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_messages" ADD CONSTRAINT "agent_messages_session_id_agent_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."agent_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_sessions" ADD CONSTRAINT "agent_sessions_agent_id_voice_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."voice_agents"("id") ON DELETE cascade ON UPDATE no action;