import * as React from "react";
import { SubmitHandler, useForm } from "react-hook-form";
import * as yup from "yup";
import { yupResolver } from "@hookform/resolvers/yup";
import Input from "../../Input";
import { Button } from "../../Button";
import { languages } from "../../../constant/languages";
import {
    useCompanyControllerGetCompany,
    useDocumentControllerGetDocumentTags
} from "../../../lib/client/api";
import { useMutation } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { toast, Bounce } from 'react-toastify';
import "react-toastify/dist/ReactToastify.css";

interface UploadDocTemplateFormValues {
    file: FileList;
    docName: string;
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
        docName: yup.string().required("Document name is required").max(100, "Document name must be less than 100 characters"),
        langCode: yup.string().required("Language is required"),
    });

export const UploadTeamDocumentTemplateForm: React.FC<{
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
    } = useForm<UploadDocTemplateFormValues>({
        resolver: yupResolver(createSchema(isUpdateMode)),
        defaultValues: {
            docName: isUpdateMode ? document?.tag || '' : '',
            langCode: isUpdateMode ? document?.langCode || '' : '',
        }
    });

    // Set default values when document changes (for update mode)
    React.useEffect(() => {
        if (isUpdateMode && document) {
            setValue('docName', document.tag || '');
            setValue('langCode', document.langCode || '');
        } else {
            // Reset form for create mode
            reset({
                docName: '',
                langCode: '',
                file: undefined,
            });
        }
    }, [document, isUpdateMode, setValue, reset]);

    const uploadDocument = useMutation({
        mutationFn: async (formData: FormData) => {
            const baseUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';
            const endpoint = isUpdateMode
                ? `${baseUrl}/api/v1/uploads/team-document/${document.id}`
                : `${baseUrl}/api/v1/uploads/team-document`;

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
                ? 'Document updated successfully!'
                : 'Document uploaded successfully!';

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

        formData.append('tag', data.docName);
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
            setValue('docName', selectedTag);
        }
    };

    return (
        <>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                {/* File Upload Section */}
                <div>
                    <Input
                        register={register}
                        name="file"
                        label={isUpdateMode ? "Replace Document (Optional)" : "Upload Document"}
                        type="file"
                        accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx"
                        required={!isUpdateMode}
                    />
                    {errors.file && (
                        <p className="text-red-600 text-sm mt-1">
                            {errors.file.message}
                        </p>
                    )}

                    {/* Show current file info in update mode */}
                    {isUpdateMode && document && !fileInfo && (
                        <p className="text-sm text-blue-600 mt-1">
                            Current file: {document.originalName || document.tag}.{document.ext}
                        </p>
                    )}

                    {/* Show selected new file info */}
                    {fileInfo && (
                        <p className="text-sm text-gray-600 mt-1">
                            {isUpdateMode ? 'New file selected: ' : 'Selected: '}
                            {fileInfo.name} ({(fileInfo.size / 1024 / 1024).toFixed(2)} MB)
                        </p>
                    )}

                    {/* File type hint */}
                    <p className="text-xs text-gray-500 mt-1">
                        Accepted formats: PDF, DOC, DOCX, PPT, PPTX, XLS, XLSX (Max 10MB)
                    </p>

                </div>

                {/* Document Tag Section */}
                <div>
                    <Input
                        register={register}
                        name="docName"
                        label="Document Tag"
                        placeholder="Enter tag name or select from dropdown..."
                        required
                    />
                    {errors.docName && (
                        <p className="text-red-600 text-sm mt-1">
                            {errors.docName.message}
                        </p>
                    )}

                    {/* Tag Dropdown */}
                    <div className="mt-2">
                        <label className="block text-xs font-medium text-gray-600 mb-1">
                            Or select existing tag:
                        </label>
                        <select
                            onChange={(e) => handleTagSelect(e.target.value)}
                            className="w-full border border-gray-300 p-2 rounded text-sm"
                            defaultValue=""
                        >
                            <option value="">Select existing tag...</option>
                            {documentTags.data?.map((value, index) => (
                                <option value={value.tag} key={`${value.tag}-${index}`}>
                                    {value.tag}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* Language Selection */}
                <div>
                    <label className="block text-sm font-medium mb-1">Language *</label>
                    <select
                        {...register("langCode")}
                        className={`w-full border p-2 rounded ${errors.langCode ? "border-red-500" : "border-gray-300"
                            }`}
                        required
                    >
                        <option value="">Select language...</option>
                        {languages.map((l) => (
                            <option key={l.code} value={l.code}>
                                {l.name}
                            </option>
                        ))}
                        <option value="tr">Turkish</option>
                        <option value="fr">French</option>
                    </select>
                </div>

                {/* Form Actions */}
                <div className="flex justify-end space-x-2 pt-4">
                    {onClose && (
                        <Button
                            onClick={onClose}
                            disabled={uploadDocument.isPending}
                            type="button"
                        >
                            Cancel
                        </Button>
                    )}
                    <Button
                        isLoading={uploadDocument.isPending}
                        disabled={uploadDocument.isPending}
                        type="submit"
                    >
                        {isUpdateMode ? 'Update Document' : 'Upload Document'}
                    </Button>
                </div>
            </form>
        </>
    );
};