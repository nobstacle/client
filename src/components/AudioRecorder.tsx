// src/components/AudioRecorder.jsx
import React, { useState, useRef } from "react";
import {
  useCompanyControllerGetCompany,
  useUploadControllerUploadSpeechToTextFile,
} from "../lib/client/api";
import { useSocketContext } from "../context/SocketContextProvider";
import { useSearchParams } from "next/navigation";
import { MicIcon } from "./icons/MicIcon";
import { Button } from "./Button";
import { useSession } from "next-auth/react";
import { useMessageStore } from "../lib/zustand/store/messageStore";

const AudioRecorder: React.FC = ({ mode }) => {
  const [recording, setRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunks = useRef<Blob[]>([]);
  const speechToTextFileMutation = useUploadControllerUploadSpeechToTextFile();
  const { emitSendMessage } = useSocketContext();
  const params = useSearchParams();
  const { data: companyData } = useCompanyControllerGetCompany();
  const { data: userData } = useSession();

  const messageStore = useMessageStore();

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      mediaRecorderRef.current = new MediaRecorder(stream);

      mediaRecorderRef.current.ondataavailable = (event) => {
        audioChunks.current.push(event.data);
      };

      mediaRecorderRef.current.onstop = async () => {
        const audioBlob = new Blob(audioChunks.current, {
          type: getSupportedMimeTypes()[0],
        });
        audioChunks.current = []; // Clear recorded chunks
        await sendAudioToBackend(audioBlob);
      };

      mediaRecorderRef.current.start();
      setRecording(true);
    } catch (error) {
      console.error("Error accessing microphone:", error);
    }
  };

  function getSupportedMimeTypes() {
    const possibleTypes = [
      "audio/webm;codecs=opus",
      "audio/ogg;codecs=opus",
      "audio/mp4", // Note: This may not work with MediaRecorder in most browsers
    ];

    return possibleTypes.filter((type) => MediaRecorder.isTypeSupported(type));
  }

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    setRecording(false);
  };

  const sendAudioToBackend = async (audioBlob: Blob) => {
    const recognitionLangCode = mode === 'client' ? localStorage?.getItem("lang-code") : "en";

    try {
      speechToTextFileMutation.mutate(
        { data: { file: audioBlob, langCode: recognitionLangCode } },
        {
          onSuccess: (res) => {
            sendMessage(res.transcription);
          },
        },
      );
    } catch (error) {
      console.error("Error sending audio:", error);
    }
  };

  const sendMessage = (message: string) => {
    if (message.length === 0) return;

    emitSendMessage({
      message: message,
      station: Number(params.get("station") ?? 1),
      refType: "ChatMessage",
      langCode: params.get("lang") || companyData?.defaultLangCode || "en",
    });
  };

  return (
    <Button
      className="border-1 relative flex flex-col items-center justify-center rounded-md  border-black  px-3  text-center text-white"
      type="button"
      onClick={recording ? stopRecording : startRecording}
      isLoading={speechToTextFileMutation.status === "pending"}
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
