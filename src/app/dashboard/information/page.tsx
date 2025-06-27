"use client";

import React, { useEffect, useState } from 'react';
import { Select, Table, Button, Space, Checkbox, Tag, InputNumber, Typography, Radio, Card, Modal, Form, Input, Upload, Row, Col, Image, message } from 'antd';
import { EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { useHasHydrated } from "../../../hooks/useHydrated";
import "../../../styles/base.css";
import dayjs from 'dayjs';
import { UploadOutlined, FileTextOutlined, PictureOutlined, BellOutlined } from '@ant-design/icons';
import { useMutation } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { toast, Bounce } from 'react-toastify';
import "react-toastify/dist/ReactToastify.css";
import { PlusIcon } from "../../../components/icons/PlusIcon";
import { FaTrash } from "react-icons/fa";
import { RiEdit2Fill } from "react-icons/ri";

const { Option } = Select;
const { TextArea } = Input;
const { Text } = Typography;

interface InformationRecord {
    id: number;
    title: string;
    notes: string;
    imageUrl?: string;
    signedImageUrl?: string;
    createdBy: string;
    createdAt: string;
    updatedAt: string;
}

export default function InformationNotes() {
    const hasHydrated = useHasHydrated();
    let isMobile = typeof window !== 'undefined' && window.innerWidth <= 768;
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [form] = Form.useForm();
    const { data } = useSession();
    const [informationList, setInformationList] = useState<InformationRecord[]>([]);
    const [editRecordData, setEditRecordData] = useState<InformationRecord | null>(null);
    const [originalInformationList, setOriginalInformationList] = useState<InformationRecord[]>([]);
    const [loadingData, setLoadingData] = useState(true);
    const [fileList, setFileList] = useState([]);
    const [submitting, setSubmitting] = useState(false);
    let Url = process.env.NEXT_PUBLIC_BACKEND_URL;
    let role = data?.user?.Roles?.[0];

    const columns = [
        {
            title: 'Title',
            dataIndex: 'title',
            key: 'title',
            width: 200,
        },
        {
            title: 'Notes',
            dataIndex: 'notes',
            key: 'notes',
            render: (text: string, record: InformationRecord) => {
                return (
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                        <div style={{ flex: 1 }}>
                            <div style={{
                                wordBreak: 'break-word',
                                whiteSpace: 'normal',
                                lineHeight: '1.5',
                                marginBottom: record.signedImageUrl ? '8px' : '0'
                            }}>
                                {text}
                            </div>
                            {record.signedImageUrl && (
                                <div style={{ marginTop: '8px' }}>
                                    <Image
                                        src={record.signedImageUrl}
                                        alt="Information attachment"
                                        width={60}
                                        height={60}
                                        style={{
                                            objectFit: 'cover',
                                            borderRadius: '6px',
                                            border: '1px solid #d9d9d9'
                                        }}
                                        preview={{
                                            mask: (
                                                <div style={{
                                                    background: 'rgba(0,0,0,0.6)',
                                                    color: 'white',
                                                    fontSize: '12px',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    height: '100%'
                                                }}>
                                                    <PictureOutlined />
                                                </div>
                                            )
                                        }}
                                    />
                                </div>
                            )}
                        </div>
                    </div>
                );
            },
        },
        {
            title: 'Created By',
            dataIndex: 'createdBy',
            key: 'createdBy',
            width: 150,
        },
        {
            title: 'Created On',
            dataIndex: 'createdAt',
            key: 'createdAt',
            width: 150,
            render: (date: string) => {
                if (!date) return 'N/A';
                return new Date(date).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                });
            }
        },
        ...(role === 'Admin' ? [{
            title: 'Action',
            key: 'actions',
            width: 120,
            render: (_: any, record: InformationRecord) => (
                <Space size="small" style={{ display: 'flex', flexDirection: 'row', alignItems: 'center' }}>
                    <Button
                        type="text"
                        icon={<RiEdit2Fill />}
                        onClick={() => handleEdit(record)}
                        size="small"
                        className='customEditButton'
                    />
                    <Button
                        type="text"
                        danger
                        icon={<FaTrash />}
                        onClick={() => handleDelete(record)}
                        size="small"
                        className='customDeleteButton'
                    />
                </Space>
            ),
        }] : [])
    ];

    const fetchInformation = () => {
        if (!data?.user?.backendTokens?.at) {
            setLoadingData(false);
            return;
        }

        fetch(`${Url}/api/v1/uploads/information`, {
            headers: { Authorization: `Bearer ${data?.user.backendTokens.at}` },
        })
            .then(async (response) => {
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                const json = await response.json();
                const responseData = json.data || json;

                setOriginalInformationList(responseData);
                setInformationList(responseData);
                setLoadingData(false);
            })
            .catch((error) => {
                setLoadingData(false);
                console.warn("Error fetching information:", error);
                message.error('Failed to load information notes');
            });
    };

    useEffect(() => {
        if (data?.user !== undefined) {
            fetchInformation();
        }
    }, [data]);

    const handleEdit = (record: InformationRecord) => {
        setEditRecordData(record);
        form.setFieldsValue({
            title: record.title,
            notes: record.notes,
        });
        if (record.signedImageUrl) {
            setFileList([{
                uid: '-1',
                name: 'existing-image',
                status: 'done',
                url: record.signedImageUrl,
            }]);
        }
        setIsModalOpen(true);
    }

    const handleDelete = (record: InformationRecord) => {
        Modal.confirm({
            title: 'Delete Information Note',
            content: 'Are you sure you want to delete this information note?',
            okText: 'Yes, Delete',
            okType: 'danger',
            cancelText: 'Cancel',
            onOk: async () => {
                try {
                    const response = await fetch(`${Url}/api/v1/uploads/information/${record.id}`, {
                        method: 'DELETE',
                        headers: {
                            Authorization: `Bearer ${data?.user.backendTokens.at}`,
                            'Content-Type': 'application/json'
                        },
                    });

                    if (response.ok) {
                        message.success('Information note deleted successfully');
                        fetchInformation(); // Refresh the list
                    } else {
                        throw new Error('Failed to delete');
                    }
                } catch (error) {
                    console.error('Delete error:', error);
                    message.error('Failed to delete information note');
                }
            },
        });
    }

    const handleModalCancel = () => {
        setIsModalOpen(false);
        setEditRecordData(null);
        form.resetFields();
        setFileList([]);
    };

    const handleFormSubmit = async (values) => {
        setSubmitting(true);
        try {
            const formData = new FormData();
            formData.append('title', values.title);
            formData.append('notes', values.notes);
            formData.append('createdBy', data?.user?.firstName !== null && data?.user?.firstName + " " + data?.user?.lastName || 'Admin');

            if (fileList.length > 0 && fileList[0].originFileObj) {
                formData.append('file', fileList[0].originFileObj);
            }

            const url = editRecordData
                ? `${Url}/api/v1/uploads/information/${editRecordData.id}`
                : `${Url}/api/v1/uploads/information`;

            const method = editRecordData ? 'PUT' : 'POST';

            const response = await fetch(url, {
                method,
                headers: {
                    Authorization: `Bearer ${data?.user.backendTokens.at}`,
                },
                body: formData,
            });

            if (response.ok) {
                message.success(editRecordData ? 'Information note updated successfully!' : 'Information note created successfully!');
                handleModalCancel();
                fetchInformation();
            } else {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to save information note');
            }
        } catch (error) {
            console.error('Error submitting form:', error);
            message.error(error.message || 'Failed to save information note. Please try again.');
        } finally {
            setSubmitting(false);
        }
    };

    const uploadProps = {
        fileList,
        onChange: ({ fileList: newFileList }) => setFileList(newFileList),
        beforeUpload: (file) => {
            const isImage = file.type.startsWith('image/');
            if (!isImage) {
                message.error('You can only upload image files!');
                return false;
            }
            const isLt5M = file.size / 1024 / 1024 < 5;
            if (!isLt5M) {
                message.error('Image must be smaller than 5MB!');
                return false;
            }
            return false; // Prevent automatic upload
        },
        onRemove: () => {
            setFileList([]);
        },
        maxCount: 1,
    };

    const MobileCard = ({ record, index }) => {
        const isEvenIndex = index % 2 === 0;

        const formatDate = (dateString) => {
            if (!dateString) return 'N/A';
            const date = new Date(dateString);
            return date.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        };

        const imageUrl = record.signedImageUrl || record.imageUrl;

        return (
            <Card
                size="small"
                style={{
                    marginBottom: '12px',
                    backgroundColor: isEvenIndex ? '#e6f4ff' : '#f5f5f5',
                    border: isEvenIndex ? '1px solid #91caff' : '1px solid #d9d9d9'
                }}
                bodyStyle={{ padding: '16px' }}
            >
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {/* Header with actions */}
                    <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', position: 'absolute', right: '0.5rem' }}>
                        {role === "Admin" && (
                            <Space size="small">
                                <Button
                                    type="text"
                                    icon={<EditOutlined />}
                                    onClick={() => handleEdit(record)}
                                    size="small"
                                    className='customEditButton'
                                />
                                <Button
                                    type="text"
                                    danger
                                    icon={<DeleteOutlined />}
                                    onClick={() => handleDelete(record)}
                                    size="small"
                                    className='customDeleteButton'
                                />
                            </Space>
                        )}
                    </div>

                    {/* Title */}
                    <div style={{
                        fontSize: '16px',
                        fontWeight: '600',
                        color: '#262626',
                        marginBottom: '4px'
                    }}>
                        {record.title}
                    </div>

                    {/* Notes content */}
                    <div>
                        <div style={{
                            wordBreak: 'break-word',
                            whiteSpace: 'normal',
                            lineHeight: '1.5',
                            fontSize: '14px',
                            color: '#595959',
                            marginBottom: imageUrl ? '12px' : '0'
                        }}>
                            {record.notes}
                        </div>

                        {/* Image */}
                        {imageUrl && (
                            <div style={{
                                display: 'flex',
                                justifyContent: 'flex-start',
                                marginBottom: '8px'
                            }}>
                                <Image
                                    src={imageUrl}
                                    alt="Information attachment"
                                    width={80}
                                    height={80}
                                    style={{
                                        objectFit: 'cover',
                                        borderRadius: '8px',
                                        border: '1px solid #d9d9d9'
                                    }}
                                    preview={{
                                        mask: (
                                            <div style={{
                                                background: 'rgba(0,0,0,0.6)',
                                                color: 'white',
                                                fontSize: '14px',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                height: '100%'
                                            }}>
                                                <PictureOutlined />
                                            </div>
                                        )
                                    }}
                                />
                            </div>
                        )}
                    </div>

                    {/* Footer with creation info */}
                    <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        paddingTop: '8px',
                        borderTop: '1px solid #f0f0f0'
                    }}>
                        <div style={{ fontSize: '12px', color: '#8c8c8c', fontStyle: 'italic' }}>
                            Created by: {record.createdBy}
                        </div>
                        <div style={{ fontSize: '12px', color: '#8c8c8c', fontStyle: 'italic' }}>
                            {formatDate(record.createdAt)}
                        </div>
                    </div>
                </div>
            </Card>
        );
    };

    const searchNotes = (e: any) => {
        const searchTerm = e.target.value.toLowerCase().trim();

        if (searchTerm === '') {
            setInformationList(originalInformationList);
        } else {
            const filteredRecords = originalInformationList.filter((item) =>
                item?.notes?.toLowerCase().includes(searchTerm) ||
                item?.title?.toLowerCase().includes(searchTerm) ||
                item?.createdBy?.toLowerCase().includes(searchTerm)
            );
            setInformationList(filteredRecords);
        }
    }

    const createNotes = () => {
        form.resetFields();
        setEditRecordData(null);
        setFileList([]);
        setIsModalOpen(true);
    };

    return (
        <>
            <div className={`HandoverMainWrapper flex h-full w-full flex-col justify-start gap-4 overflow-y-auto ${isMobile ? 'p-4' : 'p-6'}`}>
                <div className="flex w-full flex-col gap-4">
                    <div className="customSearchWrapper">
                        <Card className="w-full customCards">
                            <div className="searchInputWidth">
                                <Input placeholder='Search Information Notes' className='w-full rounded-md p-2' onChange={searchNotes} />
                            </div>
                        </Card>
                    </div>
                    <div className="flex w-full flex-col items-end gap-4">
                        <div className="w-full">
                            {isMobile ? (
                                <div>
                                    {informationList.map((record, i) => (
                                        <MobileCard key={record.id || i} record={record} index={i} />
                                    ))}
                                </div>
                            ) : (
                                <>
                                    <Table
                                        columns={columns}
                                        dataSource={informationList}
                                        className='customHandoverTable'
                                        pagination={false}
                                        bordered
                                        size="middle"
                                        loading={loadingData}
                                        rowKey="id"
                                    />
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Add/Edit Information Modal */}
            <Modal
                title={
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        fontSize: isMobile ? '16px' : '18px',
                        fontWeight: '600'
                    }}>
                        <FileTextOutlined style={{ color: '#1890ff' }} />
                        {editRecordData ? 'Edit Information Note' : 'Add New Information Note'}
                    </div>
                }
                open={isModalOpen}
                onCancel={handleModalCancel}
                footer={null}
                width={isMobile ? '95%' : 520}
                style={{
                    top: isMobile ? 20 : 100,
                    maxHeight: isMobile ? 'calc(100vh - 40px)' : 'auto'
                }}
                bodyStyle={{
                    padding: isMobile ? '16px' : '5px',
                    maxHeight: isMobile ? 'calc(100vh - 160px)' : '70vh',
                }}
                destroyOnClose={true}
                className='handoverModal'
            >
                <Form
                    form={form}
                    layout="vertical"
                    onFinish={handleFormSubmit}
                    size={isMobile ? 'middle' : 'large'}
                    style={{ marginTop: '16px' }}
                >
                    <Row gutter={[16, 0]}>
                        <Col span={24}>
                            <Form.Item
                                label={
                                    <span style={{
                                        fontSize: isMobile ? '14px' : '15px',
                                        fontWeight: '500',
                                        color: '#262626'
                                    }}>
                                        Title
                                    </span>
                                }
                                name="title"
                                rules={[
                                    { required: true, message: 'Please enter a title' },
                                    { max: 100, message: 'Title cannot exceed 100 characters' }
                                ]}
                            >
                                <Input
                                    placeholder="Enter information title"
                                    style={{
                                        borderRadius: '8px',
                                        fontSize: isMobile ? '14px' : '15px'
                                    }}
                                />
                            </Form.Item>
                        </Col>

                        <Col span={24}>
                            <Form.Item
                                label={
                                    <span style={{
                                        fontSize: isMobile ? '14px' : '15px',
                                        fontWeight: '500',
                                        color: '#262626'
                                    }}>
                                        Notes
                                    </span>
                                }
                                name="notes"
                                rules={[
                                    { required: true, message: 'Please enter your notes' },
                                    { max: 1000, message: 'Notes cannot exceed 1000 characters' }
                                ]}
                            >
                                <TextArea
                                    placeholder="Enter your notes here..."
                                    rows={isMobile ? 4 : 5}
                                    style={{
                                        borderRadius: '8px',
                                        fontSize: isMobile ? '14px' : '15px',
                                        resize: 'none'
                                    }}
                                    showCount
                                    maxLength={1000}
                                />
                            </Form.Item>
                        </Col>

                        <Col span={24}>
                            <Form.Item
                                label={
                                    <span style={{
                                        fontSize: isMobile ? '14px' : '15px',
                                        fontWeight: '500',
                                        color: '#262626'
                                    }}>
                                        Image (Optional)
                                    </span>
                                }
                                name="image"
                            >
                                <Upload
                                    {...uploadProps}
                                    listType="picture-card"
                                    className="note-upload"
                                    style={{
                                        width: '100%'
                                    }}
                                >
                                    {fileList.length === 0 && (
                                        <div style={{
                                            display: 'flex',
                                            flexDirection: 'column',
                                            alignItems: 'center',
                                            padding: isMobile ? '16px 8px' : '20px 12px'
                                        }}>
                                            <UploadOutlined style={{
                                                fontSize: isMobile ? '20px' : '24px',
                                                color: '#8c8c8c',
                                                marginBottom: '8px'
                                            }} />
                                            <span style={{
                                                fontSize: isMobile ? '12px' : '14px',
                                                color: '#8c8c8c',
                                                textAlign: 'center'
                                            }}>
                                                Upload Image
                                                <br />
                                                <span style={{ fontSize: isMobile ? '10px' : '12px' }}>
                                                    Max 5MB
                                                </span>
                                            </span>
                                        </div>
                                    )}
                                </Upload>
                            </Form.Item>
                        </Col>
                    </Row>

                    <div className='bottomActionSection'>
                        <Button
                            type="primary"
                            htmlType="submit"
                            loading={submitting}
                            style={{
                                height: '42px',
                                borderRadius: '8px',
                                fontWeight: '500',
                            }}
                        >
                            {submitting ? 'Saving...' : (editRecordData ? 'Update' : 'Add Note')}
                        </Button>
                    </div>
                </Form>
            </Modal>

            {/* Floating Add Button */}
            <div className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-50">
                <Button
                    onClick={() => createNotes()}
                    className="group relative flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 bg-white/50 backdrop-blur-md hover:bg-white/60 border border-white/20 text-gray-700 hover:text-gray-900 rounded-full shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105 focus:outline-none focus:ring-4 focus:ring-white/30"
                    aria-label="Create new information note"
                >
                    <PlusIcon className="w-6 h-6 sm:w-7 sm:h-7 opacity-100" />
                    <div className="absolute right-full mr-3 px-3 py-2 bg-gray-900 text-white text-sm rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap">
                        Add Information Note
                        <div className="absolute top-1/2 left-full w-0 h-0 border-l-4 border-l-gray-900 border-y-4 border-y-transparent transform -translate-y-1/2"></div>
                    </div>
                </Button>
            </div>

            <style jsx>{`
                .note-upload .ant-upload-select {
                    width: 100% !important;
                    height: auto !important;
                    min-height: ${isMobile ? '80px' : '100px'} !important;
                }
                
                .note-upload .ant-upload-list-picture-card .ant-upload-list-item {
                    width: 100% !important;
                    height: auto !important;
                }
                
                @media (max-width: 768px) {
                    .ant-modal {
                        margin: 0 !important;
                        max-width: none !important;
                    }
                    
                    .ant-form-item-label > label {
                        height: auto !important;
                    }
                }
            `}</style>
        </>
    )
}