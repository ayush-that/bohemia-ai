"use client";
import { useEffect, useRef, useState } from "react";
import { useParams, usePathname } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import { useBreadcrumbContext } from "@/components/breadcrumbs-context";
import { agentsAPI, liveKitAPI } from "@/lib/api/agents";
import { toast } from "sonner";
import { Mic, Save } from "lucide-react";
import { cn } from "@/lib/utils";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import Loader from "@/components/loader";

function LiveKitTester({
  token,
  wsUrl,
  onTokenError,
}: {
  token: string;
  wsUrl: string;
  onTokenError: () => void;
}) {
  const statusRef = useRef<HTMLSpanElement>(null);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string>("");
  const roomRef = useRef<any>(null);
  const remoteAudioRef = useRef<HTMLAudioElement>(null);
  const [publishing, setPublishing] = useState(false);
  const [audioUnlockNeeded, setAudioUnlockNeeded] = useState(false);
  const [time, setTime] = useState(0);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    let intervalId: NodeJS.Timeout;

    if (connected && publishing) {
      intervalId = setInterval(() => {
        setTime((t) => t + 1);
      }, 1000);
    } else {
      setTime(0);
    }

    return () => clearInterval(intervalId);
  }, [connected, publishing]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  async function connectIfNeeded() {
    if (!token || !wsUrl || connected || roomRef.current) return;
    if (!wsUrl) {
      setError("Missing WebSocket URL");
      return;
    }

    console.log("[LiveKit] Connecting to room...", {
      wsUrl: wsUrl.substring(0, 30) + "...",
    });

    try {
      const { Room, RoomEvent, createLocalAudioTrack, DefaultReconnectPolicy } =
        await import("livekit-client");
      const room = new Room({
        reconnectPolicy: new DefaultReconnectPolicy(),
      });
      roomRef.current = room;

      room.on(RoomEvent.Disconnected, () => {
        console.log("[LiveKit] Disconnected from room");
        setConnected(false);
        setPublishing(false);
        roomRef.current = null;
      });

      room.on(RoomEvent.ParticipantConnected, (participant) => {
        console.log("[LiveKit] Participant connected:", {
          identity: participant.identity,
          isAgent: participant.isAgent,
          metadata: participant.metadata,
        });
      });

      room.on(RoomEvent.TrackSubscribed, (_track, publication, participant) => {
        console.log("[LiveKit] Track subscribed from:", participant.identity);
        if (publication && publication.track && remoteAudioRef.current) {
          const mediaStream = new MediaStream();
          const mediaStreamTrack = publication.track.mediaStreamTrack;
          if (mediaStreamTrack) {
            mediaStream.addTrack(mediaStreamTrack);
            remoteAudioRef.current.srcObject = mediaStream;
            remoteAudioRef.current
              .play()
              .then(() => setAudioUnlockNeeded(false))
              .catch((e) => {
                console.warn(
                  "[LiveKit] Autoplay prevented; user gesture required",
                  e
                );
                setAudioUnlockNeeded(true);
              });
          }
        }
      });

      room.on(RoomEvent.ConnectionStateChanged, (state) => {
        if (statusRef.current) statusRef.current.textContent = state;
      });
      room.on(RoomEvent.Reconnecting, () => {
        if (statusRef.current) statusRef.current.textContent = "reconnecting";
      });
      room.on(RoomEvent.Reconnected, async () => {
        if (statusRef.current) statusRef.current.textContent = "connected";
        try {
          if (!room.localParticipant.isMicrophoneEnabled) {
            await room.localParticipant.setMicrophoneEnabled(true);
            setPublishing(true);
          }
        } catch (error) {
          console.error(error);
        }
      });

      const isLocalDev =
        wsUrl.startsWith("ws://localhost") ||
        wsUrl.startsWith("ws://127.0.0.1");

      await room.connect(wsUrl, token, {
        rtcConfig: isLocalDev ? undefined : { iceTransportPolicy: "relay" },
      });

      console.log(
        "[LiveKit] Connected successfully. Room participants:",
        Array.from(room.remoteParticipants.values()).map((p) => ({
          identity: p.identity,
          isAgent: p.isAgent,
        }))
      );

      setConnected(true);
      if (statusRef.current) statusRef.current.textContent = "connected";

      try {
        const audioTrack = await createLocalAudioTrack();
        if (roomRef.current) {
          await room.localParticipant.publishTrack(audioTrack);
          console.log("[LiveKit] Microphone published successfully");
          setPublishing(true);
        }
      } catch (pubErr: any) {
        console.error("[LiveKit] Failed to publish microphone:", pubErr);
        setError(pubErr?.message || "Failed to publish microphone");
      }
    } catch (e: any) {
      console.error(e);
      const errorMsg = e?.message || "Failed to connect";
      setError(errorMsg);

      // Check if it's a token error
      if (errorMsg.includes("invalid token") || errorMsg.includes("token")) {
        toast.error("Session expired. Click 'New Session' to refresh.");
        onTokenError();
      }
    }
  }

  async function toggleMic() {
    try {
      const room = roomRef.current;
      if (!room) return;
      const enabled = room.localParticipant.isMicrophoneEnabled;
      if (enabled) {
        await room.localParticipant.setMicrophoneEnabled(false);
        setPublishing(false);
      } else {
        await room.localParticipant.setMicrophoneEnabled(true);
        setPublishing(true);
      }
    } catch (e: any) {
      console.error(e);
      setError(e?.message || "Failed to toggle microphone");
    }
  }

  async function disconnect() {
    try {
      const room = roomRef.current;
      if (room) {
        await room.disconnect();
        roomRef.current = null;
      }
      setConnected(false);
      setPublishing(false);
    } catch (error) {
      console.error(error);
    }
  }
  async function reconnect() {
    await disconnect();
    setError("");
    void connectIfNeeded();
  }

  useEffect(() => {
    return () => {
      void disconnect();
    };
  }, [token, wsUrl]);

  const handleMicClick = async () => {
    if (!connected) {
      await connectIfNeeded();
      try {
        const room = roomRef.current;
        if (room && typeof room.startAudio === "function") {
          await room.startAudio();
        }
      } catch (error) {
        console.error(error);
      }
    } else {
      await toggleMic();
    }
  };

  return (
    <div className="w-full space-y-6">
      <div className="w-full py-4">
        <div className="relative mx-auto flex w-full max-w-xl flex-col items-center gap-2">
          <button
            className={cn(
              "group flex h-16 w-16 items-center justify-center rounded-xl transition-colors",
              connected && publishing
                ? "bg-none"
                : "bg-none hover:bg-black/5 dark:hover:bg-white/5"
            )}
            type="button"
            onClick={handleMicClick}
          >
            {connected && publishing ? (
              <div
                className="pointer-events-auto h-6 w-6 animate-spin cursor-pointer rounded-sm bg-black dark:bg-white"
                style={{ animationDuration: "3s" }}
              />
            ) : (
              <Mic className="h-6 w-6 text-black/90 dark:text-white/90" />
            )}
          </button>

          <span
            className={cn(
              "font-mono text-sm transition-opacity duration-300",
              connected && publishing
                ? "text-black/70 dark:text-white/70"
                : "text-black/30 dark:text-white/30"
            )}
          >
            {formatTime(time)}
          </span>

          <div className="flex h-4 w-64 items-center justify-center gap-0.5">
            {[...Array(48)].map((_, i) => (
              <div
                key={i}
                className={cn(
                  "w-0.5 rounded-full transition-all duration-300",
                  connected && publishing
                    ? "animate-pulse bg-black/50 dark:bg-white/50"
                    : "h-1 bg-black/10 dark:bg-white/10"
                )}
                style={
                  connected && publishing && isClient
                    ? {
                        height: `${20 + Math.random() * 80}%`,
                        animationDelay: `${i * 0.05}s`,
                      }
                    : undefined
                }
              />
            ))}
          </div>

          <p className="h-4 text-xs text-black/70 dark:text-white/70">
            {!connected
              ? "Click to connect"
              : publishing
                ? "Listening..."
                : "Click to speak"}
          </p>
        </div>
      </div>

      {error && (
        <div className="wrap-break-word text-sm text-red-500">
          Error: {error}
        </div>
      )}

      {audioUnlockNeeded && (
        <div className="flex justify-center">
          <button
            className="hover:bg-accent rounded-md border border-yellow-500/50 bg-yellow-500/10 px-3 py-1.5 text-sm transition-colors"
            onClick={async () => {
              try {
                if (remoteAudioRef.current) {
                  await remoteAudioRef.current.play();
                  setAudioUnlockNeeded(false);
                }
                const room = roomRef.current;
                if (room && typeof room.startAudio === "function") {
                  await room.startAudio();
                }
              } catch (error) {
                console.error(error);
              }
            }}
          >
            Enable Audio
          </button>
        </div>
      )}

      <audio ref={remoteAudioRef} autoPlay playsInline />
    </div>
  );
}

