// components/home/Extension.tsx
// Browser extension download cards — positioned after the Product Tour.

import React from 'react';

const Extension = () => {
  return (
    <section id="browser-extensions" aria-labelledby="extensions-heading">
      <div className="container">
        <div className="section-header animate-on-scroll">
          <h2 id="extensions-heading">Add Nobstacle to Your Browser</h2>
          <p>
            Send content to your customer screen directly from any webpage —
            in one click, with our free browser extension.
          </p>
        </div>

        <div className="extension-cards animate-on-scroll">
          {/* Chrome */}
          <a
            href="https://chromewebstore.google.com/detail/magic-box-by-nobstacle/hkefcbmmedhekjdnmpkpmdbnhnhmhlld"
            target="_blank"
            rel="noopener noreferrer"
            className="extension-card extension-card--chrome"
            aria-label="Add Nobstacle to Chrome Web Store"
          >
            <div className="extension-card-img">
              <img
                src="/chrome-web-store.png"
                alt="Chrome Web Store logo"
                loading="lazy"
                width={120}
                height={60}
              />
            </div>
            <h3>Chrome Web Store</h3>
            <p>For Chrome &amp; Chromium browsers</p>
            <span className="extension-card-cta">
              Add to Chrome
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </span>
          </a>

          {/* Edge */}
          <a
            href="https://microsoftedge.microsoft.com/addons/detail/magic-box-by-nobstacle/dkkpgjdkihifanfknfmojjgeancegnhi"
            target="_blank"
            rel="noopener noreferrer"
            className="extension-card extension-card--edge"
            aria-label="Add Nobstacle to Microsoft Edge"
          >
            <div className="extension-card-img">
              <img
                src="/microsoft-store.png"
                alt="Microsoft Edge Add-ons Store logo"
                loading="lazy"
                width={120}
                height={60}
              />
            </div>
            <h3>Microsoft Edge Store</h3>
            <p>For Microsoft Edge browser</p>
            <span className="extension-card-cta">
              Add to Edge
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </span>
          </a>
        </div>
      </div>
    </section>
  );
};

export default Extension;