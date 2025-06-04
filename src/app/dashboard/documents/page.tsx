"use client";
import { useEffect, useState } from "react";
// import { SendDocumentForm } from "../../../components/pages/dashboard/SendDocuments";
import { useSearchParams } from "next/navigation";
import { useDisclousure } from "../../../hooks/useDisclosure";
import { PlusIcon } from "../../../components/icons/PlusIcon";
import Modal from "../../../components/Modal";
import { UploadDocumentTemplateForm } from "../../../components/pages/dashboard/CreateDocumentTemplate";
import { useSession } from "next-auth/react";
import { SearchTemplateForm } from "../../../components/pages/dashboard/SearchTemplateForm";
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
    AiFillFileUnknown
} from 'react-icons/ai';
import { useDocumentControllerDeleteDocumentOne } from "../../../lib/client/api";
import { toast } from 'react-toastify';
import useTemplateStore from "../../../lib/zustand/store/templateStore";
import { useSearchDocument } from "../../../hooks/useSearchDocument";
import { Card } from "antd";

export default function Documents() {
    const { data } = useSession();
    const params = useSearchParams();
    const { handleClose, handleOpen, isOpen } = useDisclousure();
    const [responses, setResponses] = useState([]);
    const [selectedDocument, setSelectedDocument] = useState(null);
    const [modalType, setModalType] = useState<'create' | 'update'>('create');
    const [isMounted, setIsMounted] = useState(false);
    const {
        documents,
        setDocuments,
        searchDocuments,
        setSearchDocuments
    } = useTemplateStore();
    const { search, clearSearch, isSearching } = useSearchDocument(documents, setSearchDocuments);
    const { emitSendDocument } = useSocketContext();
    let Url = process.env.NEXT_PUBLIC_BACKEND_URL;

    useEffect(() => {
        setIsMounted(true);
    }, []);

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
                    setDocuments(data); // To Store documents in Zustand store
                })
                .catch((error) => console.error("Error fetching data:", error));
        }
    }

    useEffect(() => {
        fetchDocuments();
    }, [data]);

    const handleUploadSuccess = () => {
        fetchDocuments();
        setSelectedDocument(null); // To clear selected document after success
        setModalType('create'); // To reset modal type
    }

    const { mutate: deleteDocument } = useDocumentControllerDeleteDocumentOne({
        mutation: {
            onSuccess: (_, variables) => {
                toast.success("Document deleted successfully!");
                fetchDocuments();
            },
            onError: (error) => {
                toast.error(error?.message ?? "Error deleting document");
            }
        }
    });

    // Function to handle document deletion
    const onDeleteDocument = (id: number) => {
        deleteDocument({ id });
    };

    // Enhanced function to handle document update
    const onUpdateDocument = (document: any) => {
        setSelectedDocument(document);
        setModalType('update');
        handleOpen();
        console.log("Update document:", document);
    };

    // Function to handle creating new document
    const onCreateDocument = () => {
        setSelectedDocument(null);
        setModalType('create');
        handleOpen();
    };

    // Enhanced modal close handler
    const handleModalClose = () => {
        handleClose();
        setSelectedDocument(null);
        setModalType('create');
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

    const getFileIcon = (ext: string) => {
        const extension = ext?.toLowerCase();
        const iconProps = { size: 65 };

        switch (extension) {
            case 'pdf':
                return <AiFillFilePdf color="#e63946" {...iconProps} />;
            case 'doc':
            case 'docx':
                return <AiFillFileWord color="#1a73e8" {...iconProps} />;
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

    const documentsSource = searchDocuments.length > 0 ? searchDocuments : documents;

    if (!isMounted) {
        return null;
    }


    return (
        <>
            <div className="h-full overflow-y-auto p-4">
                <div className="flex w-full flex-col gap-4 p-4">
                    <Card className="w-full customCards">
                        <div style={{ width: '20%' }}>
                            <SearchTemplateForm
                                searchOnChange={search}
                                onClear={clearSearch}
                                isSearching={isSearching}
                                placeholder="Search documents by name, tag, or file type..."
                            />
                        </div>
                    </Card>
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
                                            </div>
                                        </DraggableCardItem>
                                    ))}
                                </DraggableCardContainer>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Upload/Update Modal */}
            {data?.user.Roles?.includes("Admin") && (
                <Modal
                    title={modalType === 'update' ? "Update Document" : "Upload Document"}
                    closeModal={handleModalClose}
                    isOpen={isOpen}
                >
                    <UploadDocumentTemplateForm
                        onClose={handleModalClose}
                        onSuccess={handleUploadSuccess}
                        document={selectedDocument}
                        mode={modalType}
                    />
                </Modal>
            )}

            {/* Add Button */}
            {data?.user.Roles?.includes("Admin") && (
                <div className="fixed bottom-0 right-0 p-4">
                    <button onClick={onCreateDocument}>
                        <PlusIcon />
                    </button>
                </div>
            )}
        </>
    );
}