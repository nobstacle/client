import React, { useState, useRef, useEffect } from "react";
import {
  useCompanyControllerGetCompany,
  useUploadControllerUploadSpeechToTextFile,
} from "../lib/client/api";
import { useSocketContext } from "../context/SocketContextProvider";
import { useSearchParams } from "next/navigation";
import { MicIcon } from "./icons/MicIcon";
import { Button } from "./Button";
import { message as antMessage } from "antd";

type AudioRecorderProps = {
  mode?: "client" | "header";
  activeLangCode?: string;
  station?: number;
  onTranscription?: (text: string) => void;
};

const AudioRecorder: React.FC<AudioRecorderProps> = ({
  mode = "header",
  activeLangCode,
  station,
  onTranscription,
}) => {
  const [recording, setRecording] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const [canStop, setCanStop] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioChunks = useRef<Blob[]>([]);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const recordingStartTimeRef = useRef<number>(0);
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const MIN_RECORDING_DURATION_MS = 600; // Minimum 0.6 seconds for natural short phrases
  const speechToTextFileMutation = useUploadControllerUploadSpeechToTextFile({
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

  // Check browser support on mount
  useEffect(() => {
    const hasSupport =
      typeof window !== "undefined" &&
      navigator.mediaDevices &&
      navigator.mediaDevices.getUserMedia &&
      typeof MediaRecorder !== "undefined";

    setIsInitialized(hasSupport);
    
    if (!hasSupport) {
      console.warn("Browser does not support required audio APIs");
    }
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
      "", // Browser's default codec
    ];

    const supported = possibleTypes.filter((type) => {
      if (type === "") return true; // Default codec is always supported as fallback
      return MediaRecorder.isTypeSupported(type);
    });

    return supported;
  }

  const cleanupStream = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        track.stop();
      });
      streamRef.current = null;
    }
    
    // Clean up audio context and monitoring
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
    
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    
    analyserRef.current = null;
    setAudioLevel(0);
    setCountdown(0);
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
        
        // Calculate average audio level (0-100)
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
      console.warn('[Mic] Audio monitoring failed:', error);
    }
  };

  const startRecording = async () => {
    try {
      if (!isInitialized) {
        antMessage.error(
          "Your browser does not support microphone access. Please use Chrome, Firefox, or Safari."
        );
        return;
      }

      if (recording) {
        return; // Already recording
      }

      audioChunks.current = [];
      console.log("[Mic] Requesting microphone access...");

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      streamRef.current = stream;
      
      // Start audio level monitoring
      monitorAudioLevel(stream);
      
      const supportedMimeTypes = getSupportedMimeTypes();
      const mimeType = supportedMimeTypes[0];

      console.log("[Mic] Supported MIME types:", supportedMimeTypes);
      console.log("[Mic] Using MIME type:", mimeType);

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
          const actualMimeType = mediaRecorderRef.current?.mimeType || mimeType || "audio/webm";
          const audioBlob = new Blob(audioChunks.current, {
            type: actualMimeType,
          });
          audioChunks.current = [];

          cleanupStream();

          if (audioBlob.size === 0) {
            antMessage.warning("No audio recorded. Please try again.");
            return;
          }

          console.log("[Mic] Audio recorded, size:", audioBlob.size, "MIME:", actualMimeType);
          await sendAudioToBackend(audioBlob);
        } catch (error) {
          console.error("[Mic] Error in onstop:", error);
          cleanupStream();
        }
      };

      mediaRecorderRef.current.onerror = (event) => {
        console.error("[Mic] MediaRecorder error:", event.error);
        antMessage.error(`Recording failed: ${event.error}`);
        setRecording(false);
        setCanStop(false);
        cleanupStream();
      };

      mediaRecorderRef.current.start(250);
      setRecording(true);
      setCanStop(true);
      recordingStartTimeRef.current = Date.now();
      
      console.log("[Mic] Recording started - speak clearly");
    } catch (error: any) {
      console.error("[Mic] Error accessing microphone:", error);
      cleanupStream();

      if (error.name === "NotAllowedError" || error.name === "PermissionDeniedError") {
        antMessage.error(
          "Microphone permission denied. Please allow access in your browser settings."
        );
      } else if (error.name === "NotFoundError" || error.name === "DevicesNotFoundError") {
        antMessage.error("No microphone found. Please connect one.");
      } else if (error.name === "NotReadableError" || error.name === "SecurityError") {
        antMessage.error("Could not access microphone. Check browser settings.");
      } else {
        antMessage.error("Microphone access failed. Try a different browser.");
      }
    }
  };

  const stopRecording = () => {
    const elapsed = Date.now() - recordingStartTimeRef.current;
    
    if (elapsed < MIN_RECORDING_DURATION_MS) {
      const remaining = ((MIN_RECORDING_DURATION_MS - elapsed) / 1000).toFixed(1);
      antMessage.info(`Please speak for at least ${remaining}s`);
      return;
    }
    
    if (mediaRecorderRef.current && recording) {
      try {
        if (mediaRecorderRef.current.state === "recording") {
          mediaRecorderRef.current.requestData();
        }
      } catch (e) {
        console.warn("[Mic] requestData error:", e);
      }
      mediaRecorderRef.current.stop();
      setRecording(false);
      setCanStop(false);
      console.log("[Mic] Recording stopped after", elapsed, "ms, audio level:", audioLevel);
    }
  };

  const sendAudioToBackend = async (audioBlob: Blob) => {
    const langCode = getActiveLangCode();

    console.log(
      "[Mic] Sending audio to backend. Size:",
      audioBlob.size,
      "Type:",
      audioBlob.type,
      "Lang:",
      langCode
    );

    if (audioBlob.size === 0) {
      console.warn("[Mic] Audio blob is empty");
      antMessage.warning("No audio was recorded. Please try again.");
      return;
    }

    try {
      speechToTextFileMutation.mutate(
        { data: { file: audioBlob, langCode } },
        {
          onSuccess: (res) => {
            console.log("[Mic] Transcription received:", res.transcription);
            if (res?.transcription && res.transcription.trim()) {
              if (onTranscription) {
                onTranscription(res.transcription);
              }
              sendMessage(res.transcription, langCode);
            } else {
              antMessage.warning("No speech detected. Please try again.");
            }
          },
          onError: (error: any) => {
            console.error("[Mic] Speech-to-text error details:", {
              message: error?.message,
              status: error?.response?.status,
              statusText: error?.response?.statusText,
              data: error?.response?.data,
            });

            if (error?.response?.status === 401) {
              antMessage.error("Session expired. Please refresh the page.");
            } else if (error?.response?.status === 400) {
              antMessage.error("Invalid audio format. Please try again.");
            } else if (error?.response?.status >= 500) {
              antMessage.error("Server error. Please try again later.");
            } else {
              antMessage.error("Failed to process audio. Please try again.");
            }
          },
        }
      );
    } catch (error) {
      console.error("[Mic] Error in sendAudioToBackend:", error);
      antMessage.error("Failed to send audio. Please try again.");
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
      const fromLocal = typeof window !== "undefined" ? localStorage.getItem("lang-code") : null;
      if (fromLocal) return fromLocal;
    }
    return companyData?.defaultLangCode || "en";
  };

  const sendMessage = (message: string, langCode = getActiveLangCode()) => {
    if (!message.trim()) {
      // Empty transcript after trim — STT returned whitespace-only string
      antMessage.warning("No speech detected. Please speak clearly and try again.");
      return;
    }

    if (!socketConnected) {
      antMessage.error("Not connected. Please try again.");
      return;
    }

    console.log("[Mic] Sending message via socket:", message);

    const targetStation = station !== undefined ? station : Number(params.get("station") ?? 1);

    emitSendMessage({
      message: message,
      station: targetStation,
      refType: "ChatMessage",
      langCode,
    });
  };

  if (!isInitialized) {
    return (
      <Button
        className="border-1 relative flex flex-col items-center justify-center rounded-md border-black px-3 text-center text-white opacity-50 cursor-not-allowed"
        type="button"
        disabled
        title="Microphone not supported in this browser"
      >
        <AnimatedMicIcon loading={false} />
      </Button>
    );
  }

  return (
    <Button
      className="border-1 relative flex flex-col items-center justify-center rounded-md border-black px-3 text-center text-white"
      type="button"
      onClick={recording ? stopRecording : startRecording}
      isLoading={speechToTextFileMutation.status === "pending"}
      disabled={!socketConnected && mode === "client"}
      title={
        !socketConnected && mode === "client"
          ? "Waiting for connection..."
          : recording
          ? canStop
            ? "Click to stop recording"
            : `Speak clearly... (${countdown}s)`
          : "Click to start recording"
      }
    >
      <div className="relative">
        <AnimatedMicIcon loading={recording} />
        {recording && (
          <div className="absolute -top-1 -right-1 flex h-3 w-3">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75"></span>
            <span className="relative inline-flex h-3 w-3 rounded-full bg-red-500"></span>
          </div>
        )}
      </div>
      {recording && (
        <div className="absolute -bottom-1 left-0 right-0 h-1 bg-gray-600 rounded-full overflow-hidden">
          <div 
            className="h-full bg-green-400 transition-all duration-150 ease-out"
            style={{ width: `${audioLevel}%` }}
          />
        </div>
      )}
    </Button>
  );
};

const AnimatedMicIcon: React.FC<{ loading: boolean }> = ({ loading }) => {
  const clx = loading ? "animate-breath text-green-400" : "text-white";

  return (
    <div className={clx}>
      <MicIcon fill={"currentColor"} />
    </div>
  );
};

export default AudioRecorder;
