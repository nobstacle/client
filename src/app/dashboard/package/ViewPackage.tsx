"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import { Table, Tag, Card, Pagination, Input, Modal, Row, Col, Button, Image, Typography, Space, Divider, Tabs } from "antd";
import { InfoCircleOutlined, TrophyOutlined, LeftOutlined, RightOutlined } from "@ant-design/icons";

const { Title, Text, Paragraph } = Typography;
const { TabPane } = Tabs;

export default function ViewPackage({ packageData, onClose, viewPackageToggle }) {
    const [currentImageIndex, setCurrentImageIndex] = useState(0);
    const slideInterval = useRef(null);

    const handleModalClose = () => {
        onClose();
    }

    console.info("Package Data in ViewPackage:", packageData);
    
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
            'taxInformation'
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

        const langValue = field[language] || defaultValue;

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

    // Localized text function
    const getLocalizedText = (key, language, value = null) => {
        const localizations = {
            'bestSeller': {
                'en': 'Best Seller',
                'ar': 'الأكثر مبيعاً',
                'fr': 'Meilleure Vente',
                'es': 'Más Vendido',
                'de': 'Bestseller',
                'zh-CN': '最畅销',
                'ja': 'ベストセラー',
                'ko': '베스트셀러',
                'ru': 'Хит продаж',
                'pt': 'Mais Vendido',
                'it': 'Più Venduto',
                'hi': 'सबसे ज्यादा बिकने वाला',
                'he': 'הנמכר ביותר',
                'fa': 'پرفروش‌ترین',
                'ur': 'سب سے زیادہ فروخت',
                'tr': 'En Çok Satan',
                'nl': 'Bestseller',
                'sv': 'Bästsäljare',
                'th': 'ขายดีที่สุด',
                'vi': 'Bán Chạy Nhất'
            },
            'soldTimes': {
                'en': `Sold ${value} times`,
                'ar': `تم البيع ${value} مرة`,
                'fr': `Vendu ${value} fois`,
                'es': `Vendido ${value} veces`,
                'de': `${value} mal verkauft`,
                'zh-CN': `已售出${value}次`,
                'ja': `${value}回販売`,
                'ko': `${value}번 판매됨`,
                'ru': `Продано ${value} раз`,
                'pt': `Vendido ${value} vezes`,
                'it': `Venduto ${value} volte`,
                'hi': `${value} बार बेचा गया`,
                'he': `נמכר ${value} פעמים`,
                'fa': `${value} بار فروخته شده`,
                'ur': `${value} بار فروخت ہوا`,
                'tr': `${value} kez satıldı`,
                'nl': `${value} keer verkocht`,
                'sv': `Såld ${value} gånger`,
                'th': `ขายแล้ว ${value} ครั้ง`,
                'vi': `Đã bán ${value} lần`
            },
            'postingAlgorithm': {
                'en': 'Posting Algorithm',
                'ar': 'خوارزمية النشر',
                'fr': 'Algorithme de Publication',
                'es': 'Algoritmo de Publicación',
                'de': 'Veröffentlichungsalgorithmus',
                'zh-CN': '发布算法',
                'ja': '投稿アルゴリズム',
                'ko': '게시 알고리즘',
                'ru': 'Алгоритм публикации',
                'pt': 'Algoritmo de Publicação',
                'it': 'Algoritmo di Pubblicazione',
                'hi': 'पोस्टिंग एल्गोरिदम',
                'he': 'אלגוריתם פרסום',
                'fa': 'الگوریتم انتشار',
                'ur': 'پوسٹنگ الگورتھم',
                'tr': 'Yayınlama Algoritması',
                'nl': 'Plaatsingsalgoritme',
                'sv': 'Publiceringsalgoritm',
                'th': 'อัลกอริทึมการโพสต์',
                'vi': 'Thuật toán Đăng bài'
            }
        };

        return localizations[key]?.[language] || localizations[key]?.['en'] || key;
    };

    // Image slideshow component (shared between all language cards)
    const ImageSlideshow = () => (
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
    );

    // Language card component
    const LanguageCard = ({ language }) => {
        const packageName = getMultilingualValue(packageData.packageNames, language, "Package Name");
        const packageDescription = getMultilingualValue(packageData.packageDescriptions, language, "Package Description");
        const packageBenefits = getMultilingualValue(packageData.packageBenefits, language, []);
        const packageTags = getMultilingualValue(packageData.packageTags, language, []);
        const packageAlert = getMultilingualValue(packageData.packageAlerts, language, "");
        const buttonText = getMultilingualValue(packageData.buttonTexts, language, "Take this deal");
        const currency = getMultilingualValue(packageData.currencies, language, "USD");
        const taxInfo = getMultilingualValue(packageData.taxInformation, language, "");

        // Determine text direction based on language
        const rtlLanguages = ['ar', 'he', 'fa', 'ur', 'ps', 'sd', 'ug', 'yi'];
        const isRTL = rtlLanguages.includes(language);
        const textDirection = isRTL ? 'rtl' : 'ltr';

        return (
            <div style={{ direction: textDirection }}>
                <Row gutter={16}>
                    {/* Left Column - Square Image */}
                    <Col xs={24} md={10}>
                        <ImageSlideshow />
                    </Col>

                    {/* Right Column - Content */}
                    <Col xs={24} md={14}>
                        <div style={{ height: '280px', display: 'flex', flexDirection: 'column' }}>
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
                                        <Text strong style={{ color: '#333', fontSize: '14px' }}>
                                            {getLocalizedText('bestSeller', language)}
                                        </Text>
                                        <br />
                                        <Text type="secondary" style={{ fontSize: '12px' }}>
                                            {getLocalizedText('soldTimes', language, packageData.totalPackagesSold || 22)}
                                        </Text>
                                    </div>
                                </div>

                                {/* Tags */}
                                <div style={{ marginBottom: '8px' }}>
                                    <Space wrap size="small" direction={isRTL ? 'rtl' : 'ltr'}>
                                        {packageBenefits.map((benefit, index) => (
                                            <div key={index} style={{ marginBottom: '4px' }}>
                                                <Text style={{ color: '#52c41a', fontSize: '13px', lineHeight: '18px' }}>
                                                    {isRTL ? '✓' : '✓'} {typeof benefit === 'object' ? JSON.stringify(benefit) : benefit}
                                                </Text>
                                            </div>
                                        ))}
                                    </Space>
                                </div>
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
                                                <div style={{ marginBottom: '2px' }}>
                                                    <Text type="secondary" style={{ fontSize: '12px' }}>
                                                        {getLocalizedText('postingAlgorithm', language)}
                                                    </Text>
                                                </div>
                                                <div style={{ 
                                                    display: 'flex', 
                                                    alignItems: 'center', 
                                                    gap: '8px', 
                                                    justifyContent: isRTL ? 'flex-start' : 'flex-end',
                                                    flexDirection: isRTL ? 'row-reverse' : 'row'
                                                }}>
                                                    {packageData.originalPrice && (
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
                                        <div style={{ 
                                            display: 'flex', 
                                            justifyContent: isRTL ? 'flex-start' : 'flex-end' 
                                        }}>
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
            'ba': 'Batest',
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