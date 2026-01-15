import * as React from "react";
import {
    Form,
    Button,
    Select,
    Card,
    message,
    Spin,
    Divider,
    Alert,
    Tooltip
} from "antd";
import {
    SaveOutlined,
    InfoCircleOutlined
} from "@ant-design/icons";
import useTemplateStore from "../../../../lib/zustand/store/templateStore";
import {
    useSurveyHeaderControllerCreateSurveyHeader,
    useSurveyHeaderControllerPatchSurveyHeader,
    useSurveyHeaderControllerGetSurveyHeaders,
} from "../../../../lib/client/api";

interface SurveyHeader {
    id: number;
    textId: number;
    userId: number;
    createdAt: string;
    updatedAt: string;
    text?: {
        id: number;
        content: string;
        tag: string;
    };
}

export const TemplateMergerForm: React.FC = () => {
    const [form] = Form.useForm();
    const { texts } = useTemplateStore();

    // API hooks - now fetching single survey header
    const { data: surveyHeader, isLoading, refetch } = useSurveyHeaderControllerGetSurveyHeaders();
    const createMutation = useSurveyHeaderControllerCreateSurveyHeader();
    const updateMutation = useSurveyHeaderControllerPatchSurveyHeader();

    // Set initial form value when data loads
    React.useEffect(() => {
        if (surveyHeader) {
            form.setFieldsValue({
                textId: surveyHeader.items[0]?.textId,
            });
        }
    }, [surveyHeader, form]);

    const handleSubmit = (values: any) => {
        if (surveyHeader !== undefined && surveyHeader?.items?.length > 0) {
            updateMutation.mutate(
                {
                    id: "",
                    data: {
                        textId: values.textId,
                    }
                },
                {
                    onSuccess: () => {
                        message.success("Survey header template updated!");
                        refetch();
                    },
                    onError: (error: any) => {
                        message.error(error?.response?.data?.message || "Failed to update survey header template");
                    },
                }
            );
        } else {
            createMutation.mutate(
                {
                    data: {
                        textId: values.textId,
                    }
                },
                {
                    onSuccess: () => {
                        message.success("Survey header template assigned!");
                        refetch();
                    },
                    onError: (error: any) => {
                        message.error(error?.response?.data?.message || "Failed to assign survey header template");
                    },
                }
            );
        }
    };

    // Get unique templates by tag
    const uniqueTemplates = React.useMemo(() => {
        const templateMap = new Map();
        texts.forEach((template) => {
            if (template.tag && !templateMap.has(template.tag)) {
                templateMap.set(template.tag, template);
            }
        });
        return Array.from(templateMap.values());
    }, [texts]);

    const currentTemplate = texts.find((t) => t.id === surveyHeader?.textId);

    return (
        <div style={{ padding: "8px" }}>
            <Card
                className="w-full"
                title={
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                        <span className="text-lg font-bold">Survey Header Template Settings</span>
                        <Tooltip
                            title="Configure the header template displayed on all survey screens. The content will automatically adapt to the user's selected language in the client app."
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
                bordered={false}
                style={{ boxShadow: "0 2px 8px rgba(0, 0, 0, 0.1)" }}
            >
                <Spin spinning={isLoading}>
                    {currentTemplate && (
                        <Alert
                            message="Current Template"
                            description={
                                <div>
                                    <strong>Tag:</strong> {currentTemplate.tag || "N/A"}
                                    <br />
                                    <strong>Preview:</strong> {currentTemplate.content.length > 150
                                        ? `${currentTemplate.content.substring(0, 150)}...`
                                        : currentTemplate.content}
                                </div>
                            }
                            type="info"
                            showIcon
                            style={{ marginBottom: 24 }}
                        />
                    )}

                    <Form
                        form={form}
                        layout="vertical"
                        onFinish={handleSubmit}
                    >
                        <Form.Item
                            label="Select Survey Header Template"
                            name="textId"
                            rules={[
                                { required: true, message: "Please select a template" },
                            ]}
                            extra="This template will be displayed in the language selected by the user in the client app"
                        >
                            <Select
                                placeholder="Select a template by tag"
                                size="large"
                                showSearch
                                optionFilterProp="children"
                                filterOption={(input, option) =>
                                    (option?.label ?? "")
                                        .toLowerCase()
                                        .includes(input.toLowerCase())
                                }
                                options={uniqueTemplates?.map((template) => ({
                                    label: template.tag || `Template ID: ${template.id}`,
                                    value: template.id,
                                }))}
                            />
                        </Form.Item>

                        <Divider />

                        <Form.Item style={{ marginBottom: 0 }}>
                            <Button
                                type="primary"
                                htmlType="submit"
                                icon={<SaveOutlined />}
                                size="large"
                                loading={createMutation.isPending || updateMutation.isPending}
                                block
                                className="customBtn"
                            >
                                {surveyHeader ? "Update Template" : "Assign Template"}
                            </Button>
                        </Form.Item>
                    </Form>
                </Spin>
            </Card>
        </div>
    );
};