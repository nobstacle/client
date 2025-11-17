import React, { useState, useRef, useEffect } from 'react';
import { Button, Card, message, Modal, Radio } from 'antd';
import { AudioOutlined, VideoCameraOutlined, StopOutlined, PlayCircleOutlined, DeleteOutlined, SendOutlined } from '@ant-design/icons';

interface RecordingProps {
  onSubmit: (blob: Blob, type: 'audio' | 'video') => void;
  langCode?: string;
  loading?: any;
}

const Recording: React.FC<RecordingProps> = ({ onSubmit, langCode = 'en', loading }: RecordingProps) => {
  const [recordingType, setRecordingType] = useState<'audio' | 'video'>('audio');
  const [isRecording, setIsRecording] = useState(false);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [recordingTime, setRecordingTime] = useState(0);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [permissionStatus, setPermissionStatus] = useState<'granted' | 'denied' | 'prompt'>('prompt');

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const videoPreviewRef = useRef<HTMLVideoElement | null>(null);
  const videoPlaybackRef = useRef<HTMLVideoElement | null>(null); // Separate ref for playback
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
      console.log('🎬 Starting recording...');

      // Reset previous recording
      if (recordedBlob) {
        setRecordedBlob(null);
        setPreviewUrl(null);
      }

      const stream = await requestPermissions(recordingType);
      if (!stream) {
        console.error('❌ No stream returned');
        return;
      }

      console.log('✅ Stream obtained:', stream);
      console.log('📹 Stream tracks:', stream.getTracks());

      streamRef.current = stream;

      // SET isRecording to true FIRST so the video element renders
      setIsRecording(true);

      // THEN set up the video preview after a small delay to ensure element is mounted
      if (recordingType === 'video') {
        // Use setTimeout to ensure video element is in DOM
        setTimeout(() => {
          if (videoPreviewRef.current && streamRef.current) {
            console.log('📺 Setting up video preview...');

            videoPreviewRef.current.srcObject = streamRef.current;
            videoPreviewRef.current.muted = true;

            videoPreviewRef.current.onloadedmetadata = () => {
              console.log('✅ Video metadata loaded');
              console.log('Video dimensions:', videoPreviewRef.current?.videoWidth, 'x', videoPreviewRef.current?.videoHeight);
            };

            videoPreviewRef.current.onplay = () => {
              console.log('▶️ Video started playing');
            };

            videoPreviewRef.current.onerror = (e) => {
              console.error('❌ Video error:', e);
            };

            videoPreviewRef.current.play().catch(err => {
              console.error('❌ Error playing video preview:', err);
            });
          }
        }, 100);
      }

      // Determine MIME type based on browser support
      let mimeType = recordingType === 'video' ? 'video/mp4' : 'audio/mp4';

      // iOS Safari fallback
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = recordingType === 'video' ? 'video/webm' : 'audio/webm';
        console.log('📝 Using fallback MIME type:', mimeType);
      }

      // Android Chrome fallback
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = recordingType === 'video' ? 'video/webm;codecs=vp8,opus' : 'audio/webm;codecs=opus';
        console.log('📝 Using second fallback MIME type:', mimeType);
      }

      console.log('📝 Final MIME type:', mimeType);

      chunksRef.current = [];
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: mimeType,
        videoBitsPerSecond: 2500000,
      });

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        console.log('⏹️ Recording stopped');
        const blob = new Blob(chunksRef.current, { type: mimeType });
        console.log('💾 Blob created:', blob.size, 'bytes');
        setRecordedBlob(blob);

        const url = URL.createObjectURL(blob);
        setPreviewUrl(url);
        console.log('🔗 Preview URL created:', url);

        // Stop the stream after recording
        stopStream();

        // Clear live preview
        if (videoPreviewRef.current) {
          videoPreviewRef.current.srcObject = null;
        }

        setIsRecording(false);
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
    <>
      <div className="w-full h-screen flex items-center justify-center bg-gray-50 p-4">
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
                {/* Live Preview during recording */}
                {recordingType === 'video' && isRecording && !recordedBlob && (
                  <video
                    key="live-preview"
                    ref={videoPreviewRef}
                    className="w-full h-full object-contain"
                    style={{ minHeight: '300px', maxHeight: '400px' }}
                    playsInline
                    muted
                    autoPlay
                  />
                )}
                {/* Playback after recording */}
                {recordingType === 'video' && !isRecording && recordedBlob && (
                  <video
                    key="playback"
                    ref={videoPlaybackRef}
                    className="w-full h-full object-contain"
                    style={{ minHeight: '300px', maxHeight: '400px' }}
                    controls
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
                      loading={loading}
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
          )}

        </Card>
      </div>
    </>
  );
};

export default Recording;