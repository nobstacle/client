"use client";

import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';

const FormByUUID = () => {
  const { uuid } = useParams();
  const [error, setError] = useState<string | null>(null);
  const [expiredReason, setExpiredReason] = useState<'submitted' | 'expired' | null>(null);
  const [formUrl, setFormUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!uuid || Array.isArray(uuid)) return;

    const controller = new AbortController();
    const baseUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
    fetch(`${baseUrl}/api/jotform/prefill/${encodeURIComponent(uuid)}`, { signal: controller.signal })
      .then(async (res) => {
        const body = await res.json().catch(() => ({}));
        if (res.status === 410 || body?.expired) {
          setFormUrl(null);
          setExpiredReason(body?.reason === 'submitted' ? 'submitted' : 'expired');
          setError(body?.message || 'This form link is no longer active.');
          return null;
        }
        if (!res.ok) throw new Error(body?.message || 'Form not found');
        return body;
      })
      .then((data) => {
        if (!data) return;
        setFormUrl(data.data.iframeUrl);
        setExpiredReason(null);
        setError(null);
      })
      .catch((err) => {
        if (err.name !== 'AbortError') {
          setFormUrl(null);
          setExpiredReason(null);
          setError(err.message);
        }
      });

    return () => controller.abort();
  }, [uuid]);

  return (
    <div style={{ background: 'white', height: '100vh', width: '100%' }}>
      {expiredReason ? (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            height: '100vh',
            padding: '24px',
            textAlign: 'center',
            fontFamily: 'system-ui, -apple-system, sans-serif',
            color: '#1f2937',
          }}
        >
          <h2 style={{ fontSize: '22px', fontWeight: 600, marginBottom: '10px' }}>
            {expiredReason === 'submitted' ? 'Form Already Submitted' : 'Form Link Expired'}
          </h2>
          <p style={{ fontSize: '15px', color: '#4b5563', maxWidth: '420px', lineHeight: 1.5 }}>
            {expiredReason === 'submitted'
              ? 'Thank you — this form has already been completed. For your privacy, the link is automatically closed after submission.'
              : 'This form link has expired for your privacy. Please ask reception to send you a fresh link.'}
          </p>
        </div>
      ) : error ? (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', padding: '24px' }}>
          <p style={{ color: '#dc2626' }}>Error: {error}</p>
        </div>
      ) : formUrl ? (
        <div style={{ width: '100%', height: '100vh' }}>
          {formUrl && (
            <iframe
              title="JotForm"
              src={formUrl}
              width="100%"
              height="100%"
              frameBorder="0"
              referrerPolicy="no-referrer"
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
