import * as React from "react";
import { SubmitHandler, useForm, Controller } from "react-hook-form";
import * as yup from "yup";
import { yupResolver } from "@hookform/resolvers/yup";
import {
    Form,
    Input,
    Button,
    Space,
    Typography,
    Alert,
    InputNumber,
    Switch,
    Divider,
    Row,
    Col,
    Upload,
    message,
    Spin,
    Card
} from "antd";
import { UploadOutlined, LoadingOutlined } from "@ant-design/icons";
import {
    useCompanyControllerGetCompany,
    useCategoryControllerCreateCategory,
    useCategoryControllerUpdateCategory,
} from "../../../lib/client/api";

const { Text } = Typography;

interface CreateCategoryFormFieldValues {
    name: string;
    priceLevel?: number;
    taxPercentage?: number;
    soldOut: boolean;
}

const schema = yup.object().shape({
    name: yup
        .string()
        .required("Category name is required")
        .max(100, "Name must be at most 100 characters"),
    priceLevel: yup
        .number()
        .min(1, "Price level must be at least 1")
        .nullable()
        .transform((value, originalValue) => originalValue === "" ? null : value),
    taxPercentage: yup
        .number()
        .min(0, "Tax percentage must be positive")
        .max(100, "Tax percentage must be at most 100")
        .nullable()
        .transform((value, originalValue) => originalValue === "" ? null : value),
    soldOut: yup.boolean().required(),
});

interface CreateCategoryFormProps {
    cb?: (categoryData: any, isUpdate: boolean) => void;
    initialData?: any; // The category data for editing
    isEdit?: boolean;  // Whether in edit mode
}

