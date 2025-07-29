"use client";

import React, { useEffect, useState } from 'react';
import { Table, Button, Space, Card, Form, Input, Pagination, DatePicker, Upload, Row, Col, Divider, Image, message } from 'antd';
import { FaTrash, FaEdit, FaEye, FaSearch, FaTimes } from "react-icons/fa";
import Swal from "sweetalert2";
import "../../../styles/base.css";
import Modal from "../../../components/Modal";
import useTemplateStore from "../../../lib/zustand/store/templateStore";
import { useSession } from "next-auth/react";
import { useDisclousure } from "../../../hooks/useDisclosure";
import { PlusIcon } from "../../../components/icons/PlusIcon";

export default function Category() {
    const { data: userData } = useSession();
    const [categoryData, setCategoryData] = useState([]);
    const [loadingData, setLoadingData] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);

    const handleFilterChange = (key, value) => {
    };

    const columns = [];

    const handlePageChange = () => {
    }

    const handleCreateCategory = () => {
    }

    return (
        <>
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
                        dataSource={categoryData}
                        pagination={false}
                        className="jotFormTable"
                        scroll={{ x: 2500 }}
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
                            Create Template
                            <div className="absolute top-1/2 left-full w-0 h-0 border-l-4 border-l-gray-900 border-y-4 border-y-transparent transform -translate-y-1/2"></div>
                        </div>
                    </button>
                </div>
            )}
        </>
    )
}