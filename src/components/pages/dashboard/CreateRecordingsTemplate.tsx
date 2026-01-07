// import * as React from "react";
// import { SubmitHandler, useForm, Controller } from "react-hook-form";
// import * as yup from "yup";
// import { yupResolver } from "@hookform/resolvers/yup";
// import { Button } from "../../Button";
// import { SendIcon } from "../../icons/SendIcon";
// import { useSocketContext } from "../../../context/SocketContextProvider";
// import { useSearchParams } from "next/navigation";
// import { Card } from "antd";
// import { Input as AntdInput } from "antd";
// import { toast } from "react-toastify";

// interface SendRecordingFormValues {
//   identifier: string;
// }

// const schema = yup.object().shape({
//   identifier: yup.string().required("Recording tag is required"),
// });

// interface SendRecordingTriggerProps {
//   onSearch?: (searchTerm: string) => void;
// }

// export const SendRecordingTrigger: React.FC<SendRecordingTriggerProps> = ({ onSearch }) => {
//   const {
//     register,
//     handleSubmit,
//     formState: { errors },
//     reset,
//     control,
//     setValue,
//     watch,
//   } = useForm<SendRecordingFormValues>({
//     resolver: yupResolver(schema),
//     defaultValues: {
//       identifier: "",
//     },
//   });

//   const params = useSearchParams();
//   const { emitSendRecording } = useSocketContext();
//   const identifierValue = watch("identifier");

//     React.useEffect(() => {
//     const timer = setTimeout(() => {
//       if (onSearch) {
//         onSearch(identifierValue || "");
//       }
//     }, 500); 

//     return () => clearTimeout(timer);
//   }, [identifierValue, onSearch]);

//   const handleSendRecording: SubmitHandler<SendRecordingFormValues> = (data) => {
//     emitSendRecording({
//       tag: data.identifier.trim(),
//       station: params.get("station") ? Number(params.get("station")) : 1,
//       langCode: params.get("lang") || "en",
//     });

//     toast.success("Recording trigger sent!", {
//       position: "bottom-right",
//       autoClose: 3000,
//       theme: "colored",
//     });

//     reset();
//   };

//   return (
//     <Card bordered className="w-full mb-6 pb-0 customRecordingHeaderCard">
//       <form
//         className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 w-full"
//         onSubmit={handleSubmit(handleSendRecording)}
//       >
//         {/* Input + Send Button */}
//         <div className="flex flex-col md:flex-row items-start md:items-center gap-2 md:gap-4 w-full md:w-1/2 formInnerContainer">
//           <Controller
//             name="identifier"
//             control={control}
//             render={({ field }) => (
//               <AntdInput
//                 {...field}
//                 placeholder="Type to search or enter confirmation tag to trigger recording"
//                 status={errors.identifier ? "error" : ""}
//                 onChange={(e) => field.onChange(e)}
//                 style={{ width: "100%" }}
//                 className="recording-tag-input"
//                 allowClear
//               />
//             )}
//           />

//           <Button
//             className="flex items-center justify-center bg-green-600 hover:bg-green-700 rounded-md px-4 py-2 text-white headerButton"
//             type="submit"
//           >
//             <SendIcon />
//           </Button>

//           {errors.identifier && (
//             <p className="text-sm text-red-600">{errors.identifier.message}</p>
//           )}
//         </div>

//       </form>
//     </Card>
//   );
// };
import * as React from "react";
import { useState, useRef, useEffect } from "react";
import { SubmitHandler, useForm, Controller } from "react-hook-form";
import * as yup from "yup";
import { yupResolver } from "@hookform/resolvers/yup";
import { Button as CustomButton } from "../../Button";
import { SendIcon } from "../../icons/SendIcon";
import { useSocketContext } from "../../../context/SocketContextProvider";
import { useSearchParams } from "next/navigation";
import { Card, Button, message } from "antd";
import { Input as AntdInput } from "antd";
import { toast } from "react-toastify";
import { FaMicrophone, FaStop } from "react-icons/fa";
import { useSession } from "next-auth/react";

interface SendRecordingFormValues {
  identifier: string;
}

const schema = yup.object().shape({
  identifier: yup.string().required("Recording tag is required"),
});

interface SendRecordingTriggerProps {
  onSearch?: (searchTerm: string) => void;
}

