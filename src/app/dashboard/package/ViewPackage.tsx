"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import { Table, Tag, Card, Pagination, Input, Modal, Row, Col, Button, Image, Typography, Space, Divider } from "antd";
import { InfoCircleOutlined, TrophyOutlined, LeftOutlined, RightOutlined } from "@ant-design/icons";

const { Title, Text, Paragraph } = Typography;

export default function ViewPackage({ packageData, onClose, viewPackageToggle }) {
    const [currentImageIndex, setCurrentImageIndex] = useState(0);
    const slideInterval = useRef(null);

    const handleModalClose = () => {
        onClose();
    }

    // Get images array with fallback
    const images = packageData?.signedImageUrls?.length > 0
        ? packageData.signedImageUrls
        : [{
            signedUrl: "https://images.unsplash.com/photo-1566073771259-6a8506099945?q=80&w=1170&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
            alt: "Default Package Image"
        }];

    // Auto-slide functionality
    useEffect(() => {
        if (images.length > 1) {
            slideInterval.current = setInterval(() => {
                setCurrentImageIndex((prevIndex) =>
                    prevIndex === images.length - 1 ? 0 : prevIndex + 1
                );
            }, 3000); // Change image every 3 seconds

            return () => {
                if (slideInterval.current) {
                    clearInterval(slideInterval.current);
                }
            };
        }
    }, [images.length]);

    // Manual navigation functions
    const goToPrevious = () => {
        // Clear auto-slide when user manually navigates
        if (slideInterval.current) {
            clearInterval(slideInterval.current);
        }
        setCurrentImageIndex(currentImageIndex === 0 ? images.length - 1 : currentImageIndex - 1);
    };

    const goToNext = () => {
        // Clear auto-slide when user manually navigates
        if (slideInterval.current) {
            clearInterval(slideInterval.current);
        }
        setCurrentImageIndex(currentImageIndex === images.length - 1 ? 0 : currentImageIndex + 1);
    };

    const goToSlide = (index) => {
        // Clear auto-slide when user manually navigates
        if (slideInterval.current) {
            clearInterval(slideInterval.current);
        }
        setCurrentImageIndex(index);
    };

    // Clean up interval on component unmount
    useEffect(() => {
        return () => {
            if (slideInterval.current) {
                clearInterval(slideInterval.current);
            }
        };
    }, []);

    if (!packageData) {
        return (
            <Modal
                open={viewPackageToggle}
                className="view-package-modal"
                onCancel={handleModalClose}
                footer={null}
                width={800}
            >
                <div>No package data available</div>
            </Modal>
        );
    }

    // Extract data with fallbacks
    const packageName = packageData.packageNames?.en || "Package Name";
    const packageDescription = packageData.packageDescriptions?.en || "Package Description";
    const packageBenefits = packageData.packageBenefits?.en || [];
    const packageTags = packageData.packageTags?.en || [];
    const packageAlert = packageData.packageAlerts?.en || "";
    const buttonText = packageData.buttonTexts?.en || "Take this deal";
    const currency = packageData.currencies?.en || "USD";
    const taxInfo = packageData.taxInformation?.en || "";

    // Format prices
    const originalPrice = packageData.originalPrice ? `${currency} ${packageData.originalPrice}` : "";
    const discountedPrice = packageData.discountedPrice ? `${currency} ${packageData.discountedPrice}` : "";

    return (
        <Modal
            open={viewPackageToggle}
            className="view-package-modal"
            onCancel={handleModalClose}
            footer={null}
            width={1000}
            style={{ top: 20 }}
            bodyStyle={{ padding: '16px' }}
        >
            <div>
                <Row gutter={16}>
                    {/* Left Column - Square Image */}
                    <Col xs={24} md={10}>
                        <div style={{ position: 'relative', height: '280px' }}>
                            <div
                                className="image-slideshow-wrapper"
                                style={{
                                    position: 'relative',
                                    width: '100%',
                                    height: '100%',
                                    overflow: 'hidden',
                                    borderRadius: '8px'
                                }}>
                                <Image
                                    src={images[currentImageIndex].signedUrl}
                                    alt={images[currentImageIndex].alt || `Package image ${currentImageIndex + 1}`}
                                    style={{
                                        width: '100%',
                                        height: '100%',
                                        objectFit: 'cover',
                                        borderRadius: '8px'
                                    }}
                                    fallback="https://via.placeholder.com/400x280/1890ff/ffffff?text=Package+Image"
                                    preview={false}
                                />
                            </div>

                            {/* Navigation Arrows - Only show if multiple images */}
                            {images.length > 1 && (
                                <>
                                    <Button
                                        type="text"
                                        icon={<LeftOutlined />}
                                        onClick={goToPrevious}
                                        style={{
                                            position: 'absolute',
                                            top: '50%',
                                            left: '8px',
                                            transform: 'translateY(-50%)',
                                            background: 'rgba(0, 0, 0, 0.6)',
                                            color: 'white',
                                            border: 'none',
                                            borderRadius: '50%',
                                            width: '32px',
                                            height: '32px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            fontSize: '12px'
                                        }}
                                    />
                                    <Button
                                        type="text"
                                        icon={<RightOutlined />}
                                        onClick={goToNext}
                                        style={{
                                            position: 'absolute',
                                            top: '50%',
                                            right: '8px',
                                            transform: 'translateY(-50%)',
                                            background: 'rgba(0, 0, 0, 0.6)',
                                            color: 'white',
                                            border: 'none',
                                            borderRadius: '50%',
                                            width: '32px',
                                            height: '32px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            fontSize: '12px'
                                        }}
                                    />
                                </>
                            )}

                            {/* Dot Indicators - Only show if multiple images */}
                            {images.length > 1 && (
                                <div style={{
                                    position: 'absolute',
                                    bottom: '12px',
                                    left: '50%',
                                    transform: 'translateX(-50%)',
                                    display: 'flex',
                                    gap: '6px'
                                }}>
                                    {images.map((_, index) => (
                                        <button
                                            key={index}
                                            onClick={() => goToSlide(index)}
                                            style={{
                                                width: '8px',
                                                height: '8px',
                                                borderRadius: '50%',
                                                border: 'none',
                                                background: index === currentImageIndex ? '#1890ff' : 'rgba(255, 255, 255, 0.7)',
                                                cursor: 'pointer',
                                                transition: 'background-color 0.3s ease'
                                            }}
                                        />
                                    ))}
                                </div>
                            )}

                            {/* Image Counter */}
                            {images.length > 1 && (
                                <div style={{
                                    position: 'absolute',
                                    top: '8px',
                                    left: '8px',
                                    background: 'rgba(0, 0, 0, 0.7)',
                                    color: 'white',
                                    padding: '2px 6px',
                                    borderRadius: '8px',
                                    fontSize: '11px',
                                    fontWeight: 'bold'
                                }}>
                                    {currentImageIndex + 1} / {images.length}
                                </div>
                            )}
                        </div>
                    </Col>

                    {/* Right Column - Content */}
                    <Col xs={24} md={14}>
                        <div style={{ height: '280px', display: 'flex', flexDirection: 'column' }}>
                            {/* Header Section */}
                            <div style={{ marginBottom: '12px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                                    <Title level={3} style={{ margin: 0, color: '#1890ff', fontSize: '20px', lineHeight: '24px' }}>
                                        {packageName}
                                    </Title>
                                    <div style={{ textAlign: 'right' }}>
                                        <Text strong style={{ color: '#333', fontSize: '14px' }}>Best Seller</Text>
                                        <br />
                                        <Text type="secondary" style={{ fontSize: '12px' }}>
                                            Sold {packageData.numberOfPurchases || 174} times
                                        </Text>
                                    </div>
                                </div>

                                {/* Tags */}
                                <div style={{ marginBottom: '8px' }}>
                                    <Space wrap size="small">
                                        {packageTags.map((tag, index) => (
                                            <Tag key={index} color="green" style={{
                                                borderRadius: '12px',
                                                padding: '2px 8px',
                                                fontSize: '12px',
                                                margin: '2px'
                                            }}>
                                                {tag}
                                            </Tag>
                                        ))}
                                    </Space>
                                </div>
                            </div>

                            <Row gutter={16}>
                                <Col md={12} xs={24}>
                                    {/* Description and Benefits - Scrollable */}
                                    <div style={{
                                        marginBottom: '12px',
                                        paddingRight: '8px'
                                    }}>
                                        {/* Description */}
                                        <div style={{ marginBottom: '12px' }}>
                                            <Text style={{ fontSize: '14px', color: '#666', lineHeight: '20px' }}>
                                                {packageDescription}
                                            </Text>
                                        </div>

                                        {/* Benefits */}
                                        <div style={{ marginBottom: '12px' }}>
                                            {packageBenefits.map((benefit, index) => (
                                                <div key={index} style={{ marginBottom: '4px' }}>
                                                    <Text style={{ color: '#52c41a', fontSize: '13px', lineHeight: '18px' }}>
                                                        ✓ {benefit}
                                                    </Text>
                                                </div>
                                            ))}
                                        </div>

                                        {/* Alert */}
                                        {packageAlert && (
                                            <div style={{ marginBottom: '12px' }}>
                                                <Text style={{ color: '#ff4d4f', fontSize: '12px', fontWeight: 'bold' }}>
                                                    {packageAlert}
                                                </Text>
                                            </div>
                                        )}
                                    </div>
                                </Col>
                                <Col md={12} xs={24}>
                                    {/* Bottom Section - Exact Layout Match */}
                                    <div style={{ marginTop: 'auto' }}>
                                        {/* Price Section on Right */}
                                        <div style={{
                                            display: 'flex',
                                            justifyContent: 'flex-end',
                                            alignItems: 'center',
                                            marginBottom: '8px'
                                        }}>
                                            <div style={{ textAlign: 'right' }}>
                                                <div style={{ marginBottom: '2px' }}>
                                                    <Text type="secondary" style={{ fontSize: '12px' }}>
                                                        Posting Algorithm
                                                    </Text>
                                                </div>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'flex-end' }}>
                                                    {originalPrice && (
                                                        <Text
                                                            delete
                                                            style={{ fontSize: '14px', color: '#ff4d4f' }}
                                                        >
                                                            {currency} {packageData.originalPrice}
                                                        </Text>
                                                    )}
                                                    <Text strong style={{ fontSize: '20px', color: '#333' }}>
                                                        {currency} {packageData.discountedPrice}
                                                    </Text>
                                                    <InfoCircleOutlined style={{ color: '#999', fontSize: '14px' }} />
                                                </div>
                                                {taxInfo && (
                                                    <Text type="secondary" style={{ fontSize: '11px' }}>
                                                        {taxInfo}
                                                    </Text>
                                                )}
                                            </div>
                                        </div>

                                        {/* Button Section */}
                                        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                                            <Button
                                                type="primary"
                                                size="large"
                                                style={{
                                                    backgroundColor: '#1890ff',
                                                    borderColor: '#1890ff',
                                                    borderRadius: '6px',
                                                    fontSize: '14px',
                                                    fontWeight: 'bold',
                                                    minWidth: '140px',
                                                    height: '40px'
                                                }}
                                            >
                                                {buttonText}
                                            </Button>
                                        </div>
                                    </div></Col>

                            </Row>
                        </div>
                    </Col>
                </Row>
            </div>
        </Modal>
    );
}