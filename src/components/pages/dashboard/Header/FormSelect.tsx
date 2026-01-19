import React, { useState, useEffect } from 'react';
import { Modal, Button, Input, Select, DatePicker, Radio, message } from 'antd';
import { IoClose } from 'react-icons/io5';
import dayjs from 'dayjs';
import { SendIcon } from '@/components/icons/SendIcon';

const { Option } = Select;

const JotFormPrefillModal = ({ 
  isOpen, 
  onClose, 
  selectedForm,
  onSendForm,
  socketConnected 
}) => {
  const [formFields, setFormFields] = useState(null);
  const [formValues, setFormValues] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);

  // Fetch form fields when modal opens
  useEffect(() => {
    if (isOpen && selectedForm?.form_id) {
      fetchFormFields(selectedForm.form_id);
    }
  }, [isOpen, selectedForm]);

  const fetchFormFields = async (formId) => {
    setIsLoading(true);
    try {
      // Check cache first
      const cachedFields = sessionStorage.getItem(`form_fields_${formId}`);
      if (cachedFields) {
        setFormFields(JSON.parse(cachedFields));
        setIsLoading(false);
        return;
      }

      const API_KEY = process.env.NEXT_PUBLIC_JOTFORM_API_KEY;
      const response = await fetch(
        `https://api.jotform.com/form/${formId}/questions?apiKey=${API_KEY}`
      );

      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }

      const data = await response.json();
      sessionStorage.setItem(`form_fields_${formId}`, JSON.stringify(data));
      setFormFields(data || { content: [] });
    } catch (error) {
      console.error('Error fetching form fields:', error);
      message.error('Failed to load form fields');
      setFormFields({ content: [] });
    } finally {
      setIsLoading(false);
    }
  };

  const handleFieldChange = (fieldName, value) => {
    setFormValues(prev => ({
      ...prev,
      [fieldName]: value
    }));
  };

  const parseOptions = (optionsString) => {
    if (!optionsString) return [];
    return optionsString
      .split('|')
      .map(option => option.trim())
      .filter(option => option);
  };

  const isDateField = (item) => {
    return (
      item?.type === 'control_widget' && item?.text?.toLowerCase().includes('date') ||
      item?.name?.toLowerCase().includes('date') ||
      item?.name?.toLowerCase().includes('birth') ||
      item?.name?.toLowerCase().includes('expiry') ||
      item?.text?.toLowerCase().includes('date') ||
      item?.subLabel?.includes('DD/MM/YYYY') ||
      item?.subLabel?.includes('MM/DD/YYYY') ||
      item?.validation?.toLowerCase().includes('date') ||
      item?.type?.includes('date') ||
      item?.type === 'control_datetime'
    );
  };

  const renderFieldInput = (item) => {
    const value = formValues[item.name] || '';
    const options = parseOptions(item.options);

    // Date fields
    if (isDateField(item)) {
      let dateFormat = "DD/MM/YYYY";
      if (item?.subLabel) {
        if (item.subLabel.includes('MM/DD/YYYY')) dateFormat = "MM/DD/YYYY";
        else if (item.subLabel.includes('YYYY-MM-DD')) dateFormat = "YYYY-MM-DD";
      }

      return (
        <DatePicker
          style={{ width: '100%' }}
          format={dateFormat}
          size="middle"
          value={value ? dayjs(value, dateFormat) : null}
          onChange={(date, dateString) => handleFieldChange(item.name, dateString)}
          placeholder={item?.subLabel || `Select ${item.text}`}
        />
      );
    }

    // Radio buttons for ≤3 options
    if (options.length > 0 && options.length <= 3) {
      return (
        <Radio.Group
          value={value}
          onChange={(e) => handleFieldChange(item.name, e.target.value)}
          style={{ width: '100%' }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {options.map(option => (
              <Radio key={option} value={option}>
                {option}
              </Radio>
            ))}
          </div>
        </Radio.Group>
      );
    }

    // Select dropdown for >3 options
    if (options.length > 3) {
      return (
        <Select
          value={value}
          onChange={(val) => handleFieldChange(item.name, val)}
          style={{ width: '100%' }}
          size="middle"
          placeholder={`Select ${item.text}`}
          allowClear
        >
          {options.map(option => (
            <Option key={option} value={option}>
              {option}
            </Option>
          ))}
        </Select>
      );
    }

    // Email fields
    if (
      item?.validation === 'Email' ||
      item?.type === 'control_email' ||
      item?.name?.toLowerCase().includes('email') ||
      item?.text?.toLowerCase().includes('email')
    ) {
      return (
        <Input
          type="email"
          value={value}
          onChange={(e) => handleFieldChange(item.name, e.target.value)}
          style={{ width: '100%' }}
          size="middle"
          placeholder={item?.subLabel || "Enter email address"}
        />
      );
    }

    // Number/Phone fields
    if (
      item?.validation === 'Numeric' ||
      item?.type === 'control_number' ||
      item?.name?.toLowerCase().includes('mobile') ||
      item?.name?.toLowerCase().includes('phone')
    ) {
      return (
        <Input
          type="tel"
          value={value}
          onChange={(e) => handleFieldChange(item.name, e.target.value)}
          style={{ width: '100%' }}
          size="middle"
          placeholder={item?.subLabel || `Enter ${item.text}`}
        />
      );
    }

    // Text area
    if (item?.type === 'control_textarea') {
      return (
        <Input.TextArea
          value={value}
          onChange={(e) => handleFieldChange(item.name, e.target.value)}
          style={{ width: '100%' }}
          size="middle"
          rows={3}
          placeholder={`Enter ${item.text}`}
        />
      );
    }

    // Default text input
    return (
      <Input
        value={value}
        onChange={(e) => handleFieldChange(item.name, e.target.value)}
        style={{ width: '100%' }}
        size="middle"
        placeholder={item?.subLabel || `Enter ${item.text}`}
      />
    );
  };

  const handleSend = async () => {
    if (!socketConnected) {
      message.warning('Connection not ready, please try again');
      return;
    }

    setIsSending(true);

    try {
      // Create blank record first
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
      const uploadURL = `${backendUrl}/api/jotform/upload-single-record/${selectedForm.form_id}`;

      const response = await fetch(uploadURL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          formId: selectedForm.form_id,
          data: formValues
        })
      });

      if (!response.ok) {
        throw new Error('Failed to create form record');
      }

      const data = await response.json();
      const uuid = data?.data?.uuid;

      if (!uuid) {
        throw new Error('No UUID returned from server');
      }

      // Build prefilled URL
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://www.nobstacle.com';
      const params = new URLSearchParams();
      
      // Add form values to URL params
      Object.entries(formValues).forEach(([key, value]) => {
        if (value) {
          params.append(key, String(value));
        }
      });

      const url = `${baseUrl}/forms/${uuid}?${params.toString()}`;

      // Call the send callback
      if (onSendForm) {
        await onSendForm(url, uuid);
      }

      message.success('Form sent successfully!');
      handleClose();
    } catch (error) {
      console.error('Error sending form:', error);
      message.error('Failed to send form. Please try again.');
    } finally {
      setIsSending(false);
    }
  };

  const handleClose = () => {
    setFormValues({});
    onClose();
  };

  const prefillableFields = formFields?.content
    ? Object.values(formFields.content)
        .filter((item) => item?.name?.includes('prefillable'))
        .sort((a, b) => a.name.toLowerCase().localeCompare(b.name.toLowerCase()))
    : [];

  return (
    <Modal
      open={isOpen}
      onCancel={handleClose}
      footer={null}
      width="95%"
      style={{ maxWidth: '800px' }}
      centered
      closable={false}
      title={
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: '18px', fontWeight: '600' }}>
            Prefill Form: {selectedForm?.form_name}
          </span>
          <button
            onClick={handleClose}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: '#9ca3af',
              transition: 'color 0.2s'
            }}
            onMouseEnter={(e) => e.currentTarget.style.color = '#4b5563'}
            onMouseLeave={(e) => e.currentTarget.style.color = '#9ca3af'}
          >
            <IoClose size={24} />
          </button>
        </div>
      }
    >
      {isLoading ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '80px 0' }}>
          <div style={{
            width: '48px',
            height: '48px',
            border: '4px solid #f3f4f6',
            borderTop: '4px solid #3b5998',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite'
          }} />
          <style>{`
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          `}</style>
        </div>
      ) : (
        <>
          <div style={{ maxHeight: '60vh', overflowY: 'auto', padding: '0 8px' }}>
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
              gap: '16px',
              marginTop: '16px'
            }}>
              {prefillableFields.length === 0 ? (
                <div style={{ 
                  gridColumn: '1 / -1',
                  textAlign: 'center',
                  padding: '40px 0',
                  color: '#6b7280'
                }}>
                  No prefillable fields found for this form
                </div>
              ) : (
                prefillableFields.map((item) => (
                  <div key={item.qid} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <label style={{ 
                      color: '#374151',
                      fontWeight: '500',
                      fontSize: '14px'
                    }}>
                      {item?.text}
                      {item.required === 'Yes' && (
                        <span style={{ color: '#ef4444', marginLeft: '4px' }}>*</span>
                      )}
                    </label>
                    {renderFieldInput(item)}
                  </div>
                ))
              )}
            </div>
          </div>

          <div style={{ 
            display: 'flex',
            flexDirection: 'row',
            justifyContent: 'flex-end',
            gap: '12px',
            marginTop: '24px',
            paddingTop: '16px',
            borderTop: '1px solid #e5e7eb'
          }}>
            <Button
              onClick={handleSend}
              disabled={isSending || !socketConnected}
              loading={isSending}
              type="primary"
              size="large"
              style={{ 
                backgroundColor: '#3b5998',
                borderColor: '#3b5998',
                minWidth: '120px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
              icon={<SendIcon size={18} />}
            >
              {isSending ? 'Sending...' : 'Send Form'}
            </Button>
            <Button
              onClick={handleClose}
              size="large"
              style={{ 
                minWidth: '120px',
                backgroundColor: '#DC2626',
                borderColor: '#DC2626',
                color: 'white'
              }}
            >
              Cancel
            </Button>
          </div>
        </>
      )}
    </Modal>
  );
};

export default JotFormPrefillModal;