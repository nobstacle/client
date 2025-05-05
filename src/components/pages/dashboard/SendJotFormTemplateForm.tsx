import { yupResolver } from "@hookform/resolvers/yup";
import React, { useEffect, useState, useRef } from "react";
import { useForm } from "react-hook-form";
import * as yup from "yup";
import { useSocketContext } from "../../../context/SocketContextProvider";
import "../../../styles/base.css";
import { useSession } from "next-auth/react";
import axios from 'axios';
import { io, Socket } from "socket.io-client";
import { FaFileDownload, FaFileUpload, FaCopy, FaFilePdf, FaSearch, FaTrash } from "react-icons/fa";
import { LuListPlus } from "react-icons/lu";
import { toast, Bounce } from 'react-toastify';
import { BsFillSendPlusFill } from "react-icons/bs";
import { RiUploadCloudFill } from "react-icons/ri";
import { Table, Button, Pagination, Row, Col, Modal, Select, Tooltip } from 'antd';
import { FiSend } from "react-icons/fi";
import Swal from 'sweetalert2';
import { SendIcon } from "../../icons/SendIcon";
import { FaChartBar } from "react-icons/fa";

let Url = process.env.NEXT_PUBLIC_BACKEND_URL;
const SOCKET_URL = Url;

const socket: Socket = io(SOCKET_URL, {
	transports: ["websocket", "polling"],
	reconnection: true,
	reconnectionAttempts: 5,
	reconnectionDelay: 1000,
});

const schema = yup
	.object({
		url: yup.string().url("Invalid URL format"),
	})

interface ManualInputValues {
	[key: string]: string;
}

