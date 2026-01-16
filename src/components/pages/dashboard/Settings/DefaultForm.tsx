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
    const [loadingForms, setLoadingForms] = React.useState<boolean>(false);
    const [saving, setSaving] = React.useState<boolean>(false);
    const [deleting, setDeleting] = React.useState<boolean>(false);
    const [error, setError] = React.useState<string>("");
    const [success, setSuccess] = React.useState<string>("");
    const [existingShortcut, setExistingShortcut] = React.useState<DefaultFormShortcut | null>(null);
    const { data } = useSession();

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

    const getExistingShortcut = React.useCallback(async (data) => {
        const Url = getBackendUrl();
        const API_URL = `${Url}/api/v1/shortcut/default-company-form`;

        try {
            const response = await fetch(API_URL, {
                method: 'GET',
                headers: {
                    Authorization: `Bearer ${data?.user?.backendTokens?.at}`,
                    'Content-Type': 'application/json',
                },
            });

            if (response.ok) {
                const data = await response.json();
                if (data) {
                    setExistingShortcut(data?.data || null);
                    setSelectedFormId(data?.data?.formId);
                }
            }
        } catch (error) {
            console.error('Error fetching existing shortcut:', error);
        }
    }, []);

    React.useEffect(() => {
        if (company?.id && data !== undefined) {
            getAssignedFormByID(company.id);
            getExistingShortcut(data);
        }
    }, [company?.id, data, getAssignedFormByID, getExistingShortcut]);


    const handleSubmit = async () => {
        setSaving(true);
        setError("");
        setSuccess("");

        try {
            const Url = getBackendUrl();
            const API_URL = `${Url}/api/v1/shortcut/default-form-shortcut`;

            const response = await fetch(API_URL, {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${data?.user?.backendTokens?.at}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    formId: selectedFormId?.toString(),
                })
            });

            if (response.ok) {
                const responseData = await response.json();
                setExistingShortcut(responseData);
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

    const handleDeleteShortcut = async () => {
        setDeleting(true);
        setError("");
        setSuccess("");

        try {
            const Url = getBackendUrl();
            const API_URL = `${Url}/api/v1/shortcut/default-form-shortcut`;

            const response = await fetch(API_URL, {
                method: 'DELETE',
                headers: {
                    Authorization: `Bearer ${data?.user?.backendTokens?.at}`,
                    'Content-Type': 'application/json',
                },
            });

            if (response.ok) {
                setExistingShortcut(null);
                setSelectedFormId(null);
                setSuccess("Default form shortcut deleted successfully");
            } else {
                const errorData = await response.json();
                setError(errorData.message || 'Failed to delete default form shortcut');
            }
        } catch (error) {
            console.error('Error deleting default form shortcut:', error);
            setError('Failed to delete default form shortcut');
        } finally {
            setDeleting(false);
        }
    };

    const handleClearForm = () => {
        if (existingShortcut) {
            // If there's an existing shortcut, delete it
            handleDeleteShortcut();
        } else {
            // If no existing shortcut, just clear the selection
            setSelectedFormId(null);
        }
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
                    <span className="text-lg font-bold">Default Form</span>
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
                                Select Form
                            </Text>
                            {(selectedFormId || existingShortcut) && (
                                <Button
                                    size="small"
                                    type="link"
                                    onClick={handleClearForm}
                                    danger
                                    loading={deleting}
                                    disabled={deleting}
                                >
                                    {existingShortcut ? 'Delete Shortcut' : 'Clear Selection'}
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
                            disabled={loadingForms || deleting}
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
                    disabled={saving || loadingForms || deleting}
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