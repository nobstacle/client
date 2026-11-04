"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  useCompanyControllerGetCompany,
  useUploadControllerUploadLiveTranslationFile,
} from "../lib/client/api";
import { useSocketContext } from "../context/SocketContextProvider";
import { useMessageStore } from "../lib/zustand/store/messageStore";
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

// Voice Activity Detection (VAD) tuning constants
const SPEECH_RMS_THRESHOLD = 0.022; // RMS amplitude threshold for active voice
const SPEECH_MIN_ACTIVE_MS = 200; // Minimum voiced duration to count as real speech
const SILENCE_TIMEOUT_MS = 5000; // Auto-stop recording if user stops speaking for 5s (or stays silent for 5s)

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

  // VAD & Silence tracking refs
  const recordingStartTimeRef = useRef<number>(0);
  const lastSpeechTimeRef = useRef<number>(0);
  const accumulatedVoicedMsRef = useRef<number>(0);
  const hasSpeechRef = useRef<boolean>(false);
  const shouldSendAudioRef = useRef<boolean>(true);
  const lastFrameTimeRef = useRef<number>(0);

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

  const getActiveLangCode = useCallback((): string => {
    if (mode === "header") {
      // In header mode (Admin speaking), the target language is the Client's active station language
      const store = useMessageStore.getState();
      const targetStation = getTargetStation();
      const stationLang =
        store.receivedLangCodeByStation[targetStation] || store.receivedLangCode;
      const fromLocal =
        typeof window !== "undefined" ? localStorage.getItem("lang-code") : null;
      if (activeLangCode && activeLangCode !== "en") {
        return activeLangCode;
      }
      return stationLang || fromLocal || companyData?.defaultLangCode || "en";
    }

    // In client mode (Guest speaking), language is the client's selected language
    if (activeLangCode) {
      return activeLangCode;
    }
    const fromParams = params?.get("lang");
    if (fromParams) {
      return fromParams;
    }
    const fromLocal =
      typeof window !== "undefined" ? localStorage.getItem("lang-code") : null;
    if (fromLocal) return fromLocal;
    return companyData?.defaultLangCode || "en";
  }, [mode, activeLangCode, getTargetStation, params, companyData]);

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
      } else {
        antMessage.error("Translation request failed. Please try again.");
      }
    } finally {
      setInFlightCount((c) => Math.max(0, c - 1));
    }
  };

  const stopRecording = useCallback(
    (commitAudio = true, reason: string = "user_stopped") => {
      if (!recordingRef.current && !mediaRecorderRef.current) return;

      recordingRef.current = false;
      setRecording(false);
      shouldSendAudioRef.current = commitAudio;

      if (reason === "silence_timeout") {
        antMessage.info("Finished speaking (5s silence)", 2);
      } else if (reason === "no_speech_timeout") {
        antMessage.info("No speech detected (5s silence)", 2);
      }

      const recorder = mediaRecorderRef.current;
      if (recorder) {
        try {
          if (recorder.state === "recording") {
            recorder.stop();
          }
        } catch (e) {
          console.warn("[LiveTranslationMic] Error stopping recorder:", e);
        }
        mediaRecorderRef.current = null;
      }

      cleanupStream();
    },
    [],
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

        // Acoustic Echo Suppression:
        // If translated audio is actively playing through the device speakers,
        // suppress mic input so it doesn't transcribe speaker output in a loop
        if (translatedAudioPlayer.getIsPlaying()) {
          setAudioLevel(0);
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

          if (
            !hasSpeechRef.current &&
            accumulatedVoicedMsRef.current >= SPEECH_MIN_ACTIVE_MS
          ) {
            hasSpeechRef.current = true;
          }
        }

        // 5-Second Silence Rule:
        // 1. If user spoke and then remained silent for 5s -> auto-stop and send translation
        if (hasSpeechRef.current) {
          const silenceMs = now - lastSpeechTimeRef.current;
          if (silenceMs >= SILENCE_TIMEOUT_MS) {
            stopRecording(true, "silence_timeout");
            return;
          }
        } else {
          // 2. If user initiated recording but did not speak at all for 5s -> auto-stop without sending empty audio
          const durationSinceStart = now - recordingStartTimeRef.current;
          if (durationSinceStart >= SILENCE_TIMEOUT_MS) {
            stopRecording(false, "no_speech_timeout");
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
      const chosenMime = supportedMimeTypes[0] || "";
      mimeTypeRef.current = chosenMime;

      const chunks: Blob[] = [];
      const recorderOptions: MediaRecorderOptions = {
        ...(chosenMime ? { mimeType: chosenMime } : {}),
        audioBitsPerSecond: 128000,
      };

      const recorder = new MediaRecorder(stream, recorderOptions);

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          chunks.push(event.data);
        }
      };

      recorder.onstop = () => {
        const actualMimeType = recorder.mimeType || chosenMime || "audio/webm";
        const audioBlob = new Blob(chunks, { type: actualMimeType });

        if (
          shouldSendAudioRef.current &&
          (hasSpeechRef.current || audioBlob.size > 800)
        ) {
          void sendAudioForLiveTranslation(audioBlob);
        }
      };

      recorder.onerror = (event: any) => {
        console.error("[LiveTranslationMic] MediaRecorder error:", event?.error);
      };

      const now = performance.now();
      recordingStartTimeRef.current = now;
      lastSpeechTimeRef.current = now;
      accumulatedVoicedMsRef.current = 0;
      hasSpeechRef.current = false;
      shouldSendAudioRef.current = true;

      recordingRef.current = true;
      setRecording(true);

      recorder.start(200);
      mediaRecorderRef.current = recorder;

      monitorAudioAndVad(stream);
    } catch (error: any) {
      console.error("[LiveTranslationMic] Error accessing microphone:", error);
      stopRecording(false, "mic_error");

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
      // User clicked while recording -> finish speaking and translate immediately
      stopRecording(true, "user_clicked");
    } else {
      // User clicked to speak -> start recording
      void startRecording();
    }
  };

  useEffect(() => {
    return () => {
      stopRecording(false, "unmount");
    };
  }, [stopRecording]);

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
              ? "Recording... Speak now. (Click again or pause for 5s to finish)"
              : isTranslating
                ? "Translating speech..."
                : "Live Translation (Click and speak. Auto-stops after 5s silence)"
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
