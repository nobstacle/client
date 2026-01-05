import React, { useState, useEffect } from 'react';

const ScrollToTop = () => {
    const [isVisible, setIsVisible] = useState(false);

    // Show button when page is scrolled down
    useEffect(() => {
        const toggleVisibility = () => {
            if (window.scrollY > 300) {
                setIsVisible(true);
            } else {
                setIsVisible(false);
            }
        };

        window.addEventListener('scroll', toggleVisibility);
        return () => window.removeEventListener('scroll', toggleVisibility);
    }, []);

    // Scroll to top smoothly
    const scrollToTop = () => {
        window.scrollTo({
            top: 0,
            behavior: 'smooth',
        });
    };

    return (
        <>
            <button
                onClick={scrollToTop}
                className={`scroll-to-top ${isVisible ? 'visible' : ''}`}
                aria-label="Scroll to top"
            >
                <svg
                    className="arrow-icon"
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                >
                    <path d="M12 19V5M5 12l7-7 7 7" />
                </svg>
            </button>

            <style jsx>{`
        .scroll-to-top {
          position: fixed;
          bottom: 30px;
          right: 30px;
          width: 50px;
          height: 50px;
          background: #3b5998;
          border: none;
          border-radius: 50%;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 4px 12px rgba(59, 89, 152, 0.3);
          z-index: 1000;
          opacity: 0;
          visibility: hidden;
          transform: translateY(20px);
          transition: all 0.3s ease;
        }

        .scroll-to-top.visible {
          opacity: 1;
          visibility: visible;
          transform: translateY(0);
        }

        .scroll-to-top:hover {
          background: #2d4373;
          box-shadow: 0 6px 16px rgba(59, 89, 152, 0.4);
        }

        .scroll-to-top:active {
          transform: scale(0.95);
        }

        .arrow-icon {
          color: white;
          width: 24px;
          height: 24px;
          flex-shrink: 0;
        }

        /* Responsive adjustments */
        @media (max-width: 768px) {
          .scroll-to-top {
            width: 45px;
            height: 45px;
            bottom: 20px;
            right: 20px;
          }

          .arrow-icon {
            width: 20px;
            height: 20px;
          }
        }
      `}</style>
        </>
    );
};

export default ScrollToTop;