interface InputValues {
	[key: string]: string;
}

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
	const itemsPerPage = 8;
	const formRef = useRef<HTMLFormElement>(null);
	const [isIframeLoading, setIsIframeLoading] = useState(true);

	const handlePageChange = (pageNumber: number) => {
		setCurrentPage(pageNumber);
	};

	const openModal = () => setIsModalOpen(true);
	const closeModal = () => {
		setIsModalOpen(false);
		setManualInputValues({});
	}
	const closeSendModal = () => setIsSendModalOpen(false);

	// const closeDeleteModal = () => {
	// 	setIsDeleteModal(false);
	// 	SetRecordData(null);
	// }

	const closeReportModal = () => {
		setIsReportModal(false);
	}
	const handleSocketEvents = () => {
		// Handle successful connection
		socket.on("connect", () => {
			console.log("Connected to Socket.IO server:", socket.id);
		});

		// Handle disconnection
		socket.on("disconnect", (reason) => {
			console.warn("Disconnected from Socket.IO server:", reason);
		});

		// Handle connection errors
		socket.on("connect_error", (error) => {
			console.error("Socket.IO connection error:", error);
		});

		// Listen for custom events
		socket.on("dataSaved", (data) => {
			console.log("WebSocket Event Received:", data);
			if (data?.formId) {
				getTableResponse(data.formId, 1, 8, lastSearchedValue, selectedFilter);
			}
		});
	};

	useEffect(() => {
		handleSocketEvents();
		return () => {
			socket.off("connect");
			socket.off("disconnect");
			socket.off("connect_error");
			socket.off("dataSaved");
		};
	}, []);

	type AssignedForm = {
		id: number;
		form_id: string;
		form_name: string;
		assigned_companies: string[];
		createdAt: string;
		updatedAt: string;
	};

	const { data: userData } = useSession();
	const { emitSendJotForm } = useSocketContext();
	const params = new URLSearchParams(window.location.search);
	const companyData = { defaultLangCode: "en" };
	const [assignedForms, setAssignedForms] = useState<AssignedForm[]>([]);
	const [selectedForm, setSelectedForm] = useState<string | null>(null)
	const [inputValues, setInputValues] = useState<InputValues>({});
	const [isReportModal, setIsReportModal] = useState(false);
	const [tableResponse, setTableResponse] = useState<{ data: string | any[]; uniqueKeys?: [] } | null>(null);
	interface FormFields {
		content: any[];
	}

	useEffect(() => {
		if (selectedForm) {
			getTableResponse(selectedForm, currentPage, itemsPerPage, lastSearchedValue, selectedFilter);
		}
	}, [currentPage])

	interface TableComponentProps {
		tableData: any[];
		uniqueKeys: string[];
		currentPage: number;
		itemsPerPage: number;
		onPageChange: (pageNumber: number) => void;
		totalPages: number
		setCurrentPage: React.Dispatch<React.SetStateAction<number>>;
		selectedFormFields: any[];
		totalItems: number;
	}

	async function deleteWithPathParam(id) {
		const response = await fetch(Url + `/api/jotform/responses/${id}`, {
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
				let ID = data?.formData?.submission_id ? data?.formData?.submission_id : data?.formData?.form_id;
				try {
					await deleteWithPathParam(ID);
					toast.success('Record Deleted!');
					getTableResponse(selectedForm, currentPage, itemsPerPage, lastSearchedValue, selectedFilter);
				} catch (error) {
					console.error('Error deleting record:', error);
					setLoader(false);
				}
			}
		});
	}

	const TableComponent: React.FC<TableComponentProps> = ({
		tableData,
		uniqueKeys,
		currentPage,
		totalItems,
		totalPages,
		setCurrentPage,
		selectedFormFields
	}) => {
		const [downloadingPDF, setDownloadingPDF] = useState<number | null>(null);

		const handlePageChange = (page: number) => {
			setLoader(true);
			if (page > 0 && page <= totalPages) {
				setCurrentPage(page);
			}
		};

		// If no data is available
		if (!tableData || tableData.length === 0) {
			return (
				<div className="grid gap-4 w-100">
					{/* Your "No response available" SVG and message */}
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
				toast.success('PDF downloaded successfully!', {
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

		// Filtered and sorted form fields
		const listableFields = selectedFormFields !== undefined && Object.values(selectedFormFields).filter(field =>
			field.name.includes('listable')
		);

		const sortedListableFields = listableFields
			.filter(field =>
				uniqueKeys.some(key => key.toLowerCase() === field.name.toLowerCase())
			)
			.sort((a, b) => a.name.localeCompare(b.name));

		// const filteredKeys = sortedListableFields.map(field => field.text);

		const normalizeTableData = (data:any, labelFields:any) => {
			const fieldLabelMap = {}; 
			labelFields.forEach(field => {
				fieldLabelMap[field.name] = field.text;
			});

			return data.map(entry => {
				const normalized = {};
				for (let key in entry) {
					if (key === "formData") {
						normalized.formData = entry.formData;
						continue;
					}

					const mappedKey = fieldLabelMap[key] || key; 
					let value = entry[key];

					// Try parsing widget metadata
					try {
						if (typeof value === "string" && value.includes("widget_metadata")) {
							value = JSON.parse(value);
						}
					} catch (e) {
						console.warn("Invalid JSON for key:", key);
					}

					normalized[mappedKey] = value;
				}
				return normalized;
			});
		};

		const cleanTableData = normalizeTableData(tableData, listableFields);

		const handleUploadedSend = (data:any) => {
			const result = {};
		  
			listableFields.forEach((field) => {
			  const label = field.text;
			  const key = field.name;

			  if (data[label] !== undefined) {
				result[key] = data[label];
			  }
			});
		  
			const dynamicUrl = buildUrl(selectedForm, result);
			console.info("dynamicUrl",dynamicUrl)
			sendJotFormMessage(dynamicUrl);

			toast.success('Form sent successfully!', {
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
		  };  

		  const copyFormUrl = (data: any) => {
			let url = "";
		  
			if (data?.formData?.url !== null) {
			  url = data.formData.url;
			} else {
			  const result: Record<string, any> = {};
		  
			  listableFields.forEach((field) => {
				const label = field.text;
				const key = field.name;
		  
				if (data[label] !== undefined) {
				  result[key] = data[label];
				}
			  });
		  
			  url = buildUrl(selectedForm, result);
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
		  

		const columns = [
			...listableFields.map(field => ({
				title: field.text,
				dataIndex: field.text, 
				key: field.text,
				render: (text: any) => (
					<div className="max-w-[200px] overflow-hidden text-ellipsis whitespace-nowrap min-w-[160px]">
						{text || 'N/A'}
					</div>
				),
				ellipsis: true,
			})),
			{
				title: 'Action',
				key: 'action',
				fixed: 'right',
				render: (_: any, item: any, rowIndex: number) => (
					<div className="flex flex-wrap gap-2 justify-center items-center">
						<button
							title="Copy URL"
							onClick={() => copyFormUrl(item)}
							// onClick={() => {
							// 	navigator.clipboard.writeText(item?.formData?.url);
							// 	toast.success('URL copied to clipboard!', {
							// 		position: "bottom-right",
							// 		autoClose: 5000,
							// 		hideProgressBar: false,
							// 		closeOnClick: false,
							// 		pauseOnHover: true,
							// 		draggable: true,
							// 		progress: undefined,
							// 		theme: "colored",
							// 	});
							// }}
							className="text-white bg-green-700 hover:bg-green-800 focus:outline-none focus:ring-4 focus:ring-green-300 font-medium rounded-full text-sm px-2 py-2 text-center me-2 mb-2 dark:bg-green-600 dark:hover:bg-green-700 dark:focus:ring-green-800"
							style={{ background: '#008080' }}
						>
							<FaCopy size={18} />
						</button>

						{item?.formData?.submission_id ? (
							<div className="relative group">
								<button
									title="Download PDF Response"
									onClick={() =>
										handlePDFDownload(item?.formData?.form_id, item?.formData?.submission_id, rowIndex)
									}
									className="customSearchButton text-white hover:bg-blue-800 focus:outline-none focus:ring-4 focus:ring-blue-300 font-medium rounded-full text-sm px-2 py-2 text-center me-2 mb-2 dark:bg-blue-600 dark:hover:bg-blue-700 dark:focus:ring-blue-800"
									disabled={downloadingPDF === rowIndex}
								>
									{downloadingPDF === rowIndex ? (
										<svg
											className="animate-spin h-5 w-5"
											viewBox="0 0 24 24"
											fill="none"
										>
											<circle
												className="opacity-25"
												cx="12"
												cy="12"
												r="10"
												stroke="currentColor"
												strokeWidth="4"
											/>
											<path
												className="opacity-75"
												fill="currentColor"
												d="M4 12a8 8 0 018-8v8H4z"
											/>
										</svg>
									) : (
										<FaFilePdf size={18} />
									)}
								</button>
							</div>
						) : (
							<button
								title="Send Form"
								onClick={() => handleUploadedSend(item)}
								className="customSearchButton text-white hover:bg-blue-800 focus:outline-none focus:ring-4 focus:ring-blue-300 font-medium rounded-full text-sm px-2 py-2 text-center me-2 mb-2 dark:bg-blue-600 dark:hover:bg-blue-700 dark:focus:ring-blue-800"
							>
								<FiSend size={18} />
							</button>
						)}

						<button onClick={() => deleteRecord(item)} className="text-white bg-red-700 hover:bg-red-800 focus:outline-none focus:ring-4 focus:ring-red-300 font-medium rounded-full text-sm px-2 py-2 text-center me-2 mb-2 dark:bg-red-600 dark:hover:bg-red-700 dark:focus:ring-red-900">
							<FaTrash size={18} />
						</button>
					</div>
				),
			},
		];

		const calculatedTotalPages = Math.ceil(totalItems / 10);

		return (
			<div className="p-4 bg-white shadow-md rounded-lg customTableWrapper overflow-x-auto">
				<Table
					columns={columns}
					dataSource={cleanTableData}
					rowKey={(record, index) => record?.formData?.submission_id || index}
					pagination={false}
					scroll={{ x: 'max-content', y: 400 }}
					sticky
					className="jotFormTable"
				/>
				{/* Pagination Component */}
				<div className="flex justify-center mt-6">
					<Pagination
						current={currentPage}
						total={totalItems}
						pageSize={8}
						onChange={handlePageChange}
						pageCount={calculatedTotalPages}
					/>
				</div>
			</div>
		);
	};

	const handleChange = (name: string, value: any) => {
		setInputValues((prev: any) => ({
			...prev,
			[name]: value,
		}));
	};

	useEffect(() => {
		socket.on("connect", () => {
			console.log("Connected to Socket.IO server");
		});

		socket.on("dataSaved", (data) => {
			if (data?.formId) {
				getTableResponse(data.formId, 1, 8, lastSearchedValue, selectedFilter);
			}
		});

		return () => {
			socket.off("dataSaved");
		};
	}, []);

	interface FormFields {
		content: any[];
	}
	const [selectedFormFields, setSelectedFormFields] = useState<FormFields | null>(null);

	const getAssignedFormByID = async (company_id: number) => {
		const API_URL = Url + `/api/assigned-form/${company_id}`;

		try {
			const response = await axios.get(API_URL);
			if (response.status === 200) {
				setAssignedForms(response?.data);
				if (selectedForm === null) {
					setSelectedForm(response?.data[0]?.form_id || null)
				}
			} else {
				console.error('Unexpected response status:', response.status);
			}
		} catch (error) {
			console.error('Error fetching assigned form data:', error);
		}
	}

	const fetchFormQuestions = async (form_id: string | null) => {
		if (!form_id) return;
		try {
			const API_KEY = process.env.NEXT_PUBLIC_JOTFORM_API_KEY;
			const response = await fetch(
				`https://api.jotform.com/form/${form_id}/questions?apiKey=${API_KEY}`
			);
			if (!response.ok) {
				throw new Error(`HTTP error! Status: ${response.status}`);
			}

			const data = await response.json();
			setSelectedFormFields(data || { content: [] });
		} catch (error: any) {
			console.error({ error });
			setSelectedFormFields({ content: [] });
		}
	};


	useEffect(() => {
		if (selectedForm) {
			fetchFormQuestions(selectedForm);
		}
	}, [selectedForm]);

	useEffect(() => {
		if (selectedForm) {
			getTableResponse(selectedForm || null, 1, 8, lastSearchedValue, selectedFilter);
		}
	}, [selectedForm]);

	useEffect(() => {
		if (userData?.user?.id) {
			getAssignedFormByID(userData?.user?.companyId)
		}
	}, [userData])

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

	const sendJotFormMessage = (content: string) => {
		emitSendJotForm(
			{
				refId: 1,
				langCode: params.get("lang") || companyData?.defaultLangCode || "en",
				refType: "TextTemplateMessage",
				station: Number(params.get("station") ?? 1),
				directContent: content,
			},
			(response) => {
				alert(response?.success ? "JotForm message sent successfully!" : "Failed to send JotForm message.");
			}
		);
	};

	const buildUrl = (formId: string, inputValues: any) => {
		const BASE_URL = `https://form.jotform.com/${formId}`;
		for (const [key, value] of Object.entries(inputValues)) {
			if (typeof value === 'string') {
				params.append(key, value);
			}
		}
		return `${BASE_URL}?${params.toString()}`;
	};

	const getTableResponse = async (form_id: string | null, page: number, limit: number = 8, search: any = "", filter: string) => {
		let API_URL = Url + `/api/jotform/responses/${form_id}?page=${page}&limit=${limit}`;
		if (search && (typeof search === 'string' ? search !== "" : search.length > 0)) {
			let searchArray = search;

			if (typeof search === 'string') {
				searchArray = [{ label: "", value: search }];
			}

			else if (!Array.isArray(search) && typeof search === 'object') {
				searchArray = [search];
			}

			const encodedSearch = encodeURIComponent(JSON.stringify(searchArray));
			API_URL += `&search=${encodedSearch}`;
		}
		if (filter) {
			API_URL += `&filter=${filter}`;
		}

		try {
			const response = await axios.get(API_URL);

			if (response.status === 200) {
				const data = response.data.items ? response.data.items : response.data;
				setTotalPages(response.data.totalPages);
				setTotalItems(response?.data?.totalItems);

				if (data && data.length > 0) {
					const tableData = data.map((item: any) => {
						let prettyData: Record<string, any> = {};

						if (item.submissionId === null) {
							const parsedData = JSON.parse(item.data);
							prettyData = Object.entries(parsedData).reduce((acc: any, [key, value]: [string, any]) => {
								acc[key.trim()] = String(value).trim();
								return acc;
							}, {});
						} else {
							// Handle JotForm data with "pretty" format
							const parsedData = JSON.parse(item.data);

							if (parsedData.pretty) {
								const pairs = parsedData.pretty.split(', ');
								pairs.forEach((pair: string) => {
									const separatorIndex = pair.indexOf(':');
									if (separatorIndex > 0) {
										const key = pair.substring(0, separatorIndex).trim();
										const value = pair.substring(separatorIndex + 1).trim();
										prettyData[key] = value;
									}
								});
							} else {
								// If no pretty format, use the parsed data directly
								prettyData = { ...parsedData };
							}
						}

						// Add form metadata
						prettyData.formData = {
							submission_id: item?.submissionId,
							form_id: item?.formId,
							url: item?.normalUrl,
						};

						return prettyData;
					});

					let sortColumns = response.data.allFieldNames.sort((a, b) => {
						return a.localeCompare(b);
					});

					setTableResponse({ data: tableData, sortColumns });
					setLoader(false);
				} else {
					setTableResponse({ data: [], uniqueKeys: [] });
					setLoader(false);
				}
			} else {
				setTableResponse({ data: [], uniqueKeys: [] });
				setLoader(false);
				console.error('Unexpected response status:', response.status);
			}
		} catch (error: any) {
			setTableResponse({ data: [], uniqueKeys: [] });
			setLoader(false);
			console.error('Error fetching form data:', error);
		}
	};

	const handleFormChange = (value: string) => {
		setLoader(true);
		setValue("url", value);
		setSelectedForm(value);
		setCurrentPage(1);
		getTableResponse(value || null, 1, 8, lastSearchedValue, selectedFilter);
	};

	async function onSubmit(event: React.MouseEvent<HTMLButtonElement, MouseEvent>) {
		event.preventDefault();

		if (!selectedForm) {
			toast.error("Please select a form before submitting.");
			return;
		}

		const dynamicUrl = buildUrl(selectedForm, manualInputValues);
		sendJotFormMessage(dynamicUrl);

		toast.success('Form sent successfully!', {
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

	const handleManualInputChange = (text: string, value: string) => {
		setManualInputValues((prev) => ({
			...prev,
			[text]: value,
		}));
	};

	const handleManualUpload = async () => {
		const formData = {
			formId: selectedForm,
			data: manualInputValues
		};

		const uploadURL = Url + `/api/jotform/upload/${selectedForm || ""}`;

		try {
			const response = await axios.post(uploadURL, formData, {
				headers: {
					'Content-Type': 'application/json'
				}
			});

			getTableResponse(selectedForm || null, 1, 8, lastSearchedValue, selectedFilter);

			if (response.status === 201) {
				toast.success('Response uploaded successfully!', {
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
				setManualInputValues({});
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
		closeModal();
	};

	// const handleBulkUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
	// 	if (!e.target.files || e.target.files.length === 0) {
	// 		console.error("No file selected");
	// 		return;
	// 	}

	// 	const file = e.target.files[0];
	// 	const API_URL = Url + `/api/jotform/upload/${selectedForm || ""}`;

	// 	const formData = new FormData();
	// 	formData.append("formId", selectedForm || "");
	// 	formData.append("data", file);

	// 	try {
	// 		const response = await axios.post(API_URL, formData, {
	// 			headers: {
	// 				"Content-Type": "multipart/form-data",
	// 			},
	// 		});
	// 		setCurrentPage(1)
	// 		getTableResponse(selectedForm || null, 1, 5, lastSearchedValue, selectedFilter);

	// 		if (response.status === 201) {
	// 			toast.success('Response uploaded successsfully!', {
	// 				position: "bottom-right",
	// 				autoClose: 5000,
	// 				hideProgressBar: false,
	// 				closeOnClick: false,
	// 				pauseOnHover: true,
	// 				draggable: true,
	// 				progress: undefined,
	// 				theme: "colored",
	// 				transition: Bounce,
	// 			});
	// 		} else {
	// 			toast.error('Unable to upload response.', {
	// 				position: "bottom-right",
	// 				autoClose: 5000,
	// 				hideProgressBar: false,
	// 				closeOnClick: false,
	// 				pauseOnHover: true,
	// 				draggable: true,
	// 				progress: undefined,
	// 				theme: "colored",
	// 				transition: Bounce,
	// 			});
	// 		}
	// 	} catch (error) {
	// 		toast.error('Unable to upload response.', {
	// 			position: "bottom-right",
	// 			autoClose: 5000,
	// 			hideProgressBar: false,
	// 			closeOnClick: false,
	// 			pauseOnHover: true,
	// 			draggable: true,
	// 			progress: undefined,
	// 			theme: "colored",
	// 			transition: Bounce,
	// 		});
	// 	}
	// };

	const onSearchSubmit = (e: React.FormEvent<HTMLFormElement>) => {
		setLoader(true);
		e.preventDefault();

		const formData = new FormData(e.currentTarget);
		const searchValues = Object.fromEntries(formData.entries());

		const searchParams = Object.entries(searchValues)
			.filter(([_, value]) => value !== "")
			.map(([label, value]) => `{label:${label},value:${value}}`)
			.join(',');
		let finalSearch = "";

		if (searchParams !== "") {
			finalSearch = `${searchParams}`
		}

		setCurrentPage(1);
		setLastSearchedValue(finalSearch);
		getTableResponse(selectedForm, 1, 8, finalSearch, selectedFilter)
	};

	const handleSampleCSVDownload = () => {
		if (
			selectedFormFields?.content &&
			Object.keys(selectedFormFields.content).length > 0
		) {
			const fields = Object.values(selectedFormFields.content)
				.filter((item: any) => item?.name?.includes("prefillable"))
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
		setLoader(true);
		let filterData = [];

		if (value === 'completed') {
			filterData = tableResponse.data?.filter(item => item.formData["submission_id"] !== null);
		} else if (value === 'pending') {
			filterData = tableResponse.data?.filter(item => item.formData["submission_id"] === null);
		} else {
			filterData = tableResponse.data || [];
		}

		setSelectedFilter(value);
		setCurrentPage(1);
		setTableKey((prev) => prev + 1);
		getTableResponse(selectedForm || null, 1, 8, lastSearchedValue, value);
	};

	const handleFileClick = () => {
		const fileInput = document.getElementById('file-upload') as HTMLInputElement;
		fileInput?.click();
	};

	const handleBulkUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
		if (!e.target.files || e.target.files.length === 0) {
			console.error("No file selected");
			return;
		}

		const file = e.target.files[0];
		const API_URL = `${Url}/api/jotform/upload/${selectedForm || ""}`;

		const formData = new FormData();
		formData.append("formId", selectedForm || "");
		formData.append("data", file);

		try {
			const response = await axios.post(API_URL, formData, {
				headers: {
					"Content-Type": "multipart/form-data",
				},
			});
			setCurrentPage(1);
			getTableResponse(selectedForm || null, 1, 8, lastSearchedValue, selectedFilter);

			if (response.status === 201) {
				toast.success('Response uploaded successfully!', {
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
			} else {
				toast.error('Unable to upload response.', {
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
		} catch (error) {
			toast.error('Unable to upload response.', {
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

	const openReportModel = () => {
		setIsReportModal(true);
	}

	const renderReport = () => {
		let findReportData = assignedForms?.find((item) => item?.form_id === selectedForm);
		let reportLink = findReportData?.report_link || null;
		let reportIdMatch = reportLink?.match(/data-id="(\d+)"/);
		let reportId = reportIdMatch ? reportIdMatch[1] : null;

		if (!reportId) {
			return <span>No report available for selected form.</span>;
		}

		return (
			<>
				{isIframeLoading && (
					<div style={{ textAlign: 'center', marginTop: '20px' }}>
						<div className="flex items-center justify-center py-10">
							<p className="text-gray-500 text-lg">Loading...</p>
						</div>
					</div>
				)}
				<iframe
					src={`https://www.jotform.com/report/${reportId}`}
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

	return (
		<div className="bg-gray-50 p-6 rounded-lg shadow-md w-full mx-auto">
			<div className="flex justify-between items-end mb-4">
				<div className="flex items-end gap-4" style={{ width: '100%', maxWidth: '30vw' }}>
					<Select
						className="w-full"
						onChange={handleFormChange}
						style={{ minWidth: '13.5vw' }}
						placeholder="Select Form"
						value={selectedForm}
					>
						{assignedForms.map((assignedForm) => (
							<Option key={assignedForm?.form_id} value={assignedForm?.form_id}>
								{assignedForm?.form_name}
							</Option>
						))}
					</Select>

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
				</div>
				<div>
					<Button
						className="flex items-center gap-2 w-full lg:w-auto rounded-md px-6 py-2 text-white transition customSearchButton customWidth"
						onClick={() => openReportModel()} >  <FaChartBar />
						<span>Report</span>
					</Button>
				</div>
			</div>

			<form ref={formRef} onSubmit={onSearchSubmit}>
				{selectedFormFields?.content && Object.keys(selectedFormFields.content).length > 0 && (
					<div className="w-full p-4 bg-white rounded-lg shadow-md">
						<div className="grid grid-cols-12 gap-4 items-end">
							<div className="col-span-12 lg:col-span-10 space-y-4">
								<div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-2">
									{Object.values(selectedFormFields.content)
										.filter((item) => item?.name?.includes("search"))
										.sort((a, b) => {
											const nameA = a.name.toLowerCase();
											const nameB = b.name.toLowerCase();
											if (nameA < nameB) return -1;
											if (nameA > nameB) return 1;
											return 0;
										})
										.map((item) => (
											<input
												key={item.qid}
												name={item?.text}
												placeholder={item.text}
												type={item?.type || "text"}
												className="w-full rounded-md border border-gray-300 p-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
											/>
										))}
								</div>
							</div>

							{selectedForm &&
								Object.values(selectedFormFields.content).some((item) => item?.name?.includes("search")) && (
									<div className="col-span-12 lg:col-span-2 flex justify-end">
										<Button
											className="flex items-center gap-2 w-full lg:w-auto rounded-md px-6 py-2 text-white transition customSearchButton customWidth"
											htmlType="submit"
										>
											<FaSearch />
											<span>Search</span>
										</Button>
									</div>
								)}
						</div>
					</div>
				)}
			</form>

			{tableResponse && selectedFormFields?.content ? (
				<div className="card mt-5 bg-white rounded">
					<div className="flex flex-wrap items-center gap-4 tableDataWrapper" style={{ padding: '0.5rem 1rem 0 1rem' }}>
						<div className="formFilters">
							{["all", "completed", "pending"].map((status) => (
								<label
									key={status}
									htmlFor={status}
									className="inline-flex items-center space-x-2 px-4 py-2 bg-gray-100 rounded-md cursor-pointer hover:bg-gray-200 transition"
								>
									<input
										id={status}
										name="status"
										type="checkbox"
										value={status}
										className="form-checkbox text-blue-600 focus:ring-0"
										onChange={(e) => handleFilterChange(status, e.target.checked)}
										checked={selectedFilter === status}
									/>
									<span className="capitalize text-gray-700 font-medium">{status}</span>
								</label>
							))}


						</div>
						<div className="formActions">
							{selectedForm && (
								<div className="flex items-end justify-end space-x-2" >
									<div className="flex items-start space-x-5">
										<Tooltip title="Download Sample CSV">
											<Button
												onClick={handleSampleCSVDownload}
												icon={<FaFileDownload size={20} color="#fff" />}
												style={{
													backgroundColor: '#3b5998',
													borderColor: '#3b5998',
												}}
												className="customWidth customSearchButton customTableButtons text-white hover:bg-blue-800 focus:outline-none focus:ring-4 focus:ring-blue-300 font-medium rounded-md text-sm px-4 py-2"
											>Sample</Button>
										</Tooltip>
										<Tooltip title="Upload File">
											<Button
												icon={<FaFileUpload size={20} color="#fff" />}
												style={{
													backgroundColor: '#3b5998',
													borderColor: '#3b5998',
												}}
												onClick={handleFileClick}
												className="customWidth customSearchButton customTableButtons text-white hover:bg-blue-800 focus:outline-none focus:ring-4 focus:ring-blue-300 font-medium rounded-md text-sm px-4 py-2"
											>Upload</Button>
										</Tooltip>
										<input
											id="file-upload"
											type="file"
											accept=".csv, .xlsx, .xls"
											onChange={handleBulkUpload}
											className="hidden"
										/>
									</div>
								</div>
							)}
						</div>

					</div>
					{loader ? (
						<div className="flex items-center justify-center py-10">
							<p className="text-gray-500 text-lg">Loading...</p>
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
						/>
					)}
				</div>
			) : null}

			<Modal
				open={isModalOpen}
				onCancel={closeModal}
				footer={null}
				width="60%"
				centered
				closable
				title="Prefill and Display OR Upload"
			>
				<hr />
				<div className="space-y-4 mt-4">
					<Row gutter={16}>
						{selectedFormFields?.content &&
							Object.values(selectedFormFields.content)
								.filter((item) => item?.name?.includes('prefillable'))
								.sort((a, b) => a.name.toLowerCase().localeCompare(b.name.toLowerCase()))
								.map((item) => (
									<Col md={12} xs={24} key={item.qid} className="mt-2">
										<div className="flex flex-col space-y-2">
											<label className="text-gray-700 font-medium">{item?.text}</label>
											<input
												type="text"
												className="border p-2 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
												value={manualInputValues[item.name] || ''}
												onChange={(e) => {
													handleManualInputChange(item.name, e.target.value);
												}}
											/>
										</div>
									</Col>
								))}
					</Row>
				</div>
				<div className="flex justify-end mt-6 customButtonWrapper">
					<Button
						onClick={handleManualUpload}
						className="customSearchButton text-white px-6 py-2 rounded-md flex gap-2"
					>
						Upload <RiUploadCloudFill size={25} />
					</Button>
					<Button
						onClick={onSubmit}
						className="customSearchButton ml-4 text-white px-6 py-2 rounded-md flex gap-2"
					>
						Send <FiSend />
					</Button>
					<Button
						onClick={closeModal}
						style={{ backgroundColor: '#DC2626' }}
						className="customRedButton ml-4  text-white px-6 py-2 rounded-md "
					>
						Cancel
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
				width="60%"
				centered
				closable
				title="Form Report"
			>
				<hr />
				{renderReport()}
			</Modal>
		</div>
	);
};
