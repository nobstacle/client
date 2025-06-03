"use client";
import { useEffect, useState } from "react";
import { SendDocumentForm } from "../../../components/pages/dashboard/SendDocuments";
import { useSearchParams } from "next/navigation";
import { useDisclousure } from "../../../hooks/useDisclosure";
import { PlusIcon } from "../../../components/icons/PlusIcon";
import Modal from "../../../components/Modal";
import { UploadDocumentTemplateForm } from "../../../components/pages/dashboard/CreateDocumentTemplate";
import { useSession } from "next-auth/react";
// import { FilePdfOutlined, FileWordOutlined, FileUnknownOutlined } from '@ant-design/icons';
import {
    DraggableCardContainer,
    DraggableCardItem,
} from "../../../components/DraggableCard";
import { arrayMove } from "@dnd-kit/sortable";
import { UniqueIdentifier } from "@dnd-kit/core";
import { useSocketContext } from "../../../context/SocketContextProvider";
import { ChatType } from "../../../constant/types";
import {
    AiFillFilePdf,
    AiFillFileWord,
    AiFillFileExcel,
    AiFillFileImage,
    AiFillFileZip,
    AiFillFileText,
    AiFillFileUnknown
} from 'react-icons/ai';

export default function Documents() {
    const [searchDocuments, setSearchDocuments] = useState([]);
    const { data } = useSession();
    const params = useSearchParams();
    const { handleClose, handleOpen, isOpen } = useDisclousure();
    const [responses, setResponses] = useState([]);
    const { emitSendDocument } = useSocketContext();
    let Url = process.env.NEXT_PUBLIC_BACKEND_URL;

    const fetchDocuments = () => {
        if (data?.user.backendTokens.at) {
            fetch(`${Url}/api/v1/template/documents`, {
                headers: { Authorization: `Bearer ${data?.user.backendTokens.at}` },
            })
                .then((response) => {
                    if (!response.ok) throw new Error("Unauthorized or failed request");
                    return response.json();
                })
                .then((data) => {
                    setResponses(data);
                })
                .catch((error) => console.error("Error fetching data:", error));
        }
    }

    useEffect(() => {
        fetchDocuments();
    }, [data]);

    const handleUploadSuccess = () => {
        fetchDocuments();
    }

    // Function to handle document deletion
    const onDeleteDocument = (id: number) => {
        // Add your delete API call here
        // Example:
        // fetch(`${Url}/api/v1/template/documents/${id}`, {
        //     method: 'DELETE',
        //     headers: { Authorization: `Bearer ${data?.user.backendTokens.at}` },
        // })
        // .then(() => {
        //     const newDocuments = responses.filter((doc) => doc.id !== id);
        //     setResponses(newDocuments);
        // })
        // .catch((error) => console.error("Error deleting document:", error));

        // For now, just remove from state
        const newDocuments = responses.filter((doc) => doc.id !== id);
        setResponses(newDocuments);
    };

    const onUpdateDocument = (document: any) => {
        console.log("Update document:", document);
    };

    const sortDocuments = (item1: UniqueIdentifier, item2: UniqueIdentifier) => {
        const setResource = searchDocuments.length > 0 ? setSearchDocuments : setResponses;
        const documentsResource = searchDocuments.length > 0 ? searchDocuments : responses;

        const oldIndex = documentsResource.findIndex((item) => item.id === item1);
        const newIndex = documentsResource.findIndex((item) => item.id === item2);

        let shallow = [...documentsResource];
        shallow = arrayMove(documentsResource, oldIndex, newIndex);

        shallow.forEach(({ id }, index) => {
        });

        setResource(shallow);
    };

    // const getFileIcon = (ext: string) => {
    //     const extension = ext?.toLowerCase();
    //     switch (extension) {
    //         case 'pdf':
    //             return <FilePdfOutlined style={{ color: 'red', fontSize: '60px' }} />;
    //         case 'doc':
    //         case 'docx':
    //             return <FileWordOutlined style={{ color: 'blue', fontSize: '60px' }} />;
    //         default:
    //             return <FileUnknownOutlined style={{ fontSize: '60px' }} />;
    //     }
    // };
    const getFileIcon = (ext: string) => {
        const extension = ext?.toLowerCase();
        const iconProps = { size: 65 };

        switch (extension) {
            case 'pdf':
                return <AiFillFilePdf color="#e63946" {...iconProps} />;
            case 'doc':
            case 'docx':
                return <AiFillFileWord color="#1a73e8" {...iconProps} />;
            case 'xls':
            case 'xlsx':
                return <AiFillFileExcel color="#2e7d32" {...iconProps} />;
            case 'png':
            case 'jpg':
            case 'jpeg':
            case 'gif':
                return <AiFillFileImage color="#6c757d" {...iconProps} />;
            case 'zip':
            case 'rar':
                return <AiFillFileZip color="#ffb703" {...iconProps} />;
            case 'txt':
            case 'json':
            case 'csv':
                return <AiFillFileText color="#6a4c93" {...iconProps} />;
            default:
                return <AiFillFileUnknown color="#999" {...iconProps} />;
        }
    };

    const sendDocument = (document: any) => {
        emitSendDocument({
            refId: document?.id,
            langCode: document?.isAvailable
                ? params.get("lang") || document?.companyData?.defaultLangCode || "en"
                : document?.companyData?.defaultLangCode || "en",
            refType: ChatType.Document,
            station: Number(params.get("station") ?? 1),
            contentExtra: document?.ext,
        });
    };

    const documentsSource = searchDocuments.length > 0 ? searchDocuments : responses;

    return (
        <>
            <div className="h-full overflow-y-auto p-4">
                <div className="flex w-full flex-col gap-4 p-4">
                    <SendDocumentForm />
                </div>

                <div className="flex w-full flex-col items-center justify-center gap-2 p-6">
                    <div className="w-full">
                        <div className="flex h-full w-full">
                            <div className="flex w-full flex-wrap content-start gap-4">
                                <DraggableCardContainer items={documentsSource} sort={sortDocuments}>
                                    {documentsSource?.map((document) => (
                                        <DraggableCardItem
                                            key={document.id}
                                            id={document.id}
                                            tag={document.tag}
                                            isAdmin={data?.user.Roles?.includes("Admin")}
                                            isAvailable={document.langCode?.includes(
                                                params.get("lang") || ""
                                            )}
                                            onUpdate={() => onUpdateDocument(document)}
                                            onDelete={() => onDeleteDocument(document.id)}
                                            sendOnClick={() => sendDocument(document)}
                                            isDraggable={searchDocuments.length === 0}
                                        >
                                            <div className="flex flex-col items-center justify-center h-full p-2">
                                                <div className="text-4xl mb-2">
                                                    {getFileIcon(document.ext)}
                                                </div>
                                                {/* <div className="text-xs text-center text-gray-600 truncate w-full">
                                                    {document.tag}
                                                </div> */}
                                                {/* {document.langCode && (
                                                    <div className="text-xs text-center text-gray-500 mt-1">
                                                        {Array.isArray(document.langCode)
                                                            ? document.langCode.join(', ')
                                                            : document.langCode}
                                                    </div>
                                                )} */}
                                            </div>
                                        </DraggableCardItem>
                                    ))}
                                </DraggableCardContainer>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Upload Modal */}
            {data?.user.Roles?.includes("Admin") && (
                <Modal title="Upload Document" closeModal={handleClose} isOpen={isOpen}>
                    <UploadDocumentTemplateForm onClose={handleClose} onSuccess={handleUploadSuccess} />
                </Modal>
            )}

            {/* Add Button */}
            {data?.user.Roles?.includes("Admin") && (
                <div className="fixed bottom-0 right-0 p-4">
                    <button onClick={handleOpen}>
                        <PlusIcon />
                    </button>
                </div>
            )}
        </>
    );
}