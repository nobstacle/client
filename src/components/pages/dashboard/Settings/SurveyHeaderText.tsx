import * as React from "react";
import {
    Form,
    Button,
    Select,
    Card,
    Table,
    Space,
    Modal,
    message,
    Spin,
    Popconfirm,
    Tag,
    Divider,
} from "antd";
import {
    PlusOutlined,
    EditOutlined,
    DeleteOutlined,
    SaveOutlined,
} from "@ant-design/icons";
import useTemplateStore from "../../../../lib/zustand/store/templateStore";
import { languages } from "../../../../constant/languages";
import {
    useSurveyHeaderControllerCreateSurveyHeader,
    useSurveyHeaderControllerPatchSurveyHeader,
    useSurveyHeaderControllerDeleteSurveyHeaderById,
    useSurveyHeaderControllerGetSurveyHeaders, // You need to create this query hook
} from "../../../../lib/client/api";

interface SurveyHeader {
    id: number;
    textId: number;
    langCode: string;
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
    const [isModalVisible, setIsModalVisible] = React.useState(false);
    const [editingRecord, setEditingRecord] = React.useState<SurveyHeader | null>(null);
    const { texts } = useTemplateStore();

    // API hooks - CORRECTED to match shortcut pattern
    const { data: surveyHeaders, isLoading, refetch, error } = useSurveyHeaderControllerGetSurveyHeaders();

    const createMutation = useSurveyHeaderControllerCreateSurveyHeader();
    const updateMutation = useSurveyHeaderControllerPatchSurveyHeader();
    const deleteMutation = useSurveyHeaderControllerDeleteSurveyHeaderById();

    const handleOpenModal = (record?: SurveyHeader) => {
        if (record) {
            setEditingRecord(record);
            form.setFieldsValue({
                textId: record.textId,
                langCode: record.langCode,
            });
        } else {
            setEditingRecord(null);
            form.resetFields();
        }
        setIsModalVisible(true);
    };

    const handleCloseModal = () => {
        setIsModalVisible(false);
        setEditingRecord(null);
        form.resetFields();
    };

    const handleSubmit = (values: any) => {
        if (editingRecord) {
            // Update existing survey header - CORRECTED
            updateMutation.mutate(
                {
                    id: editingRecord.id.toString(),
                    data: {
                        textId: values.textId,
                        langCode: values.langCode,
                    }
                },
                {
                    onSuccess: () => {
                        message.success("Survey header updated successfully!");
                        handleCloseModal();
                        refetch();
                    },
                    onError: (error: any) => {
                        message.error(error?.response?.data?.message || "Failed to update survey header");
                    },
                }
            );
        } else {
            // Create new survey header - CORRECTED
            createMutation.mutate(
                {
                    data: {
                        textId: values.textId,
                        langCode: values.langCode,
                    }
                },
                {
                    onSuccess: () => {
                        message.success("Survey header created successfully!");
                        handleCloseModal();
                        refetch();
                    },
                    onError: (error: any) => {
                        message.error(error?.response?.data?.message || "Failed to create survey header");
                    },
                }
            );
        }
    };

    const handleDelete = (id: number) => {
        deleteMutation.mutate(
            { id: id.toString() },
            {
                onSuccess: () => {
                    message.success("Survey header deleted successfully!");
                    refetch();
                },
                onError: (error: any) => {
                    message.error(error?.response?.data?.message || "Failed to delete survey header");
                },
            }
        );
    };

