import * as React from "react";
import { Button, Select, Card, Space, Alert, Typography, Tooltip } from "antd";
import { SaveOutlined, InfoCircleOutlined } from "@ant-design/icons";
import * as Io5Icons from "react-icons/io5";
import useCompanyStore from "../../../../lib/zustand/store/companyStore";
import { useSession } from "next-auth/react";

const { Text } = Typography;

const getBackendUrl = () => {
    return typeof window !== 'undefined'
        ? process.env.NEXT_PUBLIC_BACKEND_URL
        : process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';
};

interface AssignedForm {
    form_id: number;
    form_name: string;
}

interface DefaultFormShortcut {
    id: number;
    companyId: number;
    formId: number | null;
    createdAt: string;
    updatedAt: string;
}

export const DefaultFormShortcut: React.FC = () => {
    const { company } = useCompanyStore();

    const [assignedForms, setAssignedForms] = React.useState<AssignedForm[]>([]);
    const [selectedFormId, setSelectedFormId] = React.useState<number | null>(null);
    const [selectedIcon, setSelectedIcon] = React.useState<string>("IoDocumentText");
    const [showIconPicker, setShowIconPicker] = React.useState<boolean>(false);
    const [loadingForms, setLoadingForms] = React.useState<boolean>(false);
    const [saving, setSaving] = React.useState<boolean>(false);
    const [error, setError] = React.useState<string>("");
    const [success, setSuccess] = React.useState<string>("");
    const [existingShortcut, setExistingShortcut] = React.useState<DefaultFormShortcut | null>(null);
    const { data } = useSession();

    const iconKeys = Object.keys(Io5Icons).filter(
        (name) => !name.includes("Outline") && !name.includes("Sharp")
    );

    const getAssignedFormByID = React.useCallback(async (company_id: number) => {
        const Url = getBackendUrl();
        const API_URL = `${Url}/api/assigned-form/${company_id}`;

        setLoadingForms(true);
        try {
            const response = await fetch(API_URL);
            if (response.ok) {
                const data = await response.json();
                setAssignedForms(data);
            } else {
                console.error('Unexpected response status:', response.status);
                setError('Failed to load forms');
            }
        } catch (error) {
            console.error('Error fetching assigned form data:', error);
            setError('Failed to load forms');
        } finally {
            setLoadingForms(false);
        }
    }, []);

    const getExistingShortcut = React.useCallback(async () => {
        const Url = getBackendUrl();
        const API_URL = `${Url}/api/v1/default-form-shortcut`;

        try {
            const response = await fetch(API_URL, {
                headers: {
                    Authorization: `Bearer ${data?.user?.backendTokens?.at}`,
                    'Content-Type': 'application/json',
                },
            });

            if (response.ok) {
                const data = await response.json();
                if (data) {
                    setExistingShortcut(data);
                    setSelectedFormId(data.formId);
                    setSelectedIcon(data.icon || "IoDocumentText");
                }
            }
        } catch (error) {
            console.error('Error fetching existing shortcut:', error);
        }
    }, []);

    React.useEffect(() => {
        if (company?.id) {
            getAssignedFormByID(company.id);
            getExistingShortcut();
        }
    }, [company?.id, getAssignedFormByID, getExistingShortcut]);

    const validateForm = () => {
        if (!selectedIcon) {
            setError("Please select an icon");
            return false;
        }

        return true;
    };

    const handleSubmit = async () => {
        if (!validateForm()) return;

        setSaving(true);
        setError("");
        setSuccess("");

        try {
            const Url = getBackendUrl();
            const API_URL = `${Url}/api/v1/default-form-shortcut`;

            const response = await fetch(API_URL, {
                method: 'POST', 
                headers: {
                Authorization: `Bearer ${data?.user?.backendTokens?.at}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    formId: selectedFormId,
                })
            });

            if (response.ok) {
                const data = await response.json();
                setExistingShortcut(data);
                setSuccess(existingShortcut
                    ? "Default form shortcut updated successfully"
                    : "Default form shortcut created successfully"
                );
            } else {
                const errorData = await response.json();
                setError(errorData.message || 'Failed to save default form shortcut');
            }
        } catch (error) {
            console.error('Error saving default form shortcut:', error);
            setError('Failed to save default form shortcut');
        } finally {
            setSaving(false);
        }
    };

    const handleClearForm = () => {
        setSelectedFormId(null);
    };

    const getFormOptions = () => {
        return assignedForms.map((form) => ({
            label: form.form_name,
            value: form.form_id,
        }));
    };

    return (
        <Card
            style={{ width: '100%' }}
            title={
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                    <span className="text-lg font-bold">Default Form Shortcut</span>
                    <Tooltip
                        title="Configure a quick-access button in the header to instantly send a form to client screens. You can leave the form empty to create a shortcut without a form."
                        placement="topRight"
                    >
                        <InfoCircleOutlined
                            style={{
                                fontSize: 16,
                                color: '#1890ff',
                                cursor: 'pointer'
                            }}
                        />
                    </Tooltip>
                </div>
            }
        >
            <Space direction="vertical" size="large" style={{ width: "100%" }}>
                <Space direction="vertical" size="middle" style={{ width: "100%" }}>
                    <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                            <Text strong>
                                Select Form (Optional)
                            </Text>
                            {selectedFormId && (
                                <Button
                                    size="small"
                                    type="link"
                                    onClick={handleClearForm}
                                    danger
                                >
                                    Clear Selection
                                </Button>
                            )}
                        </div>
                        <Select
                            placeholder="Choose a form or leave empty..."
                            style={{ width: "100%" }}
                            size="large"
                            loading={loadingForms}
                            onFocus={() => (error ? setError("") : null)}
                            onChange={(value) => setSelectedFormId(value)}
                            value={selectedFormId || undefined}
                            options={getFormOptions()}
                            disabled={loadingForms}
                            allowClear
                            onClear={() => setSelectedFormId(null)}
                        />
                        <Text type="secondary" style={{ fontSize: 12, marginTop: 4, display: 'block' }}>
                            {selectedFormId
                                ? "A form is selected. Clear it to create a shortcut without a specific form."
                                : "No form selected. The shortcut will be created without a specific form."}
                        </Text>
                    </div>
                </Space>

                {error && (
                    <Alert
                        message={error}
                        type="error"
                        showIcon
                        closable
                        onClose={() => setError("")}
                    />
                )}

                {success && (
                    <Alert
                        message={success}
                        type="success"
                        showIcon
                        closable
                        onClose={() => setSuccess("")}
                    />
                )}

                <Button
                    type="primary"
                    size="large"
                    block
                    loading={saving}
                    disabled={saving || loadingForms}
                    onClick={handleSubmit}
                    icon={<SaveOutlined />}
                    style={{ height: 44, fontWeight: 500 }}
                    className="customBtn"
                >
                    {existingShortcut ? 'Update Shortcut' : 'Save Shortcut'}
                </Button>
            </Space>
        </Card>
    );
};