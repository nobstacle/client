import React, { useState, useEffect } from 'react';
import { FaCircle } from 'react-icons/fa6';

export const RecordingNotice = ({ langCode = 'en' }) => {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
    }, 5000);

    return () => clearTimeout(timer);
  }, []);

  if (!isVisible) return null;

  const messages = {
    en: "Your voice will be recorded throughout the transaction for quality check and training purposes.",
    ar: "سيتم تسجيل صوتك طوال المعاملة لأغراض فحص الجودة والتدريب.",
    es: "Su voz será grabada durante toda la transacción con fines de control de calidad y capacitación.",
    fr: "Votre voix sera enregistrée tout au long de la transaction à des fins de contrôle qualité et de formation.",
    de: "Ihre Stimme wird während der gesamten Transaktion zu Qualitätssicherungs- und Schulungszwecken aufgezeichnet.",
  };

  return (
    <>
      <style jsx>{`
        @keyframes slideDown {
          from {
            transform: translateY(-100%);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }

        @keyframes fadeOut {
          from {
            opacity: 1;
          }
          to {
            opacity: 0;
          }
        }

        @keyframes recordPulse {
          0%, 100% {
            opacity: 1;
            transform: scale(1);
          }
          50% {
            opacity: 0.6;
            transform: scale(1.15);
          }
        }

        .recording-notice {
          animation: slideDown 0.5s ease-out, fadeOut 0.5s ease-out 4.5s forwards;
        }

        .record-pulse {
          animation: recordPulse 1.5s ease-in-out infinite;
        }
      `}</style>
      
      <div 
        className="recording-notice fixed top-0 left-0 right-0 z-[9999] bg-red-600 text-white px-4 sm:px-6 py-3 sm:py-4 shadow-lg"
      >
        <div className="max-w-7xl mx-auto flex items-center gap-2 sm:gap-3">
          <div className="flex-shrink-0">
            <FaCircle className="text-white record-pulse" style={{ fontSize: '14px' }} />
          </div>
          <p className="text-xs sm:text-sm md:text-base font-medium flex-1 leading-tight">
            {messages[langCode] || messages.en}
          </p>
        </div>
      </div>
    </>
  );
};