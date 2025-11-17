import {
  type JobContext,
  type JobProcess,
  ServerOptions,
  cli,
  defineAgent,
  metrics,
  voice,
} from "@livekit/agents";
import * as deepgram from "@livekit/agents-plugin-deepgram";
import * as elevenlabs from "@livekit/agents-plugin-elevenlabs";
import * as openai from "@livekit/agents-plugin-openai";
import * as silero from "@livekit/agents-plugin-silero";
import { BackgroundVoiceCancellation } from "@livekit/noise-cancellation-node";
import dotenv from "dotenv";
import { fileURLToPath } from "node:url";

dotenv.config({ path: ".env" });

class Assistant extends voice.Agent {
  constructor(instructions: string) {
    super({
      instructions,
    });
  }
}

export default defineAgent({
  prewarm: async (proc: JobProcess) => {
    proc.userData.vad = await silero.VAD.load();
  },
  entry: async (ctx: JobContext) => {
    let instructions: string | null = null;

    try {
      const roomMetadata = ctx.job?.room?.metadata;
      if (roomMetadata) {
        const parsed = JSON.parse(roomMetadata);
        if (parsed.agentConfig?.instructions) {
          instructions = parsed.agentConfig.instructions;
        }
      }

      if (!instructions && ctx.job?.metadata) {
        try {
          const dispatchMetadata = JSON.parse(ctx.job.metadata);
          if (dispatchMetadata.instructions) {
            instructions = dispatchMetadata.instructions;
          }
        } catch (error) {
          console.error(error);
        }
      }
    } catch (error) {
      console.error(error);
    }

    if (!instructions) {
      throw new Error("Instructions are required but not found");
    }

    const deepgramApiKey = process.env.DEEPGRAM_API_KEY;
    const openaiApiKey = process.env.OPENAI_API_KEY;
    const openaiBaseUrl = process.env.OPENAI_BASE_URL;
    const elevenlabsApiKey = process.env.ELEVENLABS_API_KEY;

    const session = new voice.AgentSession({
      stt: new deepgram.STT({
        model: "nova-3",
        language: "en",
        ...(deepgramApiKey && { apiKey: deepgramApiKey }),
      }),

      llm: new openai.LLM({
        model: "microsoft/phi-4",
        ...(openaiApiKey && { apiKey: openaiApiKey }),
        ...(openaiBaseUrl && { baseURL: openaiBaseUrl }),
      }),

      tts: new elevenlabs.TTS({
        modelID: "eleven_turbo_v2_5",
        ...(elevenlabsApiKey && { apiKey: elevenlabsApiKey }),
      }),

      vad: ctx.proc.userData.vad! as silero.VAD,
    });

    const usageCollector = new metrics.UsageCollector();
    session.on(voice.AgentSessionEventTypes.MetricsCollected, (ev) => {
      metrics.logMetrics(ev.metrics);
      usageCollector.collect(ev.metrics);
    });

    const logUsage = async () => {
      usageCollector.getSummary();
    };

    ctx.addShutdownCallback(logUsage);

    await session.start({
      agent: new Assistant(instructions),
      room: ctx.room,
      inputOptions: {
        noiseCancellation: BackgroundVoiceCancellation(),
      },
    });

    await ctx.connect();
    await ctx.waitForParticipant();

    await session.generateReply({
      instructions: "Greet the user warmly and offer your assistance.",
    });
  },
});

cli.runApp(new ServerOptions({ agent: fileURLToPath(import.meta.url) }));
