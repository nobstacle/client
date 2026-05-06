import * as React from "react";
import { SubmitHandler, useForm, Controller } from "react-hook-form";
import * as yup from "yup";
import { yupResolver } from "@hookform/resolvers/yup";
import {
    Form,
    Input,
    Select,
    Upload,
    Button,
    Space,
    Typography,
    message
} from "antd";
import { UploadOutlined, InboxOutlined } from "@ant-design/icons";
import { languages } from "../../../constant/languages";
import {
    useCompanyControllerGetCompany,
    useDocumentControllerGetDocumentTags
} from "../../../lib/client/api";
import { useMutation } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { toast, Bounce } from 'react-toastify';
import "react-toastify/dist/ReactToastify.css";

const { Text } = Typography;
const { Option } = Select;

interface UploadDocTemplateFormValues {
    file: FileList;
    tagCreate?: string;
    tagSelect?: string;
    langCode: string;
    templateId: string;
}

// Create dynamic schema based on mode
const createSchema = (isUpdateMode: boolean) =>
    yup.object().shape({
        file: isUpdateMode
            ? yup
                .mixed<FileList>()
                .test("fileSize", "Max 10MB", (v) => !v?.[0] || v[0].size <= 10 * 1024 * 1024)
                .test("fileType", "Only PDF, DOC, and DOCX files are allowed", (v) => {
                    if (!v?.[0]) return true;
                    return [
                        "application/pdf",
                        "application/msword",
                        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                        "application/vnd.ms-powerpoint",
                        "application/vnd.openxmlformats-officedocument.presentationml.presentation",
                        "application/vnd.ms-excel",
                        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                    ].includes(v[0].type);

                })
            : yup
                .mixed<FileList>()
                .required("File is required")
                .test("fileRequired", "File is required", (v) => v?.length > 0)
                .test("fileSize", "Max 10MB", (v) => !v?.[0] || v[0].size <= 10 * 1024 * 1024)
                .test("fileType", "Only PDF, DOC, and DOCX files are allowed", (v) => {
                    if (!v?.[0]) return true;
                    return [
                        "application/pdf",
                        "application/msword",
                        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                        "application/vnd.ms-powerpoint",
                        "application/vnd.openxmlformats-officedocument.presentationml.presentation",
                        "application/vnd.ms-excel",
                        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                    ].includes(v[0].type);

                }),
        langCode: yup.string().required("Language is required"),
        tagSelect: yup.string().when("tagCreate", {
            is: (val: any) => !val || val.length === 0,
            then: () => yup.string().required("Tag is required"),
            otherwise: () => yup.string(),
        }),
        tagCreate: yup.string().when("tagSelect", {
            is: (val: any) => !val || val.length === 0,
            then: () => yup
                .string()
                .required("Tag is required")
                .max(100, "Document name must be less than 100 characters"),
            otherwise: () => yup.string(),
        }),
    }, [["tagCreate", "tagSelect"]]);

