import { useState, useCallback, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

import { IChatMessage } from "@/app/components/chat-history";
import { buildChatHistory } from "@/app/lib/client/chat";

import { useMediaPermissions } from "./use-media-permissions";
import useMediaRecorder from "./use-media-recorder";

import {
  generateQuestion,
  IHistoryItem,
} from "../(tabs)/(simulator)/interview/[id]/actions";

export const useInterviewControls = (history: IHistoryItem[] = []) => {
  const router = useRouter();

  const mediaStreamRef = useRef<MediaStream | null>(null);
  const [mediaStream, setMediaStream] = useState<MediaStream | null>(null);

  const [isChatOpen, setIsChatOpen] = useState(true);
  const [chats, setChats] = useState<IChatMessage[]>(buildChatHistory(history));
  const [isGenerating, setIsGenerating] = useState(false);

  // Media permissions and streams
  const {
    videoStream,
    audioStream,
    requestVideo,
    requestAudio,
    stopMediaStream,
    toggleVideo,
    toggleAudio,
    isVideoEnabled,
    isAudioEnabled,
  } = useMediaPermissions();

  // minimal: avoid noisy render logs

  useEffect(() => {
    if (!mediaStreamRef.current && typeof window !== "undefined") {
      mediaStreamRef.current = new MediaStream();
      setMediaStream(mediaStreamRef.current);
    }
  }, []);

  useEffect(() => {
    // Compose a new MediaStream from cloned tracks so the composed stream
    // doesn't become unusable if the source streams are stopped/replaced.
    try {
      const videoTracks = videoStream?.getVideoTracks() ?? [];
      const audioTracks = audioStream?.getAudioTracks() ?? [];

      if (videoTracks.length === 0 && audioTracks.length === 0) {
        // no tracks -> keep current composed stream (may be empty)
        setMediaStream(mediaStreamRef.current);
        return;
      }

      // stop previous composed tracks if any
      mediaStreamRef.current?.getTracks().forEach((t) => t.stop());

      const cloned = new MediaStream([
        ...videoTracks.map((t) => t.clone()),
        ...audioTracks.map((t) => t.clone()),
      ]);

      mediaStreamRef.current = cloned;
      setMediaStream(cloned);
    } catch (err) {
      console.debug("useInterviewControls: compose stream error", err);
    }
  }, [videoStream, audioStream]);

  // Reflect toggle state onto the composed stream's tracks so UI/Video element
  // follows user toggles even when using cloned tracks.
  useEffect(() => {
    const s = mediaStreamRef.current;
    if (!s) return;

    try {
      s.getVideoTracks().forEach((t) => {
        t.enabled = isVideoEnabled;
      });
      s.getAudioTracks().forEach((t) => {
        t.enabled = isAudioEnabled;
      });
    } catch (err) {
      // ignore
    }
  }, [isVideoEnabled, isAudioEnabled]);

  // Fallback: try to attach the composed mediaStream directly to the local
  // `you-video` element in case component attachment logic misses it.
  useEffect(() => {
    const s = mediaStream;
    if (!s || typeof document === "undefined") return;

    let stopped = false;
    let attempts = 0;
    const maxAttempts = 20;

    const iv = setInterval(() => {
      if (stopped) return;
      attempts += 1;
      try {
        const el = document.getElementById(
          "you-video",
        ) as HTMLVideoElement | null;
        if (!el) return;
        el.srcObject = s;
        el.muted = true;
        const p = el.play();
        if (p && typeof p.then === "function") {
          p.then(() => {
            clearInterval(iv);
            stopped = true;
          }).catch(() => {
            if (attempts >= maxAttempts) {
              clearInterval(iv);
              stopped = true;
            }
          });
        } else {
          clearInterval(iv);
          stopped = true;
        }
      } catch (err) {
        if (attempts >= maxAttempts) {
          clearInterval(iv);
          stopped = true;
        }
      }
    }, 200);

    return () => {
      stopped = true;
      clearInterval(iv);
    };
  }, [mediaStream]);

  ////////// Media recording //////////
  const {
    startVideoRecording,
    stopVideoRecording,
    startAudioRecording,
    stopAudioRecording,
    isRecording,
  } = useMediaRecorder(mediaStreamRef.current);

  // Initialize media permissions and start recording
  // Request permissions once on mount. Avoid re-running on stream changes
  // because the cleanup previously stopped streams when deps changed,
  // causing a mount/unmount loop.
  useEffect(() => {
    const start = async () => {
      // Request any missing permissions individually so we don't skip
      // video when audio is already available (or vice versa).
      try {
        if (!videoStream) {
          const videoResult = await requestVideo();
          if (!videoResult)
            console.warn("Video permission failed or not available");
        }

        if (!audioStream) {
          const audioResult = await requestAudio();
          if (!audioResult)
            console.warn("Audio permission failed or not available");
        }
      } catch (err) {
        console.error("Error requesting media permissions", err);
      }
    };

    start();
    return () => {
      stopVideoRecording();
      stopAudioRecording();
      stopMediaStream();
    };
    // Intentionally empty deps: run only on mount/unmount to avoid cleanup loop
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    // Start recordings only after the composed mediaStream has tracks.
    // Poll briefly because `mediaStreamRef.current` is mutated, not a state value.
    let started = false;
    const tryStart = () => {
      const s = mediaStreamRef.current;
      if (!started && s && s.getTracks().length > 0) {
        startVideoRecording();
        startAudioRecording();
        started = true;
      }
    };

    tryStart();
    const iv = setInterval(tryStart, 200);
    const to = setTimeout(() => clearInterval(iv), 5000);

    return () => {
      clearInterval(iv);
      clearTimeout(to);
      if (started) {
        stopVideoRecording();
        stopAudioRecording();
      }
    };
  }, [
    startVideoRecording,
    startAudioRecording,
    stopVideoRecording,
    stopAudioRecording,
  ]);

  ////////// Initialize chat with first question //////////
  useEffect(() => {
    return;
    const init = async () => {
      if (chats.length > 0 || isGenerating) return;

      setIsGenerating(true);
      try {
        const result = await generateQuestion({ interviewId: "1" });
        if (result) {
          if (result.question && typeof result.question === "string") {
            setChats([
              {
                id: result.questionId,
                content: result.question.trim(),
                role: "ai",
                sender: "Interviewer",
                timestamp: new Date(result.createdAt).toISOString(),
              },
            ]);
          }
        }
      } catch (error) {
        throw new Error(`초기 질문 생성중 에러 발생 ${error}`);
      } finally {
        setIsGenerating(false);
      }
    };
    init();
  }, [chats, isGenerating]);

  ////////// Control functions //////////

  const handleMicToggle = useCallback(() => {
    const newState = !isAudioEnabled;
    toggleAudio(newState);
  }, [isAudioEnabled, toggleAudio]);

  const handleCamToggle = useCallback(() => {
    const newState = !isVideoEnabled;
    toggleVideo(newState);
  }, [isVideoEnabled, toggleVideo]);

  const handleExit = useCallback(
    async (path?: string) => {
      await Promise.all([stopVideoRecording(), stopAudioRecording()]);
      stopMediaStream();
      router.push(path ?? "/dashboard/result");
    },
    [stopVideoRecording, stopAudioRecording, stopMediaStream, router],
  );

  const toggleChat = useCallback((newState?: boolean) => {
    setIsChatOpen((prev) => (newState !== undefined ? newState : !prev));
  }, []);

  return {
    // Stream states
    mediaStream,
    isVideoEnabled,
    isAudioEnabled,
    isRecording,
    isChatOpen,

    // Chat state
    chats,
    setChats,
    isGenerating,

    // Control functions
    handleMicToggle,
    handleCamToggle,
    handleExit,
    toggleChat,

    // Raw toggle functions (for backward compatibility)
    toggleVideo,
    toggleAudio,

    // Recording controls
    startRecording: () => {
      startVideoRecording();
      startAudioRecording();
    },
    stopRecording: () => {
      stopVideoRecording();
      stopAudioRecording();
    },
  };
};
