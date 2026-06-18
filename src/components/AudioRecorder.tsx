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
};

const AudioRecorder: React.FC<AudioRecorderProps> = ({ mode = "header", activeLangCode }) => {
  const [recording, setRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioChunks = useRef<Blob[]>([]);
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

      console.log("[Mic] Requesting microphone access...");

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      streamRef.current = stream;
      const supportedMimeTypes = getSupportedMimeTypes();
      const mimeType = supportedMimeTypes[0];

      console.log("[Mic] Supported MIME types:", supportedMimeTypes);
      console.log("[Mic] Using MIME type:", mimeType);

      mediaRecorderRef.current = new MediaRecorder(stream, {
        mimeType: mimeType || undefined,
      });

      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
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
        cleanupStream();
      };

      mediaRecorderRef.current.start();
      setRecording(true);
      console.log("[Mic] Recording started");
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
    if (mediaRecorderRef.current && recording) {
      mediaRecorderRef.current.stop();
      setRecording(false);
      console.log("[Mic] Recording stopped");
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
            if (res?.transcription) {
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
    if (mode === "client") {
      return localStorage.getItem("lang-code") || companyData?.defaultLangCode || "en";
    }
    return params.get("lang") || companyData?.defaultLangCode || "en";
  };

  const sendMessage = (message: string, langCode = getActiveLangCode()) => {
    if (!message.trim()) {
      antMessage.warning("No speech detected. Please try again.");
      return;
    }

    if (!socketConnected) {
      antMessage.error("Not connected. Please try again.");
      return;
    }

    console.log("[Mic] Sending message via socket:", message);

    emitSendMessage({
      message: message,
      station: Number(params.get("station") ?? 1),
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
          ? "Click to stop recording"
          : "Click to start recording"
      }
    >
      <AnimatedMicIcon loading={recording} />
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
