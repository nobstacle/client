import React, { useState, useRef, useEffect } from 'react';
import { Button, Card, message } from 'antd';
import { AudioOutlined } from '@ant-design/icons';
import SafeContentFrame from './SafeContentFrame';
interface RecordingProps {
  onSubmit: (blob: Blob, type: 'audio' | 'video') => void;
  langCode?: string;
  loading?: any;
}

const Recording: React.FC<RecordingProps> = ({ onSubmit, langCode = 'en', loading }: RecordingProps) => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [recordingTime, setRecordingTime] = useState(0);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [permissionStatus, setPermissionStatus] = useState<'granted' | 'denied' | 'prompt'>('prompt');
  const hasStartedRef = useRef(false);

  const MAX_RECORDING_TIME = 300;

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Auto-start recording on mount
  useEffect(() => {
    if (!hasStartedRef.current) {
      hasStartedRef.current = true;
      startRecording();
    }

    return () => {
      stopStream();
      if (timerRef.current) clearInterval(timerRef.current);
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, []);

  // Auto-stop at 5 minutes
  useEffect(() => {
    if (recordingTime >= MAX_RECORDING_TIME && isRecording) {
      stopRecording();
      // message.info('Recording stopped.');
    }
  }, [recordingTime, isRecording]);

  const stopStream = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => {
        track.stop();
        console.log('🎤 Microphone track stopped:', track.label);
      });
      streamRef.current = null;
    }
  };

  const requestPermissions = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setPermissionStatus('granted');
      return stream;
    } catch (error) {
      console.error('Permission denied:', error);
      setPermissionStatus('denied');

      if (error.name === 'NotAllowedError') {
        message.error('Please allow microphone access in your device settings');
      } else if (error.name === 'NotFoundError') {
        message.error('No microphone found on this device');
      } else {
        message.error('Unable to access microphone. Please check permissions.');
      }

      return null;
    }
  };


  // Modify the startRecording function:
  const startRecording = async () => {
    try {
      // Get permissions first
      const stream = await requestPermissions();
      if (!stream) return;

      streamRef.current = stream;

      // Create announcement text-to-speech or use pre-recorded audio
      const announcement = new SpeechSynthesisUtterance(
        "Your voice feedback is being recorded to help us improve our services."
      );

      announcement.rate = 1.6;

      announcement.onend = () => {
        // Generate beep sound using Web Audio API
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);

        oscillator.frequency.value = 800; // Frequency in Hz
        oscillator.type = 'sine';

        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);

        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.5);

        // Wait for beep to finish, then start recording
        setTimeout(() => {
          setIsRecording(true);
          startActualRecording(stream);
        }, 600); // 600ms = 500ms beep + 100ms buffer
      };

      speechSynthesis.speak(announcement);

    } catch (error) {
      console.error('Error:', error);
    }
  };

  const startActualRecording = async (stream: MediaStream) => {
    try {
      console.log('🎬 Starting actual recording...');

      // Determine MIME type based on browser support
      let mimeType = 'audio/mp4';

      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = 'audio/webm';
        console.log('📝 Using fallback MIME type:', mimeType);
      }

      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = 'audio/webm;codecs=opus';
        console.log('📝 Using second fallback MIME type:', mimeType);
      }

      console.log('📝 Final MIME type:', mimeType);

      chunksRef.current = [];
      const mediaRecorder = new MediaRecorder(stream, { mimeType });

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        console.log('⏹️ Recording stopped');
        const blob = new Blob(chunksRef.current, { type: mimeType });
        console.log('💾 Blob created:', blob.size, 'bytes');
        stopStream();
        setIsRecording(false);
        onSubmit(blob, 'audio');
        // message.success('Thank you for your feedback!');
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start(100);
      setRecordingTime(0);

      // Start timer
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);

      message.success('Recording started');
    } catch (error) {
      console.error('❌ Error starting recording:', error);
      message.error('Failed to start recording');
      stopStream();
      setIsRecording(false);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();

      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
        submitRecording();
      }
    }
  };

  const submitRecording = () => {
    if (recordedBlob) {
      onSubmit(recordedBlob, 'audio');
      setRecordedBlob(null);
      setPreviewUrl(null);
      setRecordingTime(0);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <SafeContentFrame className="flex w-full items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-2xl shadow-lg">
        {loading ? (
          <div className="space-y-6">
            <div className="text-center">
              <div className="text-8xl mb-4">😊</div>
              <h2 className="text-2xl font-bold text-gray-800 mb-2 mt-6">
                Thank you for your feedback!
              </h2>
            </div>
          </div>
        ) : (
          <>
            <div className="space-y-6">
              {/* Header */}
              {isRecording && !recordedBlob ? (
                <div className="relative bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 rounded-lg overflow-hidden" style={{ minHeight: '400px' }}>
                  {/* Animated background waves */}
                  <div className="absolute inset-0 opacity-30">
                    <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-blue-500 to-transparent animate-pulse"></div>
                    <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-purple-500 to-transparent animate-pulse" style={{ animationDelay: '0.5s' }}></div>
                  </div>

                  <div className="relative flex flex-col items-center justify-center h-full text-white p-8" style={{ minHeight: '400px' }}>
                    {/* Animated listening character/icon */}
                    <div className="relative mb-8">
                      {/* Pulsing sound waves */}
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-40 h-40 rounded-full bg-blue-500 opacity-20 animate-ping"></div>
                      </div>
                      <div className="absolute inset-0 flex items-center justify-center" style={{ animationDelay: '0.3s' }}>
                        <div className="w-32 h-32 rounded-full bg-purple-500 opacity-30 animate-ping"></div>
                      </div>

                      {/* Center microphone with glow */}
                      <div className="relative z-10 w-24 h-24 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center shadow-2xl">
                        <AudioOutlined className="text-5xl text-white animate-pulse" />
                      </div>

                      {/* Recording indicator */}
                      <div className="absolute -top-2 -right-2 z-20">
                        <span className="flex h-8 w-8">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-8 w-8 bg-red-500 items-center justify-center">
                            <span className="text-white text-xs font-bold">REC</span>
                          </span>
                        </span>
                      </div>
                    </div>

                    {/* Animated sound bars */}
                    <div className="flex items-end justify-center gap-1 mb-6 h-16">
                      {[...Array(5)].map((_, i) => (
                        <div
                          key={i}
                          className="w-2 bg-gradient-to-t from-blue-400 to-purple-400 rounded-full animate-bounce"
                          style={{
                            height: `${20 + Math.random() * 40}px`,
                            animationDelay: `${i * 0.1}s`,
                            animationDuration: `${0.6 + Math.random() * 0.4}s`
                          }}
                        ></div>
                      ))}
                    </div>

                    {/* Text with typing animation effect */}
                    <p className="text-2xl font-semibold mb-2 animate-pulse">
                      🎤 Listening...
                    </p>
                    <p className="text-lg text-blue-200 mb-4">
                      We&apos;re all ears! Share your thoughts
                    </p>

                    {/* Timer display */}
                    <div className="bg-black bg-opacity-30 px-6 py-3 rounded-full backdrop-blur-sm">
                      <span className="font-mono text-2xl font-bold text-green-400">
                        {formatTime(recordingTime)}
                      </span>
                      <span className="text-gray-400 ml-2">/ 5:00</span>
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  <div className="d-flex align-items-center justify-content-center p-4">
                    <h3>Your feedback is being recorded to help us improve our hotel and services. Thank you for sharing your thoughts!</h3>
                  </div>
                </>
              )}
            </div>
            <div className="flex justify-center gap-4 mt-4">
              {isRecording && (
                <Button
                  danger
                  size="large"
                  onClick={stopRecording}
                  className="min-w-[200px]"
                >
                  Stop Recording
                </Button>
              )}
            </div>

            {/* Permission Warning */}
            {permissionStatus === 'denied' && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-center">
                <p className="text-yellow-800 mb-2">
                  Microphone access is required
                </p>
                <p className="text-sm text-yellow-700">
                  Please enable microphone permissions in your browser settings
                </p>
              </div>
            )}
          </>
        )}
      </Card>
    </SafeContentFrame>
  );
};

export default Recording;
