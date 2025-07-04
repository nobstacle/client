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

    useEffect(() => {
        setIsMounted(true);
    }, []);

    const updateDocumentTemplateOrder =
        useDocumentTemplateControllerPatchDocumentTemplateOrder();

    const filterDocumentsByLanguage = (docs) => {
        const selectedLang = params.get("lang") || companyData?.defaultLangCode || "en";

        const groupedByTag = docs.reduce((acc, doc) => {
            if (!acc[doc.tag]) {
                acc[doc.tag] = [];
            }
            acc[doc.tag].push(doc);
            return acc;
        }, {});

        const filteredDocs = [];
        Object.entries(groupedByTag).forEach(([tag, tagDocs]) => {
            if (tagDocs.length === 1) {
                filteredDocs.push(tagDocs[0]);
            } else {
                const matchingLangDoc = tagDocs.find(doc => doc.langCode === selectedLang);
                if (matchingLangDoc) {
                    filteredDocs.push(matchingLangDoc);
                } else {
                    const defaultLangDoc = tagDocs.find(doc => doc.langCode === (companyData?.defaultLangCode || "en"));
                    filteredDocs.push(defaultLangDoc || tagDocs[0]);
                }
            }
        });

        return filteredDocs;
    };

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
                    const filteredData = filterDocumentsByLanguage(data);
                    setResponses(filteredData);
                    setDocuments(filteredData);
                })
                .catch((error) => console.error("Error fetching data:", error));
        }
    }

    useEffect(() => {
        fetchDocuments();
    }, [data, companyData, params.get("lang")]);

    const handleUploadSuccess = () => {
        fetchDocuments();
        setSelectedDocument(null);
        setModalType('create');
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
        const updatedDocument = {
            ...document,
            langCode: Array.isArray(document.langCode) ? document.langCode.join(',') : document.langCode,
        };

        setSelectedDocument(updatedDocument);
        setModalType('update');
        handleOpen();
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

    const sortDocuments = async (item1: UniqueIdentifier, item2: UniqueIdentifier) => {
        const setResource = searchDocuments.length > 0 ? setSearchDocuments : setResponses;
        const documentsResource = searchDocuments.length > 0 ? searchDocuments : responses;

        const oldIndex = documentsResource.findIndex((item) => item.id === item1);
        const newIndex = documentsResource.findIndex((item) => item.id === item2);

        if (oldIndex === -1 || newIndex === -1) return;

        let reorderedDocuments = [...documentsResource];
        reorderedDocuments = arrayMove(documentsResource, oldIndex, newIndex);
        setResource(reorderedDocuments);

        if (searchDocuments.length === 0) {
            setDocuments(reorderedDocuments);
        }

        try {
            const updatePromises = reorderedDocuments.map((document, index) => {
                return updateDocumentTemplateOrder.mutateAsync({
                    data: { order: index + 1 },
                    id: document.id,
                });
            });

            await Promise.all(updatePromises);
            console.log("Document order updated successfully");

        } catch (error) {
            console.error("Error updating document order:", error);
            toast.error("Failed to update document order");

            setResource(documentsResource);
            if (searchDocuments.length === 0) {
                setDocuments(documentsResource);
            }
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
            langCode: document?.isAvailable
                ? params.get("lang") || document?.companyData?.defaultLangCode || "en"
                : document?.companyData?.defaultLangCode || "en",
            refType: ChatType.Document,
            station: Number(params.get("station") ?? 1),
            contentExtra: document?.ext,
        });
    };

    // Apply language filtering to search results as well
    const documentsSource = useMemo(() => {
        const baseDocuments = searchDocuments.length > 0 ? searchDocuments : documents;
        return filterDocumentsByLanguage(baseDocuments);
    }, [searchDocuments, documents, params.get("lang"), companyData?.defaultLangCode]);

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
                                <DraggableCardContainer items={documentsSource} sort={sortDocuments}>
                                    {documentsSource?.map((document) => (
                                        <DraggableCardItem
                                            key={document.id}
                                            id={document.id}
                                            tag={document.tag}
                                            isAdmin={data?.user.Roles?.includes("Admin")}
                                            isAvailable={document.langCode.includes(
                                                params.get("lang") || companyData?.defaultLangCode || "",
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