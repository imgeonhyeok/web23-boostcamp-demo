"use client";

import React, { memo } from "react";
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  MessageSquare,
  LogOut,
} from "lucide-react";

import { Button } from "@/app/components/ui/button";

interface InterviewControlsProps {
  onToggleChat: (newState?: boolean) => void;
  onExit: (path?: string) => void;
  isVideoEnabled: boolean;
  isAudioEnabled: boolean;
  onToggleVideo: () => void;
  onToggleAudio: () => void;
}

function InterviewControlsComponent({
  onToggleChat,
  onExit,
  isVideoEnabled,
  isAudioEnabled,
  onToggleVideo,
  onToggleAudio,
}: InterviewControlsProps) {
  return (
    <div className="absolute bottom-4 left-1/2 z-10 -translate-x-1/2">
      <div className="flex items-center gap-2 rounded-full bg-black/60 px-3 py-2 backdrop-blur">
        <Button
          size="icon"
          variant="ghost"
          onClick={onToggleAudio}
          className={`text-white hover:bg-white/20 ${isAudioEnabled ? "" : "opacity-50"}`}
          aria-pressed={isAudioEnabled}
          title={isAudioEnabled ? "Mute microphone" : "Unmute microphone"}
        >
          {isAudioEnabled ? <Mic /> : <MicOff />}
        </Button>

        <Button
          size="icon"
          variant="ghost"
          onClick={onToggleVideo}
          className={`text-white hover:bg-white/20 ${isVideoEnabled ? "bg-red-500/30" : ""}`}
          aria-pressed={isVideoEnabled}
          title={isVideoEnabled ? "Turn off camera" : "Turn on camera"}
        >
          {isVideoEnabled ? <Video /> : <VideoOff />}
        </Button>

        <Button
          size="icon"
          variant="ghost"
          onClick={() => onToggleChat()}
          className="text-white hover:bg-white/20"
          title="Toggle chat panel"
        >
          <MessageSquare />
        </Button>
        <span className="mx-1 h-6 w-px bg-white/20" />
        <Button
          size="icon"
          variant="ghost"
          onClick={() => onExit("/dashboard/result")}
          className="text-white hover:bg-white/20"
          title="Exit interview"
        >
          <LogOut />
        </Button>
      </div>
    </div>
  );
}

export const InterviewControls = memo(InterviewControlsComponent);
