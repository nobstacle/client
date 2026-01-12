import * as React from "react";
import { useState, useRef, useEffect } from "react";
import { Button, Tooltip, message } from "antd";
import { useSocketContext } from "../../../../context/SocketContextProvider";
import { useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { FaMicrophone } from "react-icons/fa";

interface HeaderRecordingShortcutProps {
    confirmationNumber: string;
    clearConfirmationNumber: () => void;
    checkTooltip: boolean;
}

export const HeaderRecordingShortcut: React.FC<HeaderRecordingShortcutProps> = ({
    confirmationNumber,
    clearConfirmationNumber,
    checkTooltip
}) => {
    const [isRecording, setIsRecording] = useState(false);
    const [recordingTime, setRecordingTime] = useState(0);
    const [isUploading, setIsUploading] = useState(false);
    const [isInIframe, setIsInIframe] = useState(false);
    const [hasMicPermission, setHasMicPermission] = useState(false);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const chunksRef = useRef<Blob[]>([]);
    const timerRef = useRef<NodeJS.Timeout | null>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const confirmationNumberRef = useRef<string>(''); // Store confirmation number in ref
    const { emitSendRecording } = useSocketContext();
    const params = useSearchParams();
    const { data } = useSession();

    const MAX_RECORDING_TIME = 300; // 5 minutes in seconds
    let Url = process.env.NEXT_PUBLIC_BACKEND_URL;

    useEffect(() => {
        const inIframe = window.self !== window.top;
        setIsInIframe(inIframe);

        // If in iframe, request permission immediately on mount
        if (inIframe) {
            console.log('[HeaderRecording] 📍 In iframe, requesting microphone permission...');
            window.parent.postMessage({
                type: 'REQUEST_MICROPHONE_PERMISSION'
            }, '*');
        }
    }, []);

    // Update ref whenever confirmationNumber prop changes
    useEffect(() => {
        confirmationNumberRef.current = confirmationNumber;
    }, [confirmationNumber]);

    // Listen for permission responses from content script (extension only)
    useEffect(() => {
        if (!isInIframe) return;

        const handler = (event: MessageEvent) => {
            if (event.data.type === 'MICROPHONE_PERMISSION_GRANTED') {
                console.log('[HeaderRecording] ✅ Microphone permission granted by extension!');
                setHasMicPermission(true);
                message.success('Microphone access granted');
            }

            if (event.data.type === 'MICROPHONE_PERMISSION_DENIED') {
                console.error('[HeaderRecording] ❌ Microphone permission denied:', event.data.error);
                setHasMicPermission(false);

                let errorMsg = 'Microphone permission denied.';
                if (event.data.error === 'NotAllowedError' || event.data.error === 'PermissionDeniedError') {
                    errorMsg = 'Please allow microphone access in your browser settings and reload the page.';
                } else if (event.data.error === 'NotFoundError') {
                    errorMsg = 'No microphone found. Please connect a microphone.';
                }

                message.error(errorMsg);
            }

            if (event.data.type === 'RECORDING_STARTED') {
                console.log('[HeaderRecording] 🔴 Recording started by content script');
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
            }

            if (event.data.type === 'RECORDING_COMPLETE') {
                console.log('[HeaderRecording] ✅ Recording complete from extension, uploading...');

                if (timerRef.current) {
                    clearInterval(timerRef.current);
                    timerRef.current = null;
                }

                setIsRecording(false);
                setIsUploading(true);

                // Convert base64 back to blob and upload
                const base64Audio = event.data.audioData;
                const mimeType = event.data.mimeType;

                const binaryString = atob(base64Audio);
                const bytes = new Uint8Array(binaryString.length);
                for (let i = 0; i < binaryString.length; i++) {
                    bytes[i] = binaryString.charCodeAt(i);
                }

                const audioBlob = new Blob([bytes], { type: mimeType });

                // Determine extension
                let extension = 'webm';
                if (mimeType.includes('mp4')) extension = 'mp4';
                else if (mimeType.includes('ogg')) extension = 'ogg';

                uploadRecording(audioBlob, extension)
                    .then(() => {
                        message.success('Recording saved successfully!');
                        clearConfirmationNumber();
                    })
                    .catch((error) => {
                        console.error('[HeaderRecording] Upload error:', error);
                        message.error('Failed to save recording');
                    })
                    .finally(() => {
                        setIsUploading(false);
                        setRecordingTime(0);
                    });
            }

            if (event.data.type === 'RECORDING_ERROR') {
                console.error('[HeaderRecording] ❌ Recording error:', event.data.error);
                message.error(event.data.error);
                setIsRecording(false);
                setIsUploading(false);
            }
        };

        window.addEventListener('message', handler);
        return () => window.removeEventListener('message', handler);
    }, [isInIframe, clearConfirmationNumber]);

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
            console.log('[Recording] Requesting microphone access...');

            const stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    sampleRate: 44100,
                    channelCount: 2
                }
            });

            console.log('[Recording] ✓ Microphone access granted');
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

    const startRecordingWeb = async () => {
        // WEB APP FLOW - Direct recording
        try {
            if (!confirmationNumber.trim()) {
                message.warning('Please enter an identifier or text first');
                return;
            }

            console.log('[Recording] Starting web app recording process...');

            // Request microphone permission
            const stream = await requestMicrophonePermission();

            if (!stream) {
                console.log('[Recording] ✗ Permission denied or no stream');
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

            console.log('[Recording] Using MIME type:', mimeType);

            const mediaRecorder = new MediaRecorder(stream, {
                mimeType: mimeType,
                audioBitsPerSecond: 128000
            });

            mediaRecorderRef.current = mediaRecorder;

            mediaRecorder.ondataavailable = (event) => {
                if (event.data && event.data.size > 0) {
                    chunksRef.current.push(event.data);
                    console.log('[Recording] Audio chunk received:', event.data.size, 'bytes');
                }
            };

            mediaRecorder.onstop = async () => {
                console.log('[Recording] MediaRecorder stopped, processing recording...');
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

            console.warn("111111111111111111", confirmationNumber);
            console.warn("222222222222222222", confirmationNumberRef);
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
            console.log('[Recording] ✓ Recording started successfully');
        } catch (error) {
            console.error('[Recording] Error starting recording:', error);
            message.error('Failed to start recording. Please try again.');
            cleanup();
        }
    };

    const startRecordingExtension = async () => {
        // EXTENSION FLOW - Ask content script to handle recording
        if (!confirmationNumber.trim()) {
            message.warning('Please enter an identifier or text first');
            return;
        }

        console.log('[Recording] 📤 Requesting extension content script to start recording...');

        if (!hasMicPermission) {
            message.warning('Requesting microphone permission...');
            window.parent.postMessage({
                type: 'REQUEST_MICROPHONE_PERMISSION'
            }, '*');

            // Wait a bit for permission, then try to start
            setTimeout(() => {
                if (hasMicPermission) {
                    window.parent.postMessage({
                        type: 'START_RECORDING'
                    }, '*');


                    console.warn("33333333333333333333", confirmationNumber);
                    console.warn("444444444444444444", confirmationNumberRef);

                    emitSendRecording({
                        tag: confirmationNumber.trim() || `REC-${Date.now()}`,
                        station: params.get("station") ? Number(params.get("station")) : 1,
                        langCode: params.get("lang") || "en",
                    });
                }
            }, 1000);
        } else {
            window.parent.postMessage({
                type: 'START_RECORDING'
            }, '*');

            console.warn("666666666666666666666", confirmationNumber);
            console.warn("77777777777777777777", confirmationNumberRef);

            emitSendRecording({
                tag: confirmationNumber.trim() || `REC-${Date.now()}`,
                station: params.get("station") ? Number(params.get("station")) : 1,
                langCode: params.get("lang") || "en",
            });
        }
    };

    const startRecording = async () => {
        if (isInIframe) {
            // Extension flow
            await startRecordingExtension();
        } else {
            // Web app flow
            await startRecordingWeb();
        }
    };

    const stopRecording = () => {
        if (isInIframe) {
            // Extension flow
            console.log('[Recording] Stopping extension recording...');
            window.parent.postMessage({
                type: 'STOP_RECORDING'
            }, '*');

            if (timerRef.current) {
                clearInterval(timerRef.current);
                timerRef.current = null;
            }

            setIsRecording(false);
        } else {
            // Web app flow
            if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
                console.log('[Recording] Stopping web app recording...');
                mediaRecorderRef.current.stop();
            }

            if (timerRef.current) {
                clearInterval(timerRef.current);
                timerRef.current = null;
            }

            setIsRecording(false);
        }
    };

    const handleRecordingComplete = async () => {
        console.log('[Recording] Recording complete, chunks:', chunksRef.current.length);

        if (chunksRef.current.length === 0) {
            message.error('No recording data available');
            cleanup();
            return;
        }

        setIsUploading(true);

        try {
            // Determine file extension based on MIME type
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
            console.log('[Recording] Created blob:', blob.size, 'bytes, type:', blobType);

            if (blob.size === 0) {
                throw new Error('Recording is empty');
            }

            // Upload to backend
            await uploadRecording(blob, extension);

            message.success('Recording saved successfully!');
            clearConfirmationNumber();
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

        console.warn("cccccccccccccccccccc", confirmationNumber);
        console.warn("dddddddddddddddddddd", confirmationNumberRef, confirmationNumberRef.current);

        const formData = new FormData();
        const fileName = `recording_${Date.now()}.${extension}`;
        formData.append('file', blob, fileName);
        formData.append('type', 'audio');
        formData.append('station', params.get("station") ?? "1");
        formData.append('confirmationNumber', confirmationNumber.trim() || `REC-${Date.now()}`);

        console.log('[Recording] Uploading recording:', fileName, 'Size:', blob.size);

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
        console.log('[Recording] Upload successful:', result);
        return result;
    };

    const handleToggleRecording = () => {
        if (isRecording) {
            stopRecording();
        } else {
            if (!confirmationNumber.trim()) {
                message.warning('Please enter an identifier or text first');
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
            {!checkTooltip ? (
                <Tooltip
                    title={isUploading ? "Saving recording..." : isRecording ? `Recording: ${formatTime(recordingTime)}` : "Start Recording"}
                    placement="bottom"
                >
                    <Button
                        type="primary"
                        icon={isRecording ? <FaMicrophone style={{ fontSize: "18px", color: 'red' }} /> : <FaMicrophone style={{ fontSize: "18px" }} />}
                        onClick={handleToggleRecording}
                        disabled={isUploading || (isInIframe && !hasMicPermission)}
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
                    icon={isRecording ? <FaMicrophone style={{ fontSize: "18px", color: 'red' }} /> : <FaMicrophone style={{ fontSize: "18px" }} />}
                    onClick={handleToggleRecording}
                    disabled={isUploading || (isInIframe && !hasMicPermission)}
                    className={`flex items-center justify-center customHeaderButton ${isRecording ? 'recording-pulse' : ''}`}
                    style={{
                        backgroundColor: "#3b5998",
                        border: "none",
                        height: "40px",
                        transition: "all 0.3s ease",
                    }}
                />
            )}

            {/* Only show indicator when NOT in iframe (extension handles it) */}
            {isRecording && !isInIframe && (
                <div
                    style={{
                        position: 'fixed',
                        top: '33px',
                        right: '6px',
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
                    <div className="recording-pulse" style={{ width: '20px', height: '10px', background: 'white', borderRadius: '50%' }}></div>
                    <span>Recording: {formatTime(recordingTime)} / {formatTime(MAX_RECORDING_TIME)}</span>
                </div>
            )}
        </>
    );
};