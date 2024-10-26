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

const AudioRecorder: React.FC = () => {
  const [recording, setRecording] = useState(false);
  const [audioUrl, setAudioUrl] = useState("");
  const [transcription, setTranscription] = useState("");
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

      const audioContext = new window.AudioContext();
      const source = audioContext.createMediaStreamSource(stream);
      const sampleRate = audioContext.sampleRate;
      console.log("sampleRate", sampleRate);

      mediaRecorderRef.current = new MediaRecorder(stream);

      mediaRecorderRef.current.ondataavailable = (event) => {
        audioChunks.current.push(event.data);
      };

      mediaRecorderRef.current.onstop = async () => {
        const audioBlob = new Blob(audioChunks.current, { type: "audio/flac" });
        const audioUrl = URL.createObjectURL(audioBlob);
        setAudioUrl(audioUrl);
        audioChunks.current = []; // Clear recorded chunks
        await sendAudioToBackend(audioBlob);
      };

      mediaRecorderRef.current.start();
      setRecording(true);
    } catch (error) {
      console.error("Error accessing microphone:", error);
    }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    setRecording(false);
  };

  const sendAudioToBackend = async (audioBlob: Blob) => {
    const formData = new FormData();
    formData.append("audio", audioBlob, "audio.flac");
    console.log(formData.get("audio"));
    const isAdminOrStaff =
      userData?.user.Roles?.includes("Staff") ||
      userData?.user.Roles?.includes("Staff");

    const langCode = isAdminOrStaff
      ? companyData?.defaultLangCode || "en"
      : messageStore.receivedLangCode ?? "en";

    console.log("lang code", langCode, messageStore.receivedLangCode);

    try {
      speechToTextFileMutation.mutate(
        { data: { file: audioBlob, langCode } },
        {
          onSuccess: (res) => {
            setTranscription(res.transcription);
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
      className="border-1 flex justify-center rounded-md border-black  p-2 px-6 text-center text-white"
      type="button"
      onClick={recording ? stopRecording : startRecording}
    >
      <MicIcon fill={recording ? "#1acb38" : "#ffffff"} />
    </Button>
  );
};

export default AudioRecorder;
