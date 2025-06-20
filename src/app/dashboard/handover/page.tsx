"use client";

import React, { useState } from 'react';
import { Table, Button, Space, Card, Modal, Form, Input, DatePicker, Upload, Row, Col, Divider, Image } from 'antd';
import { EditOutlined, DeleteOutlined } from '@ant-design/icons';
import {
    useCompanyControllerGetCompany,
} from "../../../lib/client/api";
import { useSearchParams } from "next/navigation";
import { useSocketContext } from "../../../context/SocketContextProvider";
import { useHasHydrated } from "../../../hooks/useHydrated";
import "../../../styles/base.css";
import dayjs from 'dayjs';
import { UploadOutlined, FileTextOutlined, CalendarOutlined, PictureOutlined } from '@ant-design/icons';
import { useMutation } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { toast, Bounce } from 'react-toastify';
import "react-toastify/dist/ReactToastify.css";
import { PlusIcon } from "../../../components/icons/PlusIcon";
import { FaTrash } from "react-icons/fa";
import { RiEdit2Fill } from "react-icons/ri";

interface uploadHandoverNoteData {
    note: string;
    startDate: string;
    endDate: string;
    imageUrl: File;
    createdBy: string;
}

export default function Handover() {
    const hasHydrated = useHasHydrated();
    const params = useSearchParams();
    const { emitSendTemplate } = useSocketContext();
    const { data: companyData } = useCompanyControllerGetCompany();
    let isMobile = typeof window !== 'undefined' && window.innerWidth <= 768;
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [form] = Form.useForm();
    const { data } = useSession();

    const tableData = [
        {
            key: '1',
            sno: 1,
            notes: 'This is a note',
            by: 'John Doe',
            validity: '24/04/2025 - 24/09/2025',
            imageUrl: 'https://images.unsplash.com/photo-1557804506-669a67965ba0?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1000&q=80',
        },
        {
            key: '2',
            sno: 2,
            notes: 'Important project deadline reminder',
            by: 'Jane Smith',
            validity: '01/01/2025 - 31/12/2025',
        },
        {
            key: '3',
            sno: 3,
            notes: "Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry's standard dummy text ever since the 1500s, when an unknown printer took a galley of type and scrambled it to make a type specimen book. It has survived not only five centuries, but also the leap into electronic typesetting, remaining essentially unchanged. It was popularised in the 1960s with the release of Letraset sheets containing Lorem Ipsum passages, and more recently with desktop publishing software like Aldus PageMaker including versions of Lorem Ipsum",
            by: 'Mike Johnson',
            validity: '15/05/2024 - 15/06/2024',
            imageUrl: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1000&q=80',
        },
        {
            key: '4',
            sno: 4,
            notes: 'Security protocol updates for all team members',
            by: 'Sarah Wilson',
            validity: '01/06/2025 - 01/12/2025',
        },
        {
            key: '5',
            sno: 5,
            notes: 'Budget review and allocation for Q3',
            by: 'David Brown',
            validity: '10/03/2024 - 10/04/2024',
        }
    ];

    const isRecordActive = (validity) => {
        const [startDateStr, endDateStr] = validity.split(' - ');
        const [startDay, startMonth, startYear] = startDateStr.split('/');
        const [endDay, endMonth, endYear] = endDateStr.split('/');

        const startDate = new Date(startYear, startMonth - 1, startDay);
        const endDate = new Date(endYear, endMonth - 1, endDay);
        const today = new Date();

        return today >= startDate && today <= endDate;
    };

    const columns = [
        {
            title: 'Notes',
            dataIndex: 'notes',
            key: 'notes',
            render: (text, record) => {
                const isActive = isRecordActive(record.validity);
                const dotColor = isActive ? '#52c41a' : '#ff4d4f';
                const glowColor = isActive ? 'rgba(82, 196, 26, 0.6)' : 'rgba(255, 77, 79, 0.6)';

                return (
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                        <span
                            style={{
                                width: '8px',
                                height: '8px',
                                borderRadius: '50%',
                                backgroundColor: dotColor,
                                boxShadow: `0 0 6px 2px ${glowColor}`,
                                display: 'inline-block',
                                marginTop: '6px',
                                flexShrink: 0
                            }}
                        ></span>
                        <div style={{ flex: 1 }}>
                            <div style={{
                                wordBreak: 'break-word',
                                whiteSpace: 'normal',
                                lineHeight: '1.5',
                                marginBottom: record.imageUrl ? '8px' : '0'
                            }}>
                                {text}
                            </div>
                            {record.imageUrl && (
                                <div style={{ marginTop: '8px' }}>
                                    <Image
                                        src={record.imageUrl}
                                        alt="Note attachment"
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
            title: 'Added By',
            dataIndex: 'by',
            key: 'by',
            width: 150,
        },
        {
            title: 'Validity',
            dataIndex: 'validity',
            key: 'validity',
            width: 200,
        },
        {
            title: 'Actions',
            key: 'actions',
            width: 150,
            render: (_, record) => (
                <Space size="middle">
                    <Button
                        type="link"
                        icon={<RiEdit2Fill />}
                        onClick={() => handleEdit(record)}
                        size="small"
                        className='customEditButton'
                    />
                    <Button
                        type="link"
                        danger
                        icon={<FaTrash />}
                        onClick={() => handleDelete(record)}
                        size="small"
                        className='customDeleteButton'
                    />
                </Space>
            ),
        },
    ];

    const handleEdit = (record) => {
        console.log('Edit clicked for:', record);
    };

    const handleDelete = (record) => {
        console.log('Delete clicked for:', record);
    };

    const createNotes = () => {
        setIsModalOpen(true);
    }

    const uploadHandoverNote = useMutation({
        mutationFn: async (formData: FormData) => {
            const baseUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';
            const endpoint = `${baseUrl}/api/v1/uploads/handover-note`;

            const response = await fetch(endpoint, {
                method: 'POST',
                body: formData,
                headers: {
                    Authorization: `Bearer ${data?.user.backendTokens.at}`,
                },
            });

            console.info("responseresponseresponse", response);

            if (!response.ok) {
                const errorText = await response.text();
                let errorMessage = "Upload failed";

                try {
                    const errorJson = JSON.parse(errorText);
                    errorMessage = errorJson.message || errorMessage;
                } catch {
                    errorMessage = errorText || errorMessage;
                }

                throw new Error(errorMessage);
            }

            return response.json();
        },

        onSuccess: (data) => {
            toast.success('Handover note uploaded successfully!', {
                position: "bottom-right",
                autoClose: 5000,
                hideProgressBar: false,
                closeOnClick: false,
                pauseOnHover: true,
                draggable: true,
                progress: undefined,
                theme: "colored",
                transition: Bounce,
            });
        },

        onError: (error: Error) => {
            const shortMessage = error.message.split('\n')[0];

            toast.error(`Upload failed: ${shortMessage}`, {
                position: "bottom-right",
                autoClose: 5000,
                hideProgressBar: false,
                closeOnClick: false,
                pauseOnHover: true,
                draggable: true,
                progress: undefined,
                theme: "colored",
                transition: Bounce,
            });

            console.error('Handover note upload error:', error);
        },
    });

    const handleOk = (dataValue: uploadHandoverNoteData) => {
        const formData = new FormData();

        if (dataValue.imageUrl?.[0]) {
            formData.append('file', dataValue.imageUrl[0]);
        }

        formData.append('note', dataValue.note);
        formData.append('startDate', dayjs(dataValue.startDate).format('YYYY-MM-DD'));
        formData.append('endDate', dayjs(dataValue.endDate).format('YYYY-MM-DD'));
        formData.append('createdBy', dataValue.createdBy || data?.user?.name || 'Unknown User');

        uploadHandoverNote.mutate(formData);
        setIsModalOpen(false);
        form.resetFields();
    };

    const handleCancel = () => {
        setIsModalOpen(false);
        form.resetFields();
    };

    // Mobile Card Component
    const MobileCard = ({ record }) => {
        const isActive = isRecordActive(record.validity);

        return (
            <Card
                size="small"
                style={{ marginBottom: '12px' }}
                bodyStyle={{ padding: '16px' }}
                className={isActive ? 'active-card' : 'inactive-card'}
            >
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span
                                style={{
                                    width: '8px',
                                    height: '8px',
                                    borderRadius: '50%',
                                    backgroundColor: isActive ? '#52c41a' : '#ff4d4f',
                                    display: 'inline-block',
                                }}
                                className='glowDot'
                            ></span>
                            <span style={{
                                fontSize: '12px',
                                color: isActive ? '#52c41a' : '#ff4d4f',
                                fontWeight: '500'
                            }}>
                                {isActive ? 'Active' : 'Inactive'}
                            </span>
                        </div>
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
                    </div>

                    {/* Notes and Image */}
                    <div>
                        <div style={{
                            wordBreak: 'break-word',
                            whiteSpace: 'normal',
                            lineHeight: '1.5',
                            fontSize: '14px',
                            marginBottom: record.imageUrl ? '12px' : '0'
                        }}>
                            {record.notes}
                        </div>
                        
                        {record.imageUrl && (
                            <div style={{ 
                                display: 'flex', 
                                justifyContent: 'flex-start',
                                marginBottom: '8px' 
                            }}>
                                <Image
                                    src={record.imageUrl}
                                    alt="Note attachment"
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

                    {/* By and Validity */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                        <div>
                            <div style={{ fontSize: '14px', fontStyle: 'italic' }}>
                                {record.by}
                            </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: '14px', fontStyle: 'italic' }}>
                                {record.validity}
                            </div>
                        </div>
                    </div>
                </div>
            </Card>
        );
    };

    if (hasHydrated)
        return (
            <>
                <div className={`HandoverMainWrapper flex h-full w-full flex-col justify-start gap-4 overflow-y-auto ${isMobile ? 'p-4' : 'p-6'}`}>
                    <div className="flex w-full flex-col gap-4">
                        <div className="customSearchWrapper">
                            <Card className="w-full customCards">
                                <div className="searchInputWidth">
                                    <Input placeholder='Search Handover Notes' className='w-full rounded-md p-2' />
                                </div>
                            </Card>
                        </div>
                        <div className="flex w-full flex-col items-end gap-4">
                            <div className="w-full">
                                {isMobile ? (
                                    <div>
                                        {tableData.map((record) => (
                                            <MobileCard key={record.key} record={record} />
                                        ))}
                                    </div>
                                ) : (
                                    <>
                                        <Table
                                            columns={columns}
                                            dataSource={tableData}
                                            className='customHandoverTable'
                                            pagination={false}
                                            bordered
                                            size="middle"
                                        />
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
                <div className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-50">
                    <Button
                        onClick={() => createNotes()}
                        className="group relative flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 bg-white/50 backdrop-blur-md hover:bg-white/60 border border-white/20 text-gray-700 hover:text-gray-900 rounded-full shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105 focus:outline-none focus:ring-4 focus:ring-white/30"
                        aria-label="Create new template"
                    >
                        <PlusIcon className="w-6 h-6 sm:w-7 sm:h-7 opacity-100" />
                        <div className="absolute right-full mr-3 px-3 py-2 bg-gray-900 text-white text-sm rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap">
                            Add Notes
                            <div className="absolute top-1/2 left-full w-0 h-0 border-l-4 border-l-gray-900 border-y-4 border-y-transparent transform -translate-y-1/2"></div>
                        </div>
                    </Button>
                </div>
                <Modal
                    title={
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            fontSize: '18px',
                            fontWeight: '600'
                        }}>
                            <FileTextOutlined style={{ color: '#1890ff' }} />
                            Add New Note
                        </div>
                    }
                    open={isModalOpen}
                    footer={false}
                    onCancel={handleCancel}
                    className='handoverModal'
                    width="90%"
                    style={{
                        maxWidth: '800px',
                        top: '20px'
                    }}
                    bodyStyle={{
                        maxHeight: '70vh',
                        overflowY: 'auto',
                        padding: '5px 8px'
                    }}
                    okButtonProps={{
                        size: 'large',
                        style: {
                            background: 'linear-gradient(135deg, #1890ff 0%, #096dd9 100%)',
                            border: 'none',
                            borderRadius: '8px',
                            fontWeight: '500'
                        }
                    }}
                    cancelButtonProps={{
                        size: 'large',
                        style: {
                            borderRadius: '8px',
                            fontWeight: '500'
                        }
                    }}
                >
                    <Form
                        layout="vertical"
                        form={form}
                        requiredMark={false}
                        style={{ marginTop: '16px' }}
                        onFinish={handleOk}
                    >
                        {/* Note Section */}
                        <div style={{ marginBottom: '24px' }}>
                            <Form.Item
                                name="note"
                                label={
                                    <div style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '6px',
                                        fontSize: '15px',
                                        fontWeight: '500',
                                        color: '#262626'
                                    }}>
                                        <FileTextOutlined />
                                        Note Content
                                    </div>
                                }
                                rules={[{ required: true, message: 'Please enter your note content' }]}
                            >
                                <Input.TextArea
                                    rows={5}
                                    placeholder="Write your note here... Share your thoughts, ideas, or important information."
                                    style={{
                                        borderRadius: '8px',
                                        fontSize: '14px',
                                        resize: 'vertical',
                                        minHeight: '120px'
                                    }}
                                    showCount
                                    maxLength={1000}
                                />
                            </Form.Item>
                        </div>

                        <Divider style={{ margin: '20px 0' }}>
                            <span style={{ color: '#8c8c8c', fontSize: '13px' }}>Additional Details</span>
                        </Divider>

                        {/* Responsive Grid */}
                        <Row gutter={[16, 16]}>
                            <Col xs={24} sm={12} md={8}>
                                <Form.Item
                                    name="startDate"
                                    label={
                                        <div style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '6px',
                                            fontSize: '14px',
                                            fontWeight: '500',
                                            color: '#262626'
                                        }}>
                                            <CalendarOutlined style={{ color: '#52c41a' }} />
                                            Start Date
                                        </div>
                                    }
                                    rules={[{ required: true, message: 'Please select start date' }]}
                                >
                                    <DatePicker
                                        style={{
                                            width: '100%',
                                            height: '42px',
                                            borderRadius: '8px'
                                        }}
                                        placeholder="Select start date"
                                        format="DD/MM/YYYY"
                                    />
                                </Form.Item>
                            </Col>

                            <Col xs={24} sm={12} md={8}>
                                <Form.Item
                                    name="endDate"
                                    label={
                                        <div style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '6px',
                                            fontSize: '14px',
                                            fontWeight: '500',
                                            color: '#262626'
                                        }}>
                                            <CalendarOutlined style={{ color: '#faad14' }} />
                                            End Date
                                        </div>
                                    }
                                    rules={[{ required: true, message: 'Please select end date' }]}
                                >
                                    <DatePicker
                                        style={{
                                            width: '100%',
                                            height: '42px',
                                            borderRadius: '8px'
                                        }}
                                        placeholder="Select end date"
                                        format="DD/MM/YYYY"
                                    />
                                </Form.Item>
                            </Col>

                            <Col xs={24} sm={24} md={8}>
                                <Form.Item
                                    name="imageUrl"
                                    label={
                                        <div style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '6px',
                                            fontSize: '14px',
                                            fontWeight: '500',
                                            color: '#262626'
                                        }}>
                                            <PictureOutlined style={{ color: '#722ed1' }} />
                                            Attach Image
                                        </div>
                                    }
                                    valuePropName="fileList"
                                    getValueFromEvent={e => e?.fileList}
                                >
                                    <Upload
                                        name="image"
                                        listType="picture-card"
                                        beforeUpload={() => false}
                                        accept="image/*"
                                        maxCount={1}
                                        style={{ width: '100%', height: '42px' }}
                                    >
                                        <div style={{
                                            display: 'flex',
                                            flexDirection: 'row',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            padding: '8px',
                                            minHeight: '20px',
                                        }}>
                                            <UploadOutlined style={{ fontSize: '20px', color: '#722ed1' }} />
                                            <div style={{
                                                marginTop: '4px',
                                                fontSize: '12px',
                                                color: '#8c8c8c',
                                                textAlign: 'center'
                                            }}>
                                                Click to Upload
                                            </div>
                                        </div>
                                    </Upload>
                                </Form.Item>
                            </Col>
                        </Row>

                        {/* Help Text */}
                        <div style={{
                            marginTop: '16px',
                            padding: '12px',
                            background: '#f6ffed',
                            border: '1px solid #b7eb8f',
                            borderRadius: '8px',
                            fontSize: '13px',
                            color: '#389e0d'
                        }}>
                            💡 <strong>Tip:</strong> Add meaningful dates and attach relevant images to make your notes more organized and memorable.
                        </div>

                        <div className='bottomActionSection'>
                            <Form.Item>
                                <Button
                                    type="primary" 
                                    htmlType="submit"
                                    style={{
                                        height: '42px',
                                        borderRadius: '8px',
                                        fontWeight: '500',
                                    }}>
                                    Add Note
                                </Button>
                            </Form.Item>
                        </div>
                    </Form>
                </Modal>
            </>
        );

    return <div></div>;
}