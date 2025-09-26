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
    Tooltip,
    Collapse,
    List,
    Tabs
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
    ExclamationCircleOutlined,
    // PackageOutlined,
    TagsOutlined,
    GiftOutlined,
    StarOutlined,
    PlayCircleOutlined,
    PictureOutlined
} from "@ant-design/icons";
import { FaChartLine } from "react-icons/fa";
import { FiPackage } from "react-icons/fi";

const { Title, Text, Paragraph } = Typography;
const { Panel } = Collapse;
const { TabPane } = Tabs;

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

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const formatPrice = (price) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD'
        }).format(price);
    };

    const getCalculationMethodText = (method) => {
        const methods = {
            'PRICE_PER_NIGHT': 'Per Night',
            'PRICE_PER_DAY': 'Per Day',
            'FIXED_PRICE': 'Fixed Price',
            'PRICE_PER_PERSON': 'Per Person'
        };
        return methods[method] || method;
    };

    const renderPackageCard = (pkg, relationType) => {
        const relationTypeColors = {
            'packages': 'blue',
            'fromCategoryPackages': 'green',
            'toCategoryPackages': 'orange'
        };

        const relationTypeTexts = {
            'packages': 'Main Package',
            'fromCategoryPackages': 'Source Package',
            'toCategoryPackages': 'Destination Package'
        };

        return (
            <Card
                key={pkg.id}
                size="small"
                style={{ marginBottom: '12px' }}
                title={
                    <Space>
                        <FiPackage />
                        <Text strong>{pkg.packageNames?.en || `Package ${pkg.packageCode}`}</Text>
                        <Tag color={relationTypeColors[relationType]}>
                            {relationTypeTexts[relationType]}
                        </Tag>
                    </Space>
                }
                extra={
                    <Badge
                        status={pkg.active ? "success" : "error"}
                        text={pkg.active ? "Active" : "Inactive"}
                    />
                }
            >
                <Row gutter={[12, 8]}>
                    <Col span={12}>
                        <Text type="secondary">Package Code:</Text>
                        <br />
                        <Text strong>{pkg.packageCode}</Text>
                    </Col>
                    <Col span={12}>
                        <Text type="secondary">Calculation Method:</Text>
                        <br />
                        <Text>{getCalculationMethodText(pkg.calculationMethod)}</Text>
                    </Col>
                    <Col span={12}>
                        <Text type="secondary">Original Price:</Text>
                        <br />
                        <Text strong style={{ color: '#f50' }}>
                            {formatPrice(pkg.originalPrice)} {pkg.currencies?.en || ''}
                        </Text>
                    </Col>
                    <Col span={12}>
                        <Text type="secondary">Discounted Price:</Text>
                        <br />
                        <Text strong style={{ color: '#52c41a' }}>
                            {formatPrice(pkg.discountedPrice)} {pkg.currencies?.en || ''}
                        </Text>
                    </Col>
                    <Col span={12}>
                        <Text type="secondary">Tax Percentage:</Text>
                        <br />
                        <Text>{pkg.taxPercentage}%</Text>
                    </Col>
                    <Col span={12}>
                        <Text type="secondary">Total Sold:</Text>
                        <br />
                        <Text strong>{pkg.totalPackagesSold}</Text>
                    </Col>
                </Row>

                {/* Package Description */}
                {pkg.packageDescriptions?.en && (
                    <div style={{ marginTop: '12px' }}>
                        <Text type="secondary">Description:</Text>
                        <Paragraph style={{ marginBottom: '8px' }}>
                            {pkg.packageDescriptions.en}
                        </Paragraph>
                    </div>
                )}

                {/* Package Benefits */}
                {pkg.packageBenefits?.en && pkg.packageBenefits.en.length > 0 && (
                    <div style={{ marginTop: '12px' }}>
                        <Text type="secondary">Benefits:</Text>
                        <div style={{ marginTop: '4px' }}>
                            {pkg.packageBenefits.en.map((benefit, index) => (
                                <Tag key={index} color="blue" style={{ margin: '2px' }}>
                                    {benefit}
                                </Tag>
                            ))}
                        </div>
                    </div>
                )}

                {/* Package Tags */}
                {pkg.packageTags?.en && pkg.packageTags.en.length > 0 && (
                    <div style={{ marginTop: '12px' }}>
                        <Text type="secondary">Tags:</Text>
                        <div style={{ marginTop: '4px' }}>
                            {pkg.packageTags.en.map((tag, index) => (
                                <Tag key={index} color="green" style={{ margin: '2px' }}>
                                    <TagsOutlined /> {tag}
                                </Tag>
                            ))}
                        </div>
                    </div>
                )}

                {/* Media Information */}
                <Row gutter={[12, 8]} style={{ marginTop: '12px' }}>
                    <Col span={12}>
                        <Space>
                            <PictureOutlined style={{ color: '#1890ff' }} />
                            <Text type="secondary">Images: {pkg.images?.length || 0}</Text>
                        </Space>
                    </Col>
                    <Col span={12}>
                        <Space>
                            <PlayCircleOutlined style={{ color: '#f50' }} />
                            <Text type="secondary">Videos: {pkg.videos?.length || 0}</Text>
                        </Space>
                    </Col>
                </Row>

                {/* Special Features */}
                <Row gutter={[12, 8]} style={{ marginTop: '8px' }}>
                    {pkg.roomUpgrade && (
                        <Col span={12}>
                            <Tag color="gold" icon={<StarOutlined />}>
                                Room Upgrade Available
                            </Tag>
                        </Col>
                    )}
                    {pkg.incentivePercentage > 0 && (
                        <Col span={12}>
                            <Tag color="purple">
                                {pkg.incentivePercentage}% Incentive
                            </Tag>
                        </Col>
                    )}
                </Row>

                {/* Purchase and Alert Information */}
                {(pkg.packageAlerts?.en || pkg.popularityTexts?.en) && (
                    <div style={{ marginTop: '12px' }}>
                        {pkg.packageAlerts?.en && (
                            <Tag color="orange" style={{ marginBottom: '4px' }}>
                                {pkg.packageAlerts.en}
                            </Tag>
                        )}
                        {pkg.popularityTexts?.en && (
                            <Tag color="red" style={{ marginBottom: '4px' }}>
                                {pkg.popularityTexts.en}
                            </Tag>
                        )}
                    </div>
                )}
            </Card>
        );
    };

    if (!packageData) return null;

    const hasImages = packageData.signedImages && packageData.signedImages.length > 0;
    const allPackages = [
        ...(packageData.packages || []),
        ...(packageData.fromCategoryPackages || []),
        ...(packageData.toCategoryPackages || [])
    ];

    return (
        <Modal
            open={viewCategoryToggle}
            className="view-category-modal"
            onCancel={handleModalClose}
            footer={null}
            width={1200}
            style={{ top: 20 }}
            bodyStyle={{ padding: 0 }}
            title={null}
        >
            <div style={{ overflow: 'hidden', borderRadius: '8px' }}>
                <Row gutter={0} style={{ minHeight: '600px' }}>
                    {/* Left Column - Image Gallery */}
                    <Col xs={24} md={10}>
                        <div style={{
                            position: 'relative',
                            height: '600px',
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
                    <Col xs={24} md={14}>
                        <div style={{ padding: '16px 24px', height: '600px', overflowY: 'auto' }}>
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
                                    <Col span={8}>
                                        <Card size="small" style={{ textAlign: 'center', background: '#f8fafc' }}>
                                            <Space direction="vertical" size="small" className="customSpace">
                                                <FaChartLine style={{ fontSize: '20px', color: '#10b981' }} />
                                                <div>
                                                    <Text strong style={{ fontSize: '14px' }}>
                                                        Price Level
                                                    </Text>
                                                    <br />
                                                    <Text style={{ fontSize: '12px' }}>
                                                        {packageData.priceLevel}
                                                    </Text>
                                                </div>
                                            </Space>
                                        </Card>
                                    </Col>
                                    <Col span={8}>
                                        <Card size="small" style={{ textAlign: 'center', background: '#f8fafc' }}>
                                            <Space direction="vertical" size="small" className="customSpace">
                                                <PercentageOutlined style={{ fontSize: '20px', color: '#10b981' }} />
                                                <div>
                                                    <Text strong style={{ fontSize: '14px' }}>
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
                                    <Col span={8}>
                                        <Card size="small" style={{ textAlign: 'center', background: '#f8fafc' }}>
                                            <Space direction="vertical" size="small" className="customSpace">
                                                <FiPackage style={{ fontSize: '20px', color: '#10b981' }} />
                                                <div>
                                                    <Text strong style={{ fontSize: '14px' }}>
                                                        Total Packages
                                                    </Text>
                                                    <br />
                                                    <Text style={{ fontSize: '12px' }}>
                                                        {packageData.packageCounts?.totalPackages || 0}
                                                    </Text>
                                                </div>
                                            </Space>
                                        </Card>
                                    </Col>
                                </Row>

                                {/* Package Counts Breakdown */}
                                <Card
                                    title={
                                        <Space>
                                            <InfoCircleOutlined />
                                            <Text strong>Package Summary</Text>
                                        </Space>
                                    }
                                    size="small"
                                    style={{ background: '#fafafa' }}
                                >
                                    <Row gutter={[16, 8]}>
                                        <Col span={8}>
                                            <div style={{ textAlign: 'center' }}>
                                                <Text type="secondary">Main Packages</Text>
                                                <br />
                                                <Text strong style={{ color: '#1890ff' }}>
                                                    {packageData.packageCounts?.packages || 0}
                                                </Text>
                                            </div>
                                        </Col>
                                        <Col span={8}>
                                            <div style={{ textAlign: 'center' }}>
                                                <Text type="secondary">Source Packages</Text>
                                                <br />
                                                <Text strong style={{ color: '#52c41a' }}>
                                                    {packageData.packageCounts?.fromCategoryPackages || 0}
                                                </Text>
                                            </div>
                                        </Col>
                                        <Col span={8}>
                                            <div style={{ textAlign: 'center' }}>
                                                <Text type="secondary">Destination Packages</Text>
                                                <br />
                                                <Text strong style={{ color: '#fa8c16' }}>
                                                    {packageData.packageCounts?.toCategoryPackages || 0}
                                                </Text>
                                            </div>
                                        </Col>
                                    </Row>
                                </Card>

                                {/* Package Details Tabs */}
                                {allPackages.length > 0 && (
                                    <Card
                                        title={
                                            <Space>
                                                <FiPackage />
                                                <Text strong>Package Details</Text>
                                            </Space>
                                        }
                                        size="small"
                                    >
                                        <Tabs defaultActiveKey="1" size="small">
                                            {packageData.packages && packageData.packages.length > 0 && (
                                                <TabPane tab={`Main Packages (${packageData.packages.length})`} key="1">
                                                    <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
                                                        {packageData.packages.map(pkg => renderPackageCard(pkg, 'packages'))}
                                                    </div>
                                                </TabPane>
                                            )}
                                            {packageData.fromCategoryPackages && packageData.fromCategoryPackages.length > 0 && (
                                                <TabPane tab={`Source Packages (${packageData.fromCategoryPackages.length})`} key="2">
                                                    <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
                                                        {packageData.fromCategoryPackages.map(pkg => renderPackageCard(pkg, 'fromCategoryPackages'))}
                                                    </div>
                                                </TabPane>
                                            )}
                                            {packageData.toCategoryPackages && packageData.toCategoryPackages.length > 0 && (
                                                <TabPane tab={`Destination Packages (${packageData.toCategoryPackages.length})`} key="3">
                                                    <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
                                                        {packageData.toCategoryPackages.map(pkg => renderPackageCard(pkg, 'toCategoryPackages'))}
                                                    </div>
                                                </TabPane>
                                            )}
                                        </Tabs>
                                    </Card>
                                )}

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
                                    <Button
                                        block
                                        onClick={handleModalClose}
                                        style={{ height: '40px' }}
                                        type="primary"
                                    >
                                        Close
                                    </Button>
                                </div>
                            </Space>
                        </div>
                    </Col>
                </Row>
            </div>
        </Modal>
    );
};