"use client";
import { useState } from "react";
import { Table, Tag, Card, Pagination } from "antd";
import Modal from "../../../components/Modal";
import { FaTrash, FaEdit, FaEye } from "react-icons/fa";
import Swal from "sweetalert2";
import "../../../styles/base.css";
import useTemplateStore from "../../../lib/zustand/store/templateStore";
import { useHasHydrated } from "../../../hooks/useHydrated";
import { surveyAnswerValToColor } from "../../../utils";
import { useSession } from "next-auth/react";
import { useCompanyControllerGetCompany } from "../../../lib/client/api";
import "../../../styles/base.css";
import { useDisclousure } from "../../../hooks/useDisclosure";
import { PlusIcon } from "../../../components/icons/PlusIcon";
import CreatePackageForm from "../../../components/pages/dashboard/CreatePackageTemplateForm";
export default function Upsell() {
    const { data: companyData } = useCompanyControllerGetCompany();
    const { data: userData } = useSession();
    const { handleClose, handleOpen, isOpen } = useDisclousure();
    const {
        handleClose: updateHandleClose,
        handleOpen: updateHandleOpen,
        isOpen: updateIsOpen,
    } = useDisclousure();
    const { setPackages, packages, searchPackages, setSearchPackages } = useTemplateStore();

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
            title: "Benefits",
            dataIndex: "packageBenefits",
            key: "packageBenefits",
            width: 200,
            render: (benefits: string[]) => (
                <div className="truncate" title={benefits?.join(", ")}>
                    {benefits?.join(", ")}
                </div>
            ),
        },
        {
            title: "Purchases",
            dataIndex: "numberOfPurchase",
            key: "numberOfPurchase",
            width: 100,
            sorter: (a, b) => a.numberOfPurchase - b.numberOfPurchase,
        },
        {
            title: "Tags",
            dataIndex: "tags",
            key: "tags",
            width: 150,
            render: (tags: string[]) => (
                <div className="flex flex-wrap gap-1">
                    {tags?.slice(0, 2).map((tag, index) => (
                        <Tag key={index} size="small">{tag}</Tag>
                    ))}
                    {tags?.length > 2 && <Tag size="small">+{tags.length - 2}</Tag>}
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
            title: "Tax Info",
            dataIndex: "taxInformation",
            key: "taxInformation",
            width: 150,
            render: (text: string) => (
                <div className="truncate" title={text}>
                    {text}
                </div>
            ),
        },
        {
            title: "Tax %",
            dataIndex: "taxPercentage",
            key: "taxPercentage",
            width: 80,
            render: (percentage: number) => percentage ? `${percentage}%` : "N/A",
        },
        {
            title: "Currency",
            dataIndex: "currency",
            key: "currency",
            width: 80,
        },
        {
            title: "Price Algorithm",
            dataIndex: "priceAlgorithm",
            key: "priceAlgorithm",
            width: 150,
        },
        {
            title: "Package Alert",
            dataIndex: "packageAlert",
            key: "packageAlert",
            width: 120,
            render: (alert: string) => (
                <div className="truncate" title={alert}>
                    {alert}
                </div>
            ),
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
            title: "Images",
            dataIndex: "images",
            key: "images",
            width: 80,
            render: (images: string[]) => (
                <Tag color={images?.length > 0 ? "blue" : "gray"}>
                    {images?.length || 0}
                </Tag>
            ),
        },
        {
            title: "Button Text",
            dataIndex: "buttonText",
            key: "buttonText",
            width: 120,
        },
        {
            title: "Price Level",
            dataIndex: "priceLevel",
            key: "priceLevel",
            width: 100,
            render: (level: number) => (
                <Tag color={level >= 4 ? "red" : level >= 3 ? "orange" : "green"}>
                    Level {level}
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
            title: "Incentive %",
            dataIndex: "incentivePercentage",
            key: "incentivePercentage",
            width: 100,
            render: (percentage: number) => `${percentage}%`,
        },
        {
            title: "Confirmation #",
            dataIndex: "confirmationNumber",
            key: "confirmationNumber",
            width: 120,
        },
        {
            title: "Sold By",
            dataIndex: "soldBy",
            key: "soldBy",
            width: 120,
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

    // Updated dummy data with new fields
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
            taxPercentage: 18,
            currency: "USD",
            priceAlgorithm: "Price per person per night",
            packageAlert: "Limited time offer",
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
            taxPercentage: 0,
            currency: "USD",
            priceAlgorithm: "Price per piece per night",
            packageAlert: "New package",
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
            taxPercentage: 12,
            currency: "USD",
            priceAlgorithm: "Price per person per stay",
            packageAlert: "Most popular",
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
            taxPercentage: 18,
            currency: "USD",
            priceAlgorithm: "Price per piece per stay",
            packageAlert: "Business special",
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
            taxPercentage: 0,
            currency: "USD",
            priceAlgorithm: "Price per person per night",
            packageAlert: "Book in advance",
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
            taxPercentage: 10,
            currency: "USD",
            priceAlgorithm: "Price per piece per night",
            packageAlert: "Trending package",
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

    console.info("isOpenisOpenisOpen", isOpen);

    return (
        <div className="h-full overflow-y-auto p-4 customPackageContainer">
            {userData?.user.Roles?.includes("Admin") && (
                <Modal
                    title="Create template"
                    closeModal={handleClose}
                    isOpen={isOpen}
                    className="packageModal"
                >
                    <CreatePackageForm
                        cb={(template, isUpdate) => {
                            handleClose();
                            if (!isUpdate) {
                                packages.push(template);
                                setPackages(packages);
                            } else {
                                const shallow = [...packages];
                                const index = shallow.findIndex(
                                    ({ id }) => id === template.id,
                                );
                                shallow[index]["langCode"] = template.langCode;
                                shallow[index]["origin"] = template.origin;
                                shallow[index]["destination"] = template.destination;
                                setPackages(shallow);
                            }
                        }}
                    />
                </Modal>
            )}
            <Card className="bg-gray-50">
                <div className="flex w-full flex-col gap-4 mb-6">
                    {/* <CreatePackageTemplate /> */}
                </div>
                <div className="p-4 shadow-md rounded-lg customTableWrapper customSurveyTable bg-white">
                    <Table
                        rowKey="id"
                        columns={columns}
                        dataSource={sourceAnswers}
                        pagination={false}
                        className="jotFormTable"
                        scroll={{ x: 2500 }}
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

            {userData?.user.Roles?.includes("Admin") && (
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
        </div>
    );
}