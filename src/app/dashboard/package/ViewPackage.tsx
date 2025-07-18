"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import { Table, Tag, Card, Pagination, Input, Modal, Row, Col, Button, Image, Typography, Space, Divider } from "antd";
import { HeartOutlined, InfoCircleOutlined, TrophyOutlined, LeftOutlined, RightOutlined } from "@ant-design/icons";

const { Title, Text, Paragraph } = Typography;

export default function ViewPackage({ packageData, onClose, viewPackageToggle }) {
    const [currentImageIndex, setCurrentImageIndex] = useState(0);
    const slideInterval = useRef(null);

    const handleModalClose = () => {
        onClose();
    }

    console.info("packageDatapackageData", packageData);

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
            width={900}
            style={{ top: 20 }}
        >
            <div style={{ padding: '20px 0' }}>
                <Row gutter={24}>
                    {/* Left Column - Image Slideshow */}
                    <Col xs={24} md={12}>
                        <div style={{ position: 'relative', height: '100%' }}>
                            <div 
                            className="image-slideshow-wrapper"
                            style={{
                                position: 'relative',
                                width: '100%',
                                height: '100%',
                                overflow: 'hidden',
                                borderRadius: '12px'
                            }}>
                                <Image
                                    src={images[currentImageIndex].signedUrl}
                                    alt={images[currentImageIndex].alt || `Package image ${currentImageIndex + 1}`}
                                    style={{
                                        width: '100%',
                                        height: '100%',
                                        objectFit: 'cover',
                                        borderRadius: '12px'
                                    }}
                                    fallback="https://via.placeholder.com/400x300/1890ff/ffffff?text=Package+Image"
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
                                            left: '12px',
                                            transform: 'translateY(-50%)',
                                            background: 'rgba(0, 0, 0, 0.5)',
                                            color: 'white',
                                            border: 'none',
                                            borderRadius: '50%',
                                            width: '40px',
                                            height: '40px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center'
                                        }}
                                    />
                                    <Button
                                        type="text"
                                        icon={<RightOutlined />}
                                        onClick={goToNext}
                                        style={{
                                            position: 'absolute',
                                            top: '50%',
                                            right: '12px',
                                            transform: 'translateY(-50%)',
                                            background: 'rgba(0, 0, 0, 0.5)',
                                            color: 'white',
                                            border: 'none',
                                            borderRadius: '50%',
                                            width: '40px',
                                            height: '40px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center'
                                        }}
                                    />
                                </>
                            )}

                            {/* Heart Icon */}
                            <Button
                                type="text"
                                icon={<HeartOutlined />}
                                style={{
                                    position: 'absolute',
                                    top: '12px',
                                    right: '12px',
                                    background: 'rgba(255, 255, 255, 0.9)',
                                    border: 'none',
                                    borderRadius: '50%',
                                    width: '40px',
                                    height: '40px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                }}
                            />

                            {/* Dot Indicators - Only show if multiple images */}
                            {images.length > 1 && (
                                <div style={{
                                    position: 'absolute',
                                    bottom: '16px',
                                    left: '50%',
                                    transform: 'translateX(-50%)',
                                    display: 'flex',
                                    gap: '8px'
                                }}>
                                    {images.map((_, index) => (
                                        <button
                                            key={index}
                                            onClick={() => goToSlide(index)}
                                            style={{
                                                width: '10px',
                                                height: '10px',
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
                                    top: '12px',
                                    left: '12px',
                                    background: 'rgba(0, 0, 0, 0.7)',
                                    color: 'white',
                                    padding: '4px 8px',
                                    borderRadius: '12px',
                                    fontSize: '12px',
                                    fontWeight: 'bold'
                                }}>
                                    {currentImageIndex + 1} / {images.length}
                                </div>
                            )}
                        </div>
                    </Col>

                    {/* Right Column - Content */}
                    <Col xs={24} md={12}>
                        <div>
                            {/* Header with Best Seller Badge */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                                <Title level={2} style={{ margin: 0, color: '#1890ff', fontSize: '24px' }}>
                                    {packageName}
                                </Title>
                                {packageData.numberOfPurchases > 0 && (
                                    <div style={{ textAlign: 'right' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '4px' }}>
                                            <TrophyOutlined style={{ color: '#52c41a' }} />
                                            <Text strong style={{ color: '#52c41a' }}>Best Seller</Text>
                                        </div>
                                        <Text type="secondary" style={{ fontSize: '14px' }}>
                                            Sold {packageData.numberOfPurchases} times
                                        </Text>
                                    </div>
                                )}
                            </div>

                            {/* Tags */}
                            <div style={{ marginBottom: '16px' }}>
                                <Space wrap>
                                    {packageTags.map((tag, index) => (
                                        <Tag key={index} color="green" style={{ borderRadius: '16px', padding: '4px 12px' }}>
                                            {tag}
                                        </Tag>
                                    ))}
                                </Space>
                            </div>

                            {/* Description */}
                            <div style={{ marginBottom: '20px' }}>
                                <Text strong style={{ fontSize: '16px', color: '#333' }}>
                                    {packageDescription}
                                </Text>
                            </div>

                            {/* Benefits */}
                            <div style={{ marginBottom: '20px' }}>
                                {packageBenefits.map((benefit, index) => (
                                    <div key={index} style={{ marginBottom: '8px' }}>
                                        <Text style={{ color: '#52c41a', fontSize: '16px' }}>
                                            ✓ {benefit}
                                        </Text>
                                    </div>
                                ))}
                            </div>

                            {/* Alert */}
                            {packageAlert && (
                                <div style={{ marginBottom: '20px' }}>
                                    <Text style={{ color: '#ff4d4f', fontSize: '14px', fontWeight: 'bold' }}>
                                        {packageAlert}
                                    </Text>
                                </div>
                            )}

                            <Divider style={{ margin: '16px 0' }} />

                            {/* Pricing Section */}
                            <div style={{ marginBottom: '20px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                                    <Text type="secondary" style={{ fontSize: '14px' }}>
                                        Pricing Algorithm
                                    </Text>
                                    <InfoCircleOutlined style={{ color: '#bfbfbf' }} />
                                </div>

                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                                    {originalPrice && (
                                        <Text
                                            delete
                                            type="secondary"
                                            style={{ fontSize: '18px', color: '#ff4d4f' }}
                                        >
                                            {originalPrice}
                                        </Text>
                                    )}
                                    <Text strong style={{ fontSize: '24px', color: '#333' }}>
                                        {discountedPrice}
                                    </Text>
                                </div>

                                {taxInfo && (
                                    <Text type="secondary" style={{ fontSize: '12px' }}>
                                        {taxInfo}
                                    </Text>
                                )}
                            </div>

                            {/* Action Button */}
                            <Button
                                type="primary"
                                size="large"
                                block
                                style={{
                                    backgroundColor: '#1890ff',
                                    borderColor: '#1890ff',
                                    borderRadius: '8px',
                                    height: '48px',
                                    fontSize: '16px',
                                    fontWeight: 'bold'
                                }}
                            >
                                {buttonText}
                            </Button>
                        </div>
                    </Col>
                </Row>

                {/* Additional Package Information */}
                <Divider style={{ margin: '24px 0' }} />

                <Row gutter={24}>
                    <Col xs={24} md={8}>
                        <Card size="small" style={{ textAlign: 'center' }}>
                            <Text strong>Package Code</Text>
                            <br />
                            <Text type="secondary">{packageData.packageCode}</Text>
                        </Card>
                    </Col>
                    <Col xs={24} md={8}>
                        <Card size="small" style={{ textAlign: 'center' }}>
                            <Text strong>Price Level</Text>
                            <br />
                            <Text type="secondary">Level {packageData.priceLevel}</Text>
                        </Card>
                    </Col>
                    <Col xs={24} md={8}>
                        <Card size="small" style={{ textAlign: 'center' }}>
                            <Text strong>Room Upgrade</Text>
                            <br />
                            <Text type="secondary">{packageData.roomUpgrade ? 'Included' : 'Not Included'}</Text>
                        </Card>
                    </Col>
                </Row>
            </div>
        </Modal>
    );
}