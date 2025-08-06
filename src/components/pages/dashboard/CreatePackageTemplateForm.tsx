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
  usePackageControllerUpdatePackage,
  usePackageControllerGetPackageTags,
} from "../../../lib/client/api";
import { useSession } from "next-auth/react";

const { Text } = Typography;
const { Option } = Select;
const { TextArea } = Input;


interface CreatePackageFormFieldValues {
  packageCode: string;
  originalPrice: number;
  discountedPrice?: number;
  includesTax: boolean;
  taxPercentage?: number;
  priceAlgorithm: string;
  active: boolean;
  priceLevel?: number;
  roomUpgrade: boolean;
  from_category?: string;
  to_category?: string;
  incentivePercentage?: number;
  companyId?: number;
  templateId?: number;
  packageName: string;
  packageDescription?: string;
  packageBenefits: string[];
  packageTags: string[];
  taxInformation?: string;
  currency: string;
  packageAlert?: string;
  buttonText: string;
  newTag?: string;
  newBenefit?: string;
  langCode: string;
  totalPackagesSold?: number;
}

const schema = yup.object().shape({
  packageCode: yup.string().required("Package code is required").max(50, "Package code must be at most 50 characters"),
  originalPrice: yup.number().required("Original price is required").min(0, "Price must be positive"),
  discountedPrice: yup.number().min(0, "Discounted price must be positive"),
  includesTax: yup.boolean().required(),
  taxPercentage: yup.number().min(0).max(100, "Tax percentage must be between 0-100"),
  priceAlgorithm: yup.string().required("Price algorithm is required"),
  active: yup.boolean().required(),
  priceLevel: yup.number().min(1, "Price level must be at least 1"),
  roomUpgrade: yup.boolean().required(),
  from_category: yup.string().when('roomUpgrade', {
    is: true,
    then: (schema) => schema.required("From category is required when room upgrade is enabled"),
    otherwise: (schema) => schema.notRequired()
  }),
  to_category: yup.string().when('roomUpgrade', {
    is: true,
    then: (schema) => schema.required("To category is required when room upgrade is enabled"),
    otherwise: (schema) => schema.notRequired()
  }),
  incentivePercentage: yup.number().min(0).max(100, "Incentive percentage must be between 0-100"),

  packageName: yup.string().required("Package name is required").max(100, "Name must be at most 100 characters"),
  packageDescription: yup.string().max(1000, "Description must be at most 1000 characters"),
  taxInformation: yup.string().max(500, "Tax information must be at most 500 characters"),
  currency: yup.string().required("Currency is required"),
  packageAlert: yup.string().max(200, "Alert text must be at most 200 characters"),
  buttonText: yup.string().required("Button text is required").max(50, "Button text must be at most 50 characters"),
  langCode: yup
    .array()
    .of(yup.string().required("Language is required"))
    .min(1, "At least one language is required")
    .required("Language is required"),
  totalPackagesSold: yup.number().min(0, "Total packages sold must be a non-negative number"),
});

interface CreatePackageFormProps {
  cb?: (packageData: any, isUpdate: boolean) => void;
  initialData?: any; // The package data for editing
  isEdit?: boolean;  // Whether in edit mode
}

