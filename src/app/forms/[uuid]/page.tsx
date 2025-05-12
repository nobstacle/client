"use client";

import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';

const FormByUUID = () => {
  const { uuid } = useParams();
  const [formData, setFormData] = useState<any>(null);
  const [formId, setFormId] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [formUrl, setFormUrl] = useState<string | null>(null);

  useEffect(() => {
    if (uuid) {
      let baseUrl = process.env.NEXT_PUBLIC_BACKEND_URL;

      fetch(baseUrl + `/api/jotform/get-form-data/${uuid}`)
        .then((res) => {
          if (!res.ok) {
            throw new Error('Form not found');
          }
          return res.json();
        })
        .then((data) => {
          setFormData(data);
          setFormId(data.data.formId);
          setError(null);
        })
        .catch((err) => {
          setFormData(null);
          setError(err.message);
        });
    }
  }, [uuid]);

  const buildUrl = (inputValues: any) => {
    const BASE_URL = `https://form.jotform.com/${formId}`;
    const params = new URLSearchParams();

    const answers =
      typeof formData?.data?.data === 'string' ? JSON.parse(formData?.data?.data) : formData?.data?.data;

    for (const [key, value] of Object.entries(answers || {})) {
      const questionLabel = inputValues[key];
      if (questionLabel && value !== undefined && value !== null) {
        params.append(key, value);
      }
    }

    return `${BASE_URL}?${params.toString()}`;
  };

  useEffect(() => {
    const fetchFormFields = async () => {
      if (!formId) return;

      try {
        const API_KEY = process.env.NEXT_PUBLIC_JOTFORM_API_KEY;
        const response = await fetch(
          `https://api.jotform.com/form/${formId}/questions?apiKey=${API_KEY}`
        );

        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`);
        }

        const data = await response.json();
        const content = data?.content || {};

        const result: Record<string, any> = {};

        Object.values(content).forEach((field: any) => {
          const label = field.text;
          const key = field.name;

          if (label && key) {
            result[key] = label;
          }
        });

        let url = buildUrl(result);
        setFormUrl(url);
      } catch (error: any) {
        console.error({ error });
      }
    };

    fetchFormFields();
  }, [formId]);

  return (
    <div style={{ background: 'white', height: '100vh', width: '100%' }}>
      {error ? (
        <p style={{ color: 'red' }}>Error: {error}</p>
      ) : formData ? (
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
