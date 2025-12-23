"use client";

import { Typography, Card, Divider, List, Tag, Space } from 'antd';
import {
    LockOutlined,
    SafetyCertificateOutlined,
    DatabaseOutlined,
    KeyOutlined,
    CloudServerOutlined,
    UserOutlined,
    EnvironmentOutlined,
    MessageOutlined,
    SettingOutlined,
    SecurityScanOutlined
} from '@ant-design/icons';

const { Title, Paragraph, Text } = Typography;

export default function Privacy() {
    const permissionData = [
        {
            icon: <KeyOutlined style={{ fontSize: 24, color: '#3b5998' }} />,
            title: 'Cookies',
            purpose: 'Authentication',
            description: 'Used to verify your session with the Nobstacle platform so you don\'t have to log in repeatedly.'
        },
        {
            icon: <DatabaseOutlined style={{ fontSize: 24, color: '#3b5998' }} />,
            title: 'Storage',
            purpose: 'Persistence',
            description: 'Saves your preferences and login state locally on your device.'
        },
        {
            icon: <SettingOutlined style={{ fontSize: 24, color: '#3b5998' }} />,
            title: 'webRequest',
            purpose: 'Core Functionality',
            description: 'Used to intercept and modify HTTP headers in real-time based on your configurations.'
        },
        {
            icon: <CloudServerOutlined style={{ fontSize: 24, color: '#3b5998' }} />,
            title: 'Host Permissions',
            purpose: 'API Communication',
            description: 'Enables the extension to communicate with Nobstacle API endpoints to process your header requests.'
        },
        {
            icon: <SecurityScanOutlined style={{ fontSize: 24, color: '#3b5998' }} />,
            title: 'Tabs / activeTab',
            purpose: 'Context Awareness',
            description: 'Allows the extension to apply your rules to the specific website you are currently visiting and determine if a rule should be active.'
        }
    ];

    const dataCollectionItems = [
        {
            icon: <KeyOutlined />,
            title: 'Authentication Information',
            description: 'We use cookies and local storage to verify your identity and link the extension to your Nobstacle account.'
        },
        {
            icon: <SettingOutlined />,
            title: 'User Activity & Configuration',
            description: 'We store your custom header rules and site-specific preferences to ensure your configurations persist across sessions.'
        },
        {
            icon: <MessageOutlined />,
            title: 'Personal Communications',
            description: 'Information you provide when contacting support or providing feedback.'
        },
        {
            icon: <EnvironmentOutlined />,
            title: 'Location',
            description: 'Basic location data (derived from IP) may be used for security logging and to comply with regional data regulations.'
        }
    ];

    const securityFeatures = [
        {
            icon: <LockOutlined />,
            title: 'Real-Time Processing',
            description: 'Header manipulations performed via the webRequest API happen locally or via direct API calls to facilitate your request. We do not "log" the content of your private browsing traffic beyond what is necessary to execute your requested header rules.'
        },
        {
            icon: <SafetyCertificateOutlined />,
            title: 'No Sale of Data',
            description: 'We do not sell, rent, or trade your personal information or browsing activity to third parties.'
        },
        {
            icon: <CloudServerOutlined />,
            title: 'Third-Party Services',
            description: 'We may use secure third-party processors for hosting (e.g., AWS/Google Cloud) or analytics, but they are bound by strict confidentiality agreements.'
        }
    ];

    const userRights = [
        'Access or Delete: You may request a copy of your data or the deletion of your account at any time.',
        'Revoke Permissions: You can disable extension permissions or uninstall the extension through your browser settings, which will immediately stop all data collection.'
    ];

    return (
        <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 py-12 px-4">
            <div className="max-w-5xl mx-auto">
                {/* Header */}
                <div className="text-center mb-12">
                    <Space direction="vertical" size="small">
                        <LockOutlined style={{ fontSize: 48, color: '#3b5998' }} />
                        <Title level={1} style={{ marginBottom: 8, color: '#1f2937' }}>
                            Privacy Policy
                        </Title>
                        <Text type="secondary" style={{ fontSize: 16 }}>
                            for Nobstacle.com & Browser Extension
                        </Text>
                        <Tag color="blue" style={{ marginTop: 8 }}>
                            Last Updated: 23.12.2025
                        </Tag>
                    </Space>
                </div>

                {/* Overview Section */}
                <Card
                    className="mb-6 shadow-md"
                    style={{ borderRadius: 12 }}
                >
                    <Space direction="vertical" size="large" style={{ width: '100%' }}>
                        <div>
                            <Title level={2} style={{ color: '#3b5998', marginBottom: 16 }}>
                                <UserOutlined /> Overview
                            </Title>
                            <Paragraph style={{ fontSize: 15, lineHeight: 1.8 }}>
                                Welcome to Nobstacle.com. We value your privacy and are committed to protecting your personal data.
                                This Privacy Policy explains how we collect, use, and safeguard your information when you visit our
                                website or use our services.
                            </Paragraph>
                            <Paragraph style={{ fontSize: 15, lineHeight: 1.8 }}>
                                Nobstacle ("we," "us," or "our") provides tools for header manipulation and web request management.
                                This policy outlines how we handle your data through our website and browser extension. Our core
                                principle is to facilitate your workflow while maintaining the highest standards of data integrity.
                            </Paragraph>
                        </div>
                    </Space>
                </Card>

                {/* Information We Collect */}
                <Card
                    className="mb-6 shadow-md"
                    style={{ borderRadius: 12 }}
                >
                    <Title level={2} style={{ color: '#3b5998', marginBottom: 24 }}>
                        <DatabaseOutlined /> Information We Collect and Why
                    </Title>
                    <Paragraph style={{ fontSize: 15, marginBottom: 24 }}>
                        We collect only the data necessary to provide our core services:
                    </Paragraph>

                    <List
                        dataSource={dataCollectionItems}
                        renderItem={(item) => (
                            <List.Item style={{ border: 'none', padding: '16px 0' }}>
                                <Card
                                    size="small"
                                    style={{
                                        width: '100%',
                                        backgroundColor: '#f8fafc',
                                        border: '1px solid #e2e8f0'
                                    }}
                                >
                                    <Space align="start" size="middle">
                                        <div style={{ fontSize: 24, color: '#3b5998' }}>
                                            {item.icon}
                                        </div>
                                        <div style={{ flex: 1 }}>
                                            <Text strong style={{ fontSize: 16, display: 'block', marginBottom: 4 }}>
                                                {item.title}
                                            </Text>
                                            <Text type="secondary" style={{ fontSize: 14 }}>
                                                {item.description}
                                            </Text>
                                        </div>
                                    </Space>
                                </Card>
                            </List.Item>
                        )}
                    />
                </Card>

                {/* Extension Permissions */}
                <Card
                    className="mb-6 shadow-md"
                    style={{ borderRadius: 12 }}
                >
                    <Title level={2} style={{ color: '#3b5998', marginBottom: 16 }}>
                        <SettingOutlined /> Extension Permissions & Technical Transparency
                    </Title>
                    <Paragraph style={{ fontSize: 15, marginBottom: 32 }}>
                        To function as a header manipulation tool, the extension requires specific browser permissions.
                        We use these strictly as follows:
                    </Paragraph>

                    <Space direction="vertical" size="large" style={{ width: '100%' }}>
                        {permissionData.map((item, index) => (
                            <Card
                                key={index}
                                style={{
                                    backgroundColor: '#f8fafc',
                                    border: '1px solid #e2e8f0',
                                    borderLeft: '4px solid #3b5998',
                                    borderRadius: 8
                                }}
                            >
                                <Space direction="vertical" size="small" style={{ width: '100%' }}>
                                    <Space align="center" size="middle">
                                        {item.icon}
                                        <div>
                                            <Text strong style={{ fontSize: 17, display: 'block', color: '#1f2937' }}>
                                                {item.title}
                                            </Text>
                                            <Tag color="blue" style={{ marginTop: 4, fontSize: 12 }}>
                                                {item.purpose}
                                            </Tag>
                                        </div>
                                    </Space>
                                    <Paragraph style={{ marginBottom: 0, marginLeft: 36, fontSize: 14, color: '#6b7280' }}>
                                        {item.description}
                                    </Paragraph>
                                </Space>
                            </Card>
                        ))}
                    </Space>
                </Card>

                {/* Data Security */}
                <Card
                    className="mb-6 shadow-md"
                    style={{ borderRadius: 12 }}
                >
                    <Title level={2} style={{ color: '#3b5998', marginBottom: 24 }}>
                        <SafetyCertificateOutlined /> Data Security and Processing
                    </Title>

                    <List
                        dataSource={securityFeatures}
                        renderItem={(item) => (
                            <List.Item style={{ border: 'none', padding: '16px 0' }}>
                                <Space align="start" size="middle" style={{ width: '100%' }}>
                                    <div style={{ fontSize: 32, color: '#10b981' }}>
                                        {item.icon}
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <Text strong style={{ fontSize: 16, display: 'block', marginBottom: 8 }}>
                                            {item.title}
                                        </Text>
                                        <Paragraph style={{ marginBottom: 0, fontSize: 14 }}>
                                            {item.description}
                                        </Paragraph>
                                    </div>
                                </Space>
                            </List.Item>
                        )}
                    />
                </Card>

                {/* Your Rights */}
                <Card
                    className="mb-6 shadow-md"
                    style={{ borderRadius: 12 }}
                >
                    <Title level={2} style={{ color: '#3b5998', marginBottom: 24 }}>
                        <UserOutlined /> Your Rights and Control
                    </Title>
                    <Paragraph style={{ fontSize: 15, marginBottom: 16 }}>
                        You have the right to:
                    </Paragraph>
                    <List
                        dataSource={userRights}
                        renderItem={(item) => (
                            <List.Item style={{ border: 'none', padding: '12px 0' }}>
                                <Space align="start">
                                    <div style={{
                                        width: 8,
                                        height: 8,
                                        borderRadius: '50%',
                                        backgroundColor: '#3b5998',
                                        marginTop: 8
                                    }} />
                                    <Text style={{ fontSize: 15 }}>{item}</Text>
                                </Space>
                            </List.Item>
                        )}
                    />
                </Card>

                {/* Changes to Policy */}
                <Card
                    className="mb-6 shadow-md"
                    style={{ borderRadius: 12, backgroundColor: '#f0f9ff' }}
                >
                    <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                        <Title level={2} style={{ color: '#3b5998', marginBottom: 0 }}>
                            <LockOutlined /> Changes to This Policy
                        </Title>
                        <Paragraph style={{ fontSize: 15, marginBottom: 0 }}>
                            We may update this policy to reflect changes in browser requirements or our services.
                            We will notify users of significant changes via the email associated with your Nobstacle account.
                        </Paragraph>
                    </Space>
                </Card>

                {/* Footer */}
                <div className="text-center mt-12">
                    <Divider />
                    <Text type="secondary" style={{ fontSize: 14 }}>
                        © 2025 Nobstacle.com. All rights reserved.
                    </Text>
                </div>
            </div>
        </main>
    );
}