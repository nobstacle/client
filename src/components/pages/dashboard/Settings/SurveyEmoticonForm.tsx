import * as React from "react";
import {
    Form,
    Button,
    Select,
    Card,
    message,
    Spin,
    Divider,
    Space,
    Tag,
    Table,
    Popconfirm,
} from "antd";
import {
    SaveOutlined,
    DeleteOutlined,
    EditOutlined,
} from "@ant-design/icons";
import useTemplateStore from "../../../../lib/zustand/store/templateStore";
import {
    useSurveyEmoticonTemplateControllerGetAll,
    useSurveyEmoticonTemplateControllerCreate,
    useSurveyEmoticonTemplateControllerUpdate,
    useSurveyEmoticonTemplateControllerDelete,
} from "../../../../lib/client/api";
import { AngryIcon } from "../../../icons/survey/AngryIcon";
import { MehIcon } from "../../../icons/survey/MehIcon";
import { NotBadIcon } from "../../../icons/survey/NotBadIcon";
import { VeryNiceIcon } from "../../../icons/survey/VeryNiceIcon";
import { GoodIcon } from "../../../icons/survey/GoodIcon";
interface EmoticonTemplate {
    id: number;
    emoticon: number;
    templateType: string;
    templateId: number;
    userId: number;
    createdAt: string;
    updatedAt: string;
}

const EMOTICONS = [
    { value: 1, label: "Very Sad", icon: AngryIcon, color: "#ff4d4f" },
    { value: 2, label: "Sad", icon: MehIcon, color: "#ff7a45" },
    { value: 3, label: "Neutral", icon: NotBadIcon, color: "#faad14" },
    { value: 4, label: "Happy", icon: GoodIcon, color: "#52c41a" },
    { value: 5, label: "Very Happy", icon: VeryNiceIcon, color: "#1890ff" },
];

const TEMPLATE_TYPES = [
    { value: "Text", label: "Text" },
    { value: "Image", label: "Image" },
    { value: "Video", label: "Video" },
    { value: "Slideshow", label: "Slideshow" },
    { value: "Map", label: "Map" },
    { value: "Website", label: "Website" },
    { value: "Document", label: "Document" },
];

