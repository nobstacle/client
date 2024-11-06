import React, { useState, useRef } from "react";

const TestAudioRecorder = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [audioURL, setAudioURL] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const startRecording = async () => {
    if (!navigator.mediaDevices) {
      alert("Audio recording is not supported in this browser.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);

      console.log("MEDIA RECORDER: ", mediaRecorderRef.current);

      mediaRecorderRef.current.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };

      mediaRecorderRef.current.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, {
          type: getSupportedMimeTypes()[0],
        });

        const url = URL.createObjectURL(audioBlob);
        setAudioURL(url);
        audioChunksRef.current = [];
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
    } catch (error) {
      console.error("Error accessing microphone", error);
      alert("Error accessing microphone");
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
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  return (
    <div>
      <button
        style={{ backgroundColor: "black", color: "white", padding: "1em" }}
        type="button"
        onClick={isRecording ? stopRecording : startRecording}
      >
        {isRecording ? "Stop Recording" : "Start Recording"}
      </button>
      {audioURL && (
        <div>
          <h3>Recording:</h3>
          <audio controls src={audioURL}></audio>
        </div>
      )}
    </div>
  );
};

export default TestAudioRecorder;
