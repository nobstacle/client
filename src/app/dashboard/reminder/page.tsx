"use client";

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { Select, Table, Button, Space, Checkbox, Tag, InputNumber, Typography, Radio, Spin, Card, Modal, Form, Input, Upload, Row, Col, Image, message, Pagination } from 'antd';
import { EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { useHasHydrated } from "../../../hooks/useHydrated";
import "../../../styles/base.css";
import dayjs from 'dayjs';
import { UploadOutlined, FileTextOutlined, PictureOutlined, BellOutlined } from '@ant-design/icons';
import { useMutation } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import "react-toastify/dist/ReactToastify.css";
import { PlusIcon } from "../../../components/icons/PlusIcon";
import { FaTrash } from "react-icons/fa";
import { RiEdit2Fill } from "react-icons/ri";

const { Option } = Select;
const { TextArea } = Input;
const { Text } = Typography;

interface NoteRecord {
    id: string;
    note: string;
    notes?: string;
    title?: string;
    startDate: string;
    endDate: string;
    reminderDate?: string;
    frequency?: string;
    createdBy: string;
    by?: string;
    signedImageUrl?: string;
    imageUrl?: string;
    validity?: string;
    recurringConfig?: {
        dailyType?: string;
        dailySpecificDays?: number[];
        weeklyDays?: number[];
        weeklyInterval?: number;
        monthlyType?: string;
        monthlyInterval?: number;
        monthlyCustomDate?: number;
        monthlyWeekPosition?: string;
        yearlyMonth?: number;
        yearlyDay?: number;
        customInterval?: number;
        customPeriod?: string;
    };
}

export default function Reminder() {
    const hasHydrated = useHasHydrated();
    let isMobile = typeof window !== 'undefined' && window.innerWidth <= 768;
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [form] = Form.useForm();
    const { data } = useSession();
    const [notesList, setNotesList] = useState<NoteRecord[]>([]);
    const [editRecordData, setEditRecordData] = useState<NoteRecord | null>(null);
    const [loadingData, setLoadingData] = useState(true);
    const [frequency, setFrequency] = useState('once');
    const [customInterval, setCustomInterval] = useState(1);
    const [dailyType, setDailyType] = useState('every');
    const [weeklyInterval, setWeeklyInterval] = useState(1);
    const [monthlyInterval, setMonthlyInterval] = useState(1);
    const [monthlyType, setMonthlyType] = useState('date');
    const [currentPage, setCurrentPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [loadingMore, setLoadingMore] = useState(false);
    const [totalRecords, setTotalRecords] = useState(null);
    const [pageSize, setPageSize] = useState(10);
    const ITEMS_PER_PAGE = 10;
    const loadingRef = useRef<HTMLDivElement>(null);
    const debounceRef = useRef<NodeJS.Timeout>();
    const observerRef = useRef<IntersectionObserver | null>(null);

    let Url = process.env.NEXT_PUBLIC_BACKEND_URL;
    let role = data?.user?.Roles?.[0];

    const fetchNotes = useCallback(async (page: number = 1, search: string = '', reset: boolean = false) => {
        if (!data?.user?.backendTokens?.at) {
            setLoadingData(false);
            return;
        }

        try {
            setNotesList([]);
            const isFirstLoad = page === 1 && !search;
            if (isFirstLoad) {
                setLoadingData(true);
            } else {
                setLoadingMore(true);
            }

            const queryParams = new URLSearchParams({
                page: page.toString(),
                limit: pageSize.toString(),
                ...(search && { search })
            });

            const response = await fetch(`${Url}/api/v1/uploads/reminders?${queryParams}`, {
                headers: { Authorization: `Bearer ${data?.user.backendTokens.at}` },
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();

            // Handle the nested response structure from your backend
            const newData = result.data || [];
            const paginationInfo = result.pagination || {};

            // Process the data with recurring config parsing
            const processedData = newData.map(item => ({
                ...item,
                key: item.id,
                recurringConfig: typeof item.recurringConfig === 'string'
                    ? JSON.parse(item.recurringConfig)
                    : item.recurringConfig || {}
            }));

            // Fixed sorting: Convert date strings to Date objects for proper comparison
            const sortedData = processedData.sort((a, b) => {
                const dateA = new Date(a.updatedAt);
                const dateB = new Date(b.updatedAt);
                return dateB.getTime() - dateA.getTime(); // Descending order (most recent first)
            });

            if (reset || page === 1) {
                setNotesList(sortedData);
            } else {
                setNotesList(prev => {
                    const existingIds = new Set(prev.map(item => item.id));
                    const newItems = sortedData.filter(item => !existingIds.has(item.id));
                    return [...prev, ...newItems];
                });
            }

            // Use the hasMore from pagination info, fallback to length check
            const hasMoreData = paginationInfo.hasMore || paginationInfo.hasNext || (sortedData.length === pageSize);
            setHasMore(hasMoreData);
            setTotalRecords(paginationInfo.totalCount || result.metadata?.totalReminders || 0);
            setCurrentPage(page);

        } catch (error) {
            console.warn("Error fetching reminders:", error);
            message.error('Failed to load reminders');
        } finally {
            setLoadingData(false);
            setLoadingMore(false);
        }
    }, [data?.user?.backendTokens?.at, Url, pageSize]);

    // Debounced search function
    const debouncedSearch = useCallback((searchValue: string) => {
        if (debounceRef.current) {
            clearTimeout(debounceRef.current);
        }

        debounceRef.current = setTimeout(() => {
            setCurrentPage(1);
            setHasMore(true);
            fetchNotes(1, searchValue, true);
        }, 500);
    }, [fetchNotes]);

    // Load more data when intersection observer triggers
    const loadMore = useCallback(() => {
        if (!loadingMore && hasMore && !searchTerm) {
            const nextPage = currentPage + 1;
            fetchNotes(nextPage, searchTerm);
        }
    }, [loadingMore, hasMore, currentPage, searchTerm, fetchNotes]);

    // Set up intersection observer
    useEffect(() => {
        if (loadingRef.current) {
            observerRef.current = new IntersectionObserver(
                (entries) => {
                    if (entries[0].isIntersecting) {
                        loadMore();
                    }
                },
                { threshold: 0.1 }
            );
            observerRef.current.observe(loadingRef.current);
        }

        return () => {
            if (observerRef.current) {
                observerRef.current.disconnect();
            }
        };
    }, [loadMore]);

    // Initial data fetch
    useEffect(() => {
        if (data?.user !== undefined) {
            setCurrentPage(1);
            fetchNotes(1, searchTerm, true);
        }
    }, [pageSize, data, fetchNotes, searchTerm]);

    useEffect(() => {
        if (!isModalOpen) {
            setFrequency('once');
            setCustomInterval(1);
        }
    }, [isModalOpen]);

    // Add this function to display detailed recurring information
    const getDetailedRecurringSummary = (frequency, reminderDate, recurringConfig = {}) => {
        if (!frequency || frequency === 'once') return 'One-time reminder';

        const date = new Date(reminderDate);
        const dayName = date.toLocaleDateString('en-US', { weekday: 'long' });
        const dayOfMonth = date.getDate();
        const monthName = date.toLocaleDateString('en-US', { month: 'long' });

        switch (frequency) {
            case 'daily':
                if (recurringConfig.dailyType === 'weekdays') {
                    return 'Every weekday (Mon-Fri)';
                } else if (recurringConfig.dailyType === 'weekends') {
                    return 'Every weekend (Sat-Sun)';
                } else if (recurringConfig.dailyType === 'interval' && recurringConfig.customInterval) {
                    return `Every ${recurringConfig.customInterval} day${recurringConfig.customInterval > 1 ? 's' : ''}`;
                } else if (recurringConfig.dailyType === 'specific' && recurringConfig.dailySpecificDays) {
                    const selectedDays = recurringConfig.dailySpecificDays.map(dayNum => {
                        const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
                        return days[dayNum];
                    }).join(', ');
                    return `Every ${selectedDays}`;
                }
                return 'Every day';

            case 'weekly':
                const interval = recurringConfig.weeklyInterval || 1;
                let weeklyText = interval === 1 ? 'Every week' : `Every ${interval} weeks`;

                if (recurringConfig.weeklyDays && recurringConfig.weeklyDays.length > 0) {
                    const selectedDays = recurringConfig.weeklyDays.map(dayNum => {
                        const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
                        return days[dayNum];
                    }).join(', ');
                    weeklyText += ` on ${selectedDays}`;
                } else {
                    weeklyText += ` on ${dayName}`;
                }
                return weeklyText;

            case 'monthly':
                const monthInterval = recurringConfig.monthlyInterval || 1;
                let monthlyText = monthInterval === 1 ? 'Every month' : `Every ${monthInterval} months`;

                if (recurringConfig.monthlyType === 'last') {
                    monthlyText += ' on the last day';
                } else if (recurringConfig.monthlyType === 'weekday') {
                    monthlyText += ` on the same weekday (${dayName})`;
                } else if (recurringConfig.monthlyType === 'custom' && recurringConfig.monthlyCustomDate) {
                    monthlyText += ` on the ${recurringConfig.monthlyCustomDate}${getDaySuffix(recurringConfig.monthlyCustomDate)}`;
                } else {
                    monthlyText += ` on the ${dayOfMonth}${getDaySuffix(dayOfMonth)}`;
                }
                return monthlyText;

            case 'yearly':
                if (recurringConfig.yearlyMonth && recurringConfig.yearlyDay) {
                    const yearlyMonthName = dayjs().month(recurringConfig.yearlyMonth - 1).format('MMMM');
                    return `Every year on ${yearlyMonthName} ${recurringConfig.yearlyDay}${getDaySuffix(recurringConfig.yearlyDay)}`;
                }
                return `Every year on ${monthName} ${dayOfMonth}${getDaySuffix(dayOfMonth)}`;

            case 'custom':
                const customInterval = recurringConfig.customInterval || 1;
                const customPeriod = recurringConfig.customPeriod || 'days';
                return `Every ${customInterval} ${customPeriod}`;

            default:
                return frequency;
        }
    };

    const frequencyOptions = [
        { label: 'Daily', value: 'daily', icon: '📅' },
        { label: 'Weekly', value: 'weekly', icon: '🗓️' },
        { label: 'Monthly', value: 'monthly', icon: '📆' },
        { label: 'Custom', value: 'custom', icon: '⚙️' }
    ];

    const weekDays = [
        { label: 'Mon', value: 1, short: 'M' },
        { label: 'Tue', value: 2, short: 'T' },
        { label: 'Wed', value: 3, short: 'W' },
        { label: 'Thu', value: 4, short: 'T' },
        { label: 'Fri', value: 5, short: 'F' },
        { label: 'Sat', value: 6, short: 'S' },
        { label: 'Sun', value: 0, short: 'S' }
    ];

    const renderDailyOptions = () => (
        <Card size="small" style={{ background: '#fafafa', border: 'none' }}>
            <div style={{ marginBottom: '16px' }}>
                <Text strong style={{ fontSize: '14px', color: '#262626' }}>Daily Frequency</Text>
            </div>

            <Form.Item name="dailyType" style={{ marginBottom: '16px' }}>
                <Radio.Group
                    value={dailyType}
                    onChange={(e) => setDailyType(e.target.value)}
                    style={{ width: '100%' }}
                >
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <Radio value="every">Every day</Radio>
                        <Radio value="weekdays">
                            <span>Weekdays only</span>
                            <Tag size="small" style={{ marginLeft: '8px' }}>Mon-Fri</Tag>
                        </Radio>
                        <Radio value="weekends">
                            <span>Weekends only</span>
                            <Tag size="small" style={{ marginLeft: '8px' }}>Sat-Sun</Tag>
                        </Radio>
                        <Radio value="interval">
                            <span style={{ marginRight: '8px' }}>Every</span>
                            <InputNumber
                                min={1}
                                max={30}
                                value={customInterval}
                                onChange={(value) => setCustomInterval(value || 1)}
                                size="small"
                                style={{ width: '60px', margin: '0 8px' }}
                            />
                            <span>days</span>
                        </Radio>
                        <Radio value="specific">
                            <span>Specific days of week</span>
                        </Radio>
                    </div>
                </Radio.Group>
            </Form.Item>

            {dailyType === 'specific' && (
                <Form.Item name="dailySpecificDays" style={{ marginLeft: '24px' }}>
                    <Checkbox.Group>
                        <Row gutter={[8, 8]}>
                            {weekDays.map(day => (
                                <Col key={day.value}>
                                    <Checkbox value={day.value}>
                                        <Tag color="blue" style={{ margin: 0, minWidth: '32px', textAlign: 'center' }}>
                                            {day.short}
                                        </Tag>
                                    </Checkbox>
                                </Col>
                            ))}
                        </Row>
                    </Checkbox.Group>
                </Form.Item>
            )}
        </Card>
    );

    const renderWeeklyOptions = () => (
        <Card size="small" style={{ background: '#fafafa', border: 'none' }}>
            <div style={{ marginBottom: '16px' }}>
                <Text strong style={{ fontSize: '14px', color: '#262626' }}>Weekly Schedule</Text>
            </div>

            <Row gutter={16} style={{ marginBottom: '16px' }}>
                <Col span={24}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                        <span>Repeat every</span>
                        <InputNumber
                            min={1}
                            max={52}
                            value={weeklyInterval}
                            onChange={(value) => setWeeklyInterval(value || 1)}
                            size="small"
                            style={{ width: '60px' }}
                        />
                        <span>week(s) on:</span>
                    </div>
                </Col>
            </Row>

            <Form.Item name="weeklyDays" style={{ marginBottom: '16px' }}>
                <Checkbox.Group style={{ width: '100%' }}>
                    <Row gutter={[8, 8]}>
                        {weekDays.map(day => (
                            <Col span={24 / 7} key={day.value}>
                                <Checkbox value={day.value} style={{ width: '100%' }}>
                                    <div style={{
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'center',
                                        padding: '8px 4px',
                                        background: 'white',
                                        borderRadius: '6px',
                                        border: '1px solid #f0f0f0'
                                    }}>
                                        <div style={{ fontSize: '12px', fontWeight: '500' }}>{day.short}</div>
                                        <div style={{ fontSize: '10px', color: '#8c8c8c' }}>{day.label}</div>
                                    </div>
                                </Checkbox>
                            </Col>
                        ))}
                    </Row>
                </Checkbox.Group>
            </Form.Item>
        </Card>
    );

    const renderMonthlyOptions = () => (
        <Card size="small" style={{ background: '#fafafa', border: 'none' }}>
            <div style={{ marginBottom: '16px' }}>
                <Text strong style={{ fontSize: '14px', color: '#262626' }}>Monthly Schedule</Text>
            </div>

            <Row gutter={16} style={{ marginBottom: '16px' }}>
                <Col span={24}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                        <span>Repeat every</span>
                        <InputNumber
                            min={1}
                            max={12}
                            value={monthlyInterval}
                            onChange={(value) => setMonthlyInterval(value || 1)}
                            size="small"
                            style={{ width: '60px' }}
                        />
                        <span>month(s)</span>
                    </div>
                </Col>
            </Row>

            <Form.Item name="monthlyType" style={{ marginBottom: '16px' }}>
                <Radio.Group
                    value={monthlyType}
                    onChange={(e) => setMonthlyType(e.target.value)}
                    style={{ width: '100%' }}
                >
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>

                        <Radio value="last">
                            <span>On the last day of the month</span>
                        </Radio>
                        <Radio value="custom">
                            <span>Custom date</span>
                        </Radio>
                    </div>
                </Radio.Group>
            </Form.Item>

            {monthlyType === 'custom' && (
                <Row gutter={16}>
                    <Col span={12}>
                        <Form.Item label="Day of Month" name="monthlyCustomDate">
                            <InputNumber
                                min={1}
                                max={31}
                                placeholder="1-31"
                                style={{ width: '100%' }}
                            />
                        </Form.Item>
                    </Col>
                </Row>
            )}
        </Card>
    );

    const renderYearlyOptions = () => (
        <Card size="small" style={{ background: '#fafafa', border: 'none' }}>
            <div style={{ marginBottom: '16px' }}>
                <Text strong style={{ fontSize: '14px', color: '#262626' }}>Yearly Schedule</Text>
            </div>

            <Row gutter={16}>
                <Col span={12}>
                    <Form.Item label="Month" name="yearlyMonth">
                        <Select placeholder="Select month" style={{ width: '100%' }}>
                            {Array.from({ length: 12 }, (_, i) => (
                                <Option key={i + 1} value={i + 1}>
                                    {dayjs().month(i).format('MMMM')}
                                </Option>
                            ))}
                        </Select>
                    </Form.Item>
                </Col>
                <Col span={12}>
                    <Form.Item label="Day" name="yearlyDay">
                        <InputNumber
                            min={1}
                            max={31}
                            placeholder="Day of month"
                            style={{ width: '100%' }}
                        />
                    </Form.Item>
                </Col>
            </Row>

            <Form.Item name="yearlyAdvanced">
                <Checkbox>Use advanced yearly options</Checkbox>
            </Form.Item>
        </Card>
    );

    const renderCustomOptions = () => (
        <Card size="small" style={{ background: '#fafafa', border: 'none' }}>
            <div style={{ marginBottom: '16px' }}>
                <Text strong style={{ fontSize: '14px', color: '#262626' }}>Custom Schedule</Text>
            </div>

            <Row gutter={16} style={{ marginBottom: '16px' }}>
                <Col span={8}>
                    <Form.Item label="Every" name="customInterval">
                        <InputNumber
                            min={1}
                            max={999}
                            value={customInterval}
                            onChange={(value) => setCustomInterval(value || 1)}
                            style={{ width: '100%' }}
                        />
                    </Form.Item>
                </Col>
                <Col span={16}>
                    <Form.Item label="Period" name="customPeriod">
                        <Select placeholder="Select period" style={{ width: '100%' }}>
                            <Option value="days">Days</Option>
                            <Option value="weeks">Weeks</Option>
                            <Option value="months">Months</Option>
                            <Option value="years">Years</Option>
                        </Select>
                    </Form.Item>
                </Col>
            </Row>

        </Card>
    );

    const renderRecurringOptions = () => {
        switch (frequency) {
            case 'daily':
                return renderDailyOptions();
            case 'weekly':
                return renderWeeklyOptions();
            case 'monthly':
                return renderMonthlyOptions();
            case 'yearly':
                return renderYearlyOptions();
            case 'custom':
                return renderCustomOptions();
            default:
                return null;
        }
    };

    const generateScheduleDates = (frequency, recurringConfig, reminderDate = new Date()) => {
        const scheduleData = [];
        let startDate = new Date(reminderDate);

        // For monthly "last" type, adjust the start date to be the last day of the current month
        if (frequency === 'monthly' && recurringConfig.monthlyType === 'last') {
            startDate = new Date(startDate.getFullYear(), startDate.getMonth() + 1, 0);
        }

        // Always include the first occurrence
        scheduleData.push(startDate.toISOString().split('T')[0]);

        if (frequency === 'once') {
            return scheduleData;
        }

        // Generate next few occurrences for recurring events
        const maxOccurrences = 12; // Generate up to 12 future dates

        switch (frequency) {
            case 'daily':
                const dailyInterval = recurringConfig.dailyInterval || 1;
                for (let i = 1; i < maxOccurrences; i++) {
                    const nextDate = new Date(startDate);
                    nextDate.setDate(startDate.getDate() + (i * dailyInterval));
                    scheduleData.push(nextDate.toISOString().split('T')[0]);
                }
                break;

            case 'weekly':
                const weeklyInterval = recurringConfig.weeklyInterval || 1;
                const selectedDays = recurringConfig.selectedDays || [startDate.getDay()];

                let currentWeek = new Date(startDate);
                let occurrenceCount = 1;

                while (occurrenceCount < maxOccurrences) {
                    // Move to next week interval
                    currentWeek.setDate(currentWeek.getDate() + (7 * weeklyInterval));

                    // For each selected day in this week
                    selectedDays.forEach(dayOfWeek => {
                        if (occurrenceCount >= maxOccurrences) return;

                        const nextDate = new Date(currentWeek);
                        const diff = dayOfWeek - currentWeek.getDay();
                        nextDate.setDate(currentWeek.getDate() + diff);

                        // Only add if it's not the same as start date
                        const dateStr = nextDate.toISOString().split('T')[0];
                        if (!scheduleData.includes(dateStr)) {
                            scheduleData.push(dateStr);
                            occurrenceCount++;
                        }
                    });
                }
                break;

            case 'monthly':
                const monthlyInterval = recurringConfig.monthlyInterval || 1;
                const monthlyType = recurringConfig.monthlyType || 'date';

                for (let i = 1; i < maxOccurrences; i++) {
                    const nextDate = new Date(startDate);

                    if (monthlyType === 'last') {
                        // Set to the last day of the target month
                        nextDate.setMonth(startDate.getMonth() + (i * monthlyInterval) + 1, 0);
                    } else {
                        // Default: same date each month
                        nextDate.setMonth(startDate.getMonth() + (i * monthlyInterval));

                        // Handle edge case where the day doesn't exist in target month
                        if (nextDate.getDate() !== startDate.getDate()) {
                            nextDate.setDate(0); // Set to last day of previous month
                        }
                    }

                    scheduleData.push(nextDate.toISOString().split('T')[0]);
                }
                break;

            case 'yearly':
                const yearlyInterval = recurringConfig.yearlyInterval || 1;
                for (let i = 1; i < maxOccurrences; i++) {
                    const nextDate = new Date(startDate);
                    nextDate.setFullYear(startDate.getFullYear() + (i * yearlyInterval));
                    scheduleData.push(nextDate.toISOString().split('T')[0]);
                }
                break;
        }

        return scheduleData;
    };

    const handleOk = (dataValue) => {
        const formData = new FormData();

        // Handle file upload
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
        }

        // Basic note content
        formData.append('note', dataValue.note || '');
        formData.append('title', dataValue.title || '');
        formData.append('createdBy', data?.user?.firstName !== null && data?.user?.firstName + ' ' + data?.user?.lastName || data?.user?.email || 'Admin');

        // Handle reminder date
        let reminderDateToUse;
        if (dataValue.reminderDate) {
            reminderDateToUse = dataValue.reminderDate instanceof Date
                ? dataValue.reminderDate
                : new Date(dataValue.reminderDate);

            formData.append('reminderDate', reminderDateToUse.toISOString());
        } else {
            reminderDateToUse = new Date();
            formData.append('reminderDate', reminderDateToUse.toISOString());
        }

        // Frequency
        const selectedFrequency = dataValue.frequency || frequency || 'once';
        formData.append('frequency', selectedFrequency);

        // Build and save detailed recurring configuration
        const recurringConfig = buildRecurringConfig(selectedFrequency, dataValue);
        formData.append('recurringOptions', JSON.stringify(recurringConfig));

        // Generate schedule data - NOW PASSING THE REMINDER DATE
        const scheduleData = generateScheduleDates(selectedFrequency, recurringConfig, reminderDateToUse);
        formData.append('scheduleData', JSON.stringify(scheduleData));

        // Add timestamps
        formData.append('createdAt', new Date().toISOString());
        if (editRecordData && editRecordData.id) {
            formData.append('updatedAt', new Date().toISOString());
            formData.append('id', editRecordData.id);
        }

        // Call appropriate mutation
        if (editRecordData && editRecordData.id) {
            updateReminderNote.mutate(formData);
        } else {
            uploadReminderNote.mutate(formData);
        }

        setIsModalOpen(false);
        form.resetFields();
        setFrequency('once');
        resetRecurringState();
    };

    const buildRecurringConfig = (frequency, dataValue) => {
        const config: any = {};

        switch (frequency) {
            case 'daily':
                config.dailyType = dataValue.dailyType || 'every';
                if (dataValue.dailyType === 'specific') {
                    config.dailySpecificDays = dataValue.dailySpecificDays || [];
                }
                if (dataValue.dailyType === 'interval') {
                    config.customInterval = dataValue.customInterval || customInterval || 1;
                }
                break;

            case 'weekly':
                config.weeklyInterval = dataValue.weeklyInterval || weeklyInterval || 1;
                config.weeklyDays = dataValue.weeklyDays || [];
                break;

            case 'monthly':
                config.monthlyType = dataValue.monthlyType || 'date';
                config.monthlyInterval = dataValue.monthlyInterval || monthlyInterval || 1;
                if (dataValue.monthlyType === 'custom') {
                    config.monthlyCustomDate = dataValue.monthlyCustomDate || monthlyInterval || 1;
                }
                if (dataValue.monthlyWeekPosition) {
                    config.monthlyWeekPosition = dataValue.monthlyWeekPosition;
                }
                break;

            case 'yearly':
                config.yearlyMonth = dataValue.yearlyMonth || null;
                config.yearlyDay = dataValue.yearlyDay || null;
                if (dataValue.yearlyAdvanced) {
                    config.yearlyAdvanced = true;
                }
                break;

            case 'custom':
                config.customInterval = dataValue.customInterval || customInterval || 1;
                config.customPeriod = dataValue.customPeriod || 'days';
                break;

            default:
                break;
        }

        return config;
    };

    function getDaySuffix(day: number): string {
        if (day >= 11 && day <= 13) {
            return 'th';
        }
        switch (day % 10) {
            case 1: return 'st';
            case 2: return 'nd';
            case 3: return 'rd';
            default: return 'th';
        }
    }

    const columns = [
        {
            title: 'Title',
            dataIndex: 'title',
            key: 'title',
            width: 200,
        },
        {
            title: 'Note',
            dataIndex: 'note',
            key: 'note',
            render: (text: string, record: NoteRecord) => {
                return (
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
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
            title: 'Recurrence',
            key: 'byValidity',
            width: 300,
            render: (_: any, record: NoteRecord) => {
                const {
                    reminderDate,
                    endDate,
                    frequency,
                    createdBy,
                    recurringOptions // comes as JSON string
                } = record;

                // Parse recurringOptions safely
                let recurringConfig: any = {};
                try {
                    recurringConfig = typeof recurringOptions === 'string'
                        ? JSON.parse(recurringOptions)
                        : recurringOptions || {};
                } catch (err) {
                    console.warn('Failed to parse recurringOptions:', err);
                }

                const parsedDate = reminderDate ? new Date(reminderDate) : null;

                const formattedReminderDate = parsedDate
                    ? parsedDate.toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' })
                    : null;

                const formattedTime = parsedDate
                    ? parsedDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })
                    : null;

                const formattedEndDate = endDate
                    ? new Date(endDate).toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' })
                    : null;

                const detailedRecurringSummary = getDetailedRecurringSummary(frequency, reminderDate, recurringConfig);

                return (
                    <div style={{ lineHeight: 1.4, fontSize: '13px', color: '#666' }}>
                        <div style={{ marginBottom: '2px' }}>
                            <span style={{ color: '#333' }}>Created by {createdBy}</span>
                        </div>
                        <div style={{ marginBottom: '2px' }}>
                            From {formattedEndDate || formattedReminderDate} {formattedTime}
                        </div>
                        <div style={{ color: '#1890ff', fontWeight: '500' }}>
                            {detailedRecurringSummary}
                        </div>
                    </div>
                );
            },
        },
        ...(role === 'Admin' ? [{
            title: 'Action',
            key: 'actions',
            width: 200,
            render: (_: any, record: NoteRecord) => (
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

    const handleEdit = (record: NoteRecord) => {
        const processedRecord = {
            ...record,
            startDate: record.startDate ? dayjs(record.startDate) : null,
            endDate: record.endDate ? dayjs(record.endDate) : null,
            recurringConfig: typeof record.recurringOptions === 'string'
                ? JSON.parse(record.recurringOptions)
                : record.recurringOptions || {}
        };

        setEditRecordData(processedRecord);
        setIsModalOpen(true);
    };

    const handleDelete = async (record: NoteRecord) => {
        setLoadingData(true);

        try {
            const response = await fetch(`${Url}/api/v1/uploads/reminder/${record?.id}`, {
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

            // Reset and fetch first page after delete
            setCurrentPage(1);
            setHasMore(true);
            fetchNotes(1, false);
        } catch (error) {
            console.warn("Error deleting handover note:", error);
            setLoadingData(false);
        }
    };

    const createNotes = () => {
        form.resetFields();
        setEditRecordData(null);
        setIsModalOpen(true);
    };

    const uploadReminderNote = useMutation({
        mutationFn: async (formData: FormData) => {
            const baseUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';
            const endpoint = `${baseUrl}/api/v1/uploads/reminder`;

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
            message.success('Reminder added!');
            setCurrentPage(1);
            setHasMore(true);
            fetchNotes(1, false);
        },

        onError: (error: Error) => {
            const shortMessage = error.message.split('\n')[0];
            message.error(`Upload failed: ${shortMessage}`);
            console.error('Handover note upload error:', error);
        },
    });

    const updateReminderNote = useMutation({
        mutationFn: async (formData: FormData) => {
            const baseUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://nobstacle.com';
            const id = formData.get('id');
            const endpoint = `${baseUrl}/api/v1/uploads/reminder/${id}`;

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
            message.success('Reminder note updated!');
            setCurrentPage(1);
            setHasMore(true);
            fetchNotes(1, false);
            setEditRecordData(null);
        },

        onError: (error: Error) => {
            const shortMessage = error.message.split('\n')[0];
            message.error(`Update failed: ${shortMessage}`);
            console.error('Reminder note update error:', error);
        },
    });

    const handleCancel = () => {
        form.resetFields();
        setEditRecordData(null);
        setIsModalOpen(false);
    };

    const MobileCard = ({ record, index }) => {
        const isEvenIndex = index % 2 === 0;

        // Format date helper function
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

        // Get the appropriate image URL
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
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        {/* Title */}
                        {record.title && (
                            <div style={{
                                fontSize: '16px',
                                fontWeight: '600',
                                color: '#262626',
                                marginBottom: '4px'
                            }}>
                                {record.title}
                            </div>
                        )}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
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
                    </div>
                    {/* Note content */}
                    <div>
                        <div style={{
                            wordBreak: 'break-word',
                            whiteSpace: 'pre-wrap',
                            lineHeight: '1.5',
                            fontSize: '14px',
                            color: '#595959',
                            marginBottom: imageUrl ? '12px' : '0'
                        }}>
                            {record.note}
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
                                    alt="Reminder attachment"
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

                    {/* Reminder details */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '12px', color: '#8c8c8c' }}>Reminder Date:</span>
                            <span style={{ fontSize: '12px' }}>
                                {formatDate(record.reminderDate)}
                            </span>
                        </div>

                        {record.frequency && (
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontSize: '12px', color: '#8c8c8c' }}>Frequency:</span>
                                <span style={{ fontSize: '12px', textTransform: 'capitalize' }}>
                                    {record.frequency}
                                </span>
                            </div>
                        )}

                        {record.endDate && (
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontSize: '12px', color: '#8c8c8c' }}>End Date:</span>
                                <span style={{ fontSize: '12px' }}>
                                    {formatDate(record.endDate)}
                                </span>
                            </div>
                        )}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '12px', color: '#8c8c8c' }}>Created by:</span>
                            <span style={{ fontSize: '12px' }}>
                                {record.createdBy}
                            </span>
                        </div>
                    </div>

                    {/* Completion info if completed */}
                    {record.isCompleted && record.completedAt && (
                        <div style={{
                            backgroundColor: '#f6ffed',
                            border: '1px solid #b7eb8f',
                            borderRadius: '4px',
                            padding: '8px',
                            fontSize: '12px',
                            color: '#389e0d'
                        }}>
                            ✓ Completed on {formatDate(record.completedAt)}
                        </div>
                    )}
                </div>
            </Card>
        );
    };

    useEffect(() => {
        if (isModalOpen) {
            if (editRecordData) {
                const reminderDate = editRecordData.reminderDate ? dayjs(editRecordData.reminderDate) : null;
                const recordFrequency = editRecordData.frequency || 'once';

                // Set the frequency state
                setFrequency(recordFrequency);

                // Handle image if present
                let imageFileList = [];
                if (editRecordData.imageUrl || editRecordData.signedImageUrl) {
                    imageFileList = [{
                        uid: '-1',
                        name: 'image.jpg',
                        status: 'done',
                        url: editRecordData.signedImageUrl || editRecordData.imageUrl,
                    }];
                }

                // Base form fields
                const baseFormFields = {
                    title: editRecordData.title || '',
                    note: editRecordData.note || '',
                    startDate: editRecordData.startDate ? dayjs(editRecordData.startDate) : null,
                    endDate: editRecordData.endDate ? dayjs(editRecordData.endDate) : null,
                    frequency: recordFrequency,
                    reminderDate: reminderDate,
                    imageUrl: imageFileList,
                };

                // Extract and set recurring details based on frequency and reminder date
                if (reminderDate && recordFrequency !== 'once') {
                    const recurringFields = extractRecurringDetails(reminderDate, recordFrequency, editRecordData.recurringConfig);

                    updateRecurringState(recordFrequency, recurringFields);
                    form.setFieldsValue({
                        ...baseFormFields,
                        ...recurringFields
                    });
                } else {
                    form.setFieldsValue(baseFormFields);
                }

            } else {
                // Reset form and frequency state when adding new reminder
                form.resetFields();
                setFrequency('once');
                resetRecurringState();
            }
        }
    }, [editRecordData, isModalOpen, form]);

    // Helper function to extract recurring details
    const extractRecurringDetails = (reminderDate, frequency, savedConfig = {}) => {
        const fields = {};

        switch (frequency) {
            case 'daily':
                // Set daily options
                fields.dailyType = savedConfig.dailyType || 'every';
                if (savedConfig.dailySpecificDays) {
                    fields.dailySpecificDays = savedConfig.dailySpecificDays;
                }
                setDailyType(savedConfig.dailyType || 'every');
                if (savedConfig.dailyType === 'interval') {
                    setCustomInterval(savedConfig.customInterval || 1);
                    fields.customInterval = savedConfig.customInterval || 1;
                }
                break;

            case 'weekly':
                const dayOfWeek = reminderDate.day(); // 0 = Sunday, 1 = Monday, etc.
                fields.weeklyDays = savedConfig.weeklyDays || [dayOfWeek];
                fields.weeklyInterval = savedConfig.weeklyInterval || 1;
                setWeeklyInterval(savedConfig.weeklyInterval || 1);
                break;

            case 'monthly':
                const dayOfMonth = reminderDate.date();
                fields.monthlyType = savedConfig.monthlyType || 'date';
                fields.monthlyInterval = savedConfig.monthlyInterval || 1;
                fields.monthlyCustomDate = savedConfig.monthlyCustomDate || dayOfMonth;

                if (savedConfig.monthlyWeekPosition) {
                    fields.monthlyWeekPosition = savedConfig.monthlyWeekPosition;
                }

                setMonthlyType(savedConfig.monthlyType || 'date');
                setMonthlyInterval(savedConfig.monthlyInterval || 1);
                break;

            case 'yearly':
                const yearlyMonth = reminderDate.month(); // 0-11 (January = 0)
                const yearlyDay = reminderDate.date();

                fields.yearlyMonth = savedConfig.yearlyMonth || (yearlyMonth + 1); // Convert to 1-12
                fields.yearlyDay = savedConfig.yearlyDay || yearlyDay;
                fields.yearlyAdvanced = savedConfig.yearlyAdvanced || false;
                break;

            case 'custom':
                fields.customInterval = savedConfig.customInterval || 1;
                fields.customPeriod = savedConfig.customPeriod || 'days';
                setCustomInterval(savedConfig.customInterval || 1);
                break;
        }

        return fields;
    };

    // Helper function to update recurring state variables
    const updateRecurringState = (frequency, fields) => {
        switch (frequency) {
            case 'daily':
                if (fields.dailyType) setDailyType(fields.dailyType);
                if (fields.customInterval) setCustomInterval(fields.customInterval);
                break;
            case 'weekly':
                if (fields.weeklyInterval) setWeeklyInterval(fields.weeklyInterval);
                break;
            case 'monthly':
                if (fields.monthlyType) setMonthlyType(fields.monthlyType);
                if (fields.monthlyInterval) setMonthlyInterval(fields.monthlyInterval);
                break;
            case 'custom':
                if (fields.customInterval) setCustomInterval(fields.customInterval);
                break;
        }
    };

    // Helper function to reset recurring state
    const resetRecurringState = () => {
        setDailyType('every');
        setWeeklyInterval(1);
        setMonthlyInterval(1);
        setMonthlyType('date');
        setCustomInterval(1);
    };

    const searchNotes = (e: any) => {
        const searchValue = e.target.value.toLowerCase().trim();
        setSearchTerm(searchValue);
        debouncedSearch(searchValue);
    }

    if (hasHydrated)
        return (
            <>
                <div className={`HandoverMainWrapper flex h-full w-full flex-col justify-start gap-4 overflow-y-auto ${isMobile ? 'p-4' : 'p-6'}`}>
                    <div className="flex w-full flex-col gap-4">
                        <div className="customSearchWrapper">
                            <Card className="w-full customCards">
                                <div className="searchInputWidth">
                                    <Input placeholder='Search Reminders' className='w-full rounded-md p-2' onChange={searchNotes} />
                                </div>
                            </Card>
                        </div>
                        <div className="flex w-full flex-col items-end gap-4">
                            <div className="w-full">
                                {isMobile ? (
                                    <div>
                                        {notesList.map((record, i) => (
                                            <MobileCard record={record} index={i} />
                                        ))}
                                        {(loadingMore || hasMore) && (
                                            <div
                                                ref={loadingRef}
                                                style={{
                                                    textAlign: 'center',
                                                    padding: '20px',
                                                    display: 'flex',
                                                    justifyContent: 'center',
                                                    alignItems: 'center'
                                                }}
                                            >
                                                {loadingMore && <Spin size="small" />}
                                                {!hasMore && notesList.length > 0 && (
                                                    <Text type="secondary">No more records to load</Text>
                                                )}
                                            </div>
                                        )}
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
                                                onChange={(page, newPageSize) => {
                                                    setCurrentPage(page);
                                                    if (newPageSize !== pageSize) {
                                                        setPageSize(newPageSize);
                                                        fetchNotes(1, searchTerm, true);
                                                    } else {
                                                        fetchNotes(page, searchTerm, false);
                                                    }
                                                }}
                                                showSizeChanger
                                                pageSizeOptions={['10', '20', '50', '100']}
                                                showTotal={(total, range) =>
                                                    `${range[0]}-${range[1]} of ${total} items`
                                                }
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
                            gap: '6px',
                            fontSize: '16px',
                            fontWeight: '600',
                            color: '#1a1a1a'
                        }}>
                            <FileTextOutlined style={{ color: '#1890ff', fontSize: '18px' }} />
                            {editRecordData ? 'Edit Reminder' : 'Add Reminder'}
                        </div>
                    }
                    open={isModalOpen}
                    footer={null}
                    onCancel={handleCancel}
                    className='handoverModal'
                    width="100%"
                    style={{
                        maxWidth: window.innerWidth <= 768 ? '95vw' : '600px',
                        margin: '0 auto',
                        top: window.innerWidth <= 768 ? '5px' : '10px'
                    }}
                    styles={{
                        body: {
                            maxHeight: window.innerWidth <= 768 ? '90vh' : '85vh',
                            overflowY: 'auto',
                            padding: window.innerWidth <= 768 ? '8px' : '16px'
                        },
                        header: {
                            padding: window.innerWidth <= 768 ? '12px 16px 8px' : '16px 20px 12px',
                            borderBottom: '1px solid #f0f0f0',
                            minHeight: 'auto'
                        },
                        content: {
                            padding: 0
                        }
                    }}
                    destroyOnClose={true}
                    centered={window.innerWidth <= 768}
                >
                    <Form
                        layout="vertical"
                        form={form}
                        requiredMark={false}
                        style={{ marginTop: '8px' }}
                        onFinish={handleOk}
                    >
                        <div style={{
                            marginBottom: '16px',
                            background: '#fafafa',
                            borderRadius: '8px',
                            padding: window.innerWidth <= 768 ? '12px' : '16px',
                            border: '1px solid #f0f0f0'
                        }}>
                            <Form.Item
                                name="title"
                                label={
                                    <span style={{
                                        fontSize: '13px',
                                        fontWeight: '500',
                                        color: '#595959',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '4px'
                                    }}>
                                        <EditOutlined style={{ color: '#1890ff', fontSize: '12px' }} />
                                        Title
                                    </span>
                                }
                                rules={[{ required: true, message: 'Please enter title' }]}
                                style={{ marginBottom: '12px' }}
                            >
                                <Input
                                    placeholder="Enter title..."
                                    style={{
                                        borderRadius: '6px',
                                        fontSize: '14px',
                                        height: '36px'
                                    }}
                                    showCount
                                    maxLength={100}
                                />
                            </Form.Item>

                            <Form.Item
                                name="note"
                                label={
                                    <span style={{
                                        fontSize: '13px',
                                        fontWeight: '500',
                                        color: '#595959',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '4px'
                                    }}>
                                        <EditOutlined style={{ color: '#1890ff', fontSize: '12px' }} />
                                        Note
                                    </span>
                                }
                                rules={[{ required: true, message: 'Please enter note content' }]}
                                style={{ marginBottom: 0 }}
                            >
                                <TextArea
                                    rows={window.innerWidth <= 768 ? 3 : 4}
                                    placeholder="Enter your note..."
                                    style={{
                                        borderRadius: '6px',
                                        fontSize: '14px',
                                        resize: 'none'
                                    }}
                                    showCount
                                    maxLength={1000}
                                />
                            </Form.Item>
                        </div>

                        <div style={{
                            marginBottom: '16px',
                            background: '#fafafa',
                            borderRadius: '8px',
                            padding: window.innerWidth <= 768 ? '12px' : '16px',
                            border: '1px solid #f0f0f0'
                        }}>
                            <Form.Item
                                name="imageUrl"
                                label={
                                    <span style={{
                                        fontSize: '13px',
                                        fontWeight: '500',
                                        color: '#595959',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '4px'
                                    }}>
                                        <PictureOutlined style={{ color: '#722ed1', fontSize: '12px' }} />
                                        Image (Optional)
                                    </span>
                                }
                                valuePropName="fileList"
                                getValueFromEvent={(e) => {
                                    if (Array.isArray(e)) return e;
                                    return e?.fileList || [];
                                }}
                                style={{ marginBottom: 0 }}
                            >
                                <Upload
                                    name="image"
                                    listType="picture-card"
                                    beforeUpload={() => false}
                                    accept="image/*"
                                    maxCount={1}
                                    style={{ width: '100%' }}
                                >
                                    <div style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        padding: '8px',
                                        minHeight: '60px',
                                        border: '1px dashed #d9d9d9',
                                        borderRadius: '6px',
                                        background: '#ffffff',
                                        cursor: 'pointer',
                                        width: '100%'
                                    }}>
                                        <div style={{
                                            display: 'flex',
                                            flexDirection: 'column',
                                            alignItems: 'center',
                                            gap: '2px'
                                        }}>
                                            <UploadOutlined style={{
                                                fontSize: '16px',
                                                color: '#722ed1'
                                            }} />
                                            <span style={{
                                                fontSize: '11px',
                                                color: '#8c8c8c',
                                                textAlign: 'center'
                                            }}>
                                                Click to upload
                                                <br />
                                                <span style={{ fontSize: '10px' }}>PNG, JPG (10MB max)</span>
                                            </span>
                                        </div>
                                    </div>
                                </Upload>
                            </Form.Item>
                        </div>

                        <div style={{
                            background: 'linear-gradient(135deg, #f6f9ff 0%, #e6f4ff 100%)',
                            padding: window.innerWidth <= 768 ? '12px' : '16px',
                            borderRadius: '8px',
                            border: '1px solid #d6e4ff',
                            marginBottom: '16px'
                        }}>
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                marginBottom: '12px',
                                fontSize: '14px',
                                fontWeight: '600',
                                color: '#262626'
                            }}>
                                <BellOutlined style={{ color: '#1890ff', fontSize: '14px' }} />
                                Schedule
                            </div>

                            <Form.Item
                                name="frequency"
                                style={{ marginBottom: frequency !== 'once' ? '12px' : 0 }}
                            >
                                <Radio.Group
                                    value={frequency}
                                    onChange={(e) => setFrequency(e.target.value)}
                                    style={{ width: '100%' }}
                                    size="small"
                                >
                                    <Row gutter={[6, 6]}>
                                        {frequencyOptions.map((option) => (
                                            <Col
                                                xs={8}
                                                sm={6}
                                                md={4}
                                                key={option.value}
                                            >
                                                <Radio.Button
                                                    value={option.value}
                                                    style={{
                                                        width: '100%',
                                                        height: '45px',
                                                        display: 'flex',
                                                        flexDirection: 'column',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        borderRadius: '6px',
                                                        textAlign: 'center',
                                                        fontSize: '11px',
                                                        padding: '4px 2px'
                                                    }}
                                                >
                                                    <div style={{
                                                        fontSize: '14px',
                                                        marginBottom: '1px',
                                                        color: '#1890ff'
                                                    }}>
                                                        {option.icon}
                                                    </div>
                                                    <div style={{
                                                        fontSize: '10px',
                                                        fontWeight: '500',
                                                        lineHeight: '1.1'
                                                    }}>
                                                        {option.label}
                                                    </div>
                                                </Radio.Button>
                                            </Col>
                                        ))}
                                    </Row>
                                </Radio.Group>
                            </Form.Item>

                            {frequency !== 'once' && (
                                <div style={{
                                    paddingTop: '8px',
                                    borderTop: '1px solid #e6f4ff'
                                }}>
                                    {renderRecurringOptions()}
                                </div>
                            )}
                        </div>

                        <div className='bottomActionSection'>
                            <Form.Item style={{ marginBottom: 0 }}>
                                <Button
                                    type="primary"
                                    htmlType="submit"
                                    style={{
                                        height: '42px',
                                        borderRadius: '8px',
                                        fontWeight: '500',
                                    }}>
                                    {editRecordData ? 'Update' : 'Add Note'}
                                </Button>
                            </Form.Item>
                        </div>
                    </Form>
                </Modal>
            </>
        );

    return <div></div>;
}