export const SurveyEmoticonForm: React.FC = () => {
    const [form] = Form.useForm();
    const { texts, images, videos, slideshows, maps, websites, documents } = useTemplateStore();

    const [selectedTemplateType, setSelectedTemplateType] = React.useState<string | null>(null);
    const [editingId, setEditingId] = React.useState<number | null>(null);

    // API hooks
    const { data: emoticonTemplatesData, isLoading, refetch } = useSurveyEmoticonTemplateControllerGetAll();
    const createMutation = useSurveyEmoticonTemplateControllerCreate();
    const updateMutation = useSurveyEmoticonTemplateControllerUpdate();
    const deleteMutation = useSurveyEmoticonTemplateControllerDelete();

    const emoticonTemplates = emoticonTemplatesData?.items || [];

    // Get templates based on selected type
    const getTemplatesByType = (type: string) => {
        switch (type) {
            case "Text":
                return texts;
            case "Image":
                return images;
            case "Video":
                return videos;
            case "Slideshow":
                return slideshows;
            case "Map":
                return maps;
            case "Website":
                return websites;
            case "Document":
                return documents;
            default:
                return [];
        }
    };

    // Get unique templates by tag for selected type
    const availableTemplates = React.useMemo(() => {
        if (!selectedTemplateType) return [];

        const templates = getTemplatesByType(selectedTemplateType);
        const templateMap = new Map();

        templates.forEach((template: any) => {
            if (template.tag && !templateMap.has(template.tag)) {
                templateMap.set(template.tag, template);
            }
        });

        return Array.from(templateMap.values());
    }, [selectedTemplateType, texts, images, videos, slideshows, maps, websites, documents]);

    // Handle form submission
    const handleSubmit = (values: any) => {
        const payload = {
            emoticon: values.emoticon,
            templateType: values.templateType,
            templateId: values.templateId,
        };

        if (editingId) {
            updateMutation.mutate(
                {
                    id: editingId.toString(),
                    data: payload,
                },
                {
                    onSuccess: () => {
                        message.success("Emoticon template updated successfully!");
                        refetch();
                        resetForm();
                    },
                    onError: (error: any) => {
                        message.error(error?.response?.data?.message || "Failed to update emoticon template");
                    },
                }
            );
        } else {
            createMutation.mutate(
                { data: payload },
                {
                    onSuccess: () => {
                        message.success("Emoticon template assigned successfully!");
                        refetch();
                        resetForm();
                    },
                    onError: (error: any) => {
                        message.error(error?.response?.data?.message || "Failed to assign emoticon template");
                    },
                }
            );
        }
    };

    // Handle edit
    const handleEdit = (record: EmoticonTemplate) => {
        setEditingId(record.id);
        setSelectedTemplateType(record.templateType);

        form.setFieldsValue({
            emoticon: record.emoticon,
            templateType: record.templateType,
            templateId: record.templateId,
        });
    };

    // Handle delete
    const handleDelete = (id: number) => {
        deleteMutation.mutate(
            { id: id.toString() },
            {
                onSuccess: () => {
                    message.success("Emoticon template deleted successfully!");
                    refetch();
                },
                onError: (error: any) => {
                    message.error(error?.response?.data?.message || "Failed to delete emoticon template");
                },
            }
        );
    };

    // Reset form
    const resetForm = () => {
        form.resetFields();
        setEditingId(null);
        setSelectedTemplateType(null);
    };

    // Get template name
    const getTemplateName = (templateType: string, templateId: number) => {
        const templates = getTemplatesByType(templateType);
        const template = templates.find((t: any) => t.id === templateId);
        return template?.tag || `ID: ${templateId}`;
    };

    // Table columns
    const columns = [
        {
            title: "Emoticon",
            dataIndex: "emoticon",
            key: "emoticon",
            width: 120,
            render: (value: number) => {
                const emoticon = EMOTICONS.find(e => e.value === value);
                const IconComponent = emoticon?.icon;
                return (
                    <Tag color={emoticon?.color} style={{ fontSize: "13px", padding: "4px 8px" }}>
                        {IconComponent && (
                            <IconComponent
                                style={{
                                    width: "16px",
                                    height: "16px",
                                    marginRight: "4px",
                                    verticalAlign: "middle"
                                }}
                                className="customIconComponent"
                            />
                        )}
                        {emoticon?.label}
                    </Tag>
                );
            },
        },
        {
            title: "Type",
            dataIndex: "templateType",
            key: "templateType",
            width: 100,
            render: (value: string) => <Tag color="blue">{value}</Tag>,
        },
        {
            title: "Template",
            dataIndex: "templateId",
            key: "templateId",
            render: (templateId: number, record: EmoticonTemplate) => (
                <span style={{ fontSize: "13px" }}>{getTemplateName(record.templateType, templateId)}</span>
            ),
        },
        {
            title: "Actions",
            key: "actions",
            width: 150,
            render: (_: any, record: EmoticonTemplate) => (
                <Space size="small">
                    <Button
                        type="link"
                        size="small"
                        icon={<EditOutlined />}
                        onClick={() => handleEdit(record)}
                    >
                        Edit
                    </Button>
                    <Popconfirm
                        title="Delete this template?"
                        onConfirm={() => handleDelete(record.id)}
                        okText="Yes"
                        cancelText="No"
                    >
                        <Button type="link" size="small" danger icon={<DeleteOutlined />}>
                            Delete
                        </Button>
                    </Popconfirm>
                </Space>
            ),
        },
    ];

    return (
        <div style={{ padding: "8px" }}>
            <Card
                title="Survey Emoticon Template Settings"
                bordered={false}
                size="small"
                style={{ marginBottom: "16px" }}
            >
                <Spin spinning={isLoading}>
                    <Form
                        form={form}
                        layout="inline"
                        onFinish={handleSubmit}
                        style={{ width: "100%", flexWrap: "nowrap", }}
                    >
                        <Form.Item
                            name="emoticon"
                            rules={[{ required: true, message: "Select emoticon" }]}
                            style={{ marginBottom: "12px", width: "calc(25% - 8px)" }}
                        >
                            <Select
                                placeholder="Emoticon"
                                size="middle"
                                options={EMOTICONS.map((emoticon) => {
                                    const IconComponent = emoticon.icon;
                                    return {
                                        label: (
                                            <span style={{ display: "flex", alignItems: "center" }}>
                                                <IconComponent style={{ width: "16px", height: "16px", marginRight: "6px" }} />
                                                {emoticon.label}
                                            </span>
                                        ),
                                        value: emoticon.value,
                                    };
                                })}
                            />
                        </Form.Item>

                        <Form.Item
                            name="templateType"
                            rules={[{ required: true, message: "Select type" }]}
                            style={{ marginBottom: "12px", width: "calc(25% - 8px)" }}
                        >
                            <Select
                                placeholder="Type"
                                size="middle"
                                onChange={(value) => {
                                    setSelectedTemplateType(value);
                                    form.setFieldsValue({ templateId: undefined });
                                }}
                                options={TEMPLATE_TYPES}
                            />
                        </Form.Item>

                        <Form.Item
                            name="templateId"
                            rules={[{ required: true, message: "Select template" }]}
                            style={{ marginBottom: "12px", width: "calc(30% - 8px)" }}
                        >
                            <Select
                                placeholder="Template"
                                size="middle"
                                showSearch
                                disabled={!selectedTemplateType}
                                optionFilterProp="children"
                                filterOption={(input, option) =>
                                    (option?.label ?? "")
                                        .toLowerCase()
                                        .includes(input.toLowerCase())
                                }
                                options={availableTemplates.map((template: any) => ({
                                    label: template.tag || `ID: ${template.id}`,
                                    value: template.id,
                                }))}
                            />
                        </Form.Item>

                        <Form.Item style={{ marginBottom: "12px", width: "calc(20% - 8px)" }}>
                            <Space size="small">
                                <Button
                                    type="primary"
                                    htmlType="submit"
                                    icon={<SaveOutlined />}
                                    size="middle"
                                    loading={createMutation.isPending || updateMutation.isPending}
                                    className="customBtn"
                                >
                                    {editingId ? "Update" : "Assign"}
                                </Button>
                                {editingId && (
                                    <Button size="middle" onClick={resetForm}>
                                        Cancel
                                    </Button>
                                )}
                            </Space>
                        </Form.Item>
                    </Form>
                </Spin>
            </Card>

            <Card
                title="Assigned Templates"
                bordered={false}
                size="small"
            >
                <Table
                    columns={columns}
                    dataSource={emoticonTemplates}
                    rowKey="id"
                    loading={isLoading}
                    pagination={{ pageSize: 10, size: "small" }}
                    size="small"
                />
            </Card>
        </div>
    );
};