import * as React from "react";
import { useState, useRef, useEffect } from "react";
import { Button, Tooltip, message, Modal } from "antd";
import { FaCircle, FaStop, FaMicrophone } from "react-icons/fa";
import { useSocketContext } from "../../../../context/SocketContextProvider";
import { useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { IoRecordingSharp } from "react-icons/io5";
interface HeaderRecordingShortcutProps {
    confirmationNumber: string;
    clearConfirmationNumber: () => void;
    checkTooltip: boolean
}

export const HeaderRecordingShortcut: React.FC<HeaderRecordingShortcutProps> = ({
    confirmationNumber,
    clearConfirmationNumber,
    checkTooltip
}) => {
    const [isRecording, setIsRecording] = useState(false);
    const [recordingTime, setRecordingTime] = useState(0);
    const [isUploading, setIsUploading] = useState(false);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const chunksRef = useRef<Blob[]>([]);
    const timerRef = useRef<NodeJS.Timeout | null>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const { emitSendRecording } = useSocketContext();
    const params = useSearchParams();
    const { data } = useSession();

    const MAX_RECORDING_TIME = 300; // 5 minutes in seconds
    let Url = process.env.NEXT_PUBLIC_BACKEND_URL;

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
        };
    }, []);

    const startRecording = async () => {
        try {
            // Request audio only
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    sampleRate: 44100,
                    channelCount: 2
                }
            });

            streamRef.current = stream;
            chunksRef.current = [];

            // Determine the best MIME type for audio
            const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
                ? 'audio/webm;codecs=opus'
                : MediaRecorder.isTypeSupported('audio/webm')
                    ? 'audio/webm'
                    : 'audio/mp4';

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

            mediaRecorder.start(100); // Collect data every 100ms
            setIsRecording(true);
            setRecordingTime(0);

            // Emit socket event to notify recording started
            emitSendRecording({
                tag: confirmationNumber.trim() || `REC-${Date.now()}`,
                station: params.get("station") ? Number(params.get("station")) : 1,
                langCode: params.get("lang") || "en",
            });

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
            console.error('Error accessing microphone:', error);
            message.error('Failed to access microphone. Please check permissions.');
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
            const blob = new Blob(chunksRef.current, { type: 'audio/webm' });

            // Upload to backend
            await uploadRecording(blob);

            message.success('Recording saved!');
            clearConfirmationNumber();
        } catch (error) {
            console.error('Error saving recording:', error);
            message.error('Failed to save recording. Please try again.');
        } finally {
            cleanup();
            setIsUploading(false);
            setRecordingTime(0);
        }
    };

    const uploadRecording = async (blob: Blob) => {
        const formData = new FormData();
        const fileName = `recording_${Date.now()}.webm`;
        formData.append('file', blob, fileName);
        formData.append('type', 'audio');
        formData.append('station', params.get("station") ?? "1");
        formData.append('confirmationNumber', confirmationNumber.trim() || `REC-${Date.now()}`);

        const response = await fetch(`${Url}/api/v1/recordings/upload`, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${data?.user.backendTokens.at}`,
            },
            body: formData,
        });

        if (!response.ok) {
            throw new Error('Upload failed');
        }

        return await response.json();
    };

    const handleToggleRecording = () => {
        if (isRecording) {
            stopRecording();
        } else {
            if (!confirmationNumber.trim()) {
                message.warning('Please enter an identifier or a text');
                return;
            }
            startRecording();
        }
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
            {checkTooltip ? (
                <Tooltip
                    title={isUploading ? "Please wait." : isRecording ? `Recording: ${formatTime(recordingTime)}` : "Start Recording"}
                    placement="bottom"
                >
                    <Button
                        type="primary"
                        icon={isRecording ? <IoRecordingSharp style={{ fontSize: "18px", color: 'red' }} /> : <IoRecordingSharp style={{ fontSize: "18px" }} />}
                        onClick={handleToggleRecording}
                        disabled={isUploading}
                        // loading={isUploading}
                        className={`flex items-center justify-center customHeaderButton ${isRecording ? 'recording-pulse' : ''}`}
                        style={{
                            backgroundColor: "#3b5998",
                            border: "none",
                            height: "40px",
                            transition: "all 0.3s ease",
                        }}
                    />
                </Tooltip>
            ) : (
                <Button
                    type="primary"
                    icon={isRecording ? <IoRecordingSharp style={{ fontSize: "18px", color: 'red' }} /> : <IoRecordingSharp style={{ fontSize: "18px" }} />}
                    onClick={handleToggleRecording}
                    disabled={isUploading}
                    // loading={isUploading}
                    className={`flex items-center justify-center customHeaderButton ${isRecording ? 'recording-pulse' : ''}`}
                    style={{
                        backgroundColor: "#3b5998",
                        border: "none",
                        height: "40px",
                        transition: "all 0.3s ease",
                    }}
                />
            )}


            {isRecording && (
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
                    <FaCircle className="recording-pulse" style={{ fontSize: '10px' }} />
                    <span>Recording: {formatTime(recordingTime)} / {formatTime(MAX_RECORDING_TIME)}</span>
                </div>
            )}
        </>
    );
};