const CreatePackageForm: React.FC<CreatePackageFormProps> = ({
  cb,
  initialData,
  isEdit = false,
}) => {
  const packageTags = usePackageControllerGetPackageTags();
  const company = useCompanyControllerGetCompany();

  // Helper function to get multilingual field value
  const getMultilingualValue = (field: any, fallbackLang = 'en') => {
    if (!field || typeof field !== 'object') return field || '';
    return field[fallbackLang] || field[Object.keys(field)[0]] || '';
  };

  // Helper function to convert price from cents to dollars
  const convertFromCents = (value: number) => {
    return value ? value / 100 : 0;
  };

  // Set default values based on edit mode
  const getDefaultValues = () => {
    if (isEdit && initialData) {
      return {
        packageCode: initialData.packageCode || "",
        originalPrice: convertFromCents(initialData.originalPrice) || 0,
        discountedPrice: convertFromCents(initialData.discountedPrice) || undefined,
        includesTax: initialData.includesTax || false,
        taxPercentage: initialData.taxPercentage || undefined,
        priceAlgorithm: initialData.priceAlgorithm || '',
        active: initialData.active || false,
        priceLevel: initialData.priceLevel || undefined,
        roomUpgrade: initialData.roomUpgrade || false,
        from_category: initialData.from_category || "",
        to_category: initialData.to_category || "",
        incentivePercentage: initialData.incentivePercentage || undefined,
        companyId: initialData.companyId || company.data?.id,
        templateId: initialData.templateId || undefined,

        packageName: getMultilingualValue(initialData.packageNames),
        packageDescription: getMultilingualValue(initialData.packageDescriptions),
        packageBenefits: [],
        packageTags: [],
        taxInformation: getMultilingualValue(initialData.taxInformation),
        currency: getMultilingualValue(initialData.currencies) || "AED",
        packageAlert: getMultilingualValue(initialData.packageAlerts),
        buttonText: getMultilingualValue(initialData.buttonTexts) || "Buy Now",
        langCode: [],
      };
    } else {
      return {
        packageCode: "",
        originalPrice: undefined,
        discountedPrice: undefined,
        includesTax: false,
        taxPercentage: undefined,
        priceAlgorithm: undefined,
        active: false,
        priceLevel: undefined,
        roomUpgrade: false,
        from_category: "",
        to_category: "",
        incentivePercentage: undefined,
        companyId: company.data?.id,
        templateId: undefined,

        packageName: "",
        packageDescription: "",
        packageBenefits: [],
        packageTags: [],
        taxInformation: "",
        currency: "AED",
        packageAlert: "",
        buttonText: "Buy Now",
        langCode: [],
        totalPackagesSold: 0
      };
    }
  };

  const {
    handleSubmit,
    control,
    watch,
    reset,
    formState: { errors },
  } = useForm<CreatePackageFormFieldValues>({
    resolver: yupResolver(schema),
    defaultValues: getDefaultValues(),
  });

  const createPackage = usePackageControllerCreatePackage();
  const updatePackage = usePackageControllerUpdatePackage();
  const { data } = useSession();
  let Url = process.env.NEXT_PUBLIC_BACKEND_URL;
  const [benefits, setBenefits] = React.useState<string[]>([]);
  const [tags, setTags] = React.useState<string[]>([]);
  const [newBenefit, setNewBenefit] = React.useState("");
  const [newTag, setNewTag] = React.useState("");
  const [images, setImages] = React.useState<any[]>([]);
  const [categoryData, setCategoryData] = React.useState<any[]>([]);

  const watchedLangCode = watch("langCode");
  const watchedRoomUpgrade = watch("roomUpgrade");
  const watchedFromCategory = watch("from_category");
  const watchedToCategory = watch("to_category");

  const transformCategoryToOptions = (categories) => {
    return categories.map(category => ({
      value: category.id,
      label: category.name,
      // Optional: include additional data if needed
      priceLevel: category.priceLevel,
      taxPercentage: category.taxPercentage,
      soldOut: category.soldOut
    }));
  };


  const getAvailableFromOptions = () => {
    const options = transformCategoryToOptions(categoryData);
    return options.filter(option => option.value !== watchedToCategory);
  };

  const getAvailableToOptions = () => {
    const options = transformCategoryToOptions(categoryData);
    return options.filter(option => option.value !== watchedFromCategory);
  };
  React.useEffect(() => {
    fetch(`${Url}/api/v1/uploads/get-all-categories`, {
      headers: { Authorization: `Bearer ${data?.user.backendTokens.at}` },
    })
      .then(async (response) => {
        const text = await response.text();
        const json = JSON.parse(text);
        const data = json.data || json;
        setCategoryData(data);
      })
      .catch((error) => {
        console.warn("Error fetching data:", error);
      });
  }, [data]);

  // Initialize form when editing
  React.useEffect(() => {
    if (isEdit && initialData) {
      reset(getDefaultValues());

      // Set benefits and tags from initial data
      const initialBenefits = getMultilingualValue(initialData.packageBenefits);
      const initialTags = getMultilingualValue(initialData.packageTags);

      setBenefits(Array.isArray(initialBenefits) ? initialBenefits : []);
      setTags(Array.isArray(initialTags) ? initialTags : []);

      // Set images if available
      if (initialData.images && Array.isArray(initialData.images)) {
        setImages(initialData.images);
      }
    }
  }, [isEdit, initialData, reset]);

  const handleCreatePackage = (data: CreatePackageFormFieldValues) => {
    // Create FormData for multipart/form-data
    const formData = new FormData();

    // Add all the package data
    formData.append('packageCode', data.packageCode);
    formData.append('originalPrice', data.originalPrice.toString());
    if (data.discountedPrice) {
      formData.append('discountedPrice', data.discountedPrice.toString());
    }
    formData.append('includesTax', data.includesTax.toString());
    if (data.taxPercentage) {
      formData.append('taxPercentage', data.taxPercentage.toString());
    }
    formData.append('priceAlgorithm', data.priceAlgorithm);
    formData.append('active', data.active.toString());
    if (data.priceLevel) {
      formData.append('priceLevel', data.priceLevel.toString());
    }
    formData.append('roomUpgrade', data.roomUpgrade.toString());
    if (data.from_category) {
      formData.append('from_category', data.from_category);
    }
    if (data.to_category) {
      formData.append('to_category', data.to_category);
    }
    if (data.incentivePercentage) {
      formData.append('incentivePercentage', data.incentivePercentage.toString());
    }
    formData.append('companyId', (data.companyId || company.data?.id).toString());
    formData.append('totalPackagesSold', (data.totalPackagesSold || 0).toString());
    if (data.templateId) {
      formData.append('templateId', data.templateId.toString());
    }

    // Add multi-language JSON fields
    formData.append('packageNames', JSON.stringify({ [watchedLangCode]: data.packageName }));
    formData.append('packageDescriptions', JSON.stringify({ [watchedLangCode]: data.packageDescription || "" }));
    formData.append('packageBenefits', JSON.stringify({ [watchedLangCode]: benefits }));
    formData.append('packageTags', JSON.stringify({ [watchedLangCode]: tags }));
    formData.append('taxInformation', JSON.stringify({ [watchedLangCode]: data.taxInformation || "" }));
    formData.append('currencies', JSON.stringify({ [watchedLangCode]: data.currency }));
    formData.append('packageAlerts', JSON.stringify({ [watchedLangCode]: data.packageAlert || "" }));
    formData.append('buttonTexts', JSON.stringify({ [watchedLangCode]: data.buttonText }));

    // Add images to FormData (only files that have originFileObj)
    images.forEach((image, index) => {
      if (image.originFileObj) {
        // For newly uploaded files
        formData.append(`images`, image.originFileObj);
        // Add image metadata
        formData.append(`imageMetadata[${index}]`, JSON.stringify({
          alt: image.alt || image.name,
          order: index + 1
        }));
      }
    });

    if (isEdit && initialData?.id) {
      // Update existing package
      updatePackage.mutate(
        { id: initialData.id, data: formData },
        {
          onSuccess: (packageResponse) => {
            message.success('Package updated successfully!');
            if (cb) {
              cb(packageResponse, true);
            }
          },
          onError: (error) => {
            message.error('Failed to update package');
            console.error('Update error:', error);
          }
        }
      );
    } else {
      // Create new package
      createPackage.mutate(
        { data: formData },
        {
          onSuccess: (packageResponse) => {
            message.success('Package created successfully!');
            if (cb) {
              cb(packageResponse, false);
            }
          },
          onError: (error) => {
            message.error('Failed to create package');
            console.error('Create error:', error);
          }
        }
      );
    }
  };

  const onSubmit: SubmitHandler<CreatePackageFormFieldValues> = (data) => {
    handleCreatePackage(data);
  }

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

  const isLoading = createPackage.status === "pending" || updatePackage.status === "pending";
  const error = createPackage.error || updatePackage.error;

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
                      placeholder="Enter unique package code"
                      status={errors.packageCode ? 'error' : ''}
                      disabled={isEdit} // Disable editing package code
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
                      placeholder="Select language"
                      status={errors.langCode ? 'error' : ''}
                      mode="multiple"
                      allowClear
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
                      placeholder="Enter package name"
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
                      placeholder="e.g., Buy Now, Purchase"
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
                label="Currency"
                validateStatus={errors.currency ? 'error' : ''}
                help={errors.currency?.message}
                required
              >
                <Controller
                  name="currency"
                  control={control}
                  render={({ field }) => (
                    <Input
                      {...field}
                      placeholder="Enter currency code"
                      status={errors.currency ? 'error' : ''}
                    />
                  )}
                />
              </Form.Item>
            </Col>
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
                      min={0}
                    />
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
                  placeholder="Enter package description"
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
                      placeholder="0"
                      style={{ width: '100%' }}
                      status={errors.originalPrice ? 'error' : ''}
                      min={0}
                      step={0.01}
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
                      placeholder="0"
                      style={{ width: '100%' }}
                      status={errors.discountedPrice ? 'error' : ''}
                      min={0}
                      step={0.01}
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
                    <Input
                      {...field}
                      placeholder="Enter price algorithm"
                      status={errors.priceAlgorithm ? 'error' : ''}
                    />
                  )}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="Total Packages Sold"
                validateStatus={errors.totalPackagesSold ? 'error' : ''}
                help={errors.totalPackagesSold?.message}
                required
              >
                <Controller
                  name="totalPackagesSold"
                  control={control}
                  render={({ field }) => (
                    <InputNumber
                      {...field}
                      placeholder="Enter total packages sold"
                      style={{ width: '100%' }}
                      status={errors.totalPackagesSold ? 'error' : ''}
                      min={0}
                    />
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
        </div>

        {/* Status and Settings */}
        <div>
          <Text strong>Status & Settings</Text>
          <Divider style={{ margin: '8px 0' }} />

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="Active">
                <Controller
                  name="active"
                  control={control}
                  render={({ field }) => (
                    <Switch
                      {...field}
                      checked={field.value}
                      checkedChildren="Active"
                      unCheckedChildren="Inactive"
                    />
                  )}
                />
              </Form.Item>
            </Col>

            <Col span={12}>
              <Form.Item label="Category Upgrade">
                <Controller
                  name="roomUpgrade"
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

          {watchedRoomUpgrade && (
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  label="From Category"
                  validateStatus={errors.from_category ? 'error' : ''}
                  help={errors.from_category?.message}
                  required
                >
                  <Controller
                    name="from_category"
                    control={control}
                    render={({ field }) => (
                      <Select
                        {...field}
                        placeholder="Select from category"
                        status={errors.from_category ? 'error' : ''}
                        allowClear
                        options={getAvailableFromOptions()}
                      />
                    )}
                  />
                </Form.Item>
              </Col>

              <Col span={12}>
                <Form.Item
                  label="To Category"
                  validateStatus={errors.to_category ? 'error' : ''}
                  help={errors.to_category?.message}
                  required
                >
                  <Controller
                    name="to_category"
                    control={control}
                    render={({ field }) => (
                      <Select
                        {...field}
                        placeholder="Select to category"
                        status={errors.to_category ? 'error' : ''}
                        allowClear
                        options={getAvailableToOptions()}
                      />
                    )}
                  />
                </Form.Item>
              </Col>
            </Row>
          )}

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
                      placeholder="Enter tax information"
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
                      placeholder="Enter alert message"
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

          <Row gutter={16}>
            <Col md={12} xs={24}>
              {/* Benefits */}
              <Form.Item label="Package Benefits">
                <Space direction="vertical" style={{ width: '100%' }}>
                  <Space style={{ width: '100%' }}>
                    <Input
                      value={newBenefit}
                      onChange={(e) => setNewBenefit(e.target.value)}
                      placeholder="Add benefit"
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
            </Col>
            <Col md={12} xs={24}>
              {/* Tags */}
              <Form.Item label="Package Tags">
                <Space direction="vertical" style={{ width: '100%' }}>
                  <Space style={{ width: '100%' }}>
                    <Input
                      value={newTag}
                      onChange={(e) => setNewTag(e.target.value)}
                      placeholder="Add tag"
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
            </Col>
          </Row>

          {/* Images */}
          <Form.Item label="Package Images">
            <Upload
              multiple
              listType="picture"
              onChange={handleImageUpload}
              beforeUpload={(file) => {
                return false;
              }}
              fileList={images.map((img, index) => ({
                uid: img.uid || index.toString(),
                name: img.name || img.alt || `image-${index}`,
                status: 'done',
                url: img.url,
                originFileObj: img.originFileObj
              }))}
              onRemove={(file) => {
                const newImages = images.filter(img => img.uid !== file.uid);
                setImages(newImages);
              }}
            >
              <Button icon={<UploadOutlined />}>Upload Images</Button>
            </Upload>
          </Form.Item>
        </div>

        {/* Error Display */}
        {error?.message && (
          <Alert
            message={error.response?.data.message || error.message}
            type="error"
            showIcon
          />
        )}

        {/* Submit Button */}
        <Form.Item style={{ textAlign: 'center', marginBottom: 0, marginTop: '1rem' }}>
          <Button
            type="primary"
            htmlType="submit"
            loading={isLoading}
            disabled={isLoading}
            style={{ width: "100%" }}
            className="create-package-button"
          >
            {isEdit ? 'Update Package' : 'Create Package'}
          </Button>
        </Form.Item>
      </Space>
    </Form>
  );
};

export default CreatePackageForm;