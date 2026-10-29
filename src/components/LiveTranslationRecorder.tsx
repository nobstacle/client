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

// Voice Activity Detection (VAD) tuning constants for real-time phrase streaming
const SPEECH_RMS_THRESHOLD = 0.018; // RMS amplitude threshold for active voice
const SPEECH_MIN_ACTIVE_MS = 140; // Minimum voiced duration to count as real speech
const SILENCE_COMMIT_MS = 750; // Pause duration after speech that auto-triggers translation
const MAX_SEGMENT_SPEECH_MS = 5500; // Auto-commit long continuous speech every ~5.5s
const IDLE_AUTO_STOP_MS = 5000; // Auto-stop mic if user stays silent for 5s after speaking

const LiveTranslationRecorder: React.FC<LiveTranslationRecorderProps> = ({
  mode = "header",
  activeLangCode,
  station,
  onTranscription,
}) => {
  const [recording, setRecording] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const [inFlightCount, setInFlightCount] = useState(0);

  const recordingRef = useRef(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const mimeTypeRef = useRef<string>("");
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // VAD state refs
  const segmentStartTimeRef = useRef<number>(0);
  const speechStartTimeRef = useRef<number>(0);
  const lastSpeechTimeRef = useRef<number>(0);
  const accumulatedVoicedMsRef = useRef<number>(0);
  const hasSpeechInSegmentRef = useRef<boolean>(false);
  const hasAutoCommittedAnySegmentRef = useRef<boolean>(false);
  const lastFrameTimeRef = useRef<number>(0);
  const isFlushingSegmentRef = useRef<boolean>(false);

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
      stopAllRecording(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        track.stop();
      });
      streamRef.current = null;
    }

    if (audioContextRef.current && audioContextRef.current.state !== "closed") {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }

    analyserRef.current = null;
    setAudioLevel(0);
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

  const resetSegmentVadState = () => {
    const now = performance.now();
    segmentStartTimeRef.current = now;
    speechStartTimeRef.current = 0;
    lastSpeechTimeRef.current = now;
    accumulatedVoicedMsRef.current = 0;
    hasSpeechInSegmentRef.current = false;
  };

  const spawnSegmentRecorder = (stream: MediaStream) => {
    const mimeType = mimeTypeRef.current;
    const chunks: Blob[] = [];
    let segmentHadSpeech = false;

    const recorderOptions: MediaRecorderOptions = {
      ...(mimeType ? { mimeType } : {}),
      audioBitsPerSecond: 128000,
    };

    const recorder = new MediaRecorder(stream, recorderOptions);

    recorder.ondataavailable = (event) => {
      if (event.data && event.data.size > 0) {
        chunks.push(event.data);
      }
    };

    recorder.onstop = () => {
      const actualMimeType = recorder.mimeType || mimeType || "audio/webm";
      const audioBlob = new Blob(chunks, { type: actualMimeType });
      if (segmentHadSpeech && audioBlob.size > 200) {
        void sendAudioForLiveTranslation(audioBlob);
      }
    };

    recorder.onerror = (event: any) => {
      console.error("[LiveTranslationMic] MediaRecorder error:", event?.error);
    };

    // Store a custom setter on the recorder instance so flush knows whether speech occurred
    (recorder as any).__markHadSpeech = (val: boolean) => {
      segmentHadSpeech = val;
    };

    resetSegmentVadState();
    recorder.start(200);
    mediaRecorderRef.current = recorder;
  };

  const flushCurrentSegment = (keepListening: boolean) => {
    if (isFlushingSegmentRef.current) return;
    isFlushingSegmentRef.current = true;

    try {
      const currentRecorder = mediaRecorderRef.current;
      const hadSpeech =
        hasSpeechInSegmentRef.current &&
        accumulatedVoicedMsRef.current >= SPEECH_MIN_ACTIVE_MS;

      if (currentRecorder) {
        if (typeof (currentRecorder as any).__markHadSpeech === "function") {
          (currentRecorder as any).__markHadSpeech(hadSpeech);
        }
        try {
          if (currentRecorder.state === "recording") {
            currentRecorder.requestData();
            currentRecorder.stop();
          }
        } catch {}
        mediaRecorderRef.current = null;
      }

      if (hadSpeech) {
        hasAutoCommittedAnySegmentRef.current = true;
      }

      if (keepListening && recordingRef.current && streamRef.current?.active) {
        spawnSegmentRecorder(streamRef.current);
      }
    } finally {
      isFlushingSegmentRef.current = false;
    }
  };

  const stopAllRecording = (flushRemainingSpeech = true) => {
    recordingRef.current = false;
    setRecording(false);

    if (flushRemainingSpeech) {
      flushCurrentSegment(false);
    } else if (mediaRecorderRef.current) {
      try {
        if (
          typeof (mediaRecorderRef.current as any).__markHadSpeech === "function"
        ) {
          (mediaRecorderRef.current as any).__markHadSpeech(false);
        }
        if (mediaRecorderRef.current.state === "recording") {
          mediaRecorderRef.current.stop();
        }
      } catch {}
      mediaRecorderRef.current = null;
    }

    cleanupStream();
  };

  const monitorAudioAndVad = (stream: MediaStream) => {
    try {
      const audioContext = new AudioContext();
      audioContextRef.current = audioContext;

      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 1024;
      analyser.smoothingTimeConstant = 0.3;
      analyserRef.current = analyser;

      const source = audioContext.createMediaStreamSource(stream);
      source.connect(analyser);

      const timeData = new Float32Array(analyser.fftSize);
      lastFrameTimeRef.current = performance.now();

      const updateLoop = () => {
        if (!analyserRef.current || !recordingRef.current) return;

        const now = performance.now();
        const dt = Math.min(100, Math.max(0, now - lastFrameTimeRef.current));
        lastFrameTimeRef.current = now;

        analyserRef.current.getFloatTimeDomainData(timeData);
        let sumSquares = 0;
        for (let i = 0; i < timeData.length; i++) {
          const sample = timeData[i];
          sumSquares += sample * sample;
        }
        const rms = Math.sqrt(sumSquares / timeData.length);
        const normalizedLevel = Math.min(100, Math.round((rms / 0.18) * 100));
        setAudioLevel(normalizedLevel);

        const isVoicedFrame = rms >= SPEECH_RMS_THRESHOLD;

        if (isVoicedFrame) {
          accumulatedVoicedMsRef.current += dt;
          lastSpeechTimeRef.current = now;

          if (
            !hasSpeechInSegmentRef.current &&
            accumulatedVoicedMsRef.current >= SPEECH_MIN_ACTIVE_MS
          ) {
            hasSpeechInSegmentRef.current = true;
            speechStartTimeRef.current = now;
          }
        }

        if (hasSpeechInSegmentRef.current) {
          const silenceDuration = now - lastSpeechTimeRef.current;
          const activeSpeechDuration = now - speechStartTimeRef.current;

          // 1. User paused naturally (~750ms silence) -> immediately translate this utterance!
          // 2. Or user has been speaking continuously for >5.5s and took a brief >220ms breath -> stream chunk!
          if (
            silenceDuration >= SILENCE_COMMIT_MS ||
            (activeSpeechDuration >= MAX_SEGMENT_SPEECH_MS &&
              silenceDuration >= 220) ||
            activeSpeechDuration >= MAX_SEGMENT_SPEECH_MS + 2000
          ) {
            flushCurrentSegment(true);
          }
        } else if (hasAutoCommittedAnySegmentRef.current) {
          // If at least one spoken phrase was already translated and the user stays silent for 5s, auto-stop
          const idleSilence = now - segmentStartTimeRef.current;
          if (idleSilence >= IDLE_AUTO_STOP_MS) {
            stopAllRecording(false);
            return;
          }
        }

        animationFrameRef.current = requestAnimationFrame(updateLoop);
      };

      updateLoop();
    } catch (error) {
      console.warn("[LiveTranslationMic] Audio monitoring failed:", error);
    }
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

      if (recordingRef.current) return;

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          sampleRate: 48000,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      streamRef.current = stream;
      const supportedMimeTypes = getSupportedMimeTypes();
      mimeTypeRef.current = supportedMimeTypes[0] || "";
      hasAutoCommittedAnySegmentRef.current = false;

      recordingRef.current = true;
      setRecording(true);

      spawnSegmentRecorder(stream);
      monitorAudioAndVad(stream);
    } catch (error: any) {
      console.error("[LiveTranslationMic] Error accessing microphone:", error);
      stopAllRecording(false);

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

  const handleToggleRecording = () => {
    if (recordingRef.current) {
      stopAllRecording(true);
    } else {
      void startRecording();
    }
  };

  const sendAudioForLiveTranslation = async (audioBlob: Blob) => {
    const langCode = getActiveLangCode();
    if (audioBlob.size < 200) return;

    setInFlightCount((c) => c + 1);
    try {
      const res = await liveTranslationMutation.mutateAsync({
        data: { file: audioBlob, langCode },
      });

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
      }
    } catch (error: any) {
      console.error("[LiveTranslationMic] Live translation error:", error);
      if (error?.response?.status === 401) {
        antMessage.error("Session expired. Please refresh the page.");
      }
    } finally {
      setInFlightCount((c) => Math.max(0, c - 1));
    }
  };

  const isTranslating = inFlightCount > 0;
  const isDisabled = !isInitialized || (!socketConnected && mode === "client");

  return (
    <button
      className={`border-1 relative flex min-h-[44px] min-w-[44px] flex-col items-center justify-center rounded-md border-black px-3 py-2 text-center text-white transition-all ${
        isDisabled ? "cursor-not-allowed opacity-50" : "cursor-pointer"
      }`}
      style={{
        backgroundColor: recording
          ? "rgb(185, 28, 28)"
          : isTranslating
            ? "rgb(153, 27, 27)"
            : "rgb(220, 38, 38)",
      }}
      type="button"
      onClick={handleToggleRecording}
      disabled={isDisabled}
      title={
        !isInitialized
          ? "Microphone not supported in this browser"
          : !socketConnected && mode === "client"
            ? "Waiting for connection..."
            : recording
              ? "Listening & translating automatically as you speak (Click to stop)"
              : "Live AI Translation (Click once & speak — translates automatically)"
      }
    >
      {!recording && isTranslating ? (
        <Spinner color="fill-white" />
      ) : (
        <>
          <div className="relative">
            <div
              className={
                recording ? "animate-breath text-yellow-200" : "text-white"
              }
            >
              <MicIcon fill="currentColor" />
            </div>
            {recording && (
              <div className="absolute -right-1 -top-1 flex h-3 w-3">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-75"></span>
                <span
                  className={`relative inline-flex h-3 w-3 rounded-full ${
                    isTranslating ? "bg-green-400" : "bg-yellow-300"
                  }`}
                ></span>
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
