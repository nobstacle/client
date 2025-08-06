"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import {
    Modal,
    Row,
    Col,
    Image,
    Typography,
    Space,
    Divider,
    Tag,
    Card,
    Badge,
    Button,
    Tooltip
} from "antd";
import {
    InfoCircleOutlined,
    TrophyOutlined,
    LeftOutlined,
    RightOutlined,
    CalendarOutlined,
    DollarOutlined,
    PercentageOutlined,
    CheckCircleOutlined,
    ExclamationCircleOutlined
} from "@ant-design/icons";
import { FaChartLine } from "react-icons/fa";

const { Title, Text, Paragraph } = Typography;

export default function ViewCategoryModal({ packageData, onClose, viewCategoryToggle }) {
    const [currentImageIndex, setCurrentImageIndex] = useState(0);

    const handleModalClose = () => {
        onClose();
    };

    const handlePrevImage = () => {
        setCurrentImageIndex(prev =>
            prev === 0 ? (packageData?.signedImages?.length || 1) - 1 : prev - 1
        );
    };

    const handleNextImage = () => {
        setCurrentImageIndex(prev =>
            prev === (packageData?.signedImages?.length || 1) - 1 ? 0 : prev + 1
        );
    };

    // const getPriceLevelText = (level) => {
    //     const levels = {
    //         1: { text: "Budget", color: "green" },
    //         2: { text: "Standard", color: "blue" },
    //         3: { text: "Premium", color: "gold" },
    //         4: { text: "Luxury", color: "purple" },
    //         5: { text: "Elite", color: "red" }
    //     };
    //     return levels[level] || { text: "Standard", color: "blue" };
    // };

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    if (!packageData) return null;

    // const priceLevel = getPriceLevelText(packageData.priceLevel);
    const hasImages = packageData.signedImages && packageData.signedImages.length > 0;

    return (
        <Modal
            open={viewCategoryToggle}
            className="view-category-modal"
            onCancel={handleModalClose}
            footer={null}
            width={1000}
            style={{ top: 20 }}
            bodyStyle={{ padding: 0 }}
        >
            <div style={{ overflow: 'hidden', borderRadius: '8px' }}>
                <Row gutter={0} style={{ minHeight: '500px' }}>
                    {/* Left Column - Image Gallery */}
                    <Col xs={24} md={12}>
                        <div style={{
                            position: 'relative',
                            height: '500px',
                            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}>
                            {hasImages ? (
                                <>
                                    <Image
                                        src={packageData.signedImages[currentImageIndex].signedUrl}
                                        alt={packageData.name}
                                        style={{
                                            width: '100%',
                                            height: '100%',
                                            objectFit: 'cover'
                                        }}
                                        preview={false}
                                    />

                                    {/* Image Navigation */}
                                    {packageData.signedImages.length > 1 && (
                                        <>
                                            <Button
                                                type="text"
                                                icon={<LeftOutlined />}
                                                onClick={handlePrevImage}
                                                style={{
                                                    position: 'absolute',
                                                    left: '16px',
                                                    top: '50%',
                                                    transform: 'translateY(-50%)',
                                                    background: 'rgba(0,0,0,0.5)',
                                                    color: 'white',
                                                    border: 'none',
                                                    borderRadius: '50%',
                                                    width: '40px',
                                                    height: '40px'
                                                }}
                                            />
                                            <Button
                                                type="text"
                                                icon={<RightOutlined />}
                                                onClick={handleNextImage}
                                                style={{
                                                    position: 'absolute',
                                                    right: '16px',
                                                    top: '50%',
                                                    transform: 'translateY(-50%)',
                                                    background: 'rgba(0,0,0,0.5)',
                                                    color: 'white',
                                                    border: 'none',
                                                    borderRadius: '50%',
                                                    width: '40px',
                                                    height: '40px'
                                                }}
                                            />

                                            {/* Image Indicators */}
                                            <div style={{
                                                position: 'absolute',
                                                bottom: '16px',
                                                left: '50%',
                                                transform: 'translateX(-50%)',
                                                display: 'flex',
                                                gap: '8px'
                                            }}>
                                                {packageData.signedImages.map((_, index) => (
                                                    <div
                                                        key={index}
                                                        style={{
                                                            width: '8px',
                                                            height: '8px',
                                                            borderRadius: '50%',
                                                            background: index === currentImageIndex ? 'white' : 'rgba(255,255,255,0.5)',
                                                            cursor: 'pointer'
                                                        }}
                                                        onClick={() => setCurrentImageIndex(index)}
                                                    />
                                                ))}
                                            </div>
                                        </>
                                    )}

                                    {/* Sold Out Overlay */}
                                    {packageData.soldOut && (
                                        <div style={{
                                            position: 'absolute',
                                            top: 0,
                                            left: 0,
                                            right: 0,
                                            bottom: 0,
                                            background: 'rgba(0,0,0,0.7)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center'
                                        }}>
                                            <Tag color="red" style={{ fontSize: '18px', padding: '8px 16px' }}>
                                                SOLD OUT
                                            </Tag>
                                        </div>
                                    )}
                                </>
                            ) : (
                                <div style={{ textAlign: 'center', color: 'white' }}>
                                    <InfoCircleOutlined style={{ fontSize: '48px', marginBottom: '16px' }} />
                                    <Text style={{ color: 'white', fontSize: '16px' }}>No Image Available</Text>
                                </div>
                            )}
                        </div>
                    </Col>

                    {/* Right Column - Details */}
                    <Col xs={24} md={12}>
                        <div style={{ padding: '0px 32px', height: '500px', overflowY: 'auto', marginTop:'1rem' }}>
                            {/* Header */}
                            <Space direction="vertical" size="large" style={{ width: '100%' }}>
                                <div>
                                    <Space align="start" style={{ width: '100%', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <Title level={2} style={{ margin: 0, color: '#1f2937' }}>
                                            {packageData.name}
                                        </Title>
                                        <Badge
                                            status={packageData.soldOut ? "error" : "success"}
                                            text={packageData.soldOut ? "Sold Out" : "Available"}
                                        />
                                    </Space>
                                </div>

                                <Divider style={{ margin: '8px 0' }} />

                                {/* Key Information Cards */}
                                <Row gutter={[12, 12]}>
                                    <Col span={12}>
                                        <Card size="small" style={{ textAlign: 'center', background: '#f8fafc' }}>
                                            <Space direction="vertical" size="small" className="customSpace">
                                                <FaChartLine style={{ fontSize: '20px', color: '#10b981' }} />
                                                <div>
                                                    <Text strong style={{ fontSize: '16px' }}>
                                                        Price Level Value
                                                    </Text>
                                                    <br />
                                                    <Text style={{ fontSize: '12px' }}>
                                                        {packageData.priceLevel}
                                                    </Text>
                                                </div>
                                            </Space>
                                        </Card>
                                    </Col>
                                    <Col span={12}>
                                        <Card size="small" style={{ textAlign: 'center', background: '#f8fafc' }}>
                                            <Space direction="vertical" size="small" className="customSpace">
                                                <PercentageOutlined style={{ fontSize: '20px', color: '#10b981' }} />
                                                <div>
                                                    <Text strong style={{ fontSize: '16px' }}>
                                                        Tax Rate
                                                    </Text>
                                                    <br />
                                                    <Text style={{ fontSize: '12px' }}>
                                                        {packageData.taxPercentage}%
                                                    </Text>
                                                </div>
                                            </Space>
                                        </Card>
                                    </Col>
                                </Row>

                                {/* Package Information */}
                                <Card
                                    title={
                                        <Space>
                                            <InfoCircleOutlined />
                                            <Text strong>Package Details</Text>
                                        </Space>
                                    }
                                    size="small"
                                    style={{ background: '#fafafa' }}
                                >
                                    <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                                        <Row justify="space-between">
                                            <Text>Total Packages:</Text>
                                            <Text strong>{packageData.packages?.length || 0}</Text>
                                        </Row>
                                        <Row justify="space-between">
                                            <Text>Total Images:</Text>
                                            <Text strong>{packageData.signedImages?.length || 0}</Text>
                                        </Row>
                                        <Row justify="space-between">
                                            <Text>Status:</Text>
                                            <Tag
                                                color={packageData.soldOut ? "red" : "green"}
                                                icon={packageData.soldOut ? <ExclamationCircleOutlined /> : <CheckCircleOutlined />}
                                            >
                                                {packageData.soldOut ? "Sold Out" : "Available"}
                                            </Tag>
                                        </Row>
                                    </Space>
                                </Card>

                                {/* Timestamps */}
                                <Card
                                    size="small"
                                    style={{ background: '#f0f9ff' }}
                                    title={
                                        <Space>
                                            <CalendarOutlined />
                                            <Text strong>Timeline</Text>
                                        </Space>
                                    }
                                >
                                    <Space direction="vertical" size="small" style={{ width: '100%' }}>
                                        <Row justify="space-between">
                                            <Text type="secondary">Created:</Text>
                                            <Tooltip title={formatDate(packageData.createdAt)}>
                                                <Text style={{ fontSize: '12px' }}>
                                                    {new Date(packageData.createdAt).toLocaleDateString()}
                                                </Text>
                                            </Tooltip>
                                        </Row>
                                        <Row justify="space-between">
                                            <Text type="secondary">Updated:</Text>
                                            <Tooltip title={formatDate(packageData.updatedAt)}>
                                                <Text style={{ fontSize: '12px' }}>
                                                    {new Date(packageData.updatedAt).toLocaleDateString()}
                                                </Text>
                                            </Tooltip>
                                        </Row>
                                    </Space>
                                </Card>

                                {/* Action Buttons */}
                                <div style={{ marginTop: 'auto', paddingTop: '16px' }}>
                                    <Row gutter={12}>
                                        <Col span={12}>
                                            <Button
                                                type="primary"
                                                block
                                                disabled={packageData.soldOut}
                                                style={{ height: '40px' }}
                                            >
                                                {packageData.soldOut ? "Sold Out" : "View Packages"}
                                            </Button>
                                        </Col>
                                        <Col span={12}>
                                            <Button
                                                block
                                                onClick={handleModalClose}
                                                style={{ height: '40px' }}
                                            >
                                                Close
                                            </Button>
                                        </Col>
                                    </Row>
                                </div>
                            </Space>
                        </div>
                    </Col>
                </Row>
            </div>
        </Modal>
    );
};