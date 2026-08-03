import { yupResolver } from "@hookform/resolvers/yup";
import React, { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { useForm } from "react-hook-form";
import * as yup from "yup";
import { useSocketContext } from "../../../context/SocketContextProvider";
import "../../../styles/base.css";
import { useSession } from "next-auth/react";
import axios from 'axios';
import { FaFileDownload, FaFileUpload, FaCopy, FaFilePdf, FaSearch, FaTrash, FaCheck, FaTimes, FaEdit, FaFileExport } from "react-icons/fa";
import { toast, Bounce } from 'react-toastify';
import { BsFillSendPlusFill } from "react-icons/bs";
import { RiUploadCloudFill } from "react-icons/ri";
import { Table, Button, Pagination, Row, Col, Modal, Select, Tooltip, Radio, Skeleton } from 'antd';
import { FiSend } from "react-icons/fi";
import Swal from 'sweetalert2';
import { SendIcon } from "../../icons/SendIcon";
import { FaChartBar } from "react-icons/fa";
import { DatePicker, Input, Form } from 'antd';
import dayjs from 'dayjs';
import { IoQrCode } from "react-icons/io5";
import Papa from 'papaparse';
import { debounce } from 'lodash';
import { HiRefresh } from "react-icons/hi";
import { useMessageStore } from "../../../lib/zustand/store/messageStore";

const { Option } = Select;

const getBackendUrl = () => {
	return typeof window !== 'undefined'
		? process.env.NEXT_PUBLIC_BACKEND_URL
		: process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';
};

const schema = yup
	.object({
		url: yup.string().url("Invalid URL format"),
	});

interface ManualInputValues {
	[key: string]: string;
}

interface InputValues {
	[key: string]: string;
}

interface AssignedForm {
	id: number;
	form_id: string;
	form_name: string;
	assigned_companies: string[];
	createdAt: string;
	updatedAt: string;
}

interface FormFields {
	content: any[];
}

interface TableComponentProps {
	tableData: any[];
	uniqueKeys: string[];
	currentPage: number;
	itemsPerPage: number;
	onPageChange: (pageNumber: number) => void;
	totalPages: number;
	setCurrentPage: React.Dispatch<React.SetStateAction<number>>;
	selectedFormFields: any[];
	totalItems: number;
	onUpdateField?: (recordId: string, fieldName: string, newValue: string) => Promise<boolean>;
	listableFields: any[];
}

const buildUrlFromFormData = (
	formId: string,
	formData: Record<string, any>,
	uuid?: string,
	listableFields?: any[],
	type?: string
): string => {
	let baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://www.nobstacle.com';

	if (uuid) {
		return `${baseUrl}/forms/${uuid}`;
	}

	if (type === "blank") {
		return `${baseUrl}/forms/${formId}`;
	}
	const params = new URLSearchParams();

	if (listableFields && listableFields.length > 0) {
		listableFields.forEach((field: any) => {
			const label = field.text;
			const key = field.name;
			const value = formData[label] || formData[key];

			if (value !== undefined && value !== null && value !== '') {
				params.append(key, String(value));
			}
		});
	} else {
		for (const [key, value] of Object.entries(formData)) {
			if (value !== undefined && value !== null && value !== '') {
				params.append(key, String(value));
			}
		}
	}

	const queryString = params.toString();
	return queryString ? `${baseUrl}/forms/${formId}?${queryString}` : `${baseUrl}/forms/${formId}`;
};

export const SendJotFormTemplateForm = ({ onSend }: { onSend: (url: string) => void }) => {
	const [isModalOpen, setIsModalOpen] = useState(false);
	const [isSendModalOpen, setIsSendModalOpen] = useState(false);
	const [manualInputValues, setManualInputValues] = useState<ManualInputValues>({});
	const [currentPage, setCurrentPage] = useState(1);
	const [lastSearchedValue, setLastSearchedValue] = useState("");
	const [totalPages, setTotalPages] = useState(0);
	const [totalItems, setTotalItems] = useState(0);
	const [selectedFilter, setSelectedFilter] = useState('all');
	const [TableKey, setTableKey] = useState(0);
	const [loader, setLoader] = useState(false);
	const [itemsPerPage, setitemsPerPage] = useState(10);
	const [selectedReportFilter, setSelectedReportFilter] = useState("last30Days");
	const [isIframeLoading, setIsIframeLoading] = useState(true);
	const { emitSendJotForm } = useSocketContext();
	const params = new URLSearchParams(window.location.search);
	const companyData = { defaultLangCode: "en" };
	const [assignedForms, setAssignedForms] = useState<AssignedForm[]>([]);
	const [selectedForm, setSelectedForm] = useState<string | null>(null)
	const [inputValues, setInputValues] = useState<InputValues>({});
	const [isReportModal, setIsReportModal] = useState(false);
	const [tableResponse, setTableResponse] = useState<{ data: any[]; sortColumns?: any[]; uniqueKeys?: string[] } | null>(null);
	const [form] = Form.useForm();
	const { data: userData } = useSession();
	const lastSearchRef = useRef(lastSearchedValue);
	const filterRef = useRef(selectedFilter);
	const { socket } = useSocketContext();
	const [pageSize, setPageSize] = useState(10);
	// let userROle = userData?.user?.Roles[0];
	const [isMobile, setIsMobile] = useState(false);
	const userRole = userData?.user?.Roles?.[0];
	const [exportLoading, setExportLoading] = useState(false);
	const [whatsappExportLoading, setWhatsappExportLoading] = useState(false);
	const [isWhatsappExportModalOpen, setIsWhatsappExportModalOpen] = useState(false);
	const [whatsappListName, setWhatsappListName] = useState("");
	const [whatsappListTags, setWhatsappListTags] = useState("");
	const abortControllerRef = useRef<AbortController | null>(null);
	const [selectedFormFields, setSelectedFormFields] = useState<FormFields | null>(null);
	const [isSearchActive, setIsSearchActive] = useState(false);
	const [currentSearchTerm, setCurrentSearchTerm] = useState<any>("");
	const [isSyncing, setIsSyncing] = useState(false);
	const lastFetchParams = useRef({ page: 0, size: 0, form: '', search: '', filter: '' });
	const hasFetchedOnMount = useRef(false);
	const hasLoadedUserData = useRef(false);
	const fetchControllerRef = useRef<AbortController | null>(null);
	const currentFormIdRef = useRef<string | null>(null);
	const { receivedResponse } = useMessageStore();
	const tableClosureRef = useRef<any>({});

	useEffect(() => {
		const handleResize = () => {
			setIsMobile(window.innerWidth <= 768);
		};

		if (typeof window !== 'undefined') {
			setIsMobile(window.innerWidth <= 768);
			window.addEventListener('resize', handleResize);
			return () => window.removeEventListener('resize', handleResize);
		}
	}, []);

useEffect(() => {
    if (!receivedResponse || !selectedForm) return;

    getTableResponse(
        selectedForm,
        currentPage,
        pageSize,
        lastSearchedValue,
        selectedFilter
    );
}, [receivedResponse]);

	const getUrlParams = () => {
		if (typeof window !== 'undefined') {
			return new URLSearchParams(window.location.search);
		}
		return new URLSearchParams();
	};

	const debouncedSearch = useCallback(
		debounce((formId, page, size, searchValue, filter) => {
			getTableResponse(formId, page, size, searchValue, filter);
		}, 500), // Wait 500ms after user stops typing
		[]
	);

	useEffect(() => {
		lastSearchRef.current = lastSearchedValue;
	}, [lastSearchedValue]);

	useEffect(() => {
		filterRef.current = selectedFilter;
	}, [selectedFilter]);

	const handlePageChange = (pageNumber: number) => {
		setCurrentPage(pageNumber);
	};

	const openModal = () => setIsModalOpen(true);

	const closeModal = () => {
		setIsModalOpen(false);
		setManualInputValues({});
	}

	const closeSendModal = () => setIsSendModalOpen(false);

	const closeReportModal = () => {
		setIsReportModal(false);
	}

	const buildDefaultWhatsappListName = () => {
		const formName = assignedForms.find((form) => form.form_id === selectedForm)?.form_name || "Form Responses";
		const suffixParts = [
			selectedFilter !== "all" ? selectedFilter : "",
			lastSearchedValue ? "filtered" : "",
			dayjs().format("YYYY-MM-DD"),
		].filter(Boolean);

		return `${formName} ${suffixParts.join(" ")}`.trim();
	};

	const openWhatsappExportModal = () => {
		if (!selectedForm) {
			toast.error("Please select a form first");
			return;
		}

		setWhatsappListName(buildDefaultWhatsappListName());
		setWhatsappListTags(selectedFilter !== "all" ? selectedFilter : "");
		setIsWhatsappExportModalOpen(true);
	};

	const closeWhatsappExportModal = () => {
		setIsWhatsappExportModalOpen(false);
		setWhatsappListName("");
		setWhatsappListTags("");
	};

	useEffect(() => {
		if (!socket) return;

		// REMOVE handleConnect completely

		const handleDisconnect = (reason: string) => {
			console.warn("Socket disconnected:", reason);
			if (reason === "io server disconnect") {
				socket.connect();
			}
		};

		const handleError = (err: any) => {
			console.error("Socket error:", err);
		};

		// const handleDataSaved = ({ formId }: { formId: string }) => {
		// 	setCurrentPage(1);
		// 	getTableResponse(
		// 		formId,
		// 		1,
		// 		itemsPerPage,
		// 		lastSearchRef.current,
		// 		filterRef.current
		// 	);
		// };

		// Don't listen to "connect" event
		socket.on("disconnect", handleDisconnect);
		socket.on("connect_error", handleError);
		// socket.on("dataSaved", handleDataSaved);

		return () => {
			socket.off("disconnect", handleDisconnect);
			socket.off("connect_error", handleError);
			// socket.off("dataSaved", handleDataSaved);
		};
	}, [socket]);

	useEffect(() => {
		if (!selectedForm) return;

		currentFormIdRef.current = selectedForm;

		const currentParams = {
			page: currentPage,
			size: pageSize,
			form: selectedForm,
			search: lastSearchedValue,
			filter: selectedFilter
		};

		const paramsChanged =
			lastFetchParams.current.page !== currentParams.page ||
			lastFetchParams.current.size !== currentParams.size ||
			lastFetchParams.current.form !== currentParams.form ||
			lastFetchParams.current.search !== currentParams.search ||
			lastFetchParams.current.filter !== currentParams.filter;

		if (paramsChanged) {
			// If only the page/size changed (same form, search and filter) we can
			// reuse the cached total and tell the backend to skip the count query.
			const onlyPageOrSizeChanged =
				lastFetchParams.current.form === currentParams.form &&
				lastFetchParams.current.search === currentParams.search &&
				lastFetchParams.current.filter === currentParams.filter &&
				lastFetchParams.current.form !== '';

			lastFetchParams.current = currentParams;
			getTableResponse(selectedForm, currentPage, pageSize, lastSearchedValue, selectedFilter, onlyPageOrSizeChanged);
		}
	}, [currentPage, pageSize, selectedForm, lastSearchedValue, selectedFilter]);

	async function deleteWithPathParam(id: any, UUID?: any) {
		const Url = getBackendUrl();
		const url = UUID
			? `${Url}/api/jotform/responses/${id}/${UUID}`
			: `${Url}/api/jotform/responses/${id}`;

		const response = await fetch(url, {
			method: 'DELETE',
		});

		return await response.json();
	}

	const deleteRecord = async (data: any) => {
		Swal.fire({
			title: "Are you sure?",
			text: "You won't be able to revert this!",
			icon: "warning",
			showCancelButton: true,
			confirmButtonText: "Delete",
			cancelButtonText: "Cancel",
			confirmButtonColor: '#3b5998',
			reverseButtons: false,
		}).then(async (result) => {
			if (result.isConfirmed) {
				setLoader(true);

				const ID = data?.formData?.submission_id || data?.formData?.form_id;
				const uuid = data?.formData?.uuid;

				try {
					if (uuid) {
						await deleteWithPathParam(ID, uuid);
					} else {
						await deleteWithPathParam(ID);
					}

					toast.success('Record Deleted!');
					getTableResponse(selectedForm, currentPage, itemsPerPage, lastSearchedValue, selectedFilter);
				} catch (error) {
					console.error('Error deleting record:', error);
					setLoader(false);
				}
			}
		});
	};


	const TableComponent = useMemo(() => {
		const Comp = React.memo<TableComponentProps>(({
			tableData,
			uniqueKeys,
			currentPage,
			totalItems,
			totalPages,
			setCurrentPage,
			selectedFormFields,
			onUpdateField,
			listableFields,
		}) => {
		const [downloadingPDF, setDownloadingPDF] = useState<number | null>(null);
		const [editingCell, setEditingCell] = useState<{
			recordId: string;
			fieldName: string;
			value: string;
			fieldType?: string;
			fieldOptions?: any[];
			fieldData?: any;
			field?: any[]
		} | null>(null);
		const [savingEdit, setSavingEdit] = useState(false);
		const [isMobile, setIsMobile] = useState(false);

		// Mobile detection hook
		useEffect(() => {
			const checkMobile = () => {
				setIsMobile(window.innerWidth < 768);
			};

			checkMobile();
			window.addEventListener('resize', checkMobile);

			return () => window.removeEventListener('resize', checkMobile);
		}, []);

		const handlePageChange = (page: number, size?: number) => {
			tableClosureRef.current.setLoader(true);
			if (size && size !== tableClosureRef.current.pageSize) {
				tableClosureRef.current.setPageSize(size);
				page = 1;
			}
			setCurrentPage(page);
		};

		// Helper function to get field data by name
		const getFieldDataByName = (fieldName: string) => {
			if (!selectedFormFields?.content) return null;
			return Object.values(selectedFormFields.content).find((field: any) =>
				field.text === fieldName || field.name === fieldName
			);
		};

		// If no data is available
		if (!tableData || tableData.length === 0) {
			return (
				<div className="grid gap-4 w-100">
				</div>
			);
		}

		// Handle PDF download
		const handlePDFDownload = async (form_id: string, submission_id: string, rowIndex: number) => {
			setDownloadingPDF(rowIndex);

			const api_key = process.env.NEXT_PUBLIC_JOTFORM_API_KEY;
			const pdfUrl = `https://www.jotform.com/server.php?action=getSubmissionPDF&sid=${submission_id}&formID=${form_id}&apikey=${api_key}`;

			const a = document.createElement("a");
			a.href = pdfUrl;
			a.download = "JotForm_Submission.pdf";
			document.body.appendChild(a);
			a.click();
			document.body.removeChild(a);

			setTimeout(() => {
				toast.success('PDF downloaded!', {
					position: "bottom-right",
					autoClose: 5000,
					hideProgressBar: false,
					closeOnClick: false,
					pauseOnHover: true,
					draggable: true,
					progress: undefined,
					theme: "colored",
				});
				setDownloadingPDF(null);
			}, 2500);
		};

		const isFieldEditable = (fieldName: string) => {
			return fieldName && fieldName.toLowerCase().includes('editable');
		};

		const handleEditSave = async () => {
			if (!editingCell || !onUpdateField) return;

			setSavingEdit(true);
			try {
				const success = await onUpdateField(
					editingCell.recordId,
					editingCell.fieldName,
					editingCell.value
				);

				if (success) {
					setEditingCell(null);
				} else {
					toast.error('Failed to update field');
				}
			} catch (error) {
				console.error('Error updating field:', error);
				toast.error('Error updating field');
			} finally {
				setSavingEdit(false);
			}
		};

		const handleEditCancel = () => {
			setEditingCell(null);
		};

		const parseOptionsNew = (optionsString: string): string[] => {
			return optionsString
				.split('|')
				.map(option => option.trim())
				.filter(option => option);
		};

		const handleEditStart = (
			recordId: string,
			fieldName: string,
			currentValue: any,
			field: any
		) => {
			const fieldData = getFieldDataByName(field?.name);
			let options = field?.options;

			setEditingCell({
				recordId,
				fieldName,
				value: String(currentValue || ''),
				fieldType: fieldData?.type || 'text',
				fieldOptions: parseOptionsNew(options || fieldData?.options || ''),
				fieldData: fieldData,
				field: field
			});
		};

		const handleEditInputChange = (value: string) => {
			if (editingCell) {
				setEditingCell({
					...editingCell,
					value
				});
			}
		};

		// Function to render the appropriate input based on field type
		const renderEditInput = () => {
			if (!editingCell) return null;

			const { fieldType, fieldOptions, fieldData, value, field } = editingCell;

			// Date fields
			if (fieldType === 'control_widget' || fieldType?.includes("date")) {
				return (
					<DatePicker
						className="max-w-[150px]"
						format="DD/MM/YYYY"
						size="small"
						value={value ? dayjs(value, "DD/MM/YYYY") : null}
						onChange={(date, dateString) => handleEditInputChange(dateString)}
					/>
				);
			}

			// Fields with predefined options
			if (fieldOptions && fieldOptions.length > 0) {
				return (
					<Select
						value={value}
						onChange={handleEditInputChange}
						className="max-w-[150px]"
						size="small"
						placeholder={`Select ${fieldData?.text || 'option'}`}
						allowClear
					>
						{fieldOptions.map(option => (
							<Select.Option key={option} value={option}>
								{option}
							</Select.Option>
						))}
					</Select>
				);
			}

			// Email fields
			if (fieldType === 'control_email') {
				return (
					<Input
						type="email"
						value={value}
						onChange={(e) => handleEditInputChange(e.target.value)}
						onPressEnter={handleEditSave}
						className="max-w-[150px]"
						size="small"
						placeholder="Enter email"
					/>
				);
			}

			// Number fields
			if (fieldType === 'control_number') {
				return (
					<Input
						type="number"
						value={value}
						onChange={(e) => handleEditInputChange(e.target.value)}
						onPressEnter={handleEditSave}
						className="max-w-[150px]"
						size="small"
						placeholder="Enter number"
					/>
				);
			}

			// Default text input for other types
			return (
				<Input
					value={value}
					onChange={(e) => handleEditInputChange(e.target.value)}
					onPressEnter={handleEditSave}
					className="max-w-[150px]"
					size="small"
					placeholder="Enter value"
				/>
			);
		};

		const normalizeTableData = (data: any, labelFields: any) => {
			if (!data || !labelFields) return [];

			// Pre-compute field label map
			const fieldLabelMap: Record<string, string> = {};
			labelFields.forEach((field: any) => {
				fieldLabelMap[field.name] = field.text;
			});

			// Normalize entries
			const normalizedData = data.map((entry: any) => {
				const normalized: Record<string, any> = {
					formData: entry.formData
				};

				for (let key in entry) {
					if (key === "formData") continue;

					const mappedKey = fieldLabelMap[key] || key;
					normalized[mappedKey] = entry[key];
				}

				return normalized;
			});

			// Sort by submission ID
			return normalizedData.sort((a, b) => {
				const submissionIdA = a.formData?.submission_id;
				const submissionIdB = b.formData?.submission_id;

				if (!submissionIdA && !submissionIdB) return 0;
				if (!submissionIdA) return 1;
				if (!submissionIdB) return -1;

				return parseInt(submissionIdB) - parseInt(submissionIdA);
			});
		};

		const cleanTableData = normalizeTableData(tableData, listableFields);

		const handleUploadedSend = (data: any) => {
			const result = {};
			let UUID = data?.formData?.uuid;

			listableFields.forEach((field: any) => {
				const label = field.text;
				const key = field.name;

				if (data[label] !== undefined) {
					result[key] = data[label];
				}
			});

			const dynamicUrl = buildUrlFromFormData(tableClosureRef.current.selectedForm, result, UUID, listableFields);
			tableClosureRef.current.sendJotFormMessage(dynamicUrl, data?.formData?.uuid);

			toast.success('Form sent!', {
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
			tableClosureRef.current.closeModal();
			tableClosureRef.current.closeSendModal();
			tableClosureRef.current.reset();
			tableClosureRef.current.setManualInputValues({});
		};

		const copyFormUrl = (data: any) => {
			let url = "";
			const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ? process.env.NEXT_PUBLIC_BASE_URL : 'https://www.nobstacle.com';

			if (data?.formData?.uuid) {
				url = `${baseUrl}/forms/${data.formData.uuid}`;
			} else {
				const result: Record<string, any> = {};

				listableFields.forEach((field: any) => {
					const label = field.text;
					const key = field.name;

					if (data[label] !== undefined) {
						result[key] = data[label];
					}
				});

				url = buildUrlFromFormData(
					tableClosureRef.current.selectedForm,
					data,
					data?.formData?.uuid,
					listableFields
				);
			}

			if (url) {
				navigator.clipboard
					.writeText(url)
					.then(() => {
						toast.success('URL copied to clipboard!', {
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
					})
					.catch((err) => console.error("Failed to copy URL:", err));
			}
		};

		const sortedListableFields = Array.isArray(listableFields)
			? [...listableFields].sort((a: any, b: any) => a.name.localeCompare(b.name))
			: [];

		// Desktop Table Columns
		const columns = [
			...sortedListableFields.map((field: any) => ({
				title: field.text,
				dataIndex: field.text,
				key: field.text,
				width: 200,
				render: (text: any, record: any) => {
					let value = text || record[field.text] || record[field.name] || '-';

					if (typeof value === 'object' && value !== null) {
						value = JSON.stringify(value);
					}

					const recordId = record?.formData?.submission_id || record?.formData?.uuid || record.id;
					const isEditable = isFieldEditable(field.name);
					const isCurrentlyEditing = editingCell?.recordId === recordId && editingCell?.fieldName === field.text;

					if (isCurrentlyEditing) {
						return (
							<div className="flex items-center gap-2">
								{renderEditInput()}
								<Button
									type="primary"
									size="small"
									icon={<FaCheck size={10} />}
									onClick={handleEditSave}
									loading={savingEdit}
									className="min-w-[24px] h-6"
									style={{
										backgroundColor: '#3b5998',
										borderColor: '#3b5998',
										color: 'white'
									}}
								/>
								<Button
									size="small"
									icon={<FaTimes size={10} />}
									onClick={handleEditCancel}
									className="min-w-[24px] h-6 text-gray-500 hover:text-black customCloseIcon"
								/>
							</div>
						);
					}

					return (
						<div className="relative group pr-7 w-full flex items-center justify-between">
							<div className="overflow-hidden text-ellipsis whitespace-nowrap mr-2">
								{value}
							</div>
							{isEditable && (
								<Button
									type="text"
									size="small"
									icon={<FaEdit size={10} />}
									onClick={() => handleEditStart(recordId, field.text, value, field)}
									className="min-w-[24px] h-6 hidden md:flex opacity-0 group-hover:opacity-100 transition-opacity duration-200 absolute right-0 top-1/2 -translate-y-1/2 items-center justify-center"
									title="Edit this field"
									style={{
										backgroundColor: '#3b5998',
										borderColor: '#3b5998',
										color: 'white',
										padding: 0
									}}
								/>
							)}
						</div>
					);
				},
				ellipsis: true,
			})),
			{
				title: 'Action',
				key: 'action',
				fixed: 'right' as const,
				render: (_: any, item: any, rowIndex: number) => (
					<div className="flex flex-wrap gap-1 sm:gap-2 items-center justify-center sm:justify-start">
						<Button
							title="Copy URL"
							onClick={() => copyFormUrl(item)}
							disabled={!!item?.formData?.submission_id}
							className={`group flex items-center justify-center w-6 h-6 sm:w-8 sm:h-8 text-white font-medium rounded-full text-xs text-center
					${item?.formData?.submission_id
									? 'bg-[#005d4d] cursor-not-allowed'
									: 'bg-green-700 hover:bg-green-800 focus:outline-none focus:ring-4 focus:ring-green-300 dark:bg-green-600 dark:hover:bg-green-700 dark:focus:ring-green-800'}
				`}
							style={{
								background: item?.formData?.submission_id ? '#005d4d' : '#008080',
								padding: 0,
							}}
						>
							<FaCopy
								size={14}
								className={`transition-colors duration-200 ${!item?.formData?.submission_id ? 'group-hover:text-white' : 'text-gray-400'}`}
							/>
						</Button>

						{item?.formData?.submission_id ? (
							<button
								title="Download PDF Response"
								onClick={() =>
									handlePDFDownload(item?.formData?.form_id, item?.formData?.submission_id, rowIndex)
								}
								className="w-6 h-6 sm:w-8 sm:h-8 flex items-center justify-center text-white bg-[#3b5998] hover:bg-[#2d4373] focus:ring-0 border-none font-medium rounded-full text-xs disabled:opacity-70 disabled:cursor-not-allowed"
								disabled={downloadingPDF === rowIndex}
							>
								{downloadingPDF === rowIndex ? (
									<svg className="animate-spin h-2.5 w-2.5 sm:h-3.5 sm:w-3.5" viewBox="0 0 24 24" fill="none">
										<circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
										<path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
									</svg>
								) : (
									<FaFilePdf size={14} />
								)}
							</button>
						) : (
							<button
								title="Send Form"
								onClick={() => handleUploadedSend(item)}
								className="w-6 h-6 sm:w-8 sm:h-8 flex items-center justify-center text-white bg-[#3b5998] hover:bg-[#2d4373] focus:ring-0 border-none font-medium rounded-full text-xs"
							>
								<SendIcon size={14} />
							</button>
						)}

						<button
							onClick={() => deleteRecord(item)}
							disabled={userRole !== 'Admin'}
							className="w-6 h-6 sm:w-8 sm:h-8 flex items-center justify-center text-white bg-red-700 hover:bg-red-800 focus:ring-4 focus:ring-red-300 font-medium rounded-full text-xs disabled:opacity-80 disabled:cursor-not-allowed"
						>
							<FaTrash size={12} />
						</button>
					</div>
				),
			}
		];

		// Mobile Card Component
		const MobileCard = ({ item, index }: { item: any; index: number }) => {
			const recordId = item?.formData?.submission_id || item?.formData?.uuid || item.id;
			const isSubmitted = !!item?.formData?.submission_id;
			const [isExpanded, setIsExpanded] = useState(false);

			const MAX_VISIBLE_FIELDS = 7;
			const hasMoreFields = sortedListableFields.length > MAX_VISIBLE_FIELDS;
			const visibleFields = isExpanded ? sortedListableFields : sortedListableFields.slice(0, MAX_VISIBLE_FIELDS);
			const hiddenFieldsCount = sortedListableFields.length - MAX_VISIBLE_FIELDS;

			return (
				<div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mb-4 hover:shadow-md transition-shadow duration-200">
					{/* Header Section */}
					<div className="bg-gradient-to-r from-blue-50 to-blue-100 px-4 py-3 border-b border-blue-200">
						<div className="flex items-center justify-end">
							{/* Action Buttons */}
							<div className="flex flex-wrap gap-1 sm:gap-2 items-center justify-center sm:justify-start">
								{/* Copy URL Button */}
								<button
									title={isSubmitted ? 'Cannot copy URL for submitted form' : 'Copy form URL'}
									onClick={() => copyFormUrl(item)}
									disabled={isSubmitted}
									className={`group flex items-center justify-center w-8 h-8 sm:w-8 sm:h-8 text-white font-medium rounded-full text-xs text-center transition-colors duration-200
						${isSubmitted
											? 'bg-[#005d4d] cursor-not-allowed'
											: 'bg-[#008080] hover:bg-green-800 focus:outline-none focus:ring-4 focus:ring-green-300'
										}`}
									style={{
										background: isSubmitted ? '#005d4d' : '#008080',
										padding: 0,
									}}
								>
									<FaCopy
										size={16}
										className={`transition-colors duration-200 ${!isSubmitted ? 'group-hover:text-white' : 'text-gray-400'}`}
									/>
								</button>

								{/* PDF Download or Send Button */}
								{isSubmitted ? (
									<button
										title="Download PDF Response"
										onClick={() => handlePDFDownload(item?.formData?.form_id, item?.formData?.submission_id, index)}
										className="w-8 h-8 sm:w-8 sm:h-8 flex items-center justify-center text-white bg-[#3b5998] hover:bg-[#2d4373] focus:ring-0 border-none font-medium rounded-full text-xs disabled:opacity-70 disabled:cursor-not-allowed transition-colors duration-200"
										disabled={downloadingPDF === index}
									>
										{downloadingPDF === index ? (
											<svg className="animate-spin h-2.5 w-2.5 sm:h-3.5 sm:w-3.5" viewBox="0 0 24 24" fill="none">
												<circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
												<path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
											</svg>
										) : (
											<FaFilePdf size={16} />
										)}
									</button>
								) : (
									<button
										title="Send Form"
										onClick={() => handleUploadedSend(item)}
										className="w-8 h-8 sm:w-8 sm:h-8 flex items-center justify-center text-white bg-[#3b5998] hover:bg-[#2d4373] focus:ring-0 border-none font-medium rounded-full text-xs transition-colors duration-200"
									>
										<SendIcon size={16} />
									</button>
								)}

								{/* Delete Button */}
								<button
									onClick={() => deleteRecord(item)}
									disabled={userRole !== 'Admin'}
									className="w-8 h-8 sm:w-8 sm:h-8 flex items-center justify-center text-white bg-red-700 hover:bg-red-800 focus:ring-4 focus:ring-red-300 font-medium rounded-full text-xs disabled:opacity-80 disabled:cursor-not-allowed transition-colors duration-200"
									title="Delete"
								>
									<FaTrash size={16} />
								</button>
							</div>
						</div>
					</div>

					{/* Content Section */}
					<div className="p-4">
						<div className="space-y-3">
							{visibleFields.map((field: any) => {
								let value = item[field.text] || item[field.name] || '-';

								if (typeof value === 'object' && value !== null) {
									value = JSON.stringify(value);
								}
								return (
									<div key={field.text} className="group w-full">
										<div className="flex items-center justify-between w-full gap-3">
											<div className="flex w-full justify-between gap-2">
												<div className="text-xs font-medium text-gray-500 Capitalize truncate w-1/2" title={field.text}>
													{field.text}
												</div>
												<div className="text-xs text-gray-900 text-sm truncate w-1/2 text-right" title={value}>
													{value}
												</div>
											</div>
										</div>
									</div>
								);
							})}
						</div>

						{/* View More/Less Section */}
						{hasMoreFields && (
							<div className="mt-4 relative">
								<div className="flex justify-center pt-2">
									<button
										onClick={() => setIsExpanded(!isExpanded)}
										className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors duration-200 border border-blue-200"
									>
										{isExpanded ? (
											<>
												<span>View Less</span>
												<svg className="w-4 h-4 transform rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
													<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
												</svg>
											</>
										) : (
											<>
												<span>View All</span>
												<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
													<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
												</svg>
											</>
										)}
									</button>
								</div>
							</div>
						)}
					</div>
				</div>
			);
		};

		// Render mobile cards or desktop table based on screen size
		if (isMobile) {
			return (
				<div className="bg-gray-50 min-h-screen pt-4">

					{/* Mobile Cards */}
					<div className="space-y-4">
						{cleanTableData.map((item, index) => (
							<MobileCard key={item?.formData?.submission_id || index} item={item} index={index} />
						))}
					</div>

					{/* Mobile Pagination */}
					<div className="mt-6 flex justify-center">
						<Pagination
							current={currentPage}
							total={totalItems}
							pageSize={tableClosureRef.current.pageSize}
							onChange={handlePageChange}
							showSizeChanger={false}
							size="small"
						/>
					</div>
				</div>
			);
		}

		// Desktop Table View
		return (
			<div className="p-4 bg-white shadow-md rounded-lg customTableWrapper overflow-x-auto">
				<Table
					columns={columns}
					dataSource={cleanTableData}
					rowKey={(record: any, index?: number) => record?.formData?.submission_id || index}
					pagination={false}
					scroll={{ x: 'max-content' }}
					sticky
					className="jotFormTable"
					loading={loader}
				/>
				{/* Desktop Pagination */}
				<div className="flex justify-center mt-6">
					<Pagination
						current={currentPage}
						total={totalItems}
						pageSize={tableClosureRef.current.pageSize}
						onChange={handlePageChange}
						showSizeChanger
						pageSizeOptions={['10', '20', '50', '100']}
					/>
				</div>
			</div>
		);
	});
	Comp.displayName = "TableComponent";
	return Comp;
	}, []);

	const handleChange = (name: string, value: any) => {
		setInputValues((prev: any) => ({
			...prev,
			[name]: value,
		}));
	};

	const listableFields = useMemo(() => {
		// Ensure we have both selectedFormFields and selectedForm
		if (!selectedFormFields?.content || !selectedForm) return [];

		return Object.values(selectedFormFields.content)
			.filter((field: any) => field.name.includes('listable'))
			.sort((a: any, b: any) => a.name.localeCompare(b.name));
	}, [selectedFormFields?.content, selectedForm]);

	const getAssignedFormByID = async (company_id: number) => {
		const Url = getBackendUrl();
		const API_URL = `${Url}/api/assigned-form/${company_id}`;

		try {
			const response = await axios.get(API_URL);
			if (response.status === 200) {
				setAssignedForms(response?.data);

				const defaultFormId = await getDefaultCompanyForm();

				const sortedForms = [...response?.data].sort((a, b) =>
					a.form_name.localeCompare(b.form_name)
				);

				const defaultFormExists = defaultFormId &&
					response?.data.some(form => form.form_id === defaultFormId);

				if (selectedForm === null) {
					const formToSelect = defaultFormExists
						? defaultFormId
						: sortedForms[0]?.form_id || null;

					setSelectedForm(formToSelect);
					setLoader(false);
				}
				setLoader(false);
			} else {
				setLoader(false);
				console.error('Unexpected response status:', response.status);
			}
		} catch (error) {
			setLoader(false);
			console.error('Error fetching assigned form data:', error);
		}
	};

	const handleSyncFormFields = async () => {
		if (!selectedForm) {
			toast.warning('Please select a form first');
			return;
		}

		setIsSyncing(true);
		try {
			// Clear cache and force refresh
			sessionStorage.removeItem(`form_fields_${selectedForm}`);
			await fetchFormQuestions(selectedForm, true);

			toast.success('Form fields refreshed!', {
				position: "bottom-right",
				autoClose: 3000,
				theme: "colored",
			});
		} catch (error) {
			console.error('Sync error:', error);
			toast.error('Failed to refresh form fields', {
				position: "bottom-right",
				autoClose: 3000,
				theme: "colored",
			});
		} finally {
			setIsSyncing(false);
		}
	};

	const fetchFormQuestions = async (form_id: string | null, forceRefresh: boolean = false) => {
		if (!form_id) return;

		if (form_id !== currentFormIdRef.current) {
			console.log('Ignoring stale form fields request');
			return;
		}

		try {
			if (!forceRefresh) {
				const cachedFields = sessionStorage.getItem(`form_fields_${form_id}`);
				if (cachedFields) {
					const parsedFields = JSON.parse(cachedFields);

					// Validate before setting state
					if (form_id === currentFormIdRef.current) {
						setSelectedFormFields(parsedFields);
					}
					return parsedFields;
				}
			}

			// Fetch through our backend proxy so the JotForm API key stays
			// server-side (and benefits from the server-side questions cache).
			const Url = getBackendUrl();
			const response = await fetch(
				`${Url}/api/jotform/form/${form_id}/questions`,
				{ signal: fetchControllerRef.current?.signal }
			);

			if (!response.ok) {
				throw new Error(`HTTP error! Status: ${response.status}`);
			}

			const data = await response.json();

			// Validate before caching and setting state
			if (form_id === currentFormIdRef.current) {
				sessionStorage.setItem(`form_fields_${form_id}`, JSON.stringify(data));
				setSelectedFormFields(data || { content: [] });
			}

			return data || { content: [] };
		} catch (error: any) {
			if (error.name === 'AbortError') {
				console.log('Form fields request cancelled');
				return;
			}

			console.error('Error fetching form fields:', error);

			// Only clear if still current form
			if (form_id === currentFormIdRef.current) {
				setSelectedFormFields({ content: [] });
			}
			return { content: [] };
		}
	};

	useEffect(() => {
		if (selectedForm && !hasFetchedOnMount.current) {
			hasFetchedOnMount.current = true;
			fetchFormQuestions(selectedForm, false);
		} else if (selectedForm) {
			// When selectedForm changes (not on initial mount), fetch the new form's fields
			fetchFormQuestions(selectedForm, false);
		}
	}, [selectedForm]);

	useEffect(() => {
		if (userData?.user?.id && !hasLoadedUserData.current) {
			hasLoadedUserData.current = true;
			setLoader(true);
			getAssignedFormByID(userData?.user?.companyId);
			setPageSize(10);
		}
	}, [userData?.user?.id, userData?.user?.companyId]);

	type FormValues = {
		url?: string;
		[key: string]: any;
	};

	const {
		register,
		handleSubmit,
		formState: { errors, isSubmitting },
		reset,
		setValue,
	} = useForm<FormValues>({
		resolver: yupResolver(schema),
	});

	useEffect(() => {
		const checkSession = async () => {
			if (!userData?.user?.id) {
				// Session expired, redirect to login
				toast.warning('Session expired. Please login again.');
				// Add redirect logic here if needed
			}
		};

		const interval = setInterval(checkSession, 60000); // Check every minute

		return () => clearInterval(interval);
	}, [userData]);

	const sendJotFormMessage = (content: string, uuid: string) => {
		const params = getUrlParams();
		emitSendJotForm(
			{
				refId: 1,
				langCode: params.get("lang") || companyData?.defaultLangCode || "en",
				refType: "TextTemplateMessage",
				station: Number(params.get("station") ?? 1),
				directContent: content,
				uuid: uuid,
			},
			(response: any) => {
				alert(response?.success ? "JotForm message sent!" : "Failed to send JotForm message.");
			}
		);
	};

	tableClosureRef.current = {
		selectedForm,
		sendJotFormMessage,
		closeModal,
		closeSendModal,
		reset,
		setManualInputValues,
		pageSize,
		setPageSize,
		setLoader
	};

	// const buildUrl = (formId: string, inputValues: any, UUID?: string) => {
	// 	const params = new URLSearchParams();
	// 	for (const [key, value] of Object.entries(inputValues)) {
	// 		if (typeof value === 'string') {
	// 			params.append(key, value);
	// 		}
	// 	}

	// 	const baseUrl = 'https://www.nobstacle.com';
	// 	let url = '';

	// 	if (UUID) {
	// 		params.append("uuid", UUID);
	// 		url = `${baseUrl}/forms/${UUID}?${params.toString()}`;
	// 	} else {
	// 		url = `${baseUrl}/forms/${formId}?${params.toString()}`;
	// 	}
	// 	return url;
	// };

	const getTableResponse = async (
		form_id: string | null,
		page: number,
		limit: number = 10,
		search: any = "",
		filter: string,
		skipCount: boolean = false
	) => {
		if (form_id !== currentFormIdRef.current) {
			console.log('Ignoring stale request for form:', form_id);
			return;
		}

		if (abortControllerRef.current) {
			abortControllerRef.current.abort();
		}
		abortControllerRef.current = new AbortController();

		const Url = getBackendUrl();
		const hasSearch = search && (typeof search === 'string' ? search.trim() !== "" : search.length > 0);

		let actualPage = page;
		if (hasSearch && search !== currentSearchTerm) {
			actualPage = 1;
			setCurrentPage(1);
			setCurrentSearchTerm(search);
			setIsSearchActive(true);
			setPageSize(10);
		} else if (!hasSearch && isSearchActive) {
			actualPage = 1;
			setCurrentPage(1);
			setIsSearchActive(false);
			setCurrentSearchTerm("");
			setPageSize(10);
		}

		const apiPage = actualPage;
		let API_URL = `${Url}/api/jotform/responses/${form_id}?page=${apiPage}&limit=${limit}`;

		if (hasSearch) {
			let searchArray = search;
			if (typeof search === 'string') {
				searchArray = [{ label: "", value: search }];
			} else if (!Array.isArray(search) && typeof search === 'object') {
				searchArray = [search];
			}
			const encodedSearch = encodeURIComponent(JSON.stringify(searchArray));
			API_URL += `&search=${encodedSearch}`;
		}

		if (filter) {
			API_URL += `&filter=${filter}`;
		}

		// On plain page/size changes the total is unchanged, so skip the
		// server-side count and reuse the value we already have.
		if (skipCount) {
			API_URL += `&skipCount=true`;
		}

		try {
			const response = await axios.get(API_URL, {
				signal: abortControllerRef.current.signal
			});

			if (form_id !== currentFormIdRef.current) {
				console.log('Discarding response for old form:', form_id);
				return;
			}

			if (response.status === 200) {
				const { items, allFieldNames, totalPages, totalItems } = response.data;

				if (!skipCount) {
					setTotalPages(totalPages || 1);
					setTotalItems(totalItems || 0);
				}

				if (items && items.length > 0) {
					const tableData = items.map((item: any) => {
						const prettyData: Record<string, any> = { ...item.formData };
						prettyData.formData = {
							submission_id: item.submissionId,
							form_id: item.formId,
							uuid: item.uuid,
							id: item.id,
							created_at: item.createdAt,
							updated_at: item.updatedAt
						};
						return prettyData;
					});

					let sortColumns = allFieldNames?.sort((a: string, b: string) => {
						return a.localeCompare(b);
					}) || [];

					setTableResponse({ data: tableData, sortColumns });
					setLoader(false);
				} else {
					setTableResponse({ data: [], sortColumns: [] });
					setLoader(false);
				}
			}
		} catch (error: any) {
			if (axios.isCancel(error) || error.name === 'AbortError') {
				console.log('Request cancelled');
				return;
			}

			if (form_id === currentFormIdRef.current) {
				setTableResponse({ data: [], sortColumns: [] });
				setLoader(false);
			}
			console.error('Error fetching form data:', error);
		}
	};

	useEffect(() => {
		return () => {
			if (fetchControllerRef.current) {
				fetchControllerRef.current.abort();
			}
			if (abortControllerRef.current) {
				abortControllerRef.current.abort();
			}
		};
	}, []);

	const handleFormChange = async (value: string) => {
		if (fetchControllerRef.current) {
			fetchControllerRef.current.abort();
		}
		if (abortControllerRef.current) {
			abortControllerRef.current.abort();
		}

		fetchControllerRef.current = new AbortController();
		currentFormIdRef.current = value;

		setLoader(true);
		setValue("url", value);

		setSelectedFormFields(null);
		setTableResponse(null);
		setSelectedForm(value);
		setCurrentPage(1);
		setPageSize(10);
		setLastSearchedValue("");
		setCurrentSearchTerm("");
		setIsSearchActive(false);
		form.resetFields();

		try {
			// Load the response table and the form questions concurrently.
			// fetchFormQuestions hits JotForm's external API and is independent of
			// the table data, so awaiting it first needlessly delayed the table.
			await Promise.all([
				fetchFormQuestions(value, false),
				getTableResponse(value, 1, 10, "", selectedFilter),
			]);
		} catch (error) {
			if (error.name !== 'AbortError') {
				console.error('Error changing form:', error);
				setLoader(false);
			}
		}
	};

	async function onSubmit(event: React.MouseEvent<HTMLButtonElement, MouseEvent>) {
		let uploadBlankRecord = await handleBlankUpload();
		if (uploadBlankRecord) {
			let uuid = uploadBlankRecord?.uuid;
			event.preventDefault();

			if (!selectedForm) {
				toast.error("Please select a form before submitting.");
				return;
			}

			const dynamicUrl = buildUrlFromFormData(selectedForm, manualInputValues, uuid, listableFields);
			sendJotFormMessage(dynamicUrl, uuid);

			toast.success('Form sent!', {
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
			closeModal();
			closeSendModal();
			reset();
			setManualInputValues({});
		}
	}

	async function onPrefillSubmit(event: React.MouseEvent<HTMLButtonElement, MouseEvent>) {
		let uploadBlankRecord = await handleManualUpload('false');
		if (uploadBlankRecord) {
			let uuid = uploadBlankRecord?.uuid;
			event.preventDefault();

			if (!selectedForm) {
				toast.error("Please select a form before submitting.");
				return;
			}

			const dynamicUrl = buildUrlFromFormData(selectedForm, manualInputValues, uuid, listableFields);
			sendJotFormMessage(dynamicUrl, uuid);

			toast.success('Form sent!', {
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
			closeModal();
			closeSendModal();
			reset();
			setManualInputValues({});
		}
	}

	const handleManualInputChange = (text: string, value: string) => {
		setManualInputValues((prev) => ({
			...prev,
			[text]: value,
		}));
	};

	const handleManualUpload = async (show: any) => {
		const Url = getBackendUrl();
		const formData = {
			formId: selectedForm,
			data: manualInputValues
		};

		const uploadURL = `${Url}/api/jotform/upload-single-record/${selectedForm || ""}`;

		try {
			const response = await axios.post(uploadURL, formData, {
				headers: {
					'Content-Type': 'application/json'
				}
			});

			getTableResponse(selectedForm || null, 1, 10, lastSearchedValue, selectedFilter);

			if (response.status === 201) {
				if (show === 'true') {
					toast.success('Response uploaded!', {
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
				}
				setManualInputValues({});
				closeModal();
				return response?.data?.data;
			} else {
				toast.error(response.data.message || 'Unable to upload response.', {
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
				closeModal();
			}
		} catch (error) {
			console.error('Upload error:', error);
			toast.error('Unable to upload response. Please try again.', {
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
		}
	};

	const handleBlankUpload = async () => {
		const Url = getBackendUrl();
		const uploadURL = Url + `/api/jotform/upload-blank-record/${selectedForm || ""}`;

		try {
			const response = await axios.post(uploadURL, {}, {
				headers: {
					'Content-Type': 'application/json'
				}
			});

			if (response.status === 201) {
				getTableResponse(selectedForm || null, 1, 10, lastSearchedValue, selectedFilter);
				closeModal();
				return response?.data?.data;
			} else {
				toast.error(response.data.message || 'Unable to create blank record.', {
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
				closeModal();
			}
		} catch (error) {
			console.error('Upload error:', error);
			toast.error('Unable to create blank record. Please try again.', {
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
		}
	};

	const onFinish = (values: any) => {
		setLoader(true);

		const formattedData = [];

		const formFields = selectedFormFields?.content || {};

		Object.entries(values).forEach(([key, val]) => {
			if (val !== undefined && val !== "" && val !== null) {
				const fieldItem = Object.values(formFields).find(item => item.text === key);

				if (fieldItem) {
					let processedValue = val;

					if (typeof val === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(val)) {
						processedValue = dayjs(val).format("DD/MM/YYYY");
					}
					if (dayjs.isDayjs(val)) {
						processedValue = val.format("DD/MM/YYYY");
					}

					formattedData.push({
						text: fieldItem.text,
						name: fieldItem.name,
						value: processedValue
					});
				}
			}
		});

		const searchParams = formattedData.length > 0
			? JSON.stringify(formattedData)
			: "";

		// CHANGE: Update these state variables
		setCurrentPage(1);
		setLastSearchedValue(searchParams);
		setCurrentSearchTerm(searchParams); // ADD THIS LINE
		setIsSearchActive(!!searchParams);  // ADD THIS LINE

		// Call with page 1
		getTableResponse(selectedForm, 1, 10, searchParams, selectedFilter);
	};

	const handleClearSearch = () => {
		form.resetFields();
		setCurrentPage(1);
		setLastSearchedValue("");
		setCurrentSearchTerm("");
		setIsSearchActive(false);
		getTableResponse(selectedForm, 1, 10, "", selectedFilter);
	};

	const handleSampleCSVDownload = () => {
		if (
			selectedFormFields?.content &&
			Object.keys(selectedFormFields.content).length > 0
		) {
			const fields = Object.values(selectedFormFields.content)
				.filter((item: any) => item?.name?.includes("prefillable"))
				.sort((a, b) => a.name.toLowerCase().localeCompare(b.name.toLowerCase()))
				.map((item: any) => item.text);

			const csvContent = fields.join(",") + "\n";

			const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
			const url = URL.createObjectURL(blob);

			const link = document.createElement("a");
			link.href = url;
			link.setAttribute("download", "sample.csv");
			document.body.appendChild(link);
			link.click();
			document.body.removeChild(link);
			toast.success('Sample CSV downloaded successsfully!', {
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
		}
	};

	const handleFilterChange = (value: string) => {
		if (!selectedForm) return;

		setLoader(true);
		setSelectedFilter(value);
		setCurrentPage(1);
		setPageSize(10);

		// Force refresh from backend with new filter
		getTableResponse(selectedForm, 1, 10, lastSearchedValue || currentSearchTerm || "", value);
	};

	const handleFileClick = () => {
		const fileInput = document.getElementById('file-upload') as HTMLInputElement;
		fileInput?.click();
	};

	const handleBulkUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
		setLoader(true);

		const file = e.target.files?.[0];
		if (!file) {
			toast.error("No file selected");
			setLoader(false);
			return;
		}

		Papa.parse(file, {
			header: true,
			skipEmptyLines: true,
			complete: async ({ data, errors }) => {
				if (errors.length > 0) {
					errors.forEach(err =>
						console.warn(`Row ${err.row}: ${err.code} — ${err.message}`)
					);
					toast.error(`CSV parse error on row ${errors[0].row}: ${errors[0].message}`);
					setLoader(false);
					return;
				}

				const payload = { data };
				try {
					const response = await axios.post(
						`${Url}/api/jotform/upload/${selectedForm}`,
						payload,
						{ headers: { "Content-Type": "application/json" } }
					);

					if (response.status === 201) {
						toast.success("Bulk data uploaded!", {
							position: "bottom-right",
							autoClose: 5000,
							theme: "colored",
						});
						getTableResponse(selectedForm, 1, 10, lastSearchedValue, selectedFilter);
					} else {
						toast.error("Upload failed: server returned " + response.status);
					}
				} catch (uploadErr: any) {
					console.error("Upload error:", uploadErr);
					toast.error("Upload failed: " + (uploadErr.message || "Unknown error"));
				} finally {
					setLoader(false);
				}
			},
			error: (err) => {
				console.error("Papa Parse fatal error:", err);
				toast.error("Error parsing CSV: " + err.message);
				setLoader(false);
			},
		});
	};

	const openReportModel = () => {
		setIsReportModal(true);
	}

	const renderReport = () => {
		const findReportData = assignedForms?.find((item) => item?.form_id === selectedForm);
		if (!findReportData) {
			return <span className="mt-4">No report available for selected form.</span>;
		}

		// Helper to extract report ID from the script string
		const extractReportId = (htmlString) => {
			const match = htmlString?.match(/data-id="(\d+)"/);
			return match?.[1] || null;
		};

		// Map filter to report IDs
		const reportIds = {
			last30Days: extractReportId(findReportData?.this_month_url),
			prevMonth: extractReportId(findReportData?.previous_month_url),
			thisYear: extractReportId(findReportData?.this_year_url),
			prevYear: extractReportId(findReportData?.previous_year_url),
		};

		const selectedReportId = reportIds[selectedReportFilter];

		if (!selectedReportId) {
			return <span className="mt-4">No valid report ID found for the selected filter.</span>;
		}

		// Construct clean embed URL
		const selectedReportUrl = `https://www.jotform.com/report/${selectedReportId}`;

		return (
			<>
				<div className="reportFilterWrapper mb-4 flex gap-2" style={{
					display: 'flex',
					justifyContent: 'center',
					alignItems: 'center',
					padding: '1rem 0'
				}}>
					{[
						{ key: "last30Days", label: "Last 30 Days" },
						{ key: "prevMonth", label: "Previous Month" },
						{ key: "thisYear", label: "This Year" },
						{ key: "prevYear", label: "Previous Year" },
					].map(({ key, label }) => (
						<Button
							key={key}
							className={`btn ${selectedReportFilter === key ? 'ActiveReportBUtton' : 'btn-outline'}`}
							onClick={() => {
								setSelectedReportFilter(key);
								setIsIframeLoading(true);
							}}
						>
							{label}
						</Button>
					))}
				</div>

				{isIframeLoading && (
					<div style={{ textAlign: 'center', marginTop: '20px' }}>
						<div className="flex items-center justify-center py-10">
							<p className="text-gray-500 text-lg">Loading...</p>
						</div>
					</div>
				)}

				<iframe
					src={selectedReportUrl}
					width="100%"
					height="600px"
					frameBorder="0"
					style={{ display: isIframeLoading ? 'none' : 'block' }}
					onLoad={() => setIsIframeLoading(false)}
					allowFullScreen
				/>
			</>
		);
	};

	const hasOptions = (item) => {
		return item.options && item.options.length > 0;
	};

	const sendBlankForm = async () => {
		let uploadBlankRecord = await handleBlankUpload();
		if (uploadBlankRecord) {
			let uuid = uploadBlankRecord?.uuid;
			const url = buildUrlFromFormData(selectedForm, {}, uuid, [], 'blank');
			if (url) {
				navigator.clipboard
					.writeText(url)
					.then(() => {
						toast.success('URL copied to clipboard!', {
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
					})
					.catch((err) => console.error("Failed to copy URL:", err));
			}
		}
	}

	const getDefaultCompanyForm = async () => {
		const Url = getBackendUrl();
		const API_URL = `${Url}/api/v1/shortcut/default-company-form`;

		try {
			const response = await fetch(API_URL, {
				method: 'GET',
				headers: {
					Authorization: `Bearer ${userData?.user?.backendTokens?.at}`,
					'Content-Type': 'application/json',
				},
			});

			if (response.ok) {
				const data = await response.json();
				return data?.data?.formId || null;
			}
		} catch (error) {
			console.error('Error fetching default form:', error);
		}
		return null;
	};

	const parseOptions = (optionsString) => {
		if (!optionsString) return [];
		return optionsString.split('|').map(option => ({
			label: option.trim(),
			value: option.trim()
		}));
	};

	const searchableSelectProps = {
		showSearch: true,
		optionFilterProp: 'children' as const,
		filterOption: (input: string, option?: { children?: React.ReactNode }) =>
			String(option?.children ?? '')
				.toLowerCase()
				.includes(input.toLowerCase()),
	};

	const renderFieldInput = (item, value, onChange) => {
		// Enhanced date field detection
		const isDateField = (item) => {
			// Check if it's a date widget type
			if (item?.type === 'control_widget' && item?.text?.toLowerCase().includes('date')) {
				return true;
			}

			// Check if field name contains date-related keywords
			const nameHasDate = item?.name?.toLowerCase().includes('date') ||
				item?.name?.toLowerCase().includes('birth') ||
				item?.name?.toLowerCase().includes('expiry') ||
				item?.name?.toLowerCase().includes('start');

			// Check if field text contains date-related keywords
			const textHasDate = item?.text?.toLowerCase().includes('date') ||
				item?.text?.toLowerCase().includes('birth') ||
				item?.text?.toLowerCase().includes('expiry') ||
				item?.text?.toLowerCase().includes('start');

			// Check if subLabel has date format pattern
			const hasDateFormat = item?.subLabel?.includes('DD/MM/YYYY') ||
				item?.subLabel?.includes('dd/mm/yyyy') ||
				item?.subLabel?.includes('MM/DD/YYYY') ||
				item?.subLabel?.includes('YYYY-MM-DD');

			// Check if validation is set to date
			const hasDateValidation = item?.validation?.toLowerCase().includes('date');

			// Check if type explicitly mentions date
			const typeIsDate = item?.type?.includes('date') || item?.type === 'control_datetime';

			return nameHasDate || textHasDate || hasDateFormat || hasDateValidation || typeIsDate;
		};

		// Date fields
		if (isDateField(item)) {
			// Determine date format from subLabel or default to DD/MM/YYYY
			let dateFormat = "DD/MM/YYYY";
			if (item?.subLabel) {
				if (item.subLabel.includes('MM/DD/YYYY')) {
					dateFormat = "MM/DD/YYYY";
				} else if (item.subLabel.includes('YYYY-MM-DD')) {
					dateFormat = "YYYY-MM-DD";
				}
			}

			return (
				<DatePicker
					className="w-full"
					format={dateFormat}
					size="middle"
					value={value ? dayjs(value, dateFormat) : null}
					onChange={(date, dateString) => onChange(dateString)}
					placeholder={item?.subLabel || `Select ${item.text}`}
				/>
			);
		}

		// Fields with predefined options
		if (hasOptions(item)) {
			const options = parseOptions(item.options);

			// Show Radio if ≤ 3 options
			if (options.length <= 3) {
				return (
					<Radio.Group
						value={value}
						onChange={(e) => onChange(e.target.value)}
						className="w-full"
					>
						<div className="flex flex-col space-y-2">
							{options.map(option => (
								<Radio key={option.value} value={option.value}>
									{option.label}
								</Radio>
							))}
						</div>
					</Radio.Group>
				);
			}

			// Else fallback to Select dropdown
			return (
				<Select
					value={value}
					onChange={onChange}
					className="w-full"
					size="middle"
					placeholder={`Search or select ${item.text}`}
					allowClear
					{...searchableSelectProps}
				>
					{options.map(option => (
						<Select.Option key={option.value} value={option.value}>
							{option.label}
						</Select.Option>
					))}
				</Select>
			);
		}

		// Email fields - check validation field and field name
		if (item?.validation === 'Email' ||
			item?.type === 'control_email' ||
			item?.name?.toLowerCase().includes('email') ||
			item?.text?.toLowerCase().includes('email')) {
			return (
				<Input
					type="email"
					value={value || ''}
					onChange={(e) => onChange(e.target.value)}
					className="w-full"
					size="middle"
					placeholder={item?.subLabel || "Enter email address"}
				/>
			);
		}

		// Numeric fields - check validation field
		if (item?.validation === 'Numeric' ||
			item?.type === 'control_number' ||
			item?.name?.toLowerCase().includes('mobile') ||
			item?.name?.toLowerCase().includes('phone') ||
			item?.text?.toLowerCase().includes('mobile') ||
			item?.text?.toLowerCase().includes('phone')) {
			return (
				<Input
					type="tel"
					value={value || ''}
					onChange={(e) => onChange(e.target.value)}
					className="w-full"
					size="middle"
					placeholder={item?.subLabel || `Enter ${item.text}`}
				/>
			);
		}

		// Text area for longer content
		if (item?.type === 'control_textarea') {
			return (
				<Input.TextArea
					value={value || ''}
					onChange={(e) => onChange(e.target.value)}
					className="w-full"
					size="middle"
					rows={3}
					placeholder={`Enter ${item.text}`}
				/>
			);
		}

		// Default text input for other types
		return (
			<Input
				value={value || ''}
				onChange={(e) => onChange(e.target.value)}
				className="w-full"
				size="middle"
				placeholder={item?.subLabel || `Enter ${item.text}`}
			/>
		);
	};

	const updateFieldValue = async (recordId: string, fieldName: string, newValue: string): Promise<boolean> => {
		const Url = getBackendUrl();
		try {
			let fieldId = null;
			if (selectedFormFields?.content) {
				for (const [qid, field] of Object.entries(selectedFormFields.content)) {
					const fieldData = field as any;
					if (fieldData.name === fieldName || fieldData.text === fieldName) {
						fieldId = qid;
						break;
					}
				}
			}

			const response = await fetch(Url + `/api/jotform/update-field/${recordId}`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					fieldName,
					newValue,
					formId: selectedForm,
					fieldId,
				}),
			});

			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(errorData.message || 'Failed to update field');
			}

			const result = await response.json();

			if (!result.success) {
				throw new Error(result.message || 'Failed to update field');
			}

			// Update local state
			setTableResponse(prevResponse => {
				if (!prevResponse?.data) return prevResponse;

				const updatedData = prevResponse.data.map(record => {
					const recordIdToMatch = record?.formData?.submission_id || record?.formData?.uuid || record.id;

					if (recordIdToMatch === recordId) {
						return {
							...record,
							[fieldName]: newValue
						};
					}
					return record;
				});

				return {
					...prevResponse,
					data: updatedData
				};
			});

			if (result.data?.jotFormUpdateSuccess) {
				toast.success('Field updated!');
			} else if (result.data?.jotFormError) {
				toast.warning(`Field updated in database, but JotForm update failed: ${result.data.jotFormError}`);
			} else {
				toast.success('Field updated!');
			}

			return true;
		} catch (error) {
			console.error('Error updating field:', error);
			return false;
		}
	};

	const handleExportToExcel = async () => {
		if (!selectedForm) {
			toast.error("Please select a form first");
			return;
		}

		setExportLoading(true);

		try {
			const Url = getBackendUrl();

			// Extract listable field text labels
			const listableFields = selectedFormFields?.content
				? Object.values(selectedFormFields.content)
					.filter((field: any) => field.name.includes('listable'))
					.sort((a: any, b: any) => a.name.localeCompare(b.name))
					.map((field: any) => field.text)
				: [];

			// Encode listable fields as query parameter
			const encodedFields = encodeURIComponent(JSON.stringify(listableFields));

			let API_URL = `${Url}/api/jotform/export/${selectedForm}?listableFields=${encodedFields}`;

			// Add search parameters if any
			if (lastSearchedValue && lastSearchedValue !== "") {
				const encodedSearch = encodeURIComponent(lastSearchedValue);
				API_URL += `&search=${encodedSearch}`;
			}

			// Add filter parameters
			if (selectedFilter && selectedFilter !== 'all') {
				API_URL += `&filter=${selectedFilter}`;
			}

			// Make the API call
			const response = await axios.get(API_URL, {
				responseType: 'blob'
			});

			// Create download link
			const url = window.URL.createObjectURL(new Blob([response.data]));
			const link = document.createElement('a');
			link.href = url;

			// Generate filename with timestamp
			const timestamp = new Date().toISOString().split('T')[0];
			const formName = assignedForms.find(f => f.form_id === selectedForm)?.form_name || 'form';
			link.setAttribute('download', `${formName}_${timestamp}.xlsx`);

			document.body.appendChild(link);
			link.click();
			document.body.removeChild(link);
			window.URL.revokeObjectURL(url);

			toast.success('Data exported!', {
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
		} catch (error) {
			console.error('Export error:', error);
			toast.error('Failed to export data. Please try again.', {
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
		} finally {
			setExportLoading(false);
		}
	};

	const handleExportToWhatsapp = async () => {
		if (!selectedForm) {
			toast.error("Please select a form first");
			return;
		}

		if (!userData?.user?.backendTokens?.at) {
			toast.error("Your session is missing a backend token. Please log in again.");
			return;
		}

		if (!whatsappListName.trim()) {
			toast.error("Please enter a contact list name");
			return;
		}

		setWhatsappExportLoading(true);

		try {
			const Url = getBackendUrl();
			const response = await axios.post(
				`${Url}/api/jotform/export-to-whatsapp/${selectedForm}`,
				{
					name: whatsappListName.trim(),
					tags: whatsappListTags
						.split(",")
						.map((tag) => tag.trim())
						.filter(Boolean),
					search: lastSearchedValue || "",
					filter: selectedFilter,
				},
				{
					headers: {
						Authorization: `Bearer ${userData.user.backendTokens.at}`,
						"Content-Type": "application/json",
					},
				}
			);

			const data = response.data;
			toast.success(
				`WhatsApp list created: ${data?.contactList?.name || whatsappListName.trim()} (${data?.imported || 0} contacts)`,
				{
					position: "bottom-right",
					autoClose: 5000,
					hideProgressBar: false,
					closeOnClick: false,
					pauseOnHover: true,
					draggable: true,
					progress: undefined,
					theme: "colored",
					transition: Bounce,
				}
			);
			closeWhatsappExportModal();
		} catch (error: any) {
			console.error("WhatsApp export error:", error);
			toast.error(
				error?.response?.data?.message || "Failed to create WhatsApp contact list. Please try again.",
				{
					position: "bottom-right",
					autoClose: 5000,
					hideProgressBar: false,
					closeOnClick: false,
					pauseOnHover: true,
					draggable: true,
					progress: undefined,
					theme: "colored",
					transition: Bounce,
				}
			);
		} finally {
			setWhatsappExportLoading(false);
		}
	};

	const renderFormField = (item, idx, arr) => {
		const commonProps = {
			key: item.qid,
			name: item.text,
			className: arr.length > 5 ? "mb-2" : "mb-0"
		};

		if (
			item?.validation === "Date" ||
			item?.subLabel?.includes("DD/MM/YYYY") ||
			item?.text?.toLowerCase().includes("date") ||
			item?.name?.toLowerCase().includes("date")
		) {
			return (
				<Form.Item {...commonProps}>
					<DatePicker
						className="w-full"
						format="DD/MM/YYYY"
						placeholder={item.text}
					/>
				</Form.Item>
			);
		}

		const hasOptions = item?.options && item.options.trim().length > 0;
		const options = hasOptions ? item.options.split('|') : [];

		if (item?.type === "control_radio" && hasOptions) {
			return (
				<Form.Item {...commonProps}>
					<Select placeholder={item.text} className="w-full">
						{options.map((option, optIdx) => (
							<Option key={optIdx} value={option.trim()}>
								{option.trim()}
							</Option>
						))}
					</Select>
				</Form.Item>
			);
		}

		if ((item?.type === "control_checkbox" || hasOptions) && options.length > 1) {
			return (
				<Form.Item {...commonProps}>
					<Select
						mode="multiple"
						placeholder={item.text}
						className="w-full"
						maxTagCount="responsive"
					>
						{options.map((option, optIdx) => (
							<Option key={optIdx} value={option.trim()}>
								{option.trim()}
							</Option>
						))}
					</Select>
				</Form.Item>
			);
		}

		if (hasOptions && options.length === 1) {
			return (
				<Form.Item {...commonProps}>
					<Select placeholder={item.text} className="w-full">
						{options.map((option, optIdx) => (
							<Option key={optIdx} value={option.trim()}>
								{option.trim()}
							</Option>
						))}
					</Select>
				</Form.Item>
			);
		}

		if (item?.validation === "Email" || item?.text?.toLowerCase().includes("email")) {
			return (
				<Form.Item {...commonProps}>
					<Input
						type="email"
						placeholder={item.text}
						className="w-full"
					/>
				</Form.Item>
			);
		}

		if (item?.validation === "Numeric" || item?.text?.toLowerCase().includes("mobile") || item?.text?.toLowerCase().includes("phone")) {
			return (
				<Form.Item {...commonProps}>
					<Input
						type="tel"
						placeholder={item.text}
						className="w-full"
					/>
				</Form.Item>
			);
		}

		if (item?.type === "control_widget") {
			return null;
		}

		if (["control_head", "control_pagebreak", "control_button"].includes(item?.type)) {
			return null;
		}

		return (
			<Form.Item {...commonProps}>
				<Input
					placeholder={item.text}
					type="text"
					className="w-full"
				/>
			</Form.Item>
		);
	};

	return (
		<div className="bg-gray-50 p-2 rounded-lg shadow-md w-full mx-auto">
			<div className="mb-4">
				{/* Mobile Layout */}
				<div className="block sm:hidden">
					{/* First Row - Select Dropdown */}
					<Row className="mb-3">
						<Col span={24}>
							<Select
								className="w-full"
								onChange={handleFormChange}
								placeholder="Select Form"
								value={selectedForm}
								size="middle"
								options={assignedForms.map((assignedForm) => ({
									label: assignedForm?.form_name,
									value: assignedForm?.form_id
								}))}
							/>
						</Col>
					</Row>

					{/* Second Row - Action Buttons */}
					<Row gutter={[8, 8]} justify="space-between" align="middle">
						{/* Left side buttons */}
						<Col>
							<div className="flex items-center gap-2 flex-wrap">
								<Tooltip title="Send Form">
									<Button
										onClick={onSubmit}
										icon={<SendIcon />}
										type="primary"
										className="headerButton"
										size="middle"
									/>
								</Tooltip>

								<Tooltip title="Prefill or upload">
									<Button
										onClick={openModal}
										icon={<BsFillSendPlusFill size={18} color="#fff" />}
										type="primary"
										className="headerButton"
										size="middle"
									/>
								</Tooltip>

								<Tooltip title="Blank Form">
									<Button
										onClick={sendBlankForm}
										icon={<IoQrCode size={18} color="#fff" />}
										type="primary"
										className="headerButton"
										size="middle"
									/>
								</Tooltip>

								{selectedForm && !isMobile && (
									<>
										<Tooltip title="Download Sample CSV">
											<Button
												onClick={handleSampleCSVDownload}
												icon={<FaFileDownload size={18} color="#fff" />}
												type="primary"
												className="headerButton"
												size="middle"
											/>
										</Tooltip>
										<Tooltip title="Upload File">
											<Button
												icon={<FaFileUpload size={18} color="#fff" />}
												type="primary"
												onClick={handleFileClick}
												className="headerButton"
												size="middle"
											/>
										</Tooltip>
									</>
								)}
							</div>
						</Col>

						{/* Right side buttons */}
						<Col>
							<div className="flex items-center gap-2">
								<Tooltip title="Report">
									<Button
										className="headerButton"
										type="primary"
										onClick={() => openReportModel()}
										icon={<FaChartBar size={18} color="#fff" />}
										size="middle"
									/>
								</Tooltip>
								{userData?.user.Roles[0] === "Admin" && (
									<Tooltip title="Refresh Form Fields">
										<Button
											onClick={handleSyncFormFields}
											icon={<HiRefresh />}
											type="primary"
											className="headerButton"
											size="middle"
											loading={isSyncing}
											style={{ fontSize: '19.4px' }}
										/>
									</Tooltip>
								)}
							</div>
						</Col>
					</Row>

					{/* Hidden file input */}
					{selectedForm && (
						<input
							id="file-upload"
							type="file"
							accept=".csv, .xlsx, .xls"
							onChange={handleBulkUpload}
							className="hidden"
						/>
					)}
				</div>

				{/* Desktop Layout */}
				<div className="hidden sm:flex justify-between items-end">
					<div className="flex items-end gap-2 customJotFOrmHeader">
						<Select
							className="w-full"
							onChange={handleFormChange}
							style={{ minWidth: '30%', maxWidth: '35%' }}
							placeholder="Select Form"
							value={selectedForm}
							options={assignedForms.map((assignedForm) => ({
								label: assignedForm?.form_name,
								value: assignedForm?.form_id
							}))}
						/>

						<Tooltip title="Send Form">
							<Button
								onClick={onSubmit}
								icon={<SendIcon />}
								type="primary"
								className="headerButton"
							/>
						</Tooltip>

						<Tooltip title="Prefill or upload">
							<Button
								onClick={openModal}
								icon={<BsFillSendPlusFill size={20} color="#fff" />}
								type="primary"
								className="headerButton"
							/>
						</Tooltip>

						<Tooltip title="Blank Form">
							<Button
								onClick={sendBlankForm}
								icon={<IoQrCode size={20} color="#fff" />}
								type="primary"
								className="headerButton"
							/>
						</Tooltip>

						{selectedForm && (
							<>
								<Tooltip title="Download Sample CSV">
									<Button
										onClick={handleSampleCSVDownload}
										icon={<FaFileDownload size={20} color="#fff" />}
										type="primary"
										className="headerButton"
									/>
								</Tooltip>
								<Tooltip title="Upload File">
									<Button
										icon={<FaFileUpload size={20} color="#fff" />}
										type="primary"
										onClick={handleFileClick}
										className="headerButton"
									/>
								</Tooltip>
								<input
									id="file-upload"
									type="file"
									accept=".csv, .xlsx, .xls"
									onChange={handleBulkUpload}
									className="hidden"
								/>
							</>
						)}

					</div>

					<div className="flex item-center gap-2">
						<Button
							className="flex items-center gap-2 w-full lg:w-auto rounded-md px-6 py-2 text-white transition customSearchButton"
							onClick={() => openReportModel()}
						>
							<FaChartBar />
							<span>Report</span>
						</Button>
						{userData?.user.Roles[0] === "Admin" && (
							<Tooltip title="Refresh Form Fields">
								<Button
									onClick={handleSyncFormFields}
									type="primary"
									className="flex items-center gap-2 w-full lg:w-auto rounded-md px-6 py-2 text-white transition customSearchButton"
									loading={isSyncing}
								>
									<HiRefresh />
									<span>Refresh</span>
								</Button>
							</Tooltip>
						)}
					</div>
				</div>
			</div>

			<Form form={form} onFinish={onFinish}>
				{selectedFormFields?.content && Object.keys(selectedFormFields.content).length > 0 && (
					<div className="w-full p-4 bg-white rounded-lg shadow-md">
						<div className="grid grid-cols-12 gap-4 items-end">
							<div className="col-span-12 lg:col-span-10 space-y-4">
								<div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-2">
									{Object.values(selectedFormFields.content)
										.filter((item) =>
											item?.name?.includes("search")
										)
										.filter((item) => item?.type !== "control_widget") // Exclude widgets from search
										.sort((a, b) => a.name.localeCompare(b.name))
										.map((item, idx, arr) => renderFormField(item, idx, arr))
										.filter(Boolean) // Remove null values
									}
								</div>
							</div>
							{selectedForm &&
								Object.values(selectedFormFields.content).some((item) =>
									(item?.name?.includes("search") ||
										item?.name?.includes("listable") ||
										item?.name?.includes("searchable")) &&
									item?.type !== "control_widget"
								) && (
									<div className="col-span-12 lg:col-span-2 flex justify-end gap-2" style={{ height: "100%" }}>
										<Button
											className="flex items-center gap-2 w-full lg:w-auto rounded-md text-white transition headerButton"
											htmlType="submit"
											style={{ maxHeight: '2.1rem' }}
										>
											<FaSearch size={18} />
										</Button>
										{(lastSearchedValue || currentSearchTerm) && (
											<Button
												className="flex items-center gap-2 w-full lg:w-auto rounded-md text-white transition"
												onClick={handleClearSearch}
												style={{ maxHeight: '2.1rem', backgroundColor: '#DC2626' }}
											>
												<FaTimes size={18} />
											</Button>
										)}
									</div>
								)}
						</div>
					</div>
				)}
			</Form>

			<div className="card mt-5 bg-white rounded" style={{ position: 'relative' }}>
				<div className="flex flex-wrap items-center justify-between gap-4 tableDataWrapper" style={{ padding: '0.5rem 1rem 0 1rem' }}>
					<div className="formFilter flex items-center gap-4 flex-wrap">
						<Radio.Group
							value={selectedFilter}
							onChange={(e) => handleFilterChange(e.target.value)}
							buttonStyle="solid"
						>
							<Radio.Button value="all">All</Radio.Button>
							<Radio.Button value="completed">Completed</Radio.Button>
							<Radio.Button value="pending">Pending</Radio.Button>
						</Radio.Group>
					</div>
					<div className="ml-auto flex items-center justify-end gap-2">
						<Tooltip title="Export to Excel">
							<Button
								onClick={handleExportToExcel}
								icon={<FaFileDownload size={20} color="#fff" />}
								type="primary"
								className="headerButton"
								loading={exportLoading}
								disabled={!selectedFormFields?.content}
							/>
						</Tooltip>
						<Tooltip title="Create WhatsApp Contact List">
							<Button
								onClick={openWhatsappExportModal}
								icon={<FaFileExport size={20} color="#fff" />}
								type="primary"
								className="headerButton"
								disabled={!selectedFormFields?.content}
							/>
						</Tooltip>
					</div>
				</div>
				{loader || !tableResponse || !selectedFormFields?.content ? (
					<div className="p-4 bg-white shadow-md rounded-lg customTableWrapper">
						<Skeleton active paragraph={{ rows: 10 }} />
					</div>
				) : (
					<TableComponent
						key={TableKey}
						tableData={Array.isArray(tableResponse.data) ? tableResponse.data : []}
						uniqueKeys={Array.isArray(tableResponse.sortColumns) ? tableResponse.sortColumns : []}
						currentPage={currentPage}
						itemsPerPage={itemsPerPage}
						onPageChange={handlePageChange}
						totalPages={totalPages}
						setCurrentPage={setCurrentPage}
						selectedFormFields={selectedFormFields?.content || []}
						totalItems={totalItems}
						onUpdateField={updateFieldValue}
						listableFields={listableFields}
					/>
				)}
			</div>

			<Modal
				open={isWhatsappExportModalOpen}
				onCancel={closeWhatsappExportModal}
				footer={null}
				title="Create WhatsApp Contact List"
				destroyOnClose
				className="whatsappListContactModal"
			>
				<div className="flex flex-col gap-4">
					<div>
						<div className="mb-2 font-medium text-gray-700">List name</div>
						<Input
							value={whatsappListName}
							onChange={(e) => setWhatsappListName(e.target.value)}
							placeholder="Enter contact list name"
							disabled={whatsappExportLoading}
						/>
					</div>
					<div>
						<div className="mb-2 font-medium text-gray-700">Tags</div>
						<Input
							value={whatsappListTags}
							onChange={(e) => setWhatsappListTags(e.target.value)}
							placeholder="vip, followup, march"
							disabled={whatsappExportLoading}
						/>
					</div>
					<div className="rounded-md bg-gray-50 px-3 py-2 text-sm text-gray-600">
						This will create a contact list in WhatsApp from the currently selected form results using the active search and status filters.
					</div>
					<div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
						<Button
							onClick={closeWhatsappExportModal}
							disabled={whatsappExportLoading}
							className="w-full sm:w-28"
						>
							Cancel
						</Button>
						<Button
							type="primary"
							onClick={handleExportToWhatsapp}
							loading={whatsappExportLoading}
							className="headerButton w-full sm:w-32"
						>
							Create List
						</Button>
					</div>
				</div>
			</Modal>

			<Modal
				open={isModalOpen}
				onCancel={closeModal}
				footer={null}
				width="95%"
				style={{ maxWidth: '800px' }}
				centered
				closable
				title="Prefill and Display OR Upload"
			>
				<hr />
				<div className="space-y-4 mt-4">
					<Row gutter={[16, 16]}>
						{selectedFormFields?.content &&
							Object.values(selectedFormFields.content)
								.filter((item) => item?.name?.includes('prefillable'))
								.sort((a, b) => a.name.toLowerCase().localeCompare(b.name.toLowerCase()))
								.map((item) => (
									<Col
										key={item.qid}
										xs={24}
										sm={12}
										md={12}
										lg={12}
										className="mt-2"
									>
										<div className="flex flex-col space-y-2">
											<label className="text-gray-700 font-medium text-sm sm:text-base">
												{item?.text}
												{item.required === 'Yes' && <span className="text-red-500 ml-1">*</span>}
											</label>
											{renderFieldInput(
												item,
												manualInputValues[item.name],
												(value) => handleManualInputChange(item.name, value)
											)}
										</div>
									</Col>
								))}
					</Row>
				</div>
				<div className="flex flex-col sm:flex-row justify-end mt-6 customButtonWrapper gap-2 sm:gap-0">
					<Button
						onClick={() => handleManualUpload('true')}
						className="customSearchButton text-white px-4 sm:px-6 py-2 rounded-md flex items-center justify-center gap-2 w-full sm:w-auto"
					>
						<span className="text-sm sm:text-base">Upload</span>
						{isMobile ? (
							<RiUploadCloudFill size={20} className="sm:hidden" />
						) : (
							<RiUploadCloudFill size={25} className="hidden sm:block" />
						)}
					</Button>
					<Button
						onClick={onPrefillSubmit}
						className="customSearchButton sm:ml-4 text-white px-4 sm:px-6 py-2 rounded-md flex items-center justify-center gap-2 w-full sm:w-auto"
					>
						<span className="text-sm sm:text-base">Send</span>
						{isMobile ? (
							<SendIcon size={18} className="sm:hidden" />
						) : (
							<SendIcon className="hidden sm:block" />
						)}
					</Button>
					<Button
						onClick={closeModal}
						style={{ backgroundColor: '#DC2626' }}
						className="customRedButton sm:ml-4 text-white px-4 sm:px-6 py-2 rounded-md w-full sm:w-auto"
					>
						<span className="text-sm sm:text-base">Cancel</span>
					</Button>
				</div>
			</Modal>

			<Modal
				open={isSendModalOpen}
				onCancel={closeSendModal}
				footer={null}
				width="60%"
				centered
				closable
				title="Send Form"
			>
				<h2 className="text-lg font-bold mb-4">Send Form</h2>
				<hr />
				<div className="space-y-4 mt-4">
					{selectedFormFields?.content &&
						Object.values(selectedFormFields.content)
							.filter((item) => item?.name?.includes('prefillable'))
							.sort((a, b) => a.name.toLowerCase().localeCompare(b.name.toLowerCase()))
							.map((item) => (
								<div key={item.qid} className="flex flex-col space-y-2">
									<label className="text-gray-700 font-medium">{item?.text}</label>
									<input
										type="text"
										className="border p-2 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
										value={inputValues[item.name] || ''}
										onChange={(e) => handleChange(item.name, e.target.value)}
									/>
								</div>
							))}
				</div>
				<div className="flex justify-end mt-6">
					<Button
						onClick={onSubmit}
						className="bg-blue-500 text-white px-6 py-2 rounded-md hover:bg-blue-600 flex gap-2"
					>
						Send <FiSend />
					</Button>
					<Button
						onClick={closeSendModal}
						style={{ backgroundColor: '#DC2626' }}
						className="ml-4 bg-gray-300 text-white px-6 py-2 rounded-md hover:bg-gray-400"
					>
						Cancel
					</Button>
				</div>
			</Modal>

			<Modal
				open={isReportModal}
				onCancel={closeReportModal}
				footer={null}
				width={isMobile ? '100%' : "75%"}
				centered
				closable
				title="Form Report"
				className="customReportModal"
			>
				<hr />
				{renderReport()}
			</Modal>
		</div>
	);
};
