"use client";
import { useState } from "react";
import { Table, Tag, Card, Pagination, Button } from "antd";
import { FaTrash, FaEdit, FaEye } from "react-icons/fa";
import Swal from "sweetalert2";
import "../../../styles/base.css";
import useTemplateStore from "../../../lib/zustand/store/templateStore";
import { useHasHydrated } from "../../../hooks/useHydrated";
import { surveyAnswerValToColor } from "../../../utils";
import CreatePackageTemplate from "../../../components/pages/dashboard/CreatePackageTemplate";
import { useSession } from "next-auth/react";
import { useSurveyAnswerControllerDeleteSurveyAnswer } from "../../../lib/client/api";
import "../../../styles/base.css";

export default function Upsell() {
    // Columns based on the provided table structure
    const columns = [
        {
            title: "Package Code",
            dataIndex: "packageCode",
            key: "packageCode",
            width: 120,
        },
        {
            title: "Package Name",
            dataIndex: "packageName",
            key: "packageName",
            width: 200,
        },
        {
            title: "Description",
            dataIndex: "packageDescription",
            key: "packageDescription",
            width: 250,
            render: (text: string) => (
                <div className="truncate" title={text}>
                    {text}
                </div>
            ),
        },
        {
            title: "Original Price",
            dataIndex: "originalPrice",
            key: "originalPrice",
            width: 120,
            render: (price: number) => `$${price}`,
        },
        {
            title: "Discounted Price",
            dataIndex: "discountedPrice",
            key: "discountedPrice",
            width: 130,
            render: (price: number) => price ? `$${price}` : "N/A",
        },
        {
            title: "Price Algorithm",
            dataIndex: "priceAlgorithm",
            key: "priceAlgorithm",
            width: 150,
        },
        {
            title: "Purchases",
            dataIndex: "numberOfPurchase",
            key: "numberOfPurchase",
            width: 100,
            sorter: (a, b) => a.numberOfPurchase - b.numberOfPurchase,
        },
        {
            title: "Status",
            dataIndex: "approved",
            key: "approved",
            width: 100,
            render: (approved: boolean) => (
                <Tag color={approved ? "green" : "red"}>
                    {approved ? "Approved" : "Pending"}
                </Tag>
            ),
        },
        {
            title: "Room",
            dataIndex: "room",
            key: "room",
            width: 80,
            render: (room: boolean) => (
                <Tag color={room ? "blue" : "gray"}>
                    {room ? "Yes" : "No"}
                </Tag>
            ),
        },
        {
            title: "Tax Included",
            dataIndex: "includesTax",
            key: "includesTax",
            width: 100,
            render: (includesTax: boolean) => (
                <Tag color={includesTax ? "green" : "orange"}>
                    {includesTax ? "Yes" : "No"}
                </Tag>
            ),
        },
        {
            title: "Actions",
            key: "actions",
            width: 120,
            fixed: 'right',
            render: (_, record) => (
                <div className="flex gap-2">
                    <FaEye
                        className="text-blue-500 cursor-pointer hover:text-blue-700"
                        onClick={() => {
                            Swal.fire("View", `Viewing package: ${record.packageName}`, "info");
                        }}
                        title="View"
                    />
                    <FaEdit
                        className="text-green-500 cursor-pointer hover:text-green-700"
                        onClick={() => {
                            Swal.fire("Edit", `Editing package: ${record.packageName}`, "info");
                        }}
                        title="Edit"
                    />
                    <FaTrash
                        className="text-red-500 cursor-pointer hover:text-red-700"
                        onClick={() => {
                            Swal.fire({
                                title: "Are you sure?",
                                text: `Delete package: ${record.packageName}?`,
                                icon: "warning",
                                showCancelButton: true,
                                confirmButtonColor: "#d33",
                                cancelButtonColor: "#3085d6",
                                confirmButtonText: "Yes, delete it!"
                            }).then((result) => {
                                if (result.isConfirmed) {
                                    Swal.fire("Deleted!", "Package has been deleted.", "success");
                                }
                            });
                        }}
                        title="Delete"
                    />
                </div>
            ),
        },
    ];

    // Dummy data based on the table structure
    const sourceAnswers = [
        {
            id: 1,
            packageCode: "PKG001",
            packageName: "Premium Photography Package",
            packageDescription: "Complete photography package with professional editing and digital gallery access",
            packageBenefits: ["High-resolution images", "Professional editing", "Digital gallery", "Print release"],
            numberOfPurchase: 45,
            tags: ["photography", "premium", "digital"],
            originalPrice: 299,
            discountedPrice: 249,
            includesTax: true,
            taxInformation: "GST 18% included",
            priceAlgorithm: "Price per person per night",
            approved: true,
            images: ["image1.jpg", "image2.jpg"],
            buttonText: "Book Now",
            priceLevel: 3,
            room: true,
            incentivePercentage: 10.5,
            confirmationNumber: 1001,
            soldBy: "John Doe"
        },
        {
            id: 2,
            packageCode: "PKG002",
            packageName: "Basic Video Package",
            packageDescription: "Essential video recording service with basic editing and HD quality output",
            packageBenefits: ["HD recording", "Basic editing", "YouTube optimization"],
            numberOfPurchase: 23,
            tags: ["video", "basic", "hd"],
            originalPrice: 450,
            discountedPrice: 0,
            includesTax: false,
            taxInformation: "Tax not included",
            priceAlgorithm: "Price per piece per night",
            approved: false,
            images: ["video1.jpg"],
            buttonText: "Order Now",
            priceLevel: 2,
            room: false,
            incentivePercentage: 5.0,
            confirmationNumber: 1002,
            soldBy: "Jane Smith"
        },
        {
            id: 3,
            packageCode: "PKG003",
            packageName: "Wedding Deluxe Package",
            packageDescription: "Comprehensive wedding package including photography, videography, and album creation",
            packageBenefits: ["Full day coverage", "Professional album", "Highlight video", "Online gallery"],
            numberOfPurchase: 78,
            tags: ["wedding", "deluxe", "complete"],
            originalPrice: 1200,
            discountedPrice: 999,
            includesTax: true,
            taxInformation: "All taxes included",
            priceAlgorithm: "Price per person per stay",
            approved: true,
            images: ["wedding1.jpg", "wedding2.jpg", "wedding3.jpg"],
            buttonText: "Reserve Now",
            priceLevel: 5,
            room: true,
            incentivePercentage: 15.0,
            confirmationNumber: 1003,
            soldBy: "Mike Johnson"
        },
        {
            id: 4,
            packageCode: "PKG004",
            packageName: "Corporate Event Package",
            packageDescription: "Professional event documentation for corporate meetings and conferences",
            packageBenefits: ["Multi-camera setup", "Live streaming", "Same-day highlights"],
            numberOfPurchase: 12,
            tags: ["corporate", "event", "professional"],
            originalPrice: 800,
            discountedPrice: 720,
            includesTax: true,
            taxInformation: "GST 18% included",
            priceAlgorithm: "Price per piece per stay",
            approved: true,
            images: ["corporate1.jpg"],
            buttonText: "Contact Us",
            priceLevel: 4,
            room: false,
            incentivePercentage: 8.0,
            confirmationNumber: 1004,
            soldBy: "Sarah Wilson"
        },
        {
            id: 5,
            packageCode: "PKG005",
            packageName: "Portrait Session",
            packageDescription: "Individual or family portrait session with professional lighting and retouching",
            packageBenefits: ["Studio lighting", "Professional retouching", "Multiple poses"],
            numberOfPurchase: 156,
            tags: ["portrait", "family", "studio"],
            originalPrice: 150,
            discountedPrice: 120,
            includesTax: false,
            taxInformation: "Tax extra",
            priceAlgorithm: "Price per person per night",
            approved: true,
            images: ["portrait1.jpg", "portrait2.jpg"],
            buttonText: "Schedule Session",
            priceLevel: 2,
            room: false,
            incentivePercentage: 12.0,
            confirmationNumber: 1005,
            soldBy: "David Brown"
        },
        {
            id: 6,
            packageCode: "PKG006",
            packageName: "Social Media Content Package",
            packageDescription: "Content creation package optimized for social media platforms with quick turnaround",
            packageBenefits: ["Social media optimization", "Quick delivery", "Multiple formats"],
            numberOfPurchase: 89,
            tags: ["social media", "content", "quick"],
            originalPrice: 200,
            discountedPrice: 0,
            includesTax: true,
            taxInformation: "All inclusive pricing",
            priceAlgorithm: "Price per piece per night",
            approved: false,
            images: ["social1.jpg"],
            buttonText: "Get Started",
            priceLevel: 1,
            room: true,
            incentivePercentage: 7.5,
            confirmationNumber: 1006,
            soldBy: "Emily Davis"
        }
    ];

    // Pagination State
    const [currentPage, setCurrentPage] = useState(1);
    const pageSize = 10;
    const totalItems = sourceAnswers.length;

    const handlePageChange = (page: number, pageSize: number) => {
        setCurrentPage(page);
    };

    return (
        <div className="h-full overflow-y-auto p-4">
            <Card className="bg-gray-50">
                <div className="flex w-full flex-col gap-4 mb-6">
                    <CreatePackageTemplate />
                </div>
                <div className="p-4 shadow-md rounded-lg customTableWrapper customSurveyTable bg-white">
                    <Table
                        rowKey="id"
                        columns={columns}
                        dataSource={sourceAnswers}
                        pagination={false}
                        className="jotFormTable"
                        scroll={{ x: 1500 }}
                    />
                    <div className="flex justify-center mt-6">
                        <Pagination
                            current={currentPage}
                            total={totalItems}
                            pageSize={pageSize}
                            onChange={handlePageChange}
                            showSizeChanger
                            pageSizeOptions={["10", "20", "50", "100"]}
                        />
                    </div>
                </div>
            </Card>
        </div>
    );
}