const CreateCategoryForm: React.FC<CreateCategoryFormProps> = ({
    cb,
    initialData,
    isEdit,
}) => {
    const company = useCompanyControllerGetCompany();

    // Set default values based on edit mode
    const getDefaultValues = () => {
        if (isEdit && initialData) {
            return {
                name: initialData.name || "",
                priceLevel: initialData.priceLevel || undefined,
                taxPercentage: initialData.taxPercentage ? Number(initialData.taxPercentage) : undefined,
                soldOut: initialData.soldOut || false,
            };
        } else {
            return {
                name: "",
                priceLevel: undefined,
                taxPercentage: undefined,
                soldOut: false,
            };
        }
    };

    const {
        handleSubmit,
        control,
        reset,
        formState: { errors },
    } = useForm<CreateCategoryFormFieldValues>({
        resolver: yupResolver(schema),
        defaultValues: getDefaultValues(),
    });

    const createCategory = useCategoryControllerCreateCategory();
    const updateCategory = useCategoryControllerUpdateCategory();

    const [images, setImages] = React.useState<any[]>([]);

    // Initialize form when editing
    React.useEffect(() => {
        if (isEdit && initialData) {
            reset(getDefaultValues());
            // Set images if available
            if (initialData.signedImages && Array.isArray(initialData.signedImages)) {
                    const existingImages = initialData.signedImages.map((img: any, index: number) => ({
                        uid: `existing-${index}`,
                        name: img.url.split('/').pop() || `image-${index}`,
                        url: img.signedUrl,
                        thumbUrl: img.signedUrl,
                        status: "done",
                    }));
             setImages(existingImages);
            }
        }
        }, [isEdit, initialData, reset]);

    const handleCreateCategory = (data: CreateCategoryFormFieldValues) => {
        // Create FormData for multipart/form-data
        const formData = new FormData();

        // Add all the category data
        formData.append('name', data.name);

        if (data.priceLevel !== undefined && data.priceLevel !== null) {
            formData.append('priceLevel', data.priceLevel.toString());
        }

        if (data.taxPercentage !== undefined && data.taxPercentage !== null) {
            formData.append('taxPercentage', data.taxPercentage.toString());
        }

        formData.append('soldOut', data.soldOut.toString());

        // Add images to FormData (only files that have originFileObj)
        images.forEach((image) => {
            if (image.originFileObj) {
                // For newly uploaded files
                formData.append(`images`, image.originFileObj);
            }
        });

        if (isEdit && initialData?.id) {
            // Update existing category
            updateCategory.mutate(
                { id: initialData.id, data: formData },
                {
                    onSuccess: (categoryResponse) => {
                        message.success('Category updated successfully!');
                        if (cb) {
                            cb(categoryResponse, true);
                        }
                    },
                    onError: (error) => {
                        message.error('Failed to update category');
                        console.error('Update error:', error);
                    }
                }
            );
        } else {
            // Create new category
            createCategory.mutate(
                { data: formData },
                {
                    onSuccess: (categoryResponse) => {
                        message.success('Category created successfully!');
                        if (cb) {
                            cb(categoryResponse, false);
                        }
                    },
                    onError: (error) => {
                        message.error('Failed to create category');
                        console.error('Create error:', error);
                    }
                }
            );
        }
    };

    const onSubmit: SubmitHandler<CreateCategoryFormFieldValues> = (data) => {
        handleCreateCategory(data);
    };

    const handleImageUpload = (info: any) => {
        // Handle file list updates from Upload component
        if (info.fileList) {
            const processedImages = info.fileList.map((file: any, index: number) => ({
                uid: file.uid,
                name: file.name,
                url: file.url || (file.originFileObj ? URL.createObjectURL(file.originFileObj) : ''),
                alt: file.name,
                order: index + 1,
                originFileObj: file.originFileObj, // This is the actual file object we need
                status: file.status
            }));

            setImages(processedImages);
        }

        // Handle individual file status updates
        if (info.file) {
            if (info.file.status === 'done') {
                message.success(`${info.file.name} file uploaded successfully.`);
            } else if (info.file.status === 'error') {
                message.error(`${info.file.name} file upload failed.`);
            }
        }
    };

    const isLoading = createCategory.status === "pending" || updateCategory.status === "pending";
    const error = createCategory.error || updateCategory.error;

    // Custom loading indicator
    const loadingIndicator = <LoadingOutlined style={{ fontSize: 24 }} spin />;

    return (
        <div className="create-category-form-wrapper" style={{ position: 'relative' }}>
            {/* Loading Overlay */}
            {isLoading && (
                <div style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: 'rgba(255, 255, 255, 0.8)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 1000,
                    borderRadius: '8px'
                }}>
                    <Spin
                        indicator={loadingIndicator}
                        size="large"
                    />
                    <Text style={{
                        marginTop: '16px',
                        fontSize: '16px',
                        color: '#1890ff',
                        fontWeight: 500
                    }}>
                        {isEdit ? 'Updating category...' : 'Creating category...'}
                    </Text>
                    <Text type="secondary" style={{
                        marginTop: '8px',
                        fontSize: '14px'
                    }}>
                        Please wait while we process your request
                    </Text>
                </div>
            )}

            {/* Main Form Content */}
            <Form
                layout="vertical"
                onFinish={handleSubmit(onSubmit)}
                className="create-category-form"
                style={{ opacity: isLoading ? 0.6 : 1 }}
            >

                <Space direction="vertical" size="middle" style={{ width: '100%', paddingTop: '1rem' }}>

                    {/* Basic Information */}
                    <Card size="small" style={{ backgroundColor: '#fafafa' }}>
                        <Text strong style={{ fontSize: '16px', color: '#262626' }}>Basic Information</Text>
                        <Divider style={{ margin: '12px 0 16px 0' }} />

                        <Row gutter={16}>
                            <Col span={24}>
                                <Form.Item
                                    label="Category Name"
                                    validateStatus={errors.name ? 'error' : ''}
                                    help={errors.name?.message}
                                    required
                                >
                                    <Controller
                                        name="name"
                                        control={control}
                                        render={({ field }) => (
                                            <Input
                                                {...field}
                                                placeholder="Enter unique category name"
                                                status={errors.name ? 'error' : ''}
                                                size="large"
                                                disabled={isLoading}
                                            />
                                        )}
                                    />
                                </Form.Item>
                            </Col>
                        </Row>

                        <Row gutter={16}>
                            <Col span={12}>
                                <Form.Item
                                    label="Price Level"
                                    validateStatus={errors.priceLevel ? 'error' : ''}
                                    help={errors.priceLevel?.message}
                                >
                                    <Controller
                                        name="priceLevel"
                                        control={control}
                                        render={({ field }) => (
                                            <InputNumber
                                                {...field}
                                                placeholder="Enter price level"
                                                style={{ width: '100%' }}
                                                status={errors.priceLevel ? 'error' : ''}
                                                min={1}
                                                size="large"
                                                disabled={isLoading}
                                            />
                                        )}
                                    />
                                </Form.Item>
                            </Col>

                            <Col span={12}>
                                <Form.Item
                                    label="Tax Percentage"
                                    validateStatus={errors.taxPercentage ? 'error' : ''}
                                    help={errors.taxPercentage?.message}
                                >
                                    <Controller
                                        name="taxPercentage"
                                        control={control}
                                        render={({ field }) => (
                                            <InputNumber
                                                {...field}
                                                placeholder="0"
                                                style={{ width: '100%' }}
                                                status={errors.taxPercentage ? 'error' : ''}
                                                min={0}
                                                max={100}
                                                precision={2}
                                                formatter={(value) => `${value}%`}
                                                parser={(value) => value!.replace('%', '')}
                                                size="large"
                                                disabled={isLoading}
                                            />
                                        )}
                                    />
                                </Form.Item>
                            </Col>
                        </Row>
                    </Card>

                    {/* Status */}
                    <Card size="small" style={{ backgroundColor: '#fafafa' }}>
                        <Text strong style={{ fontSize: '16px', color: '#262626' }}>Status</Text>
                        <Divider style={{ margin: '12px 0 16px 0' }} />

                        <Row gutter={16}>
                            <Col span={12}>
                                <Form.Item label="Sold Out">
                                    <Controller
                                        name="soldOut"
                                        control={control}
                                        render={({ field }) => (
                                            <Switch
                                                {...field}
                                                checked={field.value}
                                                checkedChildren="Sold Out"
                                                unCheckedChildren="Available"
                                                disabled={isLoading}
                                                size="default"
                                            />
                                        )}
                                    />
                                </Form.Item>
                            </Col>
                        </Row>
                    </Card>

                    {/* Images */}
                    <Card size="small" style={{ backgroundColor: '#fafafa' }}>
                        <Text strong style={{ fontSize: '16px', color: '#262626' }}>Category Images</Text>
                        <Divider style={{ margin: '12px 0 16px 0' }} />

                        <Form.Item label="Images">
                            <Upload
                                multiple
                                listType="picture"
                                onChange={handleImageUpload}
                                disabled={isLoading}
                                beforeUpload={(file) => {
                                    // Validate file type
                                    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg', 'image/gif'];
                                    if (!allowedTypes.includes(file.type)) {
                                        message.error('Only image files (jpg, jpeg, png, webp, gif) are allowed');
                                        return false;
                                    }

                                    // Validate file size (5MB)
                                    const isLt5M = file.size / 1024 / 1024 < 5;
                                    if (!isLt5M) {
                                        message.error('Image must be smaller than 5MB');
                                        return false;
                                    }

                                    return false; // Prevent auto upload, we'll handle it manually
                                }}
                                fileList={images.map((img, index) => ({
                                    uid: img.uid || index.toString(),
                                    name: img.name || `image-${index}`,
                                    status: 'done',
                                    url: img.url,
                                    originFileObj: img.originFileObj,
                                    thumbUrl: img.thumbUrl || img.url, 
                                }))}
                                onRemove={(file) => {
                                    if (!isLoading) {
                                        const newImages = images.filter(img => img.uid !== file.uid);
                                        setImages(newImages);
                                    }
                                }}
                                maxCount={10}
                            >
                                <Button
                                    icon={<UploadOutlined />}
                                    disabled={isLoading}
                                    size="large"
                                    style={{color:"black"}}
                                >
                                    Upload Images (Max 10)
                                </Button>
                            </Upload>
                            <Text type="secondary" style={{ fontSize: '12px', marginTop: '8px', display: 'block' }}>
                                Allowed formats: JPG, JPEG, PNG, WEBP, GIF. Max size: 5MB per file.
                            </Text>
                        </Form.Item>
                    </Card>

                    {/* Error Display */}
                    {error?.message && (
                        <Alert
                            message={error.response?.data.message || error.message}
                            type="error"
                            showIcon
                            style={{ marginBottom: '16px' }}
                        />
                    )}

                    {/* Submit Button */}
                    <Form.Item style={{ textAlign: 'center', marginBottom: 0, marginTop: '24px' }}>
                        <Button
                            type="primary"
                            htmlType="submit"
                            loading={isLoading}
                            disabled={isLoading}
                            style={{
                                width: "100%",
                                height: '48px',
                                fontSize: '16px',
                                fontWeight: '600'
                            }}
                            className="create-category-button"
                        >
                            {isLoading
                                ? (isEdit ? 'Updating...' : 'Creating...')
                                : (isEdit ? 'Update Category' : 'Create Category')
                            }
                        </Button>
                    </Form.Item>
                </Space>
            </Form>
        </div>
    );
};

export default CreateCategoryForm;