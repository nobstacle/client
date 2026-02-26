// PairUrlButton.tsx - new component
import { useState, useEffect, useRef } from 'react';
import { LinkOutlined, CopyOutlined, CheckOutlined, CloseOutlined } from '@ant-design/icons';
import { message } from 'antd';

interface PairUrlButtonProps {
  stationNo: number;
  backendToken: string;
}

export const PairUrlButton = ({ stationNo, backendToken }: PairUrlButtonProps) => {
  const [pairUrl, setPairUrl] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<Date | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [timeLeft, setTimeLeft] = useState<string>('');
  const timerRef = useRef<NodeJS.Timeout>();

  // Countdown timer
  useEffect(() => {
    if (!expiresAt) return;
    
    const tick = () => {
      const diff = expiresAt.getTime() - Date.now();
      if (diff <= 0) {
        setPairUrl(null);
        setExpiresAt(null);
        setTimeLeft('');
        return;
      }
      const mins = Math.floor(diff / 60000);
      const secs = Math.floor((diff % 60000) / 1000);
      setTimeLeft(`${mins}:${secs.toString().padStart(2, '0')}`);
    };

    tick();
    timerRef.current = setInterval(tick, 1000);
    return () => clearInterval(timerRef.current);
  }, [expiresAt]);

  const generateUrl = async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/v1/pairing/generate`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${backendToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ stationNo }),
        }
      );
      const data = await res.json();
      setPairUrl(data.url);
      setExpiresAt(new Date(data.expiresAt));
    } catch (e) {
      message.error('Failed to generate pairing URL');
    } finally {
      setLoading(false);
    }
  };

  const copyUrl = async () => {
    if (!pairUrl) return;
    await navigator.clipboard.writeText(pairUrl);
    setCopied(true);
    message.success('Pairing URL copied!');
    setTimeout(() => setCopied(false), 2000);
  };

  const revoke = async () => {
    // Extract token from URL
    const token = pairUrl?.split('/pair/')[1];
    if (!token) return;
    await fetch(
      `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/v1/pairing/revoke/${token}`,
      { method: 'DELETE', headers: { Authorization: `Bearer ${backendToken}` } }
    );
    setPairUrl(null);
    setExpiresAt(null);
  };

  return (
    <div style={{
      borderBottom: '1px solid #f0f0f0',
      paddingBottom: '12px',
      marginBottom: '12px',
    }}>
      {/* Label */}
      <label style={{
        display: 'block',
        fontSize: '11px',
        fontWeight: '600',
        color: '#6b7280',
        textTransform: 'uppercase',
        marginBottom: '8px',
        letterSpacing: '0.05em',
      }}>
        Guest Pairing
      </label>

      {!pairUrl ? (
        // Generate button
        <button
          onClick={generateUrl}
          disabled={loading}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            padding: '9px 14px',
            backgroundColor: '#3b5998',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            fontSize: '13px',
            fontWeight: '600',
            cursor: loading ? 'not-allowed' : 'pointer',
            opacity: loading ? 0.7 : 1,
            transition: 'all 0.2s',
          }}
        >
          <LinkOutlined />
          {loading ? 'Generating...' : 'Use URL to Pair'}
        </button>
      ) : (
        // Active pairing state
        <div>
          {/* URL display row */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '8px 10px',
            backgroundColor: '#f0f4ff',
            border: '1px solid #c7d2fe',
            borderRadius: '8px',
            marginBottom: '6px',
          }}>
            <LinkOutlined style={{ color: '#3b5998', fontSize: '13px', flexShrink: 0 }} />
            <span style={{
              flex: 1,
              fontSize: '11px',
              color: '#374151',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              fontFamily: 'monospace',
            }}>
              {pairUrl}
            </span>
            {/* Copy */}
            <button
              onClick={copyUrl}
              title="Copy URL"
              style={{
                background: copied ? '#10b981' : '#3b5998',
                border: 'none',
                borderRadius: '6px',
                color: 'white',
                width: '28px',
                height: '28px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                flexShrink: 0,
                transition: 'background 0.2s',
              }}
            >
              {copied ? <CheckOutlined style={{ fontSize: '12px' }} /> : <CopyOutlined style={{ fontSize: '12px' }} />}
            </button>
            {/* Revoke */}
            <button
              onClick={revoke}
              title="Revoke link"
              style={{
                background: '#fee2e2',
                border: 'none',
                borderRadius: '6px',
                color: '#dc2626',
                width: '28px',
                height: '28px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                flexShrink: 0,
              }}
            >
              <CloseOutlined style={{ fontSize: '12px' }} />
            </button>
          </div>

          {/* Expiry timer */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '11px',
            color: Number(timeLeft.split(':')[0]) < 5 ? '#dc2626' : '#6b7280',
          }}>
            <span>⏱ Expires in {timeLeft}</span>
            <span style={{ color: '#10b981', fontWeight: 600 }}>● Active</span>
          </div>
        </div>
      )}
    </div>
  );
};