export const UploadDocumentTemplateForm: React.FC<{
    onSuccess?: (data: any) => void;
    onClose?: () => void;
    document?: any; // The document to edit (for update mode)
    mode?: 'create' | 'update'; // Mode of the form
}> = ({ onSuccess, onClose, document, mode = 'create' }) => {
    const documentTags = useDocumentControllerGetDocumentTags();
    const company = useCompanyControllerGetCompany();
    const { data } = useSession();
    const isUpdateMode = mode === 'update' && document;

    const {
        register,
        handleSubmit,
        formState: { errors },
        reset,
        watch,
        setValue,
        control,
    } = useForm<UploadDocTemplateFormValues>({
        resolver: yupResolver(createSchema(isUpdateMode)),
        defaultValues: {
            tagCreate: isUpdateMode ? document?.tag || '' : '',
            tagSelect: '',
            langCode: isUpdateMode ? document?.langCode || '' : '',
        }
    });

    // Set default values when document changes (for update mode)
    React.useEffect(() => {
        if (isUpdateMode && document) {
            setValue('tagCreate', document.tag || '');
            setValue('tagSelect', '');
            setValue('langCode', document.langCode || '');
        } else {
            // Reset form for create mode   
            reset({
                tagCreate: '',
                tagSelect: '',
                langCode: '',
                file: undefined,
            });
        }
    }, [document, isUpdateMode, setValue, reset]);

    const uploadDocument = useMutation({
        mutationFn: async (formData: FormData) => {
            const baseUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';
            const endpoint = isUpdateMode
                ? `${baseUrl}/api/v1/uploads/company-document/${document.id}`
                : `${baseUrl}/api/v1/uploads/company-document`;

            const method = isUpdateMode ? 'PUT' : 'POST';

            const response = await fetch(endpoint, {
                method,
                body: formData,
                headers: { Authorization: `Bearer ${data?.user.backendTokens.at}` },
            });

            if (!response.ok) {
                const errorText = await response.text();
                let errorMessage = isUpdateMode ? "Update failed" : "Upload failed";

                try {
                    const errorJson = JSON.parse(errorText);
                    errorMessage = errorJson.message || errorMessage;
                } catch {
                    errorMessage = errorText || errorMessage;
                }

                throw new Error(errorMessage);
            }

            return response.json();
        },
        onSuccess: (data) => {
            const successMessage = isUpdateMode
                ? 'Document updated!'
                : 'Document uploaded!';

            toast.success(successMessage, {
                position: "bottom-right",
                autoClose: 5000,
                hideProgressBar: false,
                closeOnClick: false,
                pauseOnHover: true,
                draggable: true,
                progress: undefined,
                theme: "colored",
                transition: Bounce,
            });
            reset();
            onSuccess?.(data);
            onClose?.();
        },
        onError: (error: Error) => {
            const shortMessage = error.message.split('\n')[0];
            const errorMessage = isUpdateMode
                ? `Update failed: ${shortMessage}`
                : `Upload failed: ${shortMessage}`;

            toast.error(errorMessage, {
                position: "bottom-right",
                autoClose: 5000,
                hideProgressBar: false,
                closeOnClick: false,
                pauseOnHover: true,
                draggable: true,
                progress: undefined,
                theme: "colored",
                transition: Bounce,
            });
            console.error(`Document ${isUpdateMode ? 'update' : 'upload'} error:`, error);
        },

    });

    const handleDocumentSubmit = (data: UploadDocTemplateFormValues) => {
        const formData = new FormData();

        if (data.file?.[0]) {
            formData.append('file', data.file[0]);
        }

        // Use either tagCreate or tagSelect for the tag value
        const tagValue = data.tagCreate || data.tagSelect;
        formData.append('tag', tagValue);
        formData.append('langCode', data.langCode);
        formData.append('defaultLangCode', company.data?.defaultLangCode ?? "en");

        uploadDocument.mutate(formData);
    };

    const onSubmit: SubmitHandler<UploadDocTemplateFormValues> = (data) =>
        handleDocumentSubmit(data);

    const selectedFile = watch("file");
    const fileInfo = selectedFile?.[0];

    // Handler for dropdown selection
    const handleTagSelect = (selectedTag: string) => {
        if (selectedTag) {
            setValue('tagSelect', selectedTag);
            setValue('tagCreate', ''); // Clear the create input when selecting
        }
    };

    // Handler for input change
    const handleTagCreate = (value: string) => {
        setValue('tagCreate', value);
        if (value) {
            setValue('tagSelect', ''); // Clear the select when typing
        }
    };

    // Custom file upload props
    const uploadProps = {
        beforeUpload: (file: File) => {
            // Create a FileList-like object
            const fileList = [file] as any;
            fileList.length = 1;
            setValue('file', fileList);
            return false; // Prevent automatic upload
        },
        maxCount: 1,
        accept: '.pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx',
        showUploadList: false,
    };

    return (
        <Form layout="vertical" onFinish={handleSubmit(onSubmit)} className="create-template-form space-y-4">
            <hr />
            {/* File Upload Section */}
            <Form.Item
                label={isUpdateMode ? "Replace Document (Optional)" : "Upload Document"}
                validateStatus={errors.file ? 'error' : ''}
                help={errors.file?.message}
                required={!isUpdateMode}
            >
                <Upload.Dragger {...uploadProps}>
                    <p className="ant-upload-drag-icon">
                        <InboxOutlined />
                    </p>
                    <p className="ant-upload-text">
                        Click or drag file to this area to upload
                    </p>
                    <p className="ant-upload-hint">
                        Accepted formats: PDF, DOC, DOCX, PPT, PPTX, XLS, XLSX (Max 10MB)
                    </p>
                </Upload.Dragger>

                {/* Show current file info in update mode */}
                {isUpdateMode && document && !fileInfo && (
                    <Text type="secondary" className="block mt-2">
                        Current file: {document.originalName || document.tag}.{document.ext}
                    </Text>
                )}

                {/* Show selected new file info */}
                {fileInfo && (
                    <Text type="secondary" className="block mt-2">
                        {isUpdateMode ? 'New file selected: ' : 'Selected: '}
                        {fileInfo.name} ({(fileInfo.size / 1024 / 1024).toFixed(2)} MB)
                    </Text>
                )}
            </Form.Item>

            {/* Document Tag Section */}
            <Form.Item
                label="Document Tag"
                validateStatus={errors.tagCreate || errors.tagSelect ? 'error' : ''}
                help={errors.tagCreate?.message || errors.tagSelect?.message}
                required
            >
                <Input
                    placeholder="Type tag name here..."
                    value={watch('tagCreate') || ''}
                    onChange={(e) => handleTagCreate(e.target.value)}
                />

                {/* Tag Dropdown */}
                <div className="mt-2">
                    <Text type="secondary" className="block mb-1">
                        Or select an existing tag
                    </Text>
                    <Select
                        placeholder="Select existing tag..."
                        onChange={handleTagSelect}
                        className="w-full"
                        allowClear
                        value={watch('tagSelect') || undefined}
                        popupClassName="modal-select-dropdown"
                        getPopupContainer={(trigger) => trigger.parentElement!}
                    >
                        {documentTags.data?.map((value, index) => (
                            <Option value={value.tag} key={`${value.tag}-${index}`}>
                                {value.tag}
                            </Option>
                        ))}
                    </Select>
                </div>
            </Form.Item>

            {/* Language Selection */}
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
                            placeholder="Search or select language..."
                            status={errors.langCode ? "error" : ""}
                            className="w-full"
                            showSearch
                            popupClassName="modal-select-dropdown"
                            getPopupContainer={(trigger) => trigger.parentElement!}
                            filterOption={(input, option) =>
                                (option?.children as string)
                                    ?.toLowerCase()
                                    .includes(input.toLowerCase())
                            }
                            optionFilterProp="children"
                        >
                            {languages.map(({ code, name }, index) => (
                                <Select.Option value={code} key={index}>
                                    {name}
                                </Select.Option>
                            ))}
                        </Select>
                    )}
                />
            </Form.Item>

            <Button
                type="primary"
                htmlType="submit"
                loading={uploadDocument.isPending}
                disabled={uploadDocument.isPending}
                style={{ width: "100%" }}
                className="create-template-button"
            >
                {isUpdateMode ? 'Update Document' : 'Upload Document'}
            </Button>
        </Form>
    );
};