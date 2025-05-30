import * as React from "react";
import { SubmitHandler, useForm } from "react-hook-form";
import * as yup from "yup";
import { yupResolver } from "@hookform/resolvers/yup";
import Input from "../../Input";
import { Button } from "../../Button";
import { languages } from "../../../constant/languages";
import {
    useCompanyControllerGetCompany,
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

const schema = yup.object().shape({
    file: yup
        .mixed<FileList>()
        .required("File is required")
        .test("fileRequired", "File is required", (v) => v?.length > 0)
        .test("fileSize", "Max 10MB", (v) => !v?.[0] || v[0].size <= 10 * 1024 * 1024)
        .test("fileType", "PDF/DOC/DOCX/TXT only", (v) => {
            if (!v?.[0]) return true;
            return [
                "application/pdf",
                "application/msword",
                "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                "text/plain",
            ].includes(v[0].type);
        }),
    docName: yup.string().required("Document name is required").max(100, "Document name must be less than 100 characters"),
    langCode: yup.string().required("Language is required"),
});

export const UploadDocumentTemplateForm: React.FC<{
    onSuccess?: (data: any) => void;
    onClose?: () => void;
}> = ({ onSuccess, onClose }) => {
    const company = useCompanyControllerGetCompany();
    const { data } = useSession();

    const {
        register,
        handleSubmit,
        formState: { errors },
        reset,
        watch,
    } = useForm<UploadDocTemplateFormValues>({
        resolver: yupResolver(schema),
    });

    const uploadDocument = useMutation({
        mutationFn: async (formData: FormData) => {
            const baseUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';
            const response = await fetch(`${baseUrl}/api/v1/uploads/company-document`, {
                method: 'POST',
                body: formData,
                headers: { Authorization: `Bearer ${data?.user.backendTokens.at}` },
            });

            if (!response.ok) {
                const errorText = await response.text();
                let errorMessage = "Upload failed";

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
            toast.success('Document uploaded successfully!', {
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
            toast.error(`Upload failed: ${error.message}`, {
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
            console.error("Document upload error:", error);
        },
    });

    const handleDocumentUpload = (data: UploadDocTemplateFormValues) => {
        const file = data.file[0];
        if (!file) {
            console.error("No file selected");
            return;
        }

        const formData = new FormData();
        formData.append('file', file);
        formData.append('tag', data.docName);
        formData.append('langCode', data.langCode);
        formData.append('defaultLangCode', company.data?.defaultLangCode ?? "en");

        uploadDocument.mutate(formData);
    };

    const onSubmit: SubmitHandler<UploadDocTemplateFormValues> = (data) =>
        handleDocumentUpload(data);

    const selectedFile = watch("file");
    const fileInfo = selectedFile?.[0];

    return (
        <>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div>
                    <Input
                        register={register}
                        name="file"
                        label="Upload Document"
                        type="file"
                        accept=".pdf,.doc,.docx,.txt"
                        required
                    />
                    {errors.file && (
                        <p className="text-red-600 text-sm mt-1">
                            {errors.file.message}
                        </p>
                    )}
                    {fileInfo && (
                        <p className="text-sm text-gray-600 mt-1">
                            Selected: {fileInfo.name} ({(fileInfo.size / 1024 / 1024).toFixed(2)} MB)
                        </p>
                    )}
                </div>

                <div>
                    <Input
                        register={register}
                        name="docName"
                        label="Document Name"
                        placeholder="Enter document name"
                        required
                    />
                    {errors.docName && (
                        <p className="text-red-600 text-sm mt-1">
                            {errors.docName.message}
                        </p>
                    )}
                </div>

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
                    {errors.langCode && (
                        <p className="text-red-600 text-sm mt-1">
                            {errors.langCode.message}
                        </p>
                    )}
                </div>

                <div className="text-center">
                    {uploadDocument.isError && (
                        <div className="bg-red-50 border border-red-200 text-red-600 px-3 py-2 rounded text-sm">
                            {(uploadDocument.error as Error)?.message}
                        </div>
                    )}
                </div>

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
                        Upload Document
                    </Button>
                </div>
            </form>
        </>
    );
};