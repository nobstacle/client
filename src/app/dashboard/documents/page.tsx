"use client";
import { useEffect, useState } from "react";
import { Table, Pagination, Card } from 'antd';
import { SendDocumentForm } from "../../../components/pages/dashboard/SendDocuments";
import { useSearchParams } from "next/navigation";
import { useDisclousure } from "../../../hooks/useDisclosure";
import { PlusIcon } from "../../../components/icons/PlusIcon";
import Modal from "../../../components/Modal";
import { UploadDocumentTemplateForm } from "../../../components/pages/dashboard/CreateDocumentTemplate";
import { useSession } from "next-auth/react";
import { FilePdfOutlined, FileWordOutlined, FileUnknownOutlined } from '@ant-design/icons';

export default function Documents() {
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(0);
    const [totalItems, setTotalItems] = useState(0);
    const [pageSize, setPageSize] = useState(10);
    const { data } = useSession();
    const params = useSearchParams();
    const { handleClose, handleOpen, isOpen } = useDisclousure();
    const [responses, setResponses] = useState([]);
    let Url = process.env.NEXT_PUBLIC_BACKEND_URL;

    const documentsData = responses;

    const columns = [
        {
            title: "ID",
            dataIndex: "id",
            key: "id",
        },
        {
            title: "Tag",
            dataIndex: "tag",
            key: "tag",
        },
        {
            title: "Languages",
            dataIndex: "langCode",
            key: "langCode",
            render: (langs: string[]) => langs.join(', '),
        },
        {
            title: "File",
            key: "file",
            render: (_: any, record: any) => {
                let icon;
                const ext = record.ext?.toLowerCase();

                switch (ext) {
                    case 'pdf':
                        icon = <FilePdfOutlined style={{ color: 'red' }} />;
                        break;
                    case 'doc':
                    case 'docx':
                        icon = <FileWordOutlined style={{ color: 'blue' }} />;
                        break;
                    default:
                        icon = <FileUnknownOutlined />;
                }

                return (
                    <a href={record.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2">
                        {icon}
                        <span>{record.tag}.{record.ext}</span>
                    </a>
                );
            },
        },
    ];

    const handlePageChange = (pageNumber: number) => {
        setCurrentPage(pageNumber);
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
                    setResponses(data);
                    setTotalItems(data.length);
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

    return (
        <>
            <div className="h-full overflow-y-auto p-4 ">
                <div className="flex w-full flex-col gap-4 p-4">
                    <SendDocumentForm />
                </div>
                <div className="flex w-full flex-col items-center justify-center gap-2 p-6">
                    <div className="w-full ">
                        <Table
                            rowKey="id"
                            columns={columns}
                            dataSource={documentsData}
                            pagination={false}
                            className="jotFormTable"
                        />
                        <div className="flex justify-center mt-6">
                            <Pagination
                                current={currentPage}
                                total={totalItems}
                                pageSize={pageSize}
                                onChange={handlePageChange}
                                showSizeChanger
                                pageSizeOptions={['10', '20', '50', '100']}
                            />
                        </div>
                    </div>
                </div>
            </div>
            {data?.user.Roles?.includes("Admin") && (
                <Modal title="Upload Document" closeModal={handleClose} isOpen={isOpen}>
                    <UploadDocumentTemplateForm onClose={handleClose} onSuccess={handleUploadSuccess} />
                </Modal>
            )}
            {data?.user.Roles?.includes("Admin") && (
                <div className="fixed bottom-0 right-0 p-4">
                    <button onClick={handleOpen}>
                        <PlusIcon />
                    </button>
                </div>
            )}
        </>
    )
}