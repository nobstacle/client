"use client";

import React, { useEffect, useState } from 'react';
import { Table, Button, Space, Card, Modal, Form, Input, Pagination, DatePicker, Upload, Row, Col, Divider, Image, message } from 'antd';
import { EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { useSearchParams } from "next/navigation";
import { useHasHydrated } from "../../../hooks/useHydrated";
import { DashboardPageSkeleton } from "../../../components/DashboardPageSkeleton";
import "../../../styles/base.css";
import dayjs from 'dayjs';
import { UploadOutlined, FileTextOutlined, CalendarOutlined, PictureOutlined } from '@ant-design/icons';
import { useMutation } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
// import { toast, Bounce } from 'react-toastify';
import "react-toastify/dist/ReactToastify.css";
import { PlusIcon } from "../../../components/icons/PlusIcon";
import { FaTrash } from "react-icons/fa";
import { RiEdit2Fill } from "react-icons/ri";
import isSameOrAfter from 'dayjs/plugin/isSameOrAfter';
dayjs.extend(isSameOrAfter);

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
    let isMobile = typeof window !== 'undefined' && window.innerWidth <= 768;
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [form] = Form.useForm();
    const { data } = useSession();
    const [notesList, setNotesList] = useState([]);
    const [editRecordData, setEditRecordData] = useState([]);
    const [originalNotesList, setOriginalNotesList] = useState([]);
    const [loadingData, setLoadingData] = useState(true);
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [totalRecords, setTotalRecords] = useState(0);
    const [startDate, setStartDate] = useState(null);
    let Url = process.env.NEXT_PUBLIC_BACKEND_URL;
    let role = data?.user?.Roles[0];

    const fetchNotes = (page = 1, limit = 10, searchTerm: any) => {
        setLoadingData(true);
        fetch(`${Url}/api/v1/uploads/handover-notes?page=${page}&limit=${limit}&search=${searchTerm}`, {
            headers: { Authorization: `Bearer ${data?.user.backendTokens.at}` },
        })
            .then(async (response) => {
                const text = await response.text();
                const json = JSON.parse(text);
                const data = json.data || json;

                // If total count is provided by backend
                setTotalRecords(json.pagination?.totalCount);

                // Sort with active on top
                const sortedData = [...data].sort((a, b) => {
                    const aActive = isRecordActive(a) ? 1 : 0;
                    const bActive = isRecordActive(b) ? 1 : 0;
                    return bActive - aActive;
                });

                setOriginalNotesList(sortedData);
                setNotesList(sortedData);
            })
            .catch((error) => {
                console.warn("Error fetching data:", error);
            })
            .finally(() => {
                setLoadingData(false);
            });
    };

    useEffect(() => {
        if (data?.user !== undefined) {
            fetchNotes(currentPage, pageSize);
        }
    }, [data, currentPage, pageSize]);

    const isRecordActive = (record: any) => {
        if (record) {
            const { startDate, endDate } = record;

            if (!startDate || !endDate) return false;

            const start = new Date(startDate);
            const end = new Date(endDate);
            const today = new Date();

            start.setHours(0, 0, 0, 0);

            end.setHours(23, 59, 59, 999);

            return today >= start && today <= end;
        }
    };

    // Updated function to get record status and colors
    const getRecordStatusAndColors = (record) => {
        if (record) {
            const { startDate, endDate } = record;

            if (!startDate || !endDate) {
                return {
                    status: 'unknown',
                    label: 'Unknown',
                    backgroundColor: '#d9d9d9',
                    textColor: '#666',
                    glowColor: 'rgba(217, 217, 217, 0.6)'
                };
            }

            const start = new Date(startDate);
            const end = new Date(endDate);
            const today = new Date();

            start.setHours(0, 0, 0, 0);
            end.setHours(23, 59, 59, 999);

            if (today >= start && today <= end) {
                // Active
                return {
                    status: 'active',
                    label: 'Active',
                    backgroundColor: '#52c41a',
                    textColor: '#52c41a',
                    glowColor: 'rgba(82, 196, 26, 0.6)'
                };
            } else if (today < start) {
                // Inactive (Future)
                return {
                    status: 'inactive',
                    label: 'Inactive',
                    backgroundColor: '#fa8c16',
                    textColor: '#fa8c16',
                    glowColor: 'rgba(250, 140, 22, 0.6)'
                };
            } else {
                // Expired
                return {
                    status: 'expired',
                    label: 'Expired',
                    backgroundColor: '#ff4d4f',
                    textColor: '#ff4d4f',
                    glowColor: 'rgba(255, 77, 79, 0.6)'
                };
            }
        }

        return {
            status: 'unknown',
            label: 'Unknown',
            backgroundColor: '#d9d9d9',
            textColor: '#666',
            glowColor: 'rgba(217, 217, 217, 0.6)'
        };
    };


    const columns = [
        {
            title: 'Notes',
            dataIndex: 'note',
            key: 'note',
            render: (text, record) => {
                const statusInfo = getRecordStatusAndColors(record);

                return (
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                        <span
                            style={{
                                width: '8px',
                                height: '8px',
                                borderRadius: '50%',
                                backgroundColor: statusInfo.backgroundColor,
                                boxShadow: `0 0 6px 2px ${statusInfo.glowColor}`,
                                display: 'inline-block',
                                marginTop: '6px',
                                flexShrink: 0
                            }}
                        ></span>
                        <div style={{ flex: 1 }}>
                            <div style={{
                                wordBreak: 'break-word',
                                whiteSpace: 'pre-wrap',
                                lineHeight: '1.5',
                                marginBottom: record.signedImageUrl ? '8px' : '0'
                            }}>
                                {text}
                            </div>
                            {record.signedImageUrl && (
                                <div style={{ marginTop: '8px' }}>
                                    <Image
                                        src={record.signedImageUrl}
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
            dataIndex: 'createdBy',
            key: 'createdBy',
            width: 150,
        },
        {
            title: 'Validity',
            dataIndex: 'validity',
            key: 'validity',
            width: 200,
            render: (_, record) => {
                const { startDate, endDate } = record;

                if (!startDate || !endDate) return 'N/A';

                const formattedStart = new Date(startDate).toLocaleDateString('en-IN', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                });

                const formattedEnd = new Date(endDate).toLocaleDateString('en-IN', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                });

                return `${formattedStart} - ${formattedEnd}`;
            },
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
                    {role === 'Admin' && (
                        <Button
                            type="link"
                            danger
                            icon={<FaTrash />}
                            onClick={() => handleDelete(record)}
                            size="small"
                            className='customDeleteButton'
                        />
                    )}
                </Space>
            ),
        },
    ];

    const handleEdit = (record: any) => {
        const processedRecord = {
            ...record,
            startDate: record.startDate ? dayjs(record.startDate) : null,
            endDate: record.endDate ? dayjs(record.endDate) : null,
        };

        setEditRecordData(processedRecord);
        setIsModalOpen(true);
    };

    const handleDelete = async (record: any) => {
        setLoadingData(true);

        try {
            const response = await fetch(`${Url}/api/v1/uploads/handover-note/${record?.id}`, {
                method: 'DELETE',
                headers: {
                    Authorization: `Bearer ${data?.user.backendTokens.at}`,
                    'Content-Type': 'application/json'
                },
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Delete failed: ${errorText}`);
            }

            fetchNotes();
        } catch (error) {
            console.warn("Error deleting handover note:", error);
        } finally {
            setLoadingData(false);
        }
    };

    const createNotes = () => {
        form.resetFields();
        setEditRecordData(null);
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
            message.success('Handover note uploaded!');
            fetchNotes(1, 10, undefined);
        },

        onError: (error: Error) => {
            const shortMessage = error.message.split('\n')[0];
            message.error(`Upload failed: ${shortMessage}`);

            console.error('Handover note upload error:', error);
        },
    });

    const updateHandoverNote = useMutation({
        mutationFn: async (formData: FormData) => {
            const baseUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://nobstacle.com';
            const id = formData.get('id');
            const endpoint = `${baseUrl}/api/v1/uploads/handover-note/${id}`;

            const response = await fetch(endpoint, {
                method: 'PUT',
                body: formData,
                headers: {
                    Authorization: `Bearer ${data?.user.backendTokens.at}`,
                },
            });

            if (!response.ok) {
                const errorText = await response.text();
                let errorMessage = "Update failed";

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
            message.success('Handover note updated!');
            fetchNotes(1, 10, undefined);
            setEditRecordData(null);
        },

        onError: (error: Error) => {
            const shortMessage = error.message.split('\n')[0];
            message.error(`Update failed: ${shortMessage}`);
            console.error('Handover note update error:', error);
        },
    });

    const handleOk = (dataValue: uploadHandoverNoteData) => {
        const formData = new FormData();

        // Handle file upload (only append if there's a new file)
        if (dataValue.imageUrl !== undefined && dataValue.imageUrl?.[0]) {
            const fileItem = dataValue.imageUrl[0];

            if (fileItem.originFileObj) {
                formData.append('file', fileItem.originFileObj);
            }
            else if (fileItem instanceof File) {
                formData.append('file', fileItem);
            }
            else if (fileItem.files && fileItem.files[0]) {
                formData.append('file', fileItem.files[0]);
            }
            else {
                console.error('Unable to extract file from:', fileItem);
            }
        }

        let userInfo = data?.user?.email?.split('@')[0];

        formData.append('note', dataValue.note);
        formData.append('startDate', dayjs(dataValue.startDate).format('YYYY-MM-DD'));
        formData.append('endDate', dayjs(dataValue.endDate).format('YYYY-MM-DD'));
        formData.append('createdBy', userInfo);

        if (editRecordData && editRecordData.id) {
            formData.append('id', editRecordData.id);
        }

        for (let [key, value] of formData.entries()) {
            console.log(key, value);
        }

        if (editRecordData && editRecordData.id) {
            updateHandoverNote.mutate(formData);
        } else {
            uploadHandoverNote.mutate(formData);
        }

        setIsModalOpen(false);
        form.resetFields();
    };

    const handleCancel = () => {
        form.resetFields();
        setEditRecordData(null);
        setIsModalOpen(false);
    };

    const MobileCard = ({ record, index }) => {
        const statusInfo = getRecordStatusAndColors(record);
        const isEvenIndex = index % 2 === 0;

        const imageSrc = record.signedImageUrl || record.imageUrl;
        const validity = `${dayjs(record.startDate).format("DD MMM YYYY")} - ${dayjs(record.endDate).format("DD MMM YYYY")}`;

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
                    {/* Status and Action Buttons */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span
                                style={{
                                    width: '8px',
                                    height: '8px',
                                    borderRadius: '50%',
                                    backgroundColor: statusInfo.backgroundColor,
                                    display: 'inline-block',
                                }}
                                className='glowDot'
                            ></span>
                            <span style={{
                                fontSize: '12px',
                                color: statusInfo.textColor,
                                fontWeight: '500'
                            }}>
                                {statusInfo.label}
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

                    {/* Note Content */}
                    <div>
                        <div style={{
                            wordBreak: 'break-word',
                            whiteSpace: 'pre-wrap',
                            lineHeight: '1.5',
                            fontSize: '14px',
                            marginBottom: imageSrc ? '12px' : '0'
                        }}>
                            {record.note}
                        </div>

                        {imageSrc && (
                            <div style={{
                                display: 'flex',
                                justifyContent: 'flex-start',
                                marginBottom: '8px'
                            }}>
                                <Image
                                    src={imageSrc}
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

                    <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                        <div>
                            <div style={{ fontSize: '12px', fontStyle: 'italic' }}>
                                Created By: {record?.createdBy}
                            </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: '12px', fontStyle: 'italic' }}>
                                {validity}
                            </div>
                        </div>
                    </div>
                </div>
            </Card>
        );
    };

    useEffect(() => {
        if (isModalOpen) {
            if (editRecordData) {
                form.setFieldsValue({
                    note: editRecordData.note || '',
                    startDate: editRecordData.startDate ? dayjs(editRecordData.startDate) : null,
                    endDate: editRecordData.endDate ? dayjs(editRecordData.endDate) : null,
                    imageUrl: [],
                });
            } else {
                form.resetFields();
            }
        }
    }, [editRecordData, isModalOpen, form]);

    const searchNotes = (e: any) => {
        const searchTerm = e.target.value.toLowerCase().trim();

        if (searchTerm === '') {
            fetchNotes(currentPage, pageSize, undefined);
        } else {
            fetchNotes(currentPage, pageSize, searchTerm);
        }
    };

    useEffect(() => {
        const isMobile = window.innerWidth <= 768;
        if (isMobile) {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    }, [currentPage, pageSize]);

    if (hasHydrated)
        return (
            <>
                <div className={`HandoverMainWrapper flex h-full w-full flex-col justify-start gap-4 overflow-y-auto ${isMobile ? 'p-4' : 'p-6'}`}>
                    <div className="flex w-full flex-col gap-4">
                        <div className="customSearchWrapper">
                            <Card className="w-full customCards">
                                <div className="searchInputWidth">
                                    <Input placeholder='Search Handover Notes' className='w-full rounded-md p-2' onChange={searchNotes} />
                                </div>
                            </Card>
                        </div>
                        <div className="flex w-full flex-col items-end gap-4">
                            <div className="w-full">
                                {isMobile ? (
                                    <div>
                                        {notesList.map((record, i) => (
                                            <MobileCard
                                                key={record?.id ?? record?._id ?? i}
                                                record={record}
                                                index={i}
                                            />
                                        ))}
                                        <div className="flex justify-center mt-6">
                                            <Pagination
                                                current={currentPage}
                                                total={totalRecords}
                                                pageSize={pageSize}
                                                onChange={(page, pageSize) => {
                                                    setCurrentPage(page);
                                                    setPageSize(pageSize);
                                                }}
                                                showSizeChanger
                                                pageSizeOptions={['10', '20', '50', '100']}
                                            />
                                        </div>
                                    </div>
                                ) : (
                                    <>
                                        <Table
                                            columns={columns}
                                            dataSource={notesList}
                                            className='customHandoverTable'
                                            pagination={false}
                                            bordered
                                            size="middle"
                                            loading={loadingData}
                                        />
                                        <div className="flex justify-center mt-6">
                                            <Pagination
                                                current={currentPage}
                                                total={totalRecords}
                                                pageSize={pageSize}
                                                onChange={(page, pageSize) => {
                                                    setCurrentPage(page);
                                                    setPageSize(pageSize);
                                                }}
                                                showSizeChanger
                                                pageSizeOptions={['10', '20', '50', '100']}
                                            />
                                        </div>
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
                            {editRecordData ? 'Edit Note' : 'Add New Note'}
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
                    destroyOnClose={true} // This helps clear the form when modal closes
                >
                    <Form
                        layout="vertical"
                        form={form}
                        requiredMark={false}
                        style={{ marginTop: '16px' }}
                        onFinish={handleOk}
                    >
                        <div style={{ marginBottom: '24px' }}>
                            <Form.Item
                                name="note"
                                rules={[{ required: true, message: 'Please enter your note content' }]}
                            >
                                <Input.TextArea
                                    rows={5}
                                    placeholder="Add your note here"
                                    style={{
                                        borderRadius: '8px',
                                        fontSize: '14px',
                                        resize: 'vertical',
                                        minHeight: '120px'
                                    }}
                                    showCount
                                    maxLength={2000}
                                />
                            </Form.Item>
                        </div>

                        <Divider style={{ margin: '20px 0' }}>
                            <span style={{ color: '#8c8c8c', fontSize: '13px' }}>Additional Details</span>
                        </Divider>

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
                                        onChange={(date) => setStartDate(date)}
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
                                    rules={[
                                        { required: true, message: 'Please select end date' },
                                        ({ getFieldValue }) => ({
                                            validator(_, value) {
                                                const sDate = getFieldValue('startDate');
                                                if (!value || !sDate || value.isSameOrAfter(sDate, 'day')) {
                                                    return Promise.resolve();
                                                }
                                                return Promise.reject(new Error('End date cannot be before start date'));
                                            },
                                        }),
                                    ]}
                                >
                                    <DatePicker
                                        style={{
                                            width: '100%',
                                            height: '42px',
                                            borderRadius: '8px'
                                        }}
                                        placeholder="Select end date"
                                        format="DD/MM/YYYY"
                                        disabledDate={(current) =>
                                            startDate && current && current.isBefore(startDate, 'day')
                                        }
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
                                    getValueFromEvent={(e) => {
                                        if (Array.isArray(e)) {
                                            return e;
                                        }
                                        return e?.fileList || [];
                                    }}
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
                                    {editRecordData ? 'Update Note' : 'Add Note'}
                                </Button>
                            </Form.Item>
                        </div>
                    </Form>
                </Modal>
            </>
        );

    return <DashboardPageSkeleton />;
}
