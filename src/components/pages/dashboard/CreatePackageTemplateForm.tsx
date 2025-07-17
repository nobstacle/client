import * as React from "react";
import { SubmitHandler, useForm, Controller } from "react-hook-form";
import * as yup from "yup";
import { yupResolver } from "@hookform/resolvers/yup";
import {
  Form,
  Input,
  Button,
  Select,
  Space,
  Typography,
  Alert,
  InputNumber,
  Switch,
  Divider,
  Row,
  Col,
  Upload,
  message
} from "antd";
import { UploadOutlined } from "@ant-design/icons";
import { languages } from "../../../constant/languages";
import {
  useCompanyControllerGetCompany,
  usePackageControllerCreatePackage,
  usePackageControllerGetPackageTags,
} from "../../../lib/client/api";

const { Text } = Typography;
const { Option } = Select;
const { TextArea } = Input;

enum PriceAlgorithm {
  PRICE_PER_PIECE_PER_NIGHT = "Price per piece per night",
  PRICE_PER_PIECE_PER_STAY = "Price per piece per stay",
  PRICE_PER_PERSON_PER_NIGHT = "Price per person per night",
  PRICE_PER_PERSON_PER_STAY = "Price per person per stay",
}


interface CreatePackageFormFieldValues {
  packageCode: string;
  originalPrice: number;
  discountedPrice?: number;
  includesTax: boolean;
  taxPercentage?: number;
  priceAlgorithm: PriceAlgorithm;
  approved: boolean;
  room: boolean;
  incentivePercentage?: number;
  confirmationNumber?: number;
  soldBy?: string;
  companyId?: number;
  templateId?: number;

  // Multi-language fields (we'll handle the primary language)
  packageName: string;
  packageDescription?: string;
  packageBenefits: string[];
  packageTags: string[];
  taxInformation?: string;
  currency: string;
  packageAlert?: string;
  buttonText: string;

  // For new tags
  newTag?: string;
  newBenefit?: string;

  // Language selection
  langCode: string;
}

const schema = yup.object().shape({
  packageCode: yup.string().required("Package code is required").max(50, "Package code must be at most 50 characters"),
  originalPrice: yup.number().required("Original price is required").min(0, "Price must be positive"),
  discountedPrice: yup.number().min(0, "Discounted price must be positive"),
  includesTax: yup.boolean().required(),
  taxPercentage: yup.number().min(0).max(100, "Tax percentage must be between 0-100"),
  priceAlgorithm: yup.string().oneOf(Object.values(PriceAlgorithm)).required("Price algorithm is required"),
  approved: yup.boolean().required(),
  room: yup.boolean().required(),
  incentivePercentage: yup.number().min(0).max(100, "Incentive percentage must be between 0-100"),
  confirmationNumber: yup.number().min(1),
  soldBy: yup.string().max(100, "Sold by must be at most 100 characters"),

  packageName: yup.string().required("Package name is required").max(100, "Name must be at most 100 characters"),
  packageDescription: yup.string().max(1000, "Description must be at most 1000 characters"),
  taxInformation: yup.string().max(500, "Tax information must be at most 500 characters"),
  currency: yup.string().required("Currency is required"),
  packageAlert: yup.string().max(200, "Alert text must be at most 200 characters"),
  buttonText: yup.string().required("Button text is required").max(50, "Button text must be at most 50 characters"),
  langCode: yup.string().required("Language is required"),
});

const currencies = [
  { code: 'USD', name: 'US Dollar' },
  { code: 'EUR', name: 'Euro' },
  { code: 'GBP', name: 'British Pound' },
  { code: 'JPY', name: 'Japanese Yen' },
  { code: 'CAD', name: 'Canadian Dollar' },
  { code: 'AUD', name: 'Australian Dollar' },
  { code: 'CHF', name: 'Swiss Franc' },
  { code: 'CNY', name: 'Chinese Yuan' },
  { code: 'INR', name: 'Indian Rupee' },
  { code: 'TRY', name: 'Turkish Lira' },
];

