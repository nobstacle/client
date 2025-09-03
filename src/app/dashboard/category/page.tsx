"use client";

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { ColumnsType } from 'antd/es/table';
import { Table, Button, Space, Card, Form, Input, Pagination, DatePicker, Upload, Row, Col, Divider, Image, message, Tag } from 'antd';
import { FaTrash, FaEdit, FaEye, FaSearch, FaTimes } from "react-icons/fa";
import Swal from "sweetalert2";
import "../../../styles/base.css";
import Modal from "../../../components/Modal";
// import useTemplateStore from "../../../lib/zustand/store/templateStore";
import { useSession } from "next-auth/react";
import { PlusIcon } from "../../../components/icons/PlusIcon";
import CreateCategoryForm from "../../../components/pages/dashboard/CreateCategoryForm";
import dayjs from 'dayjs';
import ViewCategoryModal from "./ViewCategory";
import {
    useCategoryControllerDeleteCategory,
} from "../../../lib/client/api";

export default function Category() {
    const { data: userData } = useSession();
    const [categoryData, setCategoryData] = useState([]);
    const [viewCategoryData, setViewCategoryData] = useState([]);
    const [loadingData, setLoadingData] = useState(false);
    const [viewCategory, setViewCategory] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [modalMode, setModalMode] = useState('create');
    const { data } = useSession();
    let Url = process.env.NEXT_PUBLIC_BACKEND_URL;
    const debounceRef = useRef();
    const [isOpen, setIsOpen] = useState(false);
    const [editCategoryData, setEditCategoryData] = useState([]);
    const [originalCategoryData, setOriginalCategories] = useState([]);
    const [totalItems, setTotalItems] = useState(0);
    const deleteCategory = useCategoryControllerDeleteCategory();

    const handleFilterChange = (key, value) => {
        // Add your filter logic here
    };

    const fetchCategories = useCallback(() => {
        setLoadingData(true);

        fetch(`${Url}/api/v1/uploads/get-all-categories`, {
            headers: { Authorization: `Bearer ${data?.user.backendTokens.at}` },
        })
            .then(async (response) => {
                const text = await response.text();
                const json = JSON.parse(text);
                const data = json.data || json;
                setOriginalCategories(data); // Store original data
                setCategoryData(data);
                setTotalItems(json.pagination?.totalCount || data.length);
            })
            .catch((error) => {
                console.warn("Error fetching data:", error);
            })
            .finally(() => {
                setLoadingData(false);
            });
    }, [data, Url, setCategoryData]);

    useEffect(() => {
        if (data?.user !== undefined) {
            fetchCategories();
        }
    }, [data, fetchCategories]);

    const columns: ColumnsType<any> = [
        {
            title: 'Name',
            dataIndex: 'name',
            key: 'name',
        },
        {
            title: 'Price Level',
            dataIndex: 'priceLevel',
            key: 'priceLevel',
        },
        {
            title: 'Tax (%)',
            dataIndex: 'taxPercentage',
            key: 'taxPercentage',
        },
        {
            title: 'Sold Out',
            dataIndex: 'soldOut',
            key: 'soldOut',
            render: (soldOut: boolean) =>
                soldOut ? <Tag color="red">Yes</Tag> : <Tag color="green">No</Tag>,
        },
        {
            title: 'Image',
            dataIndex: 'signedImages',
            key: 'image',
            render: (images: any[]) =>
                images && images.length > 0 ? (
                    <Image
                        width={50}
                        src={images[0].signedUrl}
                        alt="Category Image"
                    />
                ) : (
                    'N/A'
                ),
        },
        {
            title: 'Created At',
            dataIndex: 'createdAt',
            key: 'createdAt',
            render: (date: string) => dayjs(date).format('YYYY-MM-DD HH:mm'),
        },
        {
            title: "Actions",
            key: "actions",
            width: 150,
            fixed: 'right',
            render: (_, record) => (
                <div className="flex flex-wrap gap-1 sm:gap-2 items-center justify-center sm:justify-start">
                    <button
                        title="View"
                        onClick={() => {
                            setViewCategoryData(record);
                            setViewCategory(true);
                        }}
                        className="w-6 h-6 sm:w-8 sm:h-8 flex items-center justify-center text-white bg-[#3b5998] hover:bg-[#2d4373] focus:ring-0 border-none font-medium rounded-full text-xs"
                    >
                        <FaEye size={14} />
                    </button>

                    <button
                        title="Edit"
                        onClick={() => handleEditPackage(record)}
                        className="w-6 h-6 sm:w-8 sm:h-8 flex items-center justify-center text-white bg-green-700 hover:bg-green-800 focus:ring-4 focus:ring-green-300 font-medium rounded-full text-xs"
                    >
                        <FaEdit size={14} />
                    </button>

                    <button
                        title="Delete"
                        onClick={() => HandlePackageDelete(record)}
                        className="w-6 h-6 sm:w-8 sm:h-8 flex items-center justify-center text-white bg-red-700 hover:bg-red-800 focus:ring-4 focus:ring-red-300 font-medium rounded-full text-xs"
                    >
                        <FaTrash size={12} />
                    </button>
                </div>
            ),
        }
    ];

    const handlePageChange = (page, size) => {
        setCurrentPage(page);
        setPageSize(size);
    }

    const handleCreateCategory = () => {
        setModalMode('create');
        setEditCategoryData([]);
        setIsOpen(true);
    }

    const handleCloseModal = () => {
        setIsOpen(false);
        setViewCategory(false);
        setEditCategoryData([]);
        setViewCategoryData([]);
    }

    const handlePackageOperationComplete = () => {
        setIsOpen(false);
        fetchCategories();
    }

    const handleEditPackage = (record) => {
        setEditCategoryData(record);
        setModalMode('edit');
        setIsOpen(true);
    }

    const HandlePackageDelete = (record) => {
        console.info("Delete", record);

        Swal.fire({
            title: 'Are you sure?',
            text: `You are about to delete the category "${record.name}". This action cannot be undone!`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6',
            confirmButtonText: 'Yes, delete it!',
            cancelButtonText: 'Cancel'
        }).then((result) => {
            if (result.isConfirmed) {
                deleteCategory.mutate(
                    { id: record.id },
                    {
                        onSuccess: (response) => {
                            Swal.fire({
                                title: 'Deleted!',
                                text: 'Category has been deleted successfully.',
                                icon: 'success',
                                timer: 2000,
                                showConfirmButton: false
                            });
                            fetchCategories();
                        },
                        onError: (error) => {
                            Swal.fire({
                                title: 'Error!',
                                text: 'Failed to delete category. Please try again.',
                                icon: 'error',
                                confirmButtonText: 'OK'
                            });
                            console.error('Delete error:', error);
                        }
                    }
                );
            }
        });
    }

    return (
        <>
            <div className="h-full overflow-y-auto p-4 customPackageContainer">
                {userData?.user.Roles?.includes("Admin") && (
                    <Modal
                        title={modalMode === 'create' ? "Create Category" : "Edit Category"}
                        closeModal={handleCloseModal}
                        isOpen={isOpen}
                        className="packageModal"
                    >
                        <CreateCategoryForm
                            initialData={editCategoryData}
                            isEdit={modalMode === 'edit' ? true : false}
                            cb={handlePackageOperationComplete}
                        />
                    </Modal>
                )}
                <Card className="bg-gray-50">
                    {/* Enhanced Search Section */}
                    <div className="mb-4 space-y-4">
                        {/* Main Search Bar */}
                        <Card className="w-full customCards">
                            <div className="searchInputWidth">
                                <div className="flex-1 min-w-0">
                                    <Input
                                        placeholder="Search categories by name, code, description, benefits, tags..."
                                        className="rounded-md"
                                        prefix={<FaSearch className="text-gray-400" />}
                                        //   value={searchFilters.searchText}
                                        onChange={(e) => handleFilterChange('searchText', e.target.value)}
                                        allowClear
                                    />
                                </div>
                            </div>
                        </Card>
                    </div>

                    {/* Table Section */}
                    <div className="p-4 shadow-md rounded-lg customTableWrapper customSurveyTable bg-white">
                        <Table
                            rowKey="id"
                            columns={columns}
                            dataSource={Array.isArray(categoryData) ? categoryData : []}
                            pagination={false}
                            className="jotFormTable"
                            scroll={{ x: 1200 }}
                            loading={loadingData}
                        />
                        <div className="flex justify-center mt-6">
                            <Pagination
                                current={currentPage}
                                total={categoryData?.length || 0}
                                pageSize={pageSize}
                                onChange={handlePageChange}
                                showSizeChanger
                                pageSizeOptions={["10", "20", "50", "100"]}
                                showTotal={(total, range) =>
                                    `${range[0]}-${range[1]} of ${total} packages`
                                }
                            />
                        </div>
                    </div>
                </Card>

                {userData?.user.Roles?.includes("Admin") && (
                    <div className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-50">
                        <button
                            onClick={handleCreateCategory}
                            className="group relative flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 bg-white/50 backdrop-blur-md hover:bg-white/60 border border-white/20 text-gray-700 hover:text-gray-900 rounded-full shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105 focus:outline-none focus:ring-4 focus:ring-white/30"
                            aria-label="Create new template"
                        >
                            <PlusIcon className="w-6 h-6 sm:w-7 sm:h-7 opacity-100" />

                            {/* Tooltip */}
                            <div className="absolute right-full mr-3 px-3 py-2 bg-gray-900 text-white text-sm rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap">
                                Create Category
                                <div className="absolute top-1/2 left-full w-0 h-0 border-l-4 border-l-gray-900 border-y-4 border-y-transparent transform -translate-y-1/2"></div>
                            </div>
                        </button>
                    </div>
                )}

                {viewCategory ? (
                    <ViewCategoryModal
                        packageData={viewCategoryData}
                        onClose={handleCloseModal}
                        viewCategoryToggle={viewCategory}
                    />
                ) : ("")}

            </div>
        </>
    )
}