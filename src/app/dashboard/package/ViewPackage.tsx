"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import { Table, Tag, Card, Pagination, Input, Modal, Row, Col, Button, Image, Typography, Space, Divider, Tabs,Carousel } from "antd";
import { InfoCircleOutlined, TrophyOutlined, LeftOutlined, RightOutlined } from "@ant-design/icons";

const { Title, Text, Paragraph } = Typography;
const { TabPane } = Tabs;

export default function ViewPackage({ packageData, onClose, viewPackageToggle }) {
    const [currentImageIndex, setCurrentImageIndex] = useState(0);
    const slideInterval = useRef(null);
    const [expanded, setExpanded] = useState(false);


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
            }, 3000);

            return () => {
                if (slideInterval.current) {
                    clearInterval(slideInterval.current);
                }
            };
        }
    }, [images.length]);

    // Manual navigation functions
    const goToPrevious = () => {
        if (slideInterval.current) {
            clearInterval(slideInterval.current);
        }
        setCurrentImageIndex(currentImageIndex === 0 ? images.length - 1 : currentImageIndex - 1);
    };

    const goToNext = () => {
        if (slideInterval.current) {
            clearInterval(slideInterval.current);
        }
        setCurrentImageIndex(currentImageIndex === images.length - 1 ? 0 : currentImageIndex + 1);
    };

    const goToSlide = (index) => {
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

    // Get all available languages from the package data
    const getAvailableLanguages = () => {
        const languages = new Set();

        // Check all multilingual fields to find available languages
        const multilingualFields = [
            'packageNames',
            'packageDescriptions',
            'packageBenefits',
            'packageTags',
            'packageAlerts',
            'buttonTexts',
            'currencies',
            'taxInformation',
            'soldOutTexts',
            'popularityTexts'
        ];

        multilingualFields.forEach(field => {
            if (packageData[field] && typeof packageData[field] === 'object') {
                Object.keys(packageData[field]).forEach(lang => languages.add(lang));
            }
        });

        return Array.from(languages);
    };

    const availableLanguages = getAvailableLanguages();

    const getMultilingualValue = (field, language, defaultValue = '') => {
        if (!field || typeof field !== 'object') return field || defaultValue;

        const langValue = field[language] || field[Object.keys(field)[0]] || defaultValue;

        // Handle nested objects and arrays
        if (Array.isArray(langValue)) {
            return langValue.map(item => {
                if (typeof item === 'object' && item !== null) {
                    return item[language] || item[Object.keys(item)[0]] || '';
                }
                return item;
            }).filter(Boolean);
        }

        return langValue;
    };

const mergedImages = [
  ...(packageData.images || []).map(img => ({
    signedUrl: img.signedUrl || img.url,
    alt: img.alt || img.originalName || "Package Image"
  })),
  ...(packageData.toCategory?.signedImages || []).map(img => {
    if (typeof img === "string") {
      return { signedUrl: img, alt: "Category Image" };
    }
    return { signedUrl: img.signedUrl || img.url, alt: img.alt || "Category Image" };
  })
];


const ImageSlideshow = ({ images }) => {
  if (!images || images.length === 0) return null;

  return (
    <div className="image-slideshow-wrapper" style={{ position: "relative", height: "280px", width: "100%" }}>
      <Carousel
        arrows
        dots
        infinite
      >
        {images.map((img, index) => (
          <div key={index}>
            <Image
              src={img.signedUrl}
              alt={img.alt || `Image ${index + 1}`}
              preview={false}
              fallback="https://via.placeholder.com/400x280/1890ff/ffffff?text=Image+Not+Available"
              style={{
                width: "100%",
                height: "280px",
                objectFit: "cover",
                borderRadius: "8px"
              }}
            />
          </div>
        ))}
      </Carousel>
    </div>
  );
};


    // Language card component
    const LanguageCard = ({ language }) => {
        const packageName = getMultilingualValue(packageData.packageNames, language, '');
        const packageDescription = getMultilingualValue(packageData.packageDescriptions, language, '');
        const packageBenefits = getMultilingualValue(packageData.packageBenefits, language, []);
        const packageTags = getMultilingualValue(packageData.packageTags, language, []);
        const packageAlert = getMultilingualValue(packageData.packageAlerts, language, '');
        const buttonText = getMultilingualValue(packageData.buttonTexts, language, '');
        const currency = getMultilingualValue(packageData.currencies, language, '');
        const taxInfo = getMultilingualValue(packageData.taxInformation, language, '');
        const soldOutText = getMultilingualValue(packageData.soldOutTexts, language, '');
        const popularityText = getMultilingualValue(packageData.popularityTexts, language, '');
        const priceAlgorithm = getMultilingualValue(packageData.priceAlgorithms, language, '');
        const maxChars = 200;

        const toggleExpand = () => setExpanded(!expanded);

        // Truncate text manually for "Show more" inline
        const displayText =
            !expanded && packageDescription.length > maxChars
            ? packageDescription.slice(0, maxChars) + '... '
            : packageDescription;
        // Determine text direction based on language
        const rtlLanguages = ['ar', 'he', 'fa', 'ur', 'ps', 'sd', 'ug', 'yi'];
        const isRTL = rtlLanguages.includes(language);
        const textDirection = isRTL ? 'rtl' : 'ltr';

        return (
            <div style={{ direction: textDirection }}>
                <Row gutter={16}>
                    {/* Left Column - Square Image */}
                    <Col xs={24} md={10}>
                        <ImageSlideshow images={mergedImages} />
                    </Col>

                    {/* Right Column - Content */}
                    <Col xs={24} md={14}>
                     <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                            {/* Header Section */}
                            <div style={{ marginBottom: '12px' }}>
                                <div style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'flex-start',
                                    marginBottom: '8px',
                                    flexDirection: isRTL ? 'row-reverse' : 'row'
                                }}>
                                    <Title level={3} style={{ margin: 0, color: '#1890ff', fontSize: '20px', lineHeight: '24px' }}>
                                        {packageName}
                                    </Title>
                                    <div style={{ textAlign: isRTL ? 'left' : 'right' }}>
                                        {popularityText && (
                                            <>
                                                <Text strong style={{ color: '#333', fontSize: '14px' }}>
                                                    {popularityText}
                                                </Text>
                                                <br />
                                            </>
                                        )}
                                        {packageData.totalPackagesSold && (
                                            <Text type="secondary" style={{ fontSize: '12px' }}>
                                                {packageData.totalPackagesSold} purchases
                                            </Text>
                                        )}
                                    </div>
                                </div>

                                {/* Tags */}
                                {packageTags && packageTags.length > 0 && (
                                    <div style={{ marginBottom: '8px' }}>
                                        <Space wrap size="small" direction={isRTL ? 'rtl' : 'ltr'}>
                                            {packageTags.map((tag, index) => (
                                                <Tag key={index} color="blue" style={{ fontSize: '12px' }}>
                                                    {tag}
                                                </Tag>
                                            ))}
                                        </Space>
                                    </div>
                                )}
                            </div>

                            <Row gutter={16}>
                                <Col md={12} xs={24}>
                                    {/* Description and Benefits */}
                                    <div style={{
                                        marginBottom: '12px',
                                        paddingRight: isRTL ? '0' : '8px',
                                        paddingLeft: isRTL ? '8px' : '0'
                                    }}>
                                        {/* Description */}
                                        {packageDescription && (
                                            <div style={{ marginBottom: '12px' }}>
                                                 <Text style={{ fontSize: '14px', color: '#666', lineHeight: '20px' }}>
                                                    {displayText}
                                                    {packageDescription.length > maxChars && (
                                                    <span
                                                        onClick={toggleExpand}
                                                        style={{ color: '#1890ff', cursor: 'pointer' }}
                                                    >
                                                        {expanded ? ' Show less' : ' Show more'}
                                                    </span>
                                                    )}
                                                </Text>
                                            </div>
                                        )}

                                        {/* Benefits */}
                                        {packageBenefits && packageBenefits.length > 0 && (
                                            <div style={{ marginBottom: '12px' }}>
                                                {packageBenefits.map((benefit, index) => (
                                                    <div key={index} style={{ marginBottom: '4px' }}>
                                                        <Text style={{ color: '#52c41a', fontSize: '13px', lineHeight: '18px' }}>
                                                            ✓ {benefit}
                                                        </Text>
                                                    </div>
                                                ))}
                                            </div>
                                        )}

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
                                    {/* Bottom Section */}
                                    <div style={{ marginTop: 'auto' }}>
                                        {/* Price Section */}
                                        <div style={{
                                            display: 'flex',
                                            justifyContent: isRTL ? 'flex-start' : 'flex-end',
                                            alignItems: 'center',
                                            marginBottom: '8px'
                                        }}>
                                            <div style={{ textAlign: isRTL ? 'left' : 'right' }}>
                                                {priceAlgorithm && (
                                                    <div style={{ marginBottom: '2px' }}>
                                                        <Text type="secondary" style={{ fontSize: '12px' }}>
                                                            {priceAlgorithm}
                                                        </Text>
                                                    </div>
                                                )}
                                                <div style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '8px',
                                                    justifyContent: isRTL ? 'flex-start' : 'flex-end',
                                                    flexDirection: isRTL ? 'row-reverse' : 'row'
                                                }}>
                                                    {packageData.originalPrice && packageData.originalPrice !== packageData.discountedPrice && (
                                                        <Text
                                                            delete
                                                            style={{ fontSize: '14px', color: '#ff4d4f' }}
                                                        >
                                                            {currency} {packageData.originalPrice}
                                                        </Text>
                                                    )}
                                                    <Text strong style={{ fontSize: '20px', color: '#333' }}>
                                                        {currency} {packageData.discountedPrice || packageData.originalPrice}
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
                                        <div style={{
                                            display: 'flex',
                                            justifyContent: isRTL ? 'flex-start' : 'flex-end'
                                        }}>
                                            {buttonText && (
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
                                            )}
                                        </div>
                                    </div>
                                </Col>
                            </Row>
                        </div>
                    </Col>
                </Row>
            </div>
        );
    };

    // Language name mapping
    const getLanguageName = (langCode) => {
        const languageNames = {
            'af': 'Afrikaans',
            'sq': 'Albanian',
            'am': 'Amharic',
            'ar': 'العربية',
            'hy': 'Armenian',
            'az': 'Azerbaijani',
            'eu': 'Basque',
            'ba': 'Bashkir',
            'be': 'Belarusian',
            'bn': 'Bengali',
            'bs': 'Bosnian',
            'bg': 'Bulgarian',
            'ca': 'Catalan',
            'ceb': 'Cebuano',
            'zh-CN': '中文(简体)',
            'co': 'Corsican',
            'hr': 'Croatian',
            'cs': 'Czech',
            'da': 'Danish',
            'nl': 'Dutch',
            'en': 'English',
            'eo': 'Esperanto',
            'et': 'Estonian',
            'fi': 'Finnish',
            'fr': 'Français',
            'fy': 'Frisian',
            'gl': 'Galician',
            'ka': 'Georgian',
            'de': 'Deutsch',
            'el': 'Ελληνικά',
            'gu': 'Gujarati',
            'ht': 'Haitian',
            'ha': 'Hausa',
            'haw': 'Hawaiian',
            'he': 'עברית',
            'hi': 'हिन्दी',
            'hmn': 'Hmong',
            'hu': 'Hungarian',
            'is': 'Icelandic',
            'ig': 'Igbo',
            'id': 'Indonesian',
            'ga': 'Irish',
            'it': 'Italiano',
            'ja': '日本語',
            'jv': 'Javanese',
            'kn': 'Kannada',
            'kk': 'Kazakh',
            'km': 'Khmer',
            'rw': 'Kinyarwanda',
            'ko': '한국어',
            'ku': 'Kurdish',
            'ky': 'Kyrgyz',
            'lo': 'Lao',
            'lv': 'Latvian',
            'lt': 'Lithuanian',
            'lb': 'Luxembourgish',
            'mk': 'Macedonian',
            'mg': 'Malagasy',
            'ms': 'Malay',
            'ml': 'Malayalam',
            'mt': 'Maltese',
            'mi': 'Maori',
            'mr': 'Marathi',
            'mn': 'Mongolian',
            'my': 'Myanmar',
            'ne': 'Nepali',
            'no': 'Norwegian',
            'ny': 'Nyanja',
            'or': 'Odia',
            'ps': 'Pashto',
            'fa': 'فارسی',
            'pl': 'Polish',
            'pt': 'Português',
            'pa': 'Punjabi',
            'ro': 'Romanian',
            'ru': 'Русский',
            'sm': 'Samoan',
            'gd': 'Scots',
            'sr': 'Serbian',
            'st': 'Sesotho',
            'sn': 'Shona',
            'sd': 'Sindhi',
            'si': 'Sinhala',
            'sk': 'Slovak',
            'sl': 'Slovenian',
            'so': 'Somali',
            'es': 'Español',
            'su': 'Sundanese',
            'sw': 'Swahili',
            'sv': 'Swedish',
            'tl': 'Tagalog',
            'tg': 'Tajik',
            'ta': 'Tamil',
            'tt': 'Tatar',
            'te': 'Telugu',
            'th': 'ไทย',
            'tr': 'Türkçe',
            'tk': 'Turkmen',
            'uk': 'Українська',
            'ur': 'اردو',
            'ug': 'Uyghur',
            'uz': 'Uzbek',
            'vi': 'Tiếng Việt',
            'cy': 'Welsh',
            'xh': 'Xhosa',
            'yi': 'Yiddish',
            'yo': 'Yoruba',
            'zu': 'Zulu'
        };
        return languageNames[langCode] || langCode.toUpperCase();
    };

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
            {availableLanguages.length > 1 ? (
                <Tabs defaultActiveKey={availableLanguages[0]} type="card">
                    {availableLanguages.map(language => (
                        <TabPane tab={getLanguageName(language)} key={language}>
                            <LanguageCard language={language} />
                        </TabPane>
                    ))}
                </Tabs>
            ) : (
                <LanguageCard language={availableLanguages[0] || 'en'} />
            )}
        </Modal>
    );
}