const CreatePackageForm: React.FC<{
  cb?: (packageData: any, isUpdate: boolean) => void;
}> = ({ cb }) => {
  const packageTags = usePackageControllerGetPackageTags();
  const company = useCompanyControllerGetCompany();

  const {
    handleSubmit,
    control,
    watch,
    formState: { errors },
  } = useForm<CreatePackageFormFieldValues>({
    resolver: yupResolver(schema),
    defaultValues: {
      packageCode: "",
      originalPrice: 0,
      discountedPrice: undefined,
      includesTax: false,
      taxPercentage: undefined,
      priceAlgorithm: PriceAlgorithm.FIXED,
      approved: false,
      room: false,
      incentivePercentage: undefined,
      confirmationNumber: undefined,
      soldBy: "",
      companyId: company.data?.id,
      templateId: undefined,

      packageName: "",
      packageDescription: "",
      packageBenefits: [],
      packageTags: [],
      taxInformation: "",
      currency: "USD",
      packageAlert: "",
      buttonText: "Buy Now",
      langCode: company.data?.defaultLangCode || "en",
    },
  });

  const createPackage = usePackageControllerCreatePackage();

  const [benefits, setBenefits] = React.useState<string[]>([]);
  const [tags, setTags] = React.useState<string[]>([]);
  const [newBenefit, setNewBenefit] = React.useState("");
  const [newTag, setNewTag] = React.useState("");
  const [images, setImages] = React.useState<any[]>([]);

  const watchedLangCode = watch("langCode");

  const handleCreatePackage = (data: CreatePackageFormFieldValues) => {
    const packageData = {
      packageCode: data.packageCode,
      originalPrice: Math.round(data.originalPrice * 100), // Convert to cents
      discountedPrice: data.discountedPrice ? Math.round(data.discountedPrice * 100) : undefined,
      includesTax: data.includesTax,
      taxPercentage: data.taxPercentage || null,
      priceAlgorithm: data.priceAlgorithm,
      approved: data.approved,
      room: data.room,
      incentivePercentage: data.incentivePercentage || null,
      confirmationNumber: data.confirmationNumber || null,
      soldBy: data.soldBy || null,
      companyId: data.companyId || company.data?.id,
      templateId: data.templateId || null,

      // Multi-language JSON fields
      packageNames: { [watchedLangCode]: data.packageName },
      packageDescriptions: { [watchedLangCode]: data.packageDescription || "" },
      packageBenefits: { [watchedLangCode]: benefits },
      packageTags: { [watchedLangCode]: tags },
      taxInformation: { [watchedLangCode]: data.taxInformation || "" },
      currencies: { [watchedLangCode]: data.currency },
      packageAlerts: { [watchedLangCode]: data.packageAlert || "" },
      buttonTexts: { [watchedLangCode]: data.buttonText },
      images: images,
    };

    // Remove undefined values
    const cleanedData = Object.fromEntries(
      Object.entries(packageData).filter(([_, value]) => value !== undefined && value !== "")
    );

    createPackage.mutate(
      { data: cleanedData },
      {
        onSuccess: (packageResponse) => {
          if (cb) {
            cb(packageResponse, false);
          }
        },
      },
    );
  };

  const onSubmit: SubmitHandler<CreatePackageFormFieldValues> = (data) =>
    handleCreatePackage(data);

  const addBenefit = () => {
    if (newBenefit.trim()) {
      setBenefits([...benefits, newBenefit.trim()]);
      setNewBenefit("");
    }
  };

  const addTag = () => {
    if (newTag.trim()) {
      setTags([...tags, newTag.trim()]);
      setNewTag("");
    }
  };

  const removeBenefit = (index: number) => {
    setBenefits(benefits.filter((_, i) => i !== index));
  };

  const removeTag = (index: number) => {
    setTags(tags.filter((_, i) => i !== index));
  };

  const handleImageUpload = (info: any) => {
    if (info.file.status === 'done') {
      setImages([...images, {
        url: info.file.response?.url || info.file.thumbUrl,
        alt: info.file.name,
        order: images.length + 1
      }]);
      message.success(`${info.file.name} uploaded successfully.`);
    } else if (info.file.status === 'error') {
      message.error(`${info.file.name} upload failed.`);
    }
  };

  return (
    <Form layout="vertical" onFinish={handleSubmit(onSubmit)} className="create-package-form">
      <Space direction="vertical" size="middle" style={{ width: '100%', paddingTop: '1rem' }}>

        {/* Basic Information */}
        <div>
          <Text strong>Basic Information</Text>
          <Divider style={{ margin: '8px 0' }} />

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="Package Code"
                validateStatus={errors.packageCode ? 'error' : ''}
                help={errors.packageCode?.message}
                required
              >
                <Controller
                  name="packageCode"
                  control={control}
                  render={({ field }) => (
                    <Input
                      {...field}
                      placeholder="Enter unique package code..."
                      status={errors.packageCode ? 'error' : ''}
                    />
                  )}
                />
              </Form.Item>
            </Col>

            <Col span={12}>
              <Form.Item
                label="Language"
                validateStatus={errors.langCode ? 'error' : ''}
                help={errors.langCode?.message}
                required
              >
                <Controller
                  name="langCode"
                  control={control}
                  render={({ field }) => (
                    <Select
                      {...field}
                      placeholder="Select language..."
                      status={errors.langCode ? 'error' : ''}
                    >
                      {languages.map(({ code, name }) => (
                        <Option value={code} key={code}>
                          {name}
                        </Option>
                      ))}
                    </Select>
                  )}
                />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="Package Name"
                validateStatus={errors.packageName ? 'error' : ''}
                help={errors.packageName?.message}
                required
              >
                <Controller
                  name="packageName"
                  control={control}
                  render={({ field }) => (
                    <Input
                      {...field}
                      placeholder="Enter package name..."
                      status={errors.packageName ? 'error' : ''}
                    />
                  )}
                />
              </Form.Item>
            </Col>

            <Col span={12}>
              <Form.Item
                label="Button Text"
                validateStatus={errors.buttonText ? 'error' : ''}
                help={errors.buttonText?.message}
                required
              >
                <Controller
                  name="buttonText"
                  control={control}
                  render={({ field }) => (
                    <Input
                      {...field}
                      placeholder="e.g., Buy Now, Purchase..."
                      status={errors.buttonText ? 'error' : ''}
                    />
                  )}
                />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="Sold By"
                validateStatus={errors.soldBy ? 'error' : ''}
                help={errors.soldBy?.message}
              >
                <Controller
                  name="soldBy"
                  control={control}
                  render={({ field }) => (
                    <Input
                      {...field}
                      placeholder="Enter seller name..."
                      status={errors.soldBy ? 'error' : ''}
                    />
                  )}
                />
              </Form.Item>
            </Col>

            <Col span={12}>
              <Form.Item
                label="Currency"
                validateStatus={errors.currency ? 'error' : ''}
                help={errors.currency?.message}
                required
              >
                <Controller
                  name="currency"
                  control={control}
                  render={({ field }) => (
                    <Select
                      {...field}
                      placeholder="Select currency..."
                      status={errors.currency ? 'error' : ''}
                    >
                      {currencies.map(({ code, name }) => (
                        <Option value={code} key={code}>
                          {code} - {name}
                        </Option>
                      ))}
                    </Select>
                  )}
                />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            label="Description"
            validateStatus={errors.packageDescription ? 'error' : ''}
            help={errors.packageDescription?.message}
          >
            <Controller
              name="packageDescription"
              control={control}
              render={({ field }) => (
                <TextArea
                  {...field}
                  placeholder="Enter package description..."
                  rows={4}
                  status={errors.packageDescription ? 'error' : ''}
                />
              )}
            />
          </Form.Item>
        </div>

        {/* Pricing */}
        <div>
          <Text strong>Pricing Information</Text>
          <Divider style={{ margin: '8px 0' }} />

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="Original Price"
                validateStatus={errors.originalPrice ? 'error' : ''}
                help={errors.originalPrice?.message}
                required
              >
                <Controller
                  name="originalPrice"
                  control={control}
                  render={({ field }) => (
                    <InputNumber
                      {...field}
                      placeholder="0.00"
                      style={{ width: '100%' }}
                      status={errors.originalPrice ? 'error' : ''}
                      min={0}
                      precision={2}
                    />
                  )}
                />
              </Form.Item>
            </Col>

            <Col span={12}>
              <Form.Item
                label="Discounted Price"
                validateStatus={errors.discountedPrice ? 'error' : ''}
                help={errors.discountedPrice?.message}
              >
                <Controller
                  name="discountedPrice"
                  control={control}
                  render={({ field }) => (
                    <InputNumber
                      {...field}
                      placeholder="0.00"
                      style={{ width: '100%' }}
                      status={errors.discountedPrice ? 'error' : ''}
                      min={0}
                      precision={2}
                    />
                  )}
                />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="Price Algorithm"
                validateStatus={errors.priceAlgorithm ? 'error' : ''}
                help={errors.priceAlgorithm?.message}
                required
              >
                <Controller
                  name="priceAlgorithm"
                  control={control}
                  render={({ field }) => (
                    <Select
                      {...field}
                      placeholder="Select price algorithm..."
                      status={errors.priceAlgorithm ? 'error' : ''}
                    >
                      {Object.values(PriceAlgorithm).map((algorithm) => (
                        <Option value={algorithm} key={algorithm}>
                          {algorithm}
                        </Option>
                      ))}
                    </Select>
                  )}
                />
              </Form.Item>
            </Col>

          </Row>

          <Row gutter={16}>
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
                    />
                  )}
                />
              </Form.Item>
            </Col>

            <Col span={12}>
              <Form.Item
                label="Incentive Percentage"
                validateStatus={errors.incentivePercentage ? 'error' : ''}
                help={errors.incentivePercentage?.message}
              >
                <Controller
                  name="incentivePercentage"
                  control={control}
                  render={({ field }) => (
                    <InputNumber
                      {...field}
                      placeholder="0"
                      style={{ width: '100%' }}
                      status={errors.incentivePercentage ? 'error' : ''}
                      min={0}
                      max={100}
                      precision={2}
                      formatter={(value) => `${value}%`}
                      parser={(value) => value!.replace('%', '')}
                    />
                  )}
                />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="Includes Tax">
                <Controller
                  name="includesTax"
                  control={control}
                  render={({ field }) => (
                    <Switch
                      {...field}
                      checked={field.value}
                      checkedChildren="Yes"
                      unCheckedChildren="No"
                    />
                  )}
                />
              </Form.Item>
            </Col>

            <Col span={12}>
              <Form.Item
                label="Confirmation Number"
                validateStatus={errors.confirmationNumber ? 'error' : ''}
                help={errors.confirmationNumber?.message}
              >
                <Controller
                  name="confirmationNumber"
                  control={control}
                  render={({ field }) => (
                    <InputNumber
                      {...field}
                      placeholder="Enter confirmation number..."
                      style={{ width: '100%' }}
                      status={errors.confirmationNumber ? 'error' : ''}
                      min={1}
                    />
                  )}
                />
              </Form.Item>
            </Col>
          </Row>
        </div>

        {/* Status and Settings */}
        <div>
          <Text strong>Status & Settings</Text>
          <Divider style={{ margin: '8px 0' }} />

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="Approved">
                <Controller
                  name="approved"
                  control={control}
                  render={({ field }) => (
                    <Switch
                      {...field}
                      checked={field.value}
                      checkedChildren="Approved"
                      unCheckedChildren="Pending"
                    />
                  )}
                />
              </Form.Item>
            </Col>

            <Col span={12}>
              <Form.Item label="Room Package">
                <Controller
                  name="room"
                  control={control}
                  render={({ field }) => (
                    <Switch
                      {...field}
                      checked={field.value}
                      checkedChildren="Yes"
                      unCheckedChildren="No"
                    />
                  )}
                />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="Tax Information"
                validateStatus={errors.taxInformation ? 'error' : ''}
                help={errors.taxInformation?.message}
              >
                <Controller
                  name="taxInformation"
                  control={control}
                  render={({ field }) => (
                    <TextArea
                      {...field}
                      placeholder="Enter tax information..."
                      rows={3}
                      status={errors.taxInformation ? 'error' : ''}
                    />
                  )}
                />
              </Form.Item>
            </Col>

            <Col span={12}>
              <Form.Item
                label="Package Alert"
                validateStatus={errors.packageAlert ? 'error' : ''}
                help={errors.packageAlert?.message}
              >
                <Controller
                  name="packageAlert"
                  control={control}
                  render={({ field }) => (
                    <TextArea
                      {...field}
                      placeholder="Enter alert message..."
                      rows={3}
                      status={errors.packageAlert ? 'error' : ''}
                    />
                  )}
                />
              </Form.Item>
            </Col>
          </Row>
        </div>

        {/* Package Details */}
        <div>
          <Text strong>Package Details</Text>
          <Divider style={{ margin: '8px 0' }} />

          {/* Benefits */}
          <Form.Item label="Package Benefits">
            <Space direction="vertical" style={{ width: '100%' }}>
              <Space style={{ width: '100%' }}>
                <Input
                  value={newBenefit}
                  onChange={(e) => setNewBenefit(e.target.value)}
                  placeholder="Add benefit..."
                  onPressEnter={addBenefit}
                  style={{ flex: 1 }}
                />
                <Button onClick={addBenefit}>Add</Button>
              </Space>
              {benefits.map((benefit, index) => (
                <Space key={index} style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                  <Text>{benefit}</Text>
                  <Button size="small" danger onClick={() => removeBenefit(index)}>
                    Remove
                  </Button>
                </Space>
              ))}
            </Space>
          </Form.Item>

          {/* Tags */}
          <Form.Item label="Package Tags">
            <Space direction="vertical" style={{ width: '100%' }}>
              <Space style={{ width: '100%' }}>
                <Input
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  placeholder="Add tag..."
                  onPressEnter={addTag}
                  style={{ flex: 1 }}
                />
                <Button onClick={addTag}>Add</Button>
              </Space>
              {tags.map((tag, index) => (
                <Space key={index} style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                  <Text>{tag}</Text>
                  <Button size="small" danger onClick={() => removeTag(index)}>
                    Remove
                  </Button>
                </Space>
              ))}
            </Space>
          </Form.Item>

          {/* Images */}
          <Form.Item label="Package Images">
            <Upload
              multiple
              listType="picture"
              onChange={handleImageUpload}
              beforeUpload={() => false} // Prevent automatic upload
            >
              <Button icon={<UploadOutlined />}>Upload Images</Button>
            </Upload>
          </Form.Item>
        </div>

        {/* Error Display */}
        {createPackage.error?.message && (
          <Alert
            message={createPackage.error.response?.data.message}
            type="error"
            showIcon
          />
        )}

        {/* Submit Button */}
        <Form.Item style={{ textAlign: 'center', marginBottom: 0, marginTop: '1rem' }}>
          <Button
            type="primary"
            htmlType="submit"
            loading={createPackage.status === "pending"}
            disabled={createPackage.status === "pending"}
            style={{ width: "100%" }}
            className="create-package-button"
          >
            Create Package
          </Button>
        </Form.Item>
      </Space>
    </Form>
  );
};

export default CreatePackageForm;