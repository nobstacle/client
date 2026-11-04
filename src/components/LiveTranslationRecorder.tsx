"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
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
const SPEECH_RMS_THRESHOLD = 0.022; // RMS amplitude threshold for active voice
const SPEECH_MIN_ACTIVE_MS = 220; // Minimum voiced duration to count as real speech
const SILENCE_COMMIT_MS = 550; // Pause duration after speech that auto-triggers translation (fast 550ms commit)
const MAX_SEGMENT_SPEECH_MS = 5500; // Auto-commit long continuous speech every ~5.5s
const MUTUAL_SILENCE_TIMEOUT_MS = 5000; // Auto-stop live translation session if neither party speaks for 5s

const LiveTranslationRecorder: React.FC<LiveTranslationRecorderProps> = ({
  mode = "header",
  activeLangCode,
  station,
  onTranscription,
}) => {
  const [recording, setRecording] = useState(false);
  const [sessionActive, setSessionActive] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const [inFlightCount, setInFlightCount] = useState(0);

  const recordingRef = useRef(false);
  const sessionActiveRef = useRef(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const mimeTypeRef = useRef<string>("");
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // VAD & Mutual Conversation Session state refs
  const segmentStartTimeRef = useRef<number>(0);
  const speechStartTimeRef = useRef<number>(0);
  const lastSpeechTimeRef = useRef<number>(0);
  const lastMutualActivityTimeRef = useRef<number>(0);
  const accumulatedVoicedMsRef = useRef<number>(0);
  const hasSpeechInSegmentRef = useRef<boolean>(false);
  const hasAutoCommittedAnySegmentRef = useRef<boolean>(false);
  const lastCommitTimeRef = useRef<number>(0);
  const lastFrameTimeRef = useRef<number>(0);
  const isFlushingSegmentRef = useRef<boolean>(false);
  const lastEmittedTranscriptRef = useRef<{ text: string; time: number }>({
    text: "",
    time: 0,
  });

  const liveTranslationMutation = useUploadControllerUploadLiveTranslationFile({
    request: {
      params: {
        mode,
      },
    },
  });

  const {
    emitSendMessage,
    emitStartLiveTranslationSession,
    emitEndLiveTranslationSession,
    socketConnected,
  } = useSocketContext();
  const params = useSearchParams();
  const { data: companyData } = useCompanyControllerGetCompany();
  const [isInitialized, setIsInitialized] = useState(false);

  const getTargetStation = useCallback((): number => {
    if (station !== undefined && station !== null) {
      const parsed = Number(station);
      if (Number.isFinite(parsed) && parsed >= 1) return Math.floor(parsed);
    }
    const fromParams = Number(params?.get("station") ?? 1);
    return Number.isFinite(fromParams) && fromParams >= 1 ? Math.floor(fromParams) : 1;
  }, [station, params]);

  useEffect(() => {
    const hasSupport =
      typeof window !== "undefined" &&
      Boolean(navigator.mediaDevices?.getUserMedia) &&
      typeof MediaRecorder !== "undefined";

    setIsInitialized(hasSupport);
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
        lastCommitTimeRef.current = performance.now();
        lastMutualActivityTimeRef.current = performance.now();
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

    // If an utterance was already recently committed via silence, and remaining segment is brief / noise, discard it
    const timeSinceLastCommit = performance.now() - lastCommitTimeRef.current;
    if (
      hasAutoCommittedAnySegmentRef.current &&
      timeSinceLastCommit < 2200 &&
      accumulatedVoicedMsRef.current < 450
    ) {
      flushRemainingSpeech = false;
    }

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

  const stopSession = useCallback(
    (emitToRemote = true, reason: string = "user_stopped") => {
      const wasActive = recordingRef.current || sessionActiveRef.current;
      setSessionActive(false);
      sessionActiveRef.current = false;

      if (emitToRemote && wasActive) {
        const targetStation = getTargetStation();
        emitEndLiveTranslationSession(targetStation, reason);
      }

      stopAllRecording(false);

      if (reason === "mutual_silence_timeout") {
        antMessage.info("Live conversation ended (5s silence)", 2.5);
      } else if (reason === "user_stopped" && emitToRemote) {
        antMessage.info("Live conversation ended", 2);
      }
    },
    [emitEndLiveTranslationSession, getTargetStation],
  );

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

        // 1. Audio Echo Suppression:
        // If translated audio is actively playing through the device speakers,
        // suppress mic input so it doesn't transcribe speaker output in a loop
        if (translatedAudioPlayer.getIsPlaying()) {
          lastMutualActivityTimeRef.current = now;
          resetSegmentVadState();
          animationFrameRef.current = requestAnimationFrame(updateLoop);
          return;
        }

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
          lastMutualActivityTimeRef.current = now;

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

          // 1. User paused naturally (~550ms silence) -> immediately translate this utterance!
          // 2. Or user has been speaking continuously for >5.5s and took a brief >220ms breath -> stream chunk!
          if (
            silenceDuration >= SILENCE_COMMIT_MS ||
            (activeSpeechDuration >= MAX_SEGMENT_SPEECH_MS &&
              silenceDuration >= 220) ||
            activeSpeechDuration >= MAX_SEGMENT_SPEECH_MS + 2000
          ) {
            flushCurrentSegment(true);
          }
        }

        // Mutual silence check: If neither user nor client has spoken for 5s, end session automatically
        const mutualSilenceMs = now - lastMutualActivityTimeRef.current;
        if (mutualSilenceMs >= MUTUAL_SILENCE_TIMEOUT_MS) {
          stopSession(true, "mutual_silence_timeout");
          return;
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
      stopSession(false, "mic_error");

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

  const startSession = useCallback(
    async (isInitiator = true) => {
      if (recordingRef.current) return;

      translatedAudioPlayer.unlockAudio();
      setSessionActive(true);
      sessionActiveRef.current = true;
      lastMutualActivityTimeRef.current = performance.now();

      const targetStation = getTargetStation();
      if (isInitiator) {
        emitStartLiveTranslationSession(targetStation, mode);
        antMessage.success("Live conversation active (both microphones listening)", 2.5);
      }

      await startRecording();
    },
    [emitStartLiveTranslationSession, getTargetStation, mode, isInitialized],
  );

  // Synchronize two-way conversation session across user & client via socket events
  useEffect(() => {
    const handleRemoteSessionStarted = (evt: Event) => {
      const customEvt = evt as CustomEvent<{ station: number; initiatorMode?: string }>;
      const targetStation = getTargetStation();
      if (customEvt.detail?.station !== targetStation) return;

      if (!recordingRef.current) {
        console.log("[LiveTranslation] Remote started live conversation session, auto-starting local mic...");
        void startSession(false);
      }
    };

    const handleRemoteSessionEnded = (evt: Event) => {
      const customEvt = evt as CustomEvent<{ station: number; reason?: string }>;
      const targetStation = getTargetStation();
      if (customEvt.detail?.station !== targetStation) return;

      if (recordingRef.current || sessionActiveRef.current) {
        console.log("[LiveTranslation] Remote ended live conversation session, stopping local mic...");
        stopSession(false, customEvt.detail?.reason || "remote_ended");
      }
    };

    const handleRemoteActivity = (evt: Event) => {
      const customEvt = evt as CustomEvent<{ station: number }>;
      const targetStation = getTargetStation();
      if (customEvt.detail?.station !== targetStation) return;

      // Keep mutual activity alive when other party speaks
      lastMutualActivityTimeRef.current = performance.now();
    };

    window.addEventListener("live-translation-session-started", handleRemoteSessionStarted);
    window.addEventListener("live-translation-session-ended", handleRemoteSessionEnded);
    window.addEventListener("live-translation-activity", handleRemoteActivity);

    return () => {
      window.removeEventListener("live-translation-session-started", handleRemoteSessionStarted);
      window.removeEventListener("live-translation-session-ended", handleRemoteSessionEnded);
      window.removeEventListener("live-translation-activity", handleRemoteActivity);
    };
  }, [getTargetStation, startSession, stopSession]);

  useEffect(() => {
    return () => {
      stopSession(false, "unmount");
    };
  }, [stopSession]);

  const handleToggleRecording = () => {
    if (recordingRef.current || sessionActiveRef.current) {
      stopSession(true, "user_stopped");
    } else {
      void startSession(true);
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
      const now = Date.now();

      // Guard against duplicate trailing messages
      if (
        transcript &&
        lastEmittedTranscriptRef.current.text &&
        now - lastEmittedTranscriptRef.current.time < 3500 &&
        (transcript.toLowerCase() === lastEmittedTranscriptRef.current.text.toLowerCase() ||
          lastEmittedTranscriptRef.current.text.toLowerCase().endsWith(transcript.toLowerCase()))
      ) {
        console.log("[LiveTranslationMic] Deduped duplicate trailing transcript:", transcript);
        return;
      }

      if (transcript) {
        lastEmittedTranscriptRef.current = { text: transcript, time: now };
        lastMutualActivityTimeRef.current = performance.now();

        if (onTranscription) {
          onTranscription(transcript);
        }
        if (!socketConnected) {
          antMessage.error("Not connected. Please try again.");
          return;
        }

        const targetStation = getTargetStation();

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
  const isLiveActive = recording || sessionActive;
  const isDisabled = !isInitialized || (!socketConnected && mode === "client");

  return (
    <button
      className={`border-1 relative flex min-h-[44px] min-w-[44px] flex-col items-center justify-center rounded-md border-black px-3 py-2 text-center text-white transition-all ${
        isDisabled ? "cursor-not-allowed opacity-50" : "cursor-pointer"
      }`}
      style={{
        backgroundColor: isLiveActive
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
            : isLiveActive
              ? "Live conversation active (Both mics recording — speak naturally. Auto-stops after 5s silence)"
              : "Live AI Conversation (Click once: both user and client record automatically with live speech translation)"
      }
    >
      {!recording && isTranslating ? (
        <Spinner color="fill-white" />
      ) : (
        <>
          <div className="relative">
            <div
              className={
                isLiveActive ? "animate-breath text-yellow-200" : "text-white"
              }
            >
              <MicIcon fill="currentColor" />
            </div>
            {isLiveActive && (
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
          {isLiveActive && (
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
