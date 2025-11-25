import React, { useState, useRef, useEffect } from 'react';
import { message } from 'antd';
import { FaCircle } from 'react-icons/fa6';

export const BackgroundRecorder = ({ 
  confirmationNumber, 
  onRecordingComplete,
  langCode = 'en' 
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef(null);
  const streamRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);
  const hasStartedRef = useRef(false);

  const MAX_RECORDING_TIME = 300; // 5 minutes

  useEffect(() => {
    if (!hasStartedRef.current) {
      hasStartedRef.current = true;
      startRecording();
    }

    return () => {
      stopStream();
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  useEffect(() => {
    if (recordingTime >= MAX_RECORDING_TIME && isRecording) {
      stopRecording();
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
      return stream;
    } catch (error) {
      console.error('Permission denied:', error);
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

  const startRecording = async () => {
    try {
      const stream = await requestPermissions();
      if (!stream) return;

      streamRef.current = stream;

      // Announcement
      const announcement = new SpeechSynthesisUtterance(
        "Your voice feedback is being recorded to help us improve our services."
      );
      announcement.rate = 1.6;

      announcement.onend = () => {
        // Beep sound
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);

        oscillator.frequency.value = 800;
        oscillator.type = 'sine';

        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);

        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.5);

        setTimeout(() => {
          setIsRecording(true);
          startActualRecording(stream);
        }, 600);
      };

      speechSynthesis.speak(announcement);
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const startActualRecording = async (stream) => {
    try {
      let mimeType = 'audio/mp4';
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = 'audio/webm';
      }
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = 'audio/webm;codecs=opus';
      }

      chunksRef.current = [];
      const mediaRecorder = new MediaRecorder(stream, { mimeType });

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mimeType });
        stopStream();
        setIsRecording(false);
        onRecordingComplete(blob, 'audio');
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start(100);
      setRecordingTime(0);

      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);

      message.success('Recording started');
    } catch (error) {
      console.error('Error starting recording:', error);
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
    }
  };

  // Small recording indicator in corner
  if (!isRecording) return null;

  return (
    <div 
      className="fixed bottom-4 right-4 z-[9998] bg-red-600 text-white px-4 py-2 rounded-full shadow-lg flex items-center gap-2"
      style={{ animation: 'recordPulse 1.5s ease-in-out infinite' }}
    >
      <FaCircle style={{ fontSize: '12px' }} />
      <span className="text-sm font-medium">
        {Math.floor(recordingTime / 60)}:{(recordingTime % 60).toString().padStart(2, '0')}
      </span>
    </div>
  );
};
