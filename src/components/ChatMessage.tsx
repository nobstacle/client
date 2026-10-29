"use client";

import React, { useEffect, useState } from "react";
import { translatedAudioPlayer } from "../utils/audioPlayer";

export const ChatMessage = ({
  isRight,
  message,
  messageId,
  audioUrl,
  langCode,
  isLiveTranslation,
}: {
  isRight?: boolean;
  message: string;
  messageId?: string | number;
  audioUrl?: string;
  langCode?: string;
  isLiveTranslation?: boolean;
}) => {
  const [playingId, setPlayingId] = useState<string | number | null>(null);

  useEffect(() => {
    if (!isLiveTranslation && !audioUrl) return;
    return translatedAudioPlayer.subscribe(setPlayingId);
  }, [isLiveTranslation, audioUrl]);

  const isPlaying = messageId != null && playingId === messageId;

  const parentClass = isRight
    ? "ml-auto mt-2 flex w-full max-w-xs justify-end space-x-3"
    : "mt-2 flex w-full max-w-xs space-x-3";
  const bubbleClass = isRight
    ? "rounded-l-lg rounded-br-lg bg-white p-3 text-black"
    : "rounded-r-lg rounded-bl-lg bg-green-300 p-3";

  const handlePlayAudio = () => {
    translatedAudioPlayer.playNow({
      messageId,
      audioUrl,
      fallbackText: message,
      langCode,
    });
  };

  return (
    <div className={parentClass} style={{ fontFamily: "var(--font-inter)" }}>
      <div>
        <div className={bubbleClass} style={{ fontFamily: "inherit" }}>
          <div className="flex items-center gap-2">
            <p className="text-sm" style={{ fontFamily: "inherit" }}>
              {message}
            </p>
            {(isLiveTranslation || audioUrl) && (
              <button
                type="button"
                onClick={handlePlayAudio}
                title={isPlaying ? "Stop audio" : "Play translated audio"}
                className={`ml-1 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full transition-colors ${
                  isPlaying
                    ? "animate-pulse bg-red-600 text-white"
                    : "bg-black/10 text-gray-800 hover:bg-black/20"
                }`}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  className="h-3.5 w-3.5"
                >
                  <path d="M13.5 4.06c0-1.336-1.616-2.005-2.56-1.06l-4.5 4.5H4.508c-1.141 0-2.318.664-2.66 1.905A9.76 9.76 0 001.5 12c0 .898.121 1.768.35 2.595.341 1.24 1.518 1.905 2.659 1.905h1.93l4.5 4.5c.945.945 2.561.276 2.561-1.06V4.06zM18.584 5.106a.75.75 0 011.06 0c3.808 3.807 3.808 9.98 0 13.788a.75.75 0 11-1.06-1.06 8.25 8.25 0 000-11.668.75.75 0 010-1.06z" />
                  <path d="M15.932 7.757a.75.75 0 011.061 0 6 6 0 010 8.486.75.75 0 01-1.06-1.061 4.5 4.5 0 000-6.364.75.75 0 010-1.06z" />
                </svg>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
