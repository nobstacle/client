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
  DatePicker,
  Divider
} from "antd";
import { languages } from "../../../constant/languages";
import {
  useCompanyControllerGetCompany,
  usePackageControllerCreatePackage,
  usePackageControllerGetPackageTags,
} from "../../../lib/client/api";
import dayjs from "dayjs";

const { Text } = Typography;
const { Option } = Select;
const { TextArea } = Input;

interface CreatePackageFormFieldValues {
  name: string;
  description?: string;
  tagCreate?: string;
  tagSelect?: string;
  price: number;
  currency: string;
  duration?: number;
  durationUnit: 'days' | 'weeks' | 'months' | 'years';
  maxParticipants?: number;
  minParticipants?: number;
  isActive: boolean;
  availableFrom?: string;
  availableTo?: string;
  langCode: string;
  location?: string;
  inclusions?: string[];
  exclusions?: string[];
  highlights?: string[];
}

const schema = yup.object().shape(
  {
    name: yup.string().required("Package name is required").max(100, "Name must be at most 100 characters"),
    description: yup.string().max(500, "Description must be at most 500 characters"),
    
    tagSelect: yup.string().when("tagCreate", {
      is: (val: any) => val && val.length > 0,
      then: () => yup.string(),
      otherwise: () => yup.string().required("Tag is required"),
    }),

    tagCreate: yup.string().when("tagSelect", {
      is: (val: any) => val && val.length > 0,
      then: () => yup.string(),
      otherwise: () =>
        yup
          .string()
          .required("Tag is required")
          .max(30, "Tag must be at most 30 characters"),
    }),
    
    price: yup.number().required("Price is required").min(0, "Price must be positive"),
    currency: yup.string().required("Currency is required"),
    duration: yup.number().min(1, "Duration must be at least 1"),
    durationUnit: yup.string().oneOf(['days', 'weeks', 'months', 'years']).required("Duration unit is required"),
    maxParticipants: yup.number().min(1, "Maximum participants must be at least 1"),
    minParticipants: yup.number().min(1, "Minimum participants must be at least 1"),
    isActive: yup.boolean().required(),
    langCode: yup.string().required("Language is required"),
    location: yup.string().max(200, "Location must be at most 200 characters"),
  },
  [["tagCreate", "tagSelect"]],
);

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

