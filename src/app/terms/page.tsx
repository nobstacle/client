"use client";

import { Typography, Card, Divider, Tag, Space } from 'antd';
import {
    FileTextOutlined,
    CheckCircleOutlined,
    UserOutlined,
    StopOutlined,
    EditOutlined,
    MailOutlined
} from '@ant-design/icons';

const { Title, Paragraph, Text } = Typography;

export default function Terms() {
    return (
        <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 py-12 px-4">
            <div className="max-w-5xl mx-auto">
                {/* Header */}
                <div className="text-center mb-12">
                    <Space direction="vertical" size="small">
                        <FileTextOutlined style={{ fontSize: 48, color: '#3b5998' }} />
                        <Title level={1} style={{ marginBottom: 8, color: '#1f2937' }}>
                            Terms and Conditions
                        </Title>
                        <Text type="secondary" style={{ fontSize: 16 }}>
                            for Nobstacle.com
                        </Text>
                        <Tag color="blue" style={{ marginTop: 8 }}>
                            Last Updated: 02.07.2026
                        </Tag>
                    </Space>
                </div>

                {/* Overview */}
                <Card className="mb-6 shadow-md" style={{ borderRadius: 12 }}>
                    <Space direction="vertical" size="large" style={{ width: '100%' }}>
                        <div>
                            <Title level={2} style={{ color: '#3b5998', marginBottom: 16 }}>
                                <UserOutlined /> Overview
                            </Title>
                            <Paragraph style={{ fontSize: 15, lineHeight: 1.8 }}>
                                Welcome to Nobstacle. By accessing or using our website and services, you agree to be bound by these
                                Terms and Conditions. Please read them carefully before using our platform.
                            </Paragraph>
                            <Paragraph style={{ fontSize: 15, lineHeight: 1.8 }}>
                                Nobstacle provides digital experience tools, including display and upselling solutions for businesses
                                such as hotels, hospitals, SPAs, and car rental companies. These terms govern your use of our website,
                                browser extension, and related services.
                            </Paragraph>
                        </div>
                    </Space>
                </Card>

                {/* Use of Service */}
                <Card className="mb-6 shadow-md" style={{ borderRadius: 12 }}>
                    <Title level={2} style={{ color: '#3b5998', marginBottom: 24 }}>
                        <CheckCircleOutlined /> Use of Service
                    </Title>
                    <Paragraph style={{ fontSize: 15, lineHeight: 1.8 }}>
                        You agree to use Nobstacle only for lawful purposes and in accordance with these Terms. You must not
                        misuse the service, attempt to gain unauthorized access to any systems, or interfere with the proper
                        working of the platform. All content, features, and functionality provided by Nobstacle are owned by
                        us and are protected by applicable intellectual property laws.
                    </Paragraph>
                </Card>

                {/* Accounts & Registration */}
                <Card className="mb-6 shadow-md" style={{ borderRadius: 12 }}>
                    <Title level={2} style={{ color: '#3b5998', marginBottom: 24 }}>
                        <UserOutlined /> Accounts &amp; Registration
                    </Title>
                    <Paragraph style={{ fontSize: 15, lineHeight: 1.8 }}>
                        When you create an account with us, you must provide accurate and complete information. You are
                        responsible for maintaining the confidentiality of your account credentials and for all activities that
                        occur under your account. You must notify us immediately of any unauthorized use of your account.
                    </Paragraph>
                </Card>

                {/* Restrictions */}
                <Card className="mb-6 shadow-md" style={{ borderRadius: 12 }}>
                    <Title level={2} style={{ color: '#3b5998', marginBottom: 24 }}>
                        <StopOutlined /> Restrictions
                    </Title>
                    <Paragraph style={{ fontSize: 15, lineHeight: 1.8 }}>
                        You may not reproduce, distribute, modify, create derivative works of, or publicly display any content
                        from Nobstacle without our prior written consent. You also agree not to use automated systems or software
                        to extract data from the service for commercial purposes without express permission.
                    </Paragraph>
                </Card>

                {/* Changes to Terms */}
                <Card className="mb-6 shadow-md" style={{ borderRadius: 12, backgroundColor: '#f0f9ff' }}>
                    <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                        <Title level={2} style={{ color: '#3b5998', marginBottom: 0 }}>
                            <EditOutlined /> Changes to These Terms
                        </Title>
                        <Paragraph style={{ fontSize: 15, marginBottom: 0 }}>
                            We reserve the right to update or modify these Terms at any time. Continued use of the service
                            after any such changes constitutes your acceptance of the new Terms. We will make reasonable
                            efforts to notify users of material changes via email or a prominent notice on our website.
                        </Paragraph>
                    </Space>
                </Card>

                {/* Contact */}
                <Card className="mb-6 shadow-md" style={{ borderRadius: 12, backgroundColor: '#f0f9ff' }}>
                    <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                        <Title level={2} style={{ color: '#3b5998', marginBottom: 0 }}>
                            <MailOutlined /> Contact Us
                        </Title>
                        <Paragraph style={{ fontSize: 15, marginBottom: 0 }}>
                            If you have any questions about these Terms and Conditions, please contact us at{' '}
                            <a href="mailto:info@nobstacle.com" style={{ color: '#3b5998' }}>info@nobstacle.com</a>.
                        </Paragraph>
                    </Space>
                </Card>

                {/* Footer */}
                <div className="text-center mt-12">
                    <Divider />
                    <Text type="secondary" style={{ fontSize: 14 }}>
                        &copy; 2026 Nobstacle LLC. All rights reserved.
                    </Text>
                </div>
            </div>
        </main>
    );
}