export default function AgentTestPage() {
  const params = useParams<{ agentId?: string | string[] }>();
  const pathname = usePathname();
  const { getToken } = useAuth();
  const { setTitle } = useBreadcrumbContext();
  const dbAgentId = Array.isArray(params.agentId)
    ? params.agentId[0]
    : params.agentId || "";

  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState("");
  const [roomName, setRoomName] = useState("");
  const [token, setToken] = useState("");
  const [wsUrl, setWsUrl] = useState("");
  const [livekitAgentName, setLivekitAgentName] = useState("");
  const [agentName, setAgentName] = useState("");
  const [instructions, setInstructions] = useState("");
  const [savingInstructions, setSavingInstructions] = useState(false);
  const [refreshingSession, setRefreshingSession] = useState(false);
  const [initializing, setInitializing] = useState(true);
  const initializedAgentIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (initializedAgentIdRef.current === dbAgentId) return;
    initializedAgentIdRef.current = dbAgentId || null;

    const initializeSession = async () => {
      if (!dbAgentId) {
        toast.error("Agent ID required");
        setLoading(false);
        setInitializing(false);
        return;
      }

      // Check sessionStorage first for agent name to set breadcrumb early (synchronous)
      try {
        const raw = sessionStorage.getItem("livekit:testSession");
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed.agentId === dbAgentId && parsed.agentName) {
            setAgentName(parsed.agentName);
            const agentDetailPath = `/dashboard/agents/${dbAgentId}`;
            setTitle(agentDetailPath, parsed.agentName);
            setTitle(pathname, "Test");
          }
        }
      } catch (e) {
        // Ignore sessionStorage errors
      }

      try {
        const authToken = await getToken();
        if (!authToken) {
          toast.error("Authentication required");
          setLoading(false);
          setInitializing(false);
          return;
        }

        // Fetch agent details first to set breadcrumb before showing loader
        let agent;
        try {
          agent = await agentsAPI.get(dbAgentId, authToken);
          setAgentName(agent.name);
          setInstructions(agent.instructions || "");
          const agentDetailPath = `/dashboard/agents/${dbAgentId}`;
          setTitle(agentDetailPath, agent.name);
          setTitle(pathname, "Test");
        } catch (err) {
          console.error("Failed to fetch agent:", err);
        }

        // Now set loading after breadcrumb is set
        setLoading(true);

        // Check sessionStorage for existing session
        try {
          const raw = sessionStorage.getItem("livekit:testSession");
          if (raw) {
            const parsed = JSON.parse(raw);
            if (
              parsed.agentId === dbAgentId &&
              parsed.accessToken &&
              parsed.wsUrl
            ) {
              setSessionId(parsed.sessionId || "");
              setRoomName(parsed.roomName || "");
              setToken(parsed.accessToken);
              setWsUrl(parsed.wsUrl);
              setLivekitAgentName(parsed.livekitAgentName || "");

              setLoading(false);
              setInitializing(false);
              return;
            }
          }
        } catch (e) {
          console.error("Failed to parse sessionStorage:", e);
        }

        toast.loading("Creating test session...", { id: "create-session" });
        const session = await liveKitAPI.createSession(
          dbAgentId,
          undefined,
          authToken
        );

        toast.success("Session created!", { id: "create-session" });

        sessionStorage.setItem(
          "livekit:testSession",
          JSON.stringify({
            agentId: dbAgentId,
            agentName: agent?.name || "",
            livekitAgentName: session.livekitAgentName,
            sessionId: session.sessionId,
            roomName: session.roomName,
            accessToken: session.accessToken,
            wsUrl: session.wsUrl,
          })
        );

        setSessionId(session.sessionId);
        setRoomName(session.roomName);
        setToken(session.accessToken);
        setWsUrl(session.wsUrl);
        setLivekitAgentName(session.livekitAgentName || "");
        if (agent?.name) {
          setAgentName(agent.name);
        }
      } catch (err: any) {
        console.error("Failed to initialize session:", err);
        toast.error("Failed to create test session", { id: "create-session" });
      } finally {
        setLoading(false);
        setInitializing(false);
      }
    };

    if (typeof window !== "undefined") {
      if (window.location.search) {
        window.history.replaceState(null, "", window.location.pathname);
      }
      initializeSession();
    }
  }, [dbAgentId]);

  const refreshSession = async () => {
    if (!dbAgentId || refreshingSession) return;

    try {
      setRefreshingSession(true);
      toast.loading("Refreshing session...", { id: "refresh-session" });

      const authToken = await getToken();
      if (!authToken) {
        toast.error("Authentication required", { id: "refresh-session" });
        return;
      }

      const session = await liveKitAPI.createSession(
        dbAgentId,
        undefined,
        authToken
      );

      toast.success("Session refreshed!", { id: "refresh-session" });

      sessionStorage.setItem(
        "livekit:testSession",
        JSON.stringify({
          agentId: dbAgentId,
          agentName: agentName,
          livekitAgentName: session.livekitAgentName,
          sessionId: session.sessionId,
          roomName: session.roomName,
          accessToken: session.accessToken,
          wsUrl: session.wsUrl,
        })
      );

      setSessionId(session.sessionId);
      setRoomName(session.roomName);
      setToken(session.accessToken);
      setWsUrl(session.wsUrl);
      setLivekitAgentName(session.livekitAgentName || "");
    } catch (err) {
      console.error("Failed to refresh session:", err);
      toast.error("Failed to refresh session", { id: "refresh-session" });
    } finally {
      setRefreshingSession(false);
    }
  };

  const handleSaveInstructions = async () => {
    if (!dbAgentId) return;

    try {
      setSavingInstructions(true);
      const authToken = await getToken();
      if (!authToken) {
        toast.error("Authentication required");
        return;
      }

      await agentsAPI.update(dbAgentId, { instructions }, authToken);
      toast.success("Instructions saved!");
    } catch (err) {
      console.error("Failed to save instructions:", err);
      toast.error("Failed to save instructions");
    } finally {
      setSavingInstructions(false);
    }
  };

  if (loading || initializing) {
    return (
      <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center">
        <Loader
          title="Creating session..."
          subtitle="Please wait while we prepare your test environment"
          size="md"
        />
      </div>
    );
  }

  if (!token || !wsUrl) {
    return (
      <div className="mx-auto max-w-6xl space-y-6 p-6">
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight">Test</h1>
          <p className="text-muted-foreground text-sm">
            Agent{" "}
            <span className="font-mono">
              {agentName || dbAgentId || "Agent"}
            </span>
          </p>
        </div>
        <div className="space-y-4 rounded-md border p-6 text-center">
          <p className="text-muted-foreground">
            Failed to create test session. Please try again.
          </p>
          <button
            className="bg-primary text-primary-foreground hover:bg-primary/90 rounded px-4 py-2"
            onClick={() => window.location.reload()}
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-4rem)] overflow-hidden">
      <div className="flex flex-1 flex-col border-r">
        <div className="border-b p-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <h2 className="text-xl font-semibold tracking-tight">
                System Instructions
              </h2>
              <p className="text-muted-foreground text-sm">
                Edit the agent's behavior and test in real-time
              </p>
            </div>
            <Button
              onClick={handleSaveInstructions}
              disabled={savingInstructions}
              size="sm"
            >
              <Save className="h-4 w-4" />
              {savingInstructions ? "Saving..." : "Save"}
            </Button>
          </div>
        </div>

        <div className="flex-1 overflow-auto p-6">
          <Textarea
            value={instructions}
            onChange={(e) => setInstructions(e.target.value)}
            className="min-h-full font-mono text-sm"
            placeholder="Enter system instructions..."
          />
        </div>
      </div>

      <div className="flex flex-1 flex-col">
        <div className="border-b p-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <h2 className="text-xl font-semibold tracking-tight">
                Live Test
              </h2>
              <p className="text-muted-foreground text-sm">
                {agentName || dbAgentId}
                {livekitAgentName ? ` (${livekitAgentName})` : ""}
              </p>
            </div>
            <Button
              onClick={refreshSession}
              disabled={refreshingSession}
              size="sm"
            >
              {refreshingSession ? "Creating..." : "New Session"}
            </Button>
          </div>
        </div>

        <div className="flex flex-1 flex-col items-center justify-center gap-4 overflow-auto p-6">
          <LiveKitTester
            token={token}
            wsUrl={wsUrl}
            onTokenError={refreshSession}
          />
        </div>
      </div>
    </div>
  );
}
