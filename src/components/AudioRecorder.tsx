import React, { useState, useRef } from "react";
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
};

const AudioRecorder: React.FC<AudioRecorderProps> = ({ mode = "header" }) => {
  const [recording, setRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunks = useRef<Blob[]>([]);
  const speechToTextFileMutation = useUploadControllerUploadSpeechToTextFile();
  const { emitSendMessage } = useSocketContext();
  const params = useSearchParams();
  const { data: companyData } = useCompanyControllerGetCompany();

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

  const startRecording = async () => {
    try {
      // Check browser support for getUserMedia
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        antMessage.error(
          "Your browser does not support microphone access. Please use a modern browser like Chrome, Firefox, or Safari."
        );
        console.error("getUserMedia not supported");
        return;
      }

      console.log("Requesting microphone access...");
      
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        }
      });

      const supportedMimeTypes = getSupportedMimeTypes();
      const mimeType = supportedMimeTypes[0];

      console.log("Supported MIME types:", supportedMimeTypes);
      console.log("Using MIME type:", mimeType);

      if (!MediaRecorder) {
        antMessage.error("MediaRecorder is not available in your browser");
        stream.getTracks().forEach((track) => track.stop());
        return;
      }

      mediaRecorderRef.current = new MediaRecorder(stream, {
        mimeType: mimeType || undefined,
      });

      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunks.current.push(event.data);
        }
      };

      mediaRecorderRef.current.onstop = async () => {
        const audioBlob = new Blob(audioChunks.current, {
          type: mimeType || "audio/webm",
        });
        audioChunks.current = []; // Clear recorded chunks
        
        // Stop all audio tracks
        stream.getTracks().forEach((track) => track.stop());

        if (audioBlob.size === 0) {
          antMessage.warning("No audio recorded. Please try again.");
          return;
        }

        await sendAudioToBackend(audioBlob);
      };

      mediaRecorderRef.current.onerror = (event) => {
        console.error("MediaRecorder error:", event.error);
        antMessage.error(`Recording failed: ${event.error}`);
        setRecording(false);
      };

      mediaRecorderRef.current.start();
      setRecording(true);
      console.log("Recording started");
    } catch (error: any) {
      console.error("Error accessing microphone:", error);
      
      // Handle specific permission errors
      if (error.name === "NotAllowedError" || error.name === "PermissionDeniedError") {
        antMessage.error(
          "Microphone permission denied. Please allow microphone access in your browser settings and try again."
        );
      } else if (error.name === "NotFoundError" || error.name === "DevicesNotFoundError") {
        antMessage.error(
          "No microphone device found. Please connect a microphone and try again."
        );
      } else if (error.name === "NotReadableError" || error.name === "SecurityError") {
        antMessage.error(
          "Could not access your microphone. Please check your browser settings and try again."
        );
      } else {
        antMessage.error(
          "Failed to access microphone. Please try again or use a different browser."
        );
      }
    }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    setRecording(false);
    console.log("Recording stopped");
  };

  const sendAudioToBackend = async (audioBlob: Blob) => {
    const langCode = getActiveLangCode();

    console.log("Sending audio to backend. Blob size:", audioBlob.size, "MIME type:", audioBlob.type);

    try {
      speechToTextFileMutation.mutate(
        { data: { file: audioBlob, langCode } },
        {
          onSuccess: (res) => {
            console.log("Speech-to-text successful:", res.transcription);
            sendMessage(res.transcription, langCode);
          },
          onError: (error: any) => {
            console.error("Speech-to-text error:", error);
            antMessage.error(
              "Failed to process audio. Please try again."
            );
          },
        },
      );
    } catch (error) {
      console.error("Error sending audio:", error);
      antMessage.error("Failed to send audio to server. Please try again.");
    }
  };

  const getActiveLangCode = () => {
    if (mode === "client") {
      return localStorage.getItem("lang-code") || companyData?.defaultLangCode || "en";
    }

    return params.get("lang") || companyData?.defaultLangCode || "en";
  };

  const sendMessage = (message: string, langCode = getActiveLangCode()) => {
    if (!message.trim()) {
      antMessage.warning("No text was recognized. Please try again.");
      return;
    }

    emitSendMessage({
      message: message,
      station: Number(params.get("station") ?? 1),
      refType: "ChatMessage",
      langCode,
    });
  };

  return (
    <Button
      className="border-1 relative flex flex-col items-center justify-center rounded-md  border-black  px-3  text-center text-white"
      type="button"
      onClick={recording ? stopRecording : startRecording}
      isLoading={speechToTextFileMutation.status === "pending"}
      title={recording ? "Click to stop recording" : "Click to start recording"}
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