    const columns = [
        {
            title: "ID",
            dataIndex: "id",
            key: "id",
            width: 80,
        },
        {
            title: "Text Template",
            dataIndex: "textContent",
            key: "textContent",
            render: (text: string) => (
                <div
                    style={{
                        maxWidth: 300,
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                    }}
                    title={text}
                >
                    <Tag color="blue">
                        {text || "N/A"}
                    </Tag>
                </div>
            ),
        },
        {
            title: "Language",
            dataIndex: "langCode",
            key: "langCode",
            width: 120,
            render: (text: string) => <Tag color="green">{text?.toUpperCase()}</Tag>,
        },
        {
            title: "Created At",
            dataIndex: "createdAt",
            key: "createdAt",
            width: 180,
            render: (date: string) => new Date(date).toLocaleDateString(),
        },
        {
            title: "Actions",
            key: "actions",
            width: 120,
            render: (_: any, record: SurveyHeader) => (
                <Space>
                    <Button
                        type="primary"
                        icon={<EditOutlined />}
                        size="small"
                        onClick={() => handleOpenModal(record)}
                         className="customBtn"
                    />
                    <Popconfirm
                        title="Are you sure you want to delete this survey header?"
                        onConfirm={() => handleDelete(record.id)}
                        okText="Yes"
                        cancelText="No"
                    >
                        <Button
                            danger
                            icon={<DeleteOutlined />}
                            size="small"
                            loading={deleteMutation.isPending}
                        />
                    </Popconfirm>
                </Space>
            ),
        },
    ];

    // Merge fetched survey headers with text content
    const dataSource = (surveyHeaders?.items || []).map((header) => {
        const matchedText = texts.find((t) => t.id === header.textId);
        return {
            ...header,
            textContent: matchedText?.content || "N/A",
        };
    });


    return (
        <div style={{ padding: "8px" }}>
            <Card
                className="w-full"
                title={
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{ fontSize: "18px", fontWeight: "bold" }}>
                            Survey Header
                        </span>
                        <Button
                            type="primary"
                            icon={<PlusOutlined />}
                            onClick={() => handleOpenModal()}
                            size="large"
                            className="customBtn"
                        >
                            Create
                        </Button>
                    </div>
                }
                bordered={false}
                style={{ boxShadow: "0 2px 8px rgba(0, 0, 0, 0.1)" }}
            >
                <Spin spinning={isLoading}>
                    <Table
                        dataSource={dataSource}
                        columns={columns}
                        rowKey="id"
                        pagination={{
                            pageSize: 10,
                            showSizeChanger: true,
                            showTotal: (total) => `Total ${total} items`,
                        }}
                        bordered
                    />
                </Spin>
            </Card>

            <Modal
                title={
                    <span style={{ fontSize: "18px", fontWeight: "bold" }}>
                        {editingRecord ? "Edit Survey Header" : "Create New Survey Header"}
                    </span>
                }
                open={isModalVisible}
                onCancel={handleCloseModal}
                footer={null}
                width={600}
            >
                <Divider />
                <Form
                    form={form}
                    layout="vertical"
                    onFinish={handleSubmit}
                >
                    <Form.Item
                        label="Text Template"
                        name="textId"
                        rules={[
                            { required: true, message: "Please select a text template" },
                        ]}
                    >
                        <Select
                            placeholder="Select a text template"
                            size="large"
                            showSearch
                            optionFilterProp="children"
                            filterOption={(input, option) =>
                                (option?.label ?? "")
                                    .toLowerCase()
                                    .includes(input.toLowerCase())
                            }
                            options={texts?.map((template) => ({
                                label: template.content.length > 100
                                    ? `${template.content.substring(0, 100)}...`
                                    : template.content,
                                value: template.id,
                            }))}
                        />
                    </Form.Item>

                    <Form.Item
                        label="Language"
                        name="langCode"
                        rules={[
                            { required: true, message: "Please select a language" },
                        ]}
                    >
                        <Select
                            placeholder="Select language..."
                            size="large"
                            showSearch
                            optionFilterProp="children"
                            filterOption={(input, option) =>
                                (option?.label ?? "")
                                    .toLowerCase()
                                    .includes(input.toLowerCase())
                            }
                            options={languages?.map(({ code, name }) => ({
                                label: `${name} (${code.toUpperCase()})`,
                                value: code,
                            }))}
                        />
                    </Form.Item>

                    <Divider />

                    <Form.Item style={{ marginBottom: 0 }}>
                        <Space style={{ width: "100%", justifyContent: "flex-end" }}>
                            <Button onClick={handleCloseModal} size="large">
                                Cancel
                            </Button>
                            <Button
                                type="primary"
                                htmlType="submit"
                                icon={<SaveOutlined />}
                                size="large"
                                loading={createMutation.isPending || updateMutation.isPending}
                            >
                                {editingRecord ? "Update" : "Save"}
                            </Button>
                        </Space>
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    );
};