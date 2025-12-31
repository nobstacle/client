"use client";
import { useEffect, useState, useMemo } from "react";
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
import { useDocumentControllerDeleteDocumentOne, useCompanyControllerGetCompany, useDocumentTemplateControllerPatchDocumentTemplateOrder } from "../../../lib/client/api";
import { toast } from 'react-toastify';
import useTemplateStore from "../../../lib/zustand/store/templateStore";
import { useSearchDocument } from "../../../hooks/useSearchDocument";
import { Card } from "antd";
import {
    AiFillFilePdf,
    AiFillFileWord,
    AiFillFileExcel,
    AiFillFilePpt,
    AiFillFileUnknown,
} from "react-icons/ai";
import "../../../styles/base.css";

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
    const { data: companyData } = useCompanyControllerGetCompany();

    // Get current language
    const currentLang = params.get("lang") || companyData?.defaultLangCode || "en";

    useEffect(() => {
        setIsMounted(true);
    }, []);

    const updateDocumentTemplateOrder =
        useDocumentTemplateControllerPatchDocumentTemplateOrder();

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
                    setDocuments(data);
                })
                .catch((error) => console.error("Error fetching data:", error));
        }
    }

    useEffect(() => {
        fetchDocuments();
    }, [data]);

    const handleUploadSuccess = () => {
        fetchDocuments();
        setSelectedDocument(null);
        setModalType('create');
    }

    const { mutate: deleteDocument } = useDocumentControllerDeleteDocumentOne({
        mutation: {
            onSuccess: (_, variables) => {
                toast.success("Document deleted!");
                fetchDocuments();
            },
            onError: (error) => {
                toast.error(error?.message ?? "Error deleting document");
            }
        }
    });

    const onDeleteDocument = (id: number) => {
        deleteDocument({ id });
    };

    const onUpdateDocument = (document: any) => {
        const updatedDocument = {
            ...document,
            langCode: Array.isArray(document.langCode) ? document.langCode.join(',') : document.langCode,
        };

        setSelectedDocument(updatedDocument);
        setModalType('update');
        handleOpen();
    };

    const onCreateDocument = () => {
        setSelectedDocument(null);
        setModalType('create');
        handleOpen();
    };

    const handleModalClose = () => {
        handleClose();
        setSelectedDocument(null);
        setModalType('create');
    };

    const sortDocuments = async (item1: UniqueIdentifier, item2: UniqueIdentifier) => {
        // Always work with the full documents array
        const oldIndex = documents.findIndex((item) => item.id === item1);
        const newIndex = documents.findIndex((item) => item.id === item2);

        if (oldIndex === -1 || newIndex === -1) {
            console.error('Could not find items for sorting');
            return;
        }

        // Create a shallow copy and move the item
        let reorderedDocuments = arrayMove(documents, oldIndex, newIndex);

        // Group by tag to update order properly
        const groupedByTag = reorderedDocuments.reduce((acc, document) => {
            if (!acc[document.tag]) {
                acc[document.tag] = [];
            }
            acc[document.tag].push(document);
            return acc;
        }, {} as Record<string, any[]>);

        // Get unique tags in the new order
        const uniqueTags = reorderedDocuments
            .map(doc => doc.tag)
            .filter((tag, index, self) => self.indexOf(tag) === index);

        // Rebuild the array with all language variants maintaining the new tag order
        const finalOrderedDocuments: any[] = [];
        let orderCounter = 1;

        uniqueTags.forEach(tag => {
            const tagDocuments = groupedByTag[tag];
            tagDocuments.forEach(doc => {
                finalOrderedDocuments.push({ ...doc, order: orderCounter });
            });
            orderCounter++;
        });

        // Update the state immediately
        setDocuments(finalOrderedDocuments);
        setResponses(finalOrderedDocuments);

        // Update the order in the backend
        try {
            const updatePromises = finalOrderedDocuments.map(({ id, order }) => {
                return updateDocumentTemplateOrder.mutateAsync({
                    data: { order },
                    id,
                });
            });

            await Promise.all(updatePromises);
        } catch (error) {
            console.error("Error updating document order:", error);
            toast.error("Failed to update document order");
            // Revert on error
            setDocuments(documents);
            setResponses(documents);
        }
    };

    const getFileIcon = (ext: string) => {
        const extension = ext?.toLowerCase();
        const iconProps = { size: 65 };

        switch (extension) {
            case "pdf":
                return <AiFillFilePdf color="#e63946" {...iconProps} />;
            case "doc":
            case "docx":
                return <AiFillFileWord color="#1a73e8" {...iconProps} />;
            case "xls":
            case "xlsx":
            case "csv":
                return <AiFillFileExcel color="#28a745" {...iconProps} />;
            case "ppt":
            case "pptx":
                return <AiFillFilePpt color="#f57c00" {...iconProps} />;
            default:
                return <AiFillFileUnknown color="#999" {...iconProps} />;
        }
    };

    const sendDocument = (document: any) => {
        emitSendDocument({
            refId: document?.id,
            langCode: document?.isAvailableInCurrentLang
                ? currentLang
                : companyData?.defaultLangCode || "en",
            refType: ChatType.Document,
            station: Number(params.get("station") ?? 1),
            contentExtra: document?.ext,
        });
    };

    const handleQrCodeClick = (id: number, url: string, tag: string, isAvailable: boolean) => {
        emitSendDocument({
            refId: id,
            langCode: isAvailable
                ? currentLang
                : companyData?.defaultLangCode || "en",
            refType: ChatType.Document,
            station: Number(params.get("station") ?? 1),
            contentExtra: url,
            directContent: 'QR'
        });
    };

    // Group documents by tag and show the default language version
    // but track availability for the current language
    const displayedDocumentsWithAvailability = useMemo(() => {
        const documentsSource = searchDocuments.length > 0 ? searchDocuments : documents;

        // Group documents by tag
        const groupedByTag = documentsSource.reduce((acc, document) => {
            if (!acc[document.tag]) {
                acc[document.tag] = [];
            }
            acc[document.tag].push(document);
            return acc;
        }, {} as Record<string, any[]>);

        // For each tag, always show the default language version
        // but check if current language is available
        const displayDocuments: any[] = [];

        Object.values(groupedByTag).forEach((tagDocuments) => {
            // Always use default language document for display
            const defaultLangDocument = tagDocuments.find(doc =>
                doc.langCode.includes(companyData?.defaultLangCode || "en")
            ) || tagDocuments[0];

            // Check if current language is available for this tag
            const isAvailableInCurrentLang = tagDocuments.some(doc =>
                doc.langCode.includes(currentLang)
            );

            displayDocuments.push({
                ...defaultLangDocument,
                isAvailableInCurrentLang
            });
        });

        // Sort by order to maintain original ordering
        return displayDocuments.sort((a, b) => (a.order || 0) - (b.order || 0));
    }, [documents, searchDocuments, currentLang, companyData?.defaultLangCode]);

    if (!isMounted) {
        return null;
    }

    return (
        <>
            <div className="h-full overflow-y-auto p-4">
                <div className="flex w-full flex-col gap-4 p-4">
                    <Card className="w-full customCards">
                        <div className="searchInputWidth">
                            <SearchTemplateForm
                                searchOnChange={search}
                                onClear={clearSearch}
                                isSearching={isSearching}
                                placeholder="Search template"
                            />
                        </div>
                    </Card>
                </div>

                <div className="flex w-full flex-col items-center justify-center gap-2 p-4">
                    <div className="w-full">
                        <div className="flex h-full w-full">
                            <div className="flex w-full flex-wrap content-start gap-4">
                                <DraggableCardContainer items={displayedDocumentsWithAvailability} sort={sortDocuments}>
                                    {displayedDocumentsWithAvailability?.map((document) => (
                                        <DraggableCardItem
                                            key={document.id}
                                            id={document.id}
                                            tag={document.tag}
                                            onQrCodeClick={() => handleQrCodeClick(document.id, document.ext, document.tag, document.isAvailableInCurrentLang)}
                                            isAdmin={data?.user.Roles?.includes("Admin")}
                                            isAvailable={document.isAvailableInCurrentLang}
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
                <div className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-50">
                    <button
                        onClick={handleOpen}
                        className="group relative flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 bg-white/50 backdrop-blur-md hover:bg-white/60 border border-white/20 text-gray-700 hover:text-gray-900 rounded-full shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105 focus:outline-none focus:ring-4 focus:ring-white/30"
                        aria-label="Create new template"
                    >
                        <PlusIcon className="w-6 h-6 sm:w-7 sm:h-7 opacity-100" />

                        {/* Tooltip */}
                        <div className="absolute right-full mr-3 px-3 py-2 bg-gray-900 text-white text-sm rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap">
                            Create Template
                            <div className="absolute top-1/2 left-full w-0 h-0 border-l-4 border-l-gray-900 border-y-4 border-y-transparent transform -translate-y-1/2"></div>
                        </div>
                    </button>
                </div>
            )}
        </>
    );
}