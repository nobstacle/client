import React, { useState, useRef, useEffect } from 'react';
import { Button, Card, message, Modal, Radio } from 'antd';
import { AudioOutlined, VideoCameraOutlined, StopOutlined, PlayCircleOutlined, DeleteOutlined, SendOutlined } from '@ant-design/icons';

interface RecordingProps {
  onSubmit: (blob: Blob, type: 'audio' | 'video') => void;
  langCode?: string;
}

const Recording: React.FC<RecordingProps> = ({ onSubmit, langCode = 'en' }) => {
  const [recordingType, setRecordingType] = useState<'audio' | 'video'>('audio');
  const [isRecording, setIsRecording] = useState(false);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [recordingTime, setRecordingTime] = useState(0);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [permissionStatus, setPermissionStatus] = useState<'granted' | 'denied' | 'prompt'>('prompt');
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const videoPreviewRef = useRef<HTMLVideoElement | null>(null);
  const audioPreviewRef = useRef<HTMLAudioElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopStream();
      if (timerRef.current) clearInterval(timerRef.current);
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, []);

  const stopStream = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  };

  const requestPermissions = async (type: 'audio' | 'video') => {
    try {
      const constraints = type === 'video' 
        ? { video: { facingMode: 'user' }, audio: true }
        : { audio: true };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      setPermissionStatus('granted');
      return stream;
    } catch (error) {
      console.error('Permission denied:', error);
      setPermissionStatus('denied');
      
      // iOS specific error handling
      if (error.name === 'NotAllowedError') {
        message.error('Please allow camera/microphone access in your device settings');
      } else if (error.name === 'NotFoundError') {
        message.error('No camera or microphone found on this device');
      } else {
        message.error('Unable to access camera/microphone. Please check permissions.');
      }
      
      return null;
    }
  };

  const startRecording = async () => {
    try {
      // Reset previous recording
      if (recordedBlob) {
        setRecordedBlob(null);
        setPreviewUrl(null);
      }

      const stream = await requestPermissions(recordingType);
      if (!stream) return;

      streamRef.current = stream;

      // Show live preview for video
      if (recordingType === 'video' && videoPreviewRef.current) {
        videoPreviewRef.current.srcObject = stream;
        videoPreviewRef.current.play();
      }

      // Determine MIME type based on browser support
      let mimeType = recordingType === 'video' ? 'video/mp4' : 'audio/mp4';
      
      // iOS Safari fallback
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = recordingType === 'video' ? 'video/webm' : 'audio/webm';
      }
      
      // Android Chrome fallback
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = recordingType === 'video' ? 'video/webm;codecs=vp8,opus' : 'audio/webm;codecs=opus';
      }

      chunksRef.current = [];
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: mimeType,
        videoBitsPerSecond: 2500000, // 2.5 Mbps for better quality
      });

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mimeType });
        setRecordedBlob(blob);
        
        const url = URL.createObjectURL(blob);
        setPreviewUrl(url);
        
        stopStream();
        
        // Clear video preview
        if (videoPreviewRef.current) {
          videoPreviewRef.current.srcObject = null;
        }
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start(100); // Collect data every 100ms
      setIsRecording(true);
      setRecordingTime(0);

      // Start timer
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);

      message.success('Recording started');
    } catch (error) {
      console.error('Error starting recording:', error);
      message.error('Failed to start recording');
      stopStream();
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      
      message.success('Recording stopped');
    }
  };

  const deleteRecording = () => {
    setRecordedBlob(null);
    setPreviewUrl(null);
    setRecordingTime(0);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
  };

  const submitRecording = () => {
    if (recordedBlob) {
      onSubmit(recordedBlob, recordingType);
      deleteRecording();
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="w-full h-screen flex items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-2xl shadow-lg">
        <div className="space-y-6">
          {/* Header */}
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-800 mb-2">
              Share Your Feedback
            </h2>
            <p className="text-gray-600">
              Record an audio or video message about your experience
            </p>
          </div>

          {/* Recording Type Selection */}
          {!isRecording && !recordedBlob && (
            <div className="flex justify-center">
              <Radio.Group 
                value={recordingType} 
                onChange={(e) => setRecordingType(e.target.value)}
                size="large"
              >
                <Radio.Button value="audio">
                  <AudioOutlined className="mr-2" />
                  Audio
                </Radio.Button>
                <Radio.Button value="video">
                  <VideoCameraOutlined className="mr-2" />
                  Video
                </Radio.Button>
              </Radio.Group>
            </div>
          )}

          {/* Preview Area */}
          <div className="relative bg-gray-900 rounded-lg overflow-hidden" style={{ minHeight: '300px' }}>
            {recordingType === 'video' && (isRecording || recordedBlob) && (
              <video
                ref={videoPreviewRef}
                className="w-full h-full object-contain"
                style={{ minHeight: '300px', maxHeight: '400px' }}
                controls={!!recordedBlob}
                playsInline
                src={previewUrl || undefined}
              />
            )}
            
            {recordingType === 'audio' && recordedBlob && (
              <div className="flex items-center justify-center h-full p-8">
                <audio
                  ref={audioPreviewRef}
                  className="w-full"
                  controls
                  src={previewUrl || undefined}
                />
              </div>
            )}

            {!isRecording && !recordedBlob && (
              <div className="flex flex-col items-center justify-center h-full text-white p-8" style={{ minHeight: '300px' }}>
                {recordingType === 'audio' ? (
                  <AudioOutlined style={{ fontSize: '64px', marginBottom: '16px' }} />
                ) : (
                  <VideoCameraOutlined style={{ fontSize: '64px', marginBottom: '16px' }} />
                )}
                <p className="text-lg">Ready to record {recordingType}</p>
              </div>
            )}

            {/* Recording Timer Overlay */}
            {isRecording && (
              <div className="absolute top-4 right-4 bg-red-600 text-white px-4 py-2 rounded-full flex items-center gap-2">
                <span className="animate-pulse">●</span>
                <span className="font-mono font-bold">{formatTime(recordingTime)}</span>
              </div>
            )}
          </div>

          {/* Controls */}
          <div className="flex justify-center gap-4">
            {!isRecording && !recordedBlob && (
              <Button
                type="primary"
                size="large"
                icon={recordingType === 'audio' ? <AudioOutlined /> : <VideoCameraOutlined />}
                onClick={startRecording}
                className="bg-blue-600 hover:bg-blue-700"
              >
                Start Recording
              </Button>
            )}

            {isRecording && (
              <Button
                danger
                size="large"
                icon={<StopOutlined />}
                onClick={stopRecording}
              >
                Stop Recording
              </Button>
            )}

            {recordedBlob && (
              <>
                <Button
                  size="large"
                  icon={<DeleteOutlined />}
                  onClick={deleteRecording}
                >
                  Delete
                </Button>
                <Button
                  type="primary"
                  size="large"
                  icon={<SendOutlined />}
                  onClick={submitRecording}
                  className="bg-green-600 hover:bg-green-700"
                >
                  Submit Feedback
                </Button>
              </>
            )}
          </div>

          {/* Permission Warning for iOS */}
          {permissionStatus === 'denied' && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-center">
              <p className="text-yellow-800 mb-2">
                Camera/Microphone access is required
              </p>
              <p className="text-sm text-yellow-700">
                Please enable permissions in Settings → Safari → Camera/Microphone
              </p>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
};

export default Recording;