const durationUnits = [
  { value: 'days', label: 'Days' },
  { value: 'weeks', label: 'Weeks' },
  { value: 'months', label: 'Months' },
  { value: 'years', label: 'Years' },
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
      name: "",
      description: "",
      tagCreate: "",
      tagSelect: "",
      price: 0,
      currency: "USD",
      duration: 1,
      durationUnit: "days",
      maxParticipants: undefined,
      minParticipants: undefined,
      isActive: true,
      availableFrom: undefined,
      availableTo: undefined,
      langCode: "",
      location: "",
      inclusions: [],
      exclusions: [],
      highlights: [],
    },
  });

  const createPackage = usePackageControllerCreatePackage();

  const [inclusions, setInclusions] = React.useState<string[]>([]);
  const [exclusions, setExclusions] = React.useState<string[]>([]);
  const [highlights, setHighlights] = React.useState<string[]>([]);
  const [newInclusion, setNewInclusion] = React.useState("");
  const [newExclusion, setNewExclusion] = React.useState("");
  const [newHighlight, setNewHighlight] = React.useState("");

  const handleCreatePackage = (data: CreatePackageFormFieldValues) => {
    const packageData = {
      ...data,
      tag: (data.tagCreate as string) || (data.tagSelect as string),
      defaultLangCode: company.data?.defaultLangCode ?? "en",
      inclusions,
      exclusions,
      highlights,
      availableFrom: data.availableFrom ? dayjs(data.availableFrom).toISOString() : undefined,
      availableTo: data.availableTo ? dayjs(data.availableTo).toISOString() : undefined,
    };

    // Remove undefined values to clean up the request
    const cleanedData = Object.fromEntries(
      Object.entries(packageData).filter(([_, value]) => value !== undefined && value !== "")
    );

    createPackage.mutate(
      { data: cleanedData },
      {
        onSuccess: (packageResponse) => {
          if (cb) {
            cb(
              packageResponse,
              !!data.tagSelect ||
              !!packageTags.data?.find(({ tag }) => tag === packageResponse.tag) ||
              false,
            );
          }
        },
      },
    );
  };

  const onSubmit: SubmitHandler<CreatePackageFormFieldValues> = (data) =>
    handleCreatePackage(data);

  const addInclusion = () => {
    if (newInclusion.trim()) {
      setInclusions([...inclusions, newInclusion.trim()]);
      setNewInclusion("");
    }
  };

  const addExclusion = () => {
    if (newExclusion.trim()) {
      setExclusions([...exclusions, newExclusion.trim()]);
      setNewExclusion("");
    }
  };

  const addHighlight = () => {
    if (newHighlight.trim()) {
      setHighlights([...highlights, newHighlight.trim()]);
      setNewHighlight("");
    }
  };

  const removeInclusion = (index: number) => {
    setInclusions(inclusions.filter((_, i) => i !== index));
  };

  const removeExclusion = (index: number) => {
    setExclusions(exclusions.filter((_, i) => i !== index));
  };

  const removeHighlight = (index: number) => {
    setHighlights(highlights.filter((_, i) => i !== index));
  };

  return (
    <Form layout="vertical" onFinish={handleSubmit(onSubmit)} className="create-package-form">
      <Space direction="vertical" size="middle" style={{ width: '100%', paddingTop: '1rem' }}>

        {/* Basic Information */}
        <div>
          <Text strong>Basic Information</Text>
          <Divider style={{ margin: '8px 0' }} />
          
          <Form.Item
            label="Package Name"
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
                  placeholder="Enter package name..."
                  status={errors.name ? 'error' : ''}
                />
              )}
            />
          </Form.Item>

          <Form.Item
            label="Description"
            validateStatus={errors.description ? 'error' : ''}
            help={errors.description?.message}
          >
            <Controller
              name="description"
              control={control}
              render={({ field }) => (
                <TextArea
                  {...field}
                  placeholder="Enter package description..."
                  rows={4}
                  status={errors.description ? 'error' : ''}
                />
              )}
            />
          </Form.Item>

          <Form.Item
            label="Location"
            validateStatus={errors.location ? 'error' : ''}
            help={errors.location?.message}
          >
            <Controller
              name="location"
              control={control}
              render={({ field }) => (
                <Input
                  {...field}
                  placeholder="Enter package location..."
                  status={errors.location ? 'error' : ''}
                />
              )}
            />
          </Form.Item>
        </div>

        {/* Tag Creation/Selection */}
        <div>
          <Text strong>Category</Text>
          <Divider style={{ margin: '8px 0' }} />
          
          <Form.Item
            label="Create a tag"
            validateStatus={errors.tagCreate ? 'error' : ''}
            help={errors.tagCreate?.message}
            required
          >
            <Controller
              name="tagCreate"
              control={control}
              render={({ field }) => (
                <Input
                  {...field}
                  placeholder="Type tag name here..."
                  status={errors.tagCreate ? 'error' : ''}
                />
              )}
            />
          </Form.Item>

          <Form.Item
            label="Or select an existing tag"
            validateStatus={errors.tagSelect ? 'error' : ''}
            help={errors.tagSelect?.message}
          >
            <Controller
              name="tagSelect"
              control={control}
              render={({ field }) => (
                <Select
                  {...field}
                  placeholder="Select tag..."
                  style={{ width: '100%' }}
                  status={errors.tagSelect ? 'error' : ''}
                  allowClear
                >
                  {packageTags.data?.map((value, index) => (
                    <Option value={value.tag} key={`${value.tag}-${index}`}>
                      {value.tag}
                    </Option>
                  ))}
                </Select>
              )}
            />
          </Form.Item>
        </div>

        {/* Pricing and Duration */}
        <div>
          <Text strong>Pricing & Duration</Text>
          <Divider style={{ margin: '8px 0' }} />
          
          <Space direction="horizontal" style={{ width: '100%' }}>
            <Form.Item
              label="Price"
              validateStatus={errors.price ? 'error' : ''}
              help={errors.price?.message}
              required
              style={{ flex: 1 }}
            >
              <Controller
                name="price"
                control={control}
                render={({ field }) => (
                  <InputNumber
                    {...field}
                    placeholder="0.00"
                    style={{ width: '100%' }}
                    status={errors.price ? 'error' : ''}
                    min={0}
                    precision={2}
                  />
                )}
              />
            </Form.Item>

            <Form.Item
              label="Currency"
              validateStatus={errors.currency ? 'error' : ''}
              help={errors.currency?.message}
              required
              style={{ flex: 1 }}
            >
              <Controller
                name="currency"
                control={control}
                render={({ field }) => (
                  <Select
                    {...field}
                    placeholder="Select currency..."
                    style={{ width: '100%' }}
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
          </Space>

          <Space direction="horizontal" style={{ width: '100%' }}>
            <Form.Item
              label="Duration"
              validateStatus={errors.duration ? 'error' : ''}
              help={errors.duration?.message}
              style={{ flex: 1 }}
            >
              <Controller
                name="duration"
                control={control}
                render={({ field }) => (
                  <InputNumber
                    {...field}
                    placeholder="1"
                    style={{ width: '100%' }}
                    status={errors.duration ? 'error' : ''}
                    min={1}
                  />
                )}
              />
            </Form.Item>

            <Form.Item
              label="Duration Unit"
              validateStatus={errors.durationUnit ? 'error' : ''}
              help={errors.durationUnit?.message}
              required
              style={{ flex: 1 }}
            >
              <Controller
                name="durationUnit"
                control={control}
                render={({ field }) => (
                  <Select
                    {...field}
                    placeholder="Select unit..."
                    style={{ width: '100%' }}
                    status={errors.durationUnit ? 'error' : ''}
                  >
                    {durationUnits.map(({ value, label }) => (
                      <Option value={value} key={value}>
                        {label}
                      </Option>
                    ))}
                  </Select>
                )}
              />
            </Form.Item>
          </Space>
        </div>

        {/* Participants and Language */}
        <div>
          <Text strong>Participants & Language</Text>
          <Divider style={{ margin: '8px 0' }} />
          
          <Space direction="horizontal" style={{ width: '100%' }}>
            <Form.Item
              label="Min Participants"
              validateStatus={errors.minParticipants ? 'error' : ''}
              help={errors.minParticipants?.message}
              style={{ flex: 1 }}
            >
              <Controller
                name="minParticipants"
                control={control}
                render={({ field }) => (
                  <InputNumber
                    {...field}
                    placeholder="1"
                    style={{ width: '100%' }}
                    status={errors.minParticipants ? 'error' : ''}
                    min={1}
                  />
                )}
              />
            </Form.Item>

            <Form.Item
              label="Max Participants"
              validateStatus={errors.maxParticipants ? 'error' : ''}
              help={errors.maxParticipants?.message}
              style={{ flex: 1 }}
            >
              <Controller
                name="maxParticipants"
                control={control}
                render={({ field }) => (
                  <InputNumber
                    {...field}
                    placeholder="10"
                    style={{ width: '100%' }}
                    status={errors.maxParticipants ? 'error' : ''}
                    min={1}
                  />
                )}
              />
            </Form.Item>
          </Space>

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
                  style={{ width: '100%' }}
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
        </div>

        {/* Availability */}
        <div>
          <Text strong>Availability</Text>
          <Divider style={{ margin: '8px 0' }} />
          
          <Form.Item
            label="Package Status"
          >
            <Controller
              name="isActive"
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

          <Space direction="horizontal" style={{ width: '100%' }}>
            <Form.Item
              label="Available From"
              style={{ flex: 1 }}
            >
              <Controller
                name="availableFrom"
                control={control}
                render={({ field }) => (
                  <DatePicker
                    {...field}
                    value={field.value ? dayjs(field.value) : undefined}
                    onChange={(date) => field.onChange(date?.toISOString())}
                    placeholder="Select start date"
                    style={{ width: '100%' }}
                  />
                )}
              />
            </Form.Item>

            <Form.Item
              label="Available To"
              style={{ flex: 1 }}
            >
              <Controller
                name="availableTo"
                control={control}
                render={({ field }) => (
                  <DatePicker
                    {...field}
                    value={field.value ? dayjs(field.value) : undefined}
                    onChange={(date) => field.onChange(date?.toISOString())}
                    placeholder="Select end date"
                    style={{ width: '100%' }}
                  />
                )}
              />
            </Form.Item>
          </Space>
        </div>

        {/* Package Details */}
        <div>
          <Text strong>Package Details</Text>
          <Divider style={{ margin: '8px 0' }} />
          
          {/* Inclusions */}
          <Form.Item label="Inclusions">
            <Space direction="vertical" style={{ width: '100%' }}>
              <Space>
                <Input
                  value={newInclusion}
                  onChange={(e) => setNewInclusion(e.target.value)}
                  placeholder="Add inclusion..."
                  onPressEnter={addInclusion}
                />
                <Button onClick={addInclusion}>Add</Button>
              </Space>
              {inclusions.map((inclusion, index) => (
                <Space key={index} style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                  <Text>{inclusion}</Text>
                  <Button size="small" danger onClick={() => removeInclusion(index)}>
                    Remove
                  </Button>
                </Space>
              ))}
            </Space>
          </Form.Item>

          {/* Exclusions */}
          <Form.Item label="Exclusions">
            <Space direction="vertical" style={{ width: '100%' }}>
              <Space>
                <Input
                  value={newExclusion}
                  onChange={(e) => setNewExclusion(e.target.value)}
                  placeholder="Add exclusion..."
                  onPressEnter={addExclusion}
                />
                <Button onClick={addExclusion}>Add</Button>
              </Space>
              {exclusions.map((exclusion, index) => (
                <Space key={index} style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                  <Text>{exclusion}</Text>
                  <Button size="small" danger onClick={() => removeExclusion(index)}>
                    Remove
                  </Button>
                </Space>
              ))}
            </Space>
          </Form.Item>

          {/* Highlights */}
          <Form.Item label="Highlights">
            <Space direction="vertical" style={{ width: '100%' }}>
              <Space>
                <Input
                  value={newHighlight}
                  onChange={(e) => setNewHighlight(e.target.value)}
                  placeholder="Add highlight..."
                  onPressEnter={addHighlight}
                />
                <Button onClick={addHighlight}>Add</Button>
              </Space>
              {highlights.map((highlight, index) => (
                <Space key={index} style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                  <Text>{highlight}</Text>
                  <Button size="small" danger onClick={() => removeHighlight(index)}>
                    Remove
                  </Button>
                </Space>
              ))}
            </Space>
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