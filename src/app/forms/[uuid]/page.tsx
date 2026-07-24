"use client";

import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';

const FormByUUID = () => {
  const { uuid } = useParams();
  const [error, setError] = useState<string | null>(null);
  const [formUrl, setFormUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!uuid || Array.isArray(uuid)) return;

    const controller = new AbortController();
    const baseUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
    fetch(`${baseUrl}/api/jotform/prefill/${encodeURIComponent(uuid)}`, { signal: controller.signal })
      .then((res) => {
        if (!res.ok) throw new Error('Form not found');
        return res.json();
      })
      .then((data) => {
        setFormUrl(data.data.iframeUrl);
        setError(null);
      })
      .catch((err) => {
        if (err.name !== 'AbortError') {
          setFormUrl(null);
          setError(err.message);
        }
      });

    return () => controller.abort();
  }, [uuid]);

  return (
    <div style={{ background: 'white', height: '100vh', width: '100%' }}>
      {error ? (
        <p style={{ color: 'red' }}>Error: {error}</p>
      ) : formUrl ? (
        <div style={{ width: '100%', height: '100vh' }}>
          {formUrl && (
            <iframe
              title="JotForm"
              src={formUrl}
              width="100%"
              height="100%"
              frameBorder="0"
              allowFullScreen
            >
            </iframe>
          )}
        </div>
      ) : (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
          <p>Loading...</p>
        </div>
      )}
    </div>
  );

};

export default FormByUUID;
