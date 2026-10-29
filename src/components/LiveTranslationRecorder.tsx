"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  useCompanyControllerGetCompany,
  useUploadControllerUploadLiveTranslationFile,
} from "../lib/client/api";
import { useSocketContext } from "../context/SocketContextProvider";
import { useSearchParams } from "next/navigation";
import { MicIcon } from "./icons/MicIcon";
import { Spinner } from "./Spinner";
import { message as antMessage } from "antd";
import { translatedAudioPlayer } from "../utils/audioPlayer";

type LiveTranslationRecorderProps = {
  mode?: "client" | "header";
  activeLangCode?: string;
  station?: number;
  onTranscription?: (text: string) => void;
};

const LiveTranslationRecorder: React.FC<LiveTranslationRecorderProps> = ({
  mode = "header",
  activeLangCode,
  station,
  onTranscription,
}) => {
  const [recording, setRecording] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const [canStop, setCanStop] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioChunks = useRef<Blob[]>([]);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const recordingStartTimeRef = useRef<number>(0);
  const MIN_RECORDING_DURATION_MS = 600;

  const liveTranslationMutation = useUploadControllerUploadLiveTranslationFile({
    request: {
      params: {
        mode,
      },
    },
  });

  const { emitSendMessage, socketConnected } = useSocketContext();
  const params = useSearchParams();
  const { data: companyData } = useCompanyControllerGetCompany();
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    const hasSupport =
      typeof window !== "undefined" &&
      Boolean(navigator.mediaDevices?.getUserMedia) &&
      typeof MediaRecorder !== "undefined";

    setIsInitialized(hasSupport);
  }, []);

  useEffect(() => {
    return () => {
      cleanupStream();
    };
  }, []);

  function getSupportedMimeTypes() {
    const possibleTypes = [
      "audio/webm;codecs=opus",
      "audio/ogg;codecs=opus",
      "audio/webm",
      "audio/ogg",
      "audio/mp4",
      "audio/wav",
      "audio/mp3",
      "",
    ];

    return possibleTypes.filter((type) => {
      if (type === "") return true;
      return MediaRecorder.isTypeSupported(type);
    });
  }

  const cleanupStream = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        track.stop();
      });
      streamRef.current = null;
    }

    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    if (audioContextRef.current && audioContextRef.current.state !== "closed") {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }

    analyserRef.current = null;
    setAudioLevel(0);
  };

  const monitorAudioLevel = (stream: MediaStream) => {
    try {
      const audioContext = new AudioContext();
      audioContextRef.current = audioContext;

      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 512;
      analyserRef.current = analyser;

      const source = audioContext.createMediaStreamSource(stream);
      source.connect(analyser);

      const dataArray = new Uint8Array(analyser.frequencyBinCount);

      const updateLevel = () => {
        if (!analyserRef.current) return;

        analyserRef.current.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i];
        }
        const average = sum / dataArray.length;
        const normalizedLevel = Math.min(100, (average / 128) * 100);

        setAudioLevel(normalizedLevel);
        animationFrameRef.current = requestAnimationFrame(updateLevel);
      };

      updateLevel();
    } catch (error) {
      console.warn("[LiveTranslationMic] Audio monitoring failed:", error);
    }
  };

  const getActiveLangCode = () => {
    if (activeLangCode) {
      return activeLangCode;
    }
    const fromParams = params?.get("lang");
    if (fromParams) {
      return fromParams;
    }
    if (mode === "client") {
      const fromLocal =
        typeof window !== "undefined"
          ? localStorage.getItem("lang-code")
          : null;
      if (fromLocal) return fromLocal;
    }
    return companyData?.defaultLangCode || "en";
  };

  const startRecording = async () => {
    try {
      translatedAudioPlayer.unlockAudio();

      if (!isInitialized) {
        antMessage.error(
          "Your browser does not support microphone access. Please use Chrome, Firefox, or Safari.",
        );
        return;
      }

      if (recording) return;

      audioChunks.current = [];
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      streamRef.current = stream;
      monitorAudioLevel(stream);

      const supportedMimeTypes = getSupportedMimeTypes();
      const mimeType = supportedMimeTypes[0];

      mediaRecorderRef.current = new MediaRecorder(stream, {
        mimeType: mimeType || undefined,
      });

      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunks.current.push(event.data);
        }
      };

      mediaRecorderRef.current.onstop = async () => {
        try {
          const actualMimeType =
            mediaRecorderRef.current?.mimeType || mimeType || "audio/webm";
          const audioBlob = new Blob(audioChunks.current, {
            type: actualMimeType,
          });
          audioChunks.current = [];

          cleanupStream();

          if (audioBlob.size === 0) {
            antMessage.warning("No audio recorded. Please try again.");
            return;
          }

          await sendAudioForLiveTranslation(audioBlob);
        } catch (error) {
          console.error("[LiveTranslationMic] Error in onstop:", error);
          cleanupStream();
        }
      };

      mediaRecorderRef.current.onerror = (event: any) => {
        console.error("[LiveTranslationMic] MediaRecorder error:", event?.error);
        antMessage.error("Recording failed. Please try again.");
        setRecording(false);
        setCanStop(false);
        cleanupStream();
      };

      mediaRecorderRef.current.start(250);
      setRecording(true);
      setCanStop(true);
      recordingStartTimeRef.current = Date.now();
    } catch (error: any) {
      console.error("[LiveTranslationMic] Error accessing microphone:", error);
      cleanupStream();

      if (
        error.name === "NotAllowedError" ||
        error.name === "PermissionDeniedError"
      ) {
        antMessage.error(
          "Microphone permission denied. Please allow access in your browser settings.",
        );
      } else if (
        error.name === "NotFoundError" ||
        error.name === "DevicesNotFoundError"
      ) {
        antMessage.error("No microphone found. Please connect one.");
      } else {
        antMessage.error("Microphone access failed. Please check settings.");
      }
    }
  };

  const stopRecording = () => {
    const elapsed = Date.now() - recordingStartTimeRef.current;

    if (elapsed < MIN_RECORDING_DURATION_MS) {
      const remaining = ((MIN_RECORDING_DURATION_MS - elapsed) / 1000).toFixed(
        1,
      );
      antMessage.info(`Please speak for at least ${remaining}s`);
      return;
    }

    if (mediaRecorderRef.current && recording) {
      try {
        if (mediaRecorderRef.current.state === "recording") {
          mediaRecorderRef.current.requestData();
        }
      } catch {}
      mediaRecorderRef.current.stop();
      setRecording(false);
      setCanStop(false);
    }
  };

  const sendAudioForLiveTranslation = async (audioBlob: Blob) => {
    const langCode = getActiveLangCode();

    if (audioBlob.size === 0) {
      antMessage.warning("No audio was recorded. Please try again.");
      return;
    }

    try {
      liveTranslationMutation.mutate(
        { data: { file: audioBlob, langCode } },
        {
          onSuccess: (res) => {
            const transcript = res?.transcription?.trim();
            if (transcript) {
              if (onTranscription) {
                onTranscription(transcript);
              }
              if (!socketConnected) {
                antMessage.error("Not connected. Please try again.");
                return;
              }

              const targetStation =
                station !== undefined
                  ? station
                  : Number(params?.get("station") ?? 1);

              emitSendMessage({
                message: transcript,
                station: targetStation,
                refType: "ChatMessage",
                langCode,
                isLiveTranslation: true,
                senderMode: mode,
                adminMessage: res.adminMessage,
                clientMessage: res.clientMessage,
                audioUrl: res.audioUrl,
                adminAudioUrl: res.adminAudioUrl,
                clientAudioUrl: res.clientAudioUrl,
              });
            } else {
              antMessage.warning("No speech detected. Please try again.");
            }
          },
          onError: (error: any) => {
            console.error("[LiveTranslationMic] Live translation error:", error);
            if (error?.response?.status === 401) {
              antMessage.error("Session expired. Please refresh the page.");
            } else {
              antMessage.error(
                "Live AI translation failed. Please try again.",
              );
            }
          },
        },
      );
    } catch (error) {
      console.error("[LiveTranslationMic] Error sending audio:", error);
      antMessage.error("Failed to send audio for translation.");
    }
  };

  const isLoading = liveTranslationMutation.status === "pending";
  const isDisabled = !isInitialized || (!socketConnected && mode === "client");

  return (
    <button
      className={`border-1 relative flex min-h-[44px] min-w-[44px] flex-col items-center justify-center rounded-md border-black px-3 py-2 text-center text-white transition-all ${
        isDisabled ? "cursor-not-allowed opacity-50" : "cursor-pointer"
      }`}
      style={{
        backgroundColor: isLoading
          ? "gray"
          : recording
            ? "rgb(185, 28, 28)"
            : "rgb(220, 38, 38)",
        opacity: isLoading ? 0.6 : 1,
      }}
      type="button"
      onClick={recording ? stopRecording : startRecording}
      disabled={isDisabled || isLoading}
      title={
        !isInitialized
          ? "Microphone not supported in this browser"
          : !socketConnected && mode === "client"
            ? "Waiting for connection..."
            : recording
              ? canStop
                ? "Click to stop live translation"
                : "Speak clearly..."
              : "Live AI Translation (Speak & Play Translated Audio)"
      }
    >
      {isLoading ? (
        <Spinner color="fill-white" />
      ) : (
        <>
          <div className="relative">
            <div className={recording ? "animate-breath text-yellow-200" : "text-white"}>
              <MicIcon fill="currentColor" />
            </div>
            {recording && (
              <div className="absolute -right-1 -top-1 flex h-3 w-3">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-75"></span>
                <span className="relative inline-flex h-3 w-3 rounded-full bg-yellow-300"></span>
              </div>
            )}
          </div>
          {recording && (
            <div className="absolute -bottom-1 left-0 right-0 h-1 overflow-hidden rounded-full bg-red-950">
              <div
                className="h-full bg-yellow-300 transition-all duration-150 ease-out"
                style={{ width: `${audioLevel}%` }}
              />
            </div>
          )}
        </>
      )}
    </button>
  );
};

export default LiveTranslationRecorder;