export const SendRecordingTrigger: React.FC<SendRecordingTriggerProps> = ({ onSearch }) => {
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    control,
    setValue,
    watch,
  } = useForm<SendRecordingFormValues>({
    resolver: yupResolver(schema),
    defaultValues: {
      identifier: "",
    },
  });

  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [isInIframe, setIsInIframe] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const params = useSearchParams();
  const { emitSendRecording } = useSocketContext();
  const { data } = useSession();
  const identifierValue = watch("identifier");

  const MAX_RECORDING_TIME = 300; // 5 minutes in seconds
  let Url = process.env.NEXT_PUBLIC_BACKEND_URL;

  useEffect(() => {
    setIsInIframe(window.self !== window.top);
  }, []);

  // Update recording indicator in extension
  useEffect(() => {
    if (isInIframe) {
      if (isRecording) {
        window.parent.postMessage({
          type: 'RECORDING_INDICATOR',
          show: true,
          text: `Recording: ${formatTime(recordingTime)} / ${formatTime(MAX_RECORDING_TIME)}`
        }, '*');
      } else {
        window.parent.postMessage({
          type: 'RECORDING_INDICATOR',
          show: false
        }, '*');
      }
    }
  }, [isRecording, recordingTime, isInIframe]);

  // Search debouncing effect
  useEffect(() => {
    const timer = setTimeout(() => {
      if (onSearch) {
        onSearch(identifierValue || "");
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [identifierValue, onSearch]);

  // Cleanup function
  const cleanup = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }

    chunksRef.current = [];
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanup();
      if (isInIframe) {
        window.parent.postMessage({
          type: 'RECORDING_INDICATOR',
          show: false
        }, '*');
      }
    };
  }, [isInIframe]);

  const requestMicrophonePermission = async (): Promise<MediaStream | null> => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100,
          channelCount: 2
        }
      });

      return stream;
    } catch (error: any) {
      console.error('[Recording] Microphone permission error:', error);

      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        if (isInIframe) {
          message.error({
            content: 'Microphone permission denied. This might be because the site needs microphone access. Please check your browser settings.',
            duration: 5
          });
        } else {
          message.error('Microphone permission denied. Please allow microphone access in your browser settings.');
        }
      } else if (error.name === 'NotFoundError') {
        message.error('No microphone found. Please connect a microphone and try again.');
      } else if (error.name === 'NotReadableError') {
        message.error('Microphone is being used by another application. Please close other apps using the microphone.');
      } else {
        message.error(`Microphone error: ${error.message || 'Unknown error'}`);
      }

      return null;
    }
  };

  const startRecording = async () => {
    try {
      if (!identifierValue?.trim()) {
        message.warning('Please enter an identifier or text first');
        return;
      }

      const stream = await requestMicrophonePermission();

      if (!stream) {
        return;
      }

      streamRef.current = stream;
      chunksRef.current = [];

      // Determine the best MIME type for audio
      let mimeType = 'audio/webm';

      if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
        mimeType = 'audio/webm;codecs=opus';
      } else if (MediaRecorder.isTypeSupported('audio/webm')) {
        mimeType = 'audio/webm';
      } else if (MediaRecorder.isTypeSupported('audio/ogg;codecs=opus')) {
        mimeType = 'audio/ogg;codecs=opus';
      } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
        mimeType = 'audio/mp4';
      } else {
        console.warn('[Recording] No supported audio MIME type found, using default');
      }

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: mimeType,
        audioBitsPerSecond: 128000
      });

      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        await handleRecordingComplete();
      };

      mediaRecorder.onerror = (event: any) => {
        console.error('[Recording] MediaRecorder error:', event.error);
        message.error('Recording error occurred');
        cleanup();
        setIsRecording(false);
      };

      mediaRecorder.start(100);
      setIsRecording(true);
      setRecordingTime(0);

      // Start timer
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => {
          const newTime = prev + 1;
          if (newTime >= MAX_RECORDING_TIME) {
            stopRecording();
            message.warning('Maximum recording time reached (5 minutes)');
          }
          return newTime;
        });
      }, 1000);

      message.success('Recording started');
    } catch (error) {
      console.error('[Recording] Error starting recording:', error);
      message.error('Failed to start recording. Please try again.');
      cleanup();
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }

    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    setIsRecording(false);
  };

  const handleRecordingComplete = async () => {

    if (chunksRef.current.length === 0) {
      message.error('No recording data available');
      cleanup();
      return;
    }

    setIsUploading(true);

    try {
      const mimeType = mediaRecorderRef.current?.mimeType || 'audio/webm';
      let extension = 'webm';
      let blobType = 'audio/webm';

      if (mimeType.includes('mp4')) {
        extension = 'mp4';
        blobType = 'audio/mp4';
      } else if (mimeType.includes('ogg')) {
        extension = 'ogg';
        blobType = 'audio/ogg';
      }

      const blob = new Blob(chunksRef.current, { type: blobType });

      if (blob.size === 0) {
        throw new Error('Recording is empty');
      }

      await uploadRecording(blob, extension);

      message.success('Recording saved successfully!');
      reset();
    } catch (error: any) {
      console.error('[Recording] Error saving recording:', error);
      message.error(`Failed to save recording: ${error.message || 'Unknown error'}`);
    } finally {
      cleanup();
      setIsUploading(false);
      setRecordingTime(0);
    }
  };

  const uploadRecording = async (blob: Blob, extension: string = 'webm') => {
    const formData = new FormData();
    const fileName = `recording_${Date.now()}.${extension}`;
    formData.append('file', blob, fileName);
    formData.append('type', 'audio');
    formData.append('station', params.get("station") ?? "1");
    formData.append('confirmationNumber', identifierValue?.trim() || `REC-${Date.now()}`);

    const response = await fetch(`${Url}/api/v1/recordings/upload`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${data?.user.backendTokens.at}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Recording] Upload failed:', response.status, errorText);
      throw new Error(`Upload failed: ${response.status}`);
    }

    const result = await response.json();
    return result;
  };

  const handleSendRecording: SubmitHandler<SendRecordingFormValues> = (data) => {
    emitSendRecording({
      tag: data.identifier.trim(),
      station: params.get("station") ? Number(params.get("station")) : 1,
      langCode: params.get("lang") || "en",
    });

    toast.success("Recording trigger sent!", {
      position: "bottom-right",
      autoClose: 3000,
      theme: "colored",
    });

    reset();
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <>
      <style jsx>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }

        .recording-pulse {
          animation: pulse 1.5s ease-in-out infinite;
        }
      `}</style>

      <Card bordered className="w-full mb-6 pb-0 customRecordingHeaderCard">
        <form
          className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 w-full"
          onSubmit={handleSubmit(handleSendRecording)}
        >
          {/* Input + Buttons */}
          <div className="flex flex-col md:flex-row items-start md:items-center gap-2 md:gap-4 w-full md:w-1/2 formInnerContainer">
            <Controller
              name="identifier"
              control={control}
              render={({ field }) => (
                <AntdInput
                  {...field}
                  placeholder="Type to search or enter confirmation tag to trigger recording"
                  status={errors.identifier ? "error" : ""}
                  onChange={(e) => field.onChange(e)}
                  style={{ width: "100%" }}
                  className="recording-tag-input"
                  allowClear
                  disabled={isRecording || isUploading}
                />
              )}
            />

            {/* Recording Button */}
            <Button
              type="primary"
              icon={isRecording ? <FaStop style={{ fontSize: "16px" }} /> : <FaMicrophone style={{ fontSize: "16px" }} />}
              onClick={isRecording ? stopRecording : startRecording}
              disabled={isUploading}
              className={`flex items-center justify-center ${isRecording ? 'recording-pulse' : ''}`}
              style={{
                backgroundColor: isRecording ? "#ef4444" : "#3b5998",
                border: "none",
                height: "100%",
                minWidth: isRecording ? "120px" : '55px',
                transition: "all 0.3s ease",
                padding: '0.3rem 1rem'
              }}
            >
              {isUploading ? "Saving..." : isRecording ? formatTime(recordingTime) : ""}
            </Button>

            {errors.identifier && (
              <p className="text-sm text-red-600">{errors.identifier.message}</p>
            )}
          </div>
        </form>

        {/* Recording Indicator */}
        {isRecording && !isInIframe && (
          <div
            style={{
              position: 'fixed',
              top: '80px',
              right: '20px',
              backgroundColor: 'rgba(239, 68, 68, 0.95)',
              color: 'white',
              padding: '12px 20px',
              borderRadius: '8px',
              zIndex: 9999,
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
              fontWeight: '500',
              fontSize: '14px'
            }}
          >
            <div className="recording-pulse" style={{ width: '10px', height: '10px', background: 'white', borderRadius: '50%' }}></div>
            <span>Recording: {formatTime(recordingTime)} / {formatTime(MAX_RECORDING_TIME)}</span>
          </div>
        )}
      </Card>
    </>
  );
};
