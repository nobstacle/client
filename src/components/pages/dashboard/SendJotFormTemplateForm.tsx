import { yupResolver } from "@hookform/resolvers/yup";
import React, { useEffect, useState, useRef } from "react";
import { useForm } from "react-hook-form";
import * as yup from "yup";
import { Button } from "../../Button";
import { SendIcon } from "../../icons/SendIcon";
import { useSocketContext } from "../../../context/SocketContextProvider";
import "../../../styles/base.css";
import { useSession } from "next-auth/react";
import axios from 'axios';
import { FormEvent } from 'react';
import { io, Socket } from "socket.io-client";
import Modal, { Styles } from 'react-modal';
import { FaFileDownload, FaFileUpload, FaCopy, FaFilePdf, FaSearch } from "react-icons/fa";
import { LuListPlus } from "react-icons/lu";
import { toast, Bounce } from 'react-toastify';
import { BsFillSendPlusFill } from "react-icons/bs";
import { RiUploadCloudFill } from "react-icons/ri";

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

interface TableComponentProps {
	tableData: any[];
	uniqueKeys: string[];
	currentPage: number;
	itemsPerPage: number;
	onPageChange: (pageNumber: number) => void;
	totalPages: number
	setCurrentPage: React.Dispatch<React.SetStateAction<number>>;
	selectedFormFields: any[];
}


const TableComponent: React.FC<TableComponentProps> = ({ tableData, uniqueKeys, currentPage, totalPages, setCurrentPage, selectedFormFields }) => {
	const [downloadingPDF, setDownloadingPDF] = useState<number | null>(null);

	const handlePageChange = (newPage: number) => {
		if (newPage > 0 && newPage <= totalPages) {
			setCurrentPage(newPage);
		}
	};

	if (!tableData || tableData.length === 0) {
		return (
			<div className="grid gap-4 w-100">
				<svg className="mx-auto" xmlns="http://www.w3.org/2000/svg" width="154" height="161" viewBox="0 0 154 161" fill="none">
					<path d="M0.0616455 84.4268C0.0616455 42.0213 34.435 7.83765 76.6507 7.83765C118.803 7.83765 153.224 42.0055 153.224 84.4268C153.224 102.42 147.026 118.974 136.622 132.034C122.282 150.138 100.367 161 76.6507 161C52.7759 161 30.9882 150.059 16.6633 132.034C6.25961 118.974 0.0616455 102.42 0.0616455 84.4268Z" fill="#EEF2FF" />
					<path d="M96.8189 0.632498L96.8189 0.632384L96.8083 0.630954C96.2034 0.549581 95.5931 0.5 94.9787 0.5H29.338C22.7112 0.5 17.3394 5.84455 17.3394 12.4473V142.715C17.3394 149.318 22.7112 154.662 29.338 154.662H123.948C130.591 154.662 135.946 149.317 135.946 142.715V38.9309C135.946 38.0244 135.847 37.1334 135.648 36.2586L135.648 36.2584C135.117 33.9309 133.874 31.7686 132.066 30.1333C132.066 30.1331 132.065 30.1329 132.065 30.1327L103.068 3.65203C103.068 3.6519 103.067 3.65177 103.067 3.65164C101.311 2.03526 99.1396 0.995552 96.8189 0.632498Z" fill="white" stroke="#E5E7EB" />
					<ellipse cx="80.0618" cy="81" rx="28.0342" ry="28.0342" fill="#EEF2FF" />
					<path d="M99.2393 61.3061L99.2391 61.3058C88.498 50.5808 71.1092 50.5804 60.3835 61.3061C49.6423 72.0316 49.6422 89.4361 60.3832 100.162C71.109 110.903 88.4982 110.903 99.2393 100.162C109.965 89.4363 109.965 72.0317 99.2393 61.3061ZM105.863 54.6832C120.249 69.0695 120.249 92.3985 105.863 106.785C91.4605 121.171 68.1468 121.171 53.7446 106.785C39.3582 92.3987 39.3582 69.0693 53.7446 54.683C68.1468 40.2965 91.4605 40.2966 105.863 54.6832Z" stroke="#E5E7EB" />
					<path d="M110.782 119.267L102.016 110.492C104.888 108.267 107.476 105.651 109.564 102.955L118.329 111.729L110.782 119.267Z" stroke="#E5E7EB" />
					<path d="M139.122 125.781L139.122 125.78L123.313 109.988C123.313 109.987 123.313 109.987 123.312 109.986C121.996 108.653 119.849 108.657 118.521 109.985L118.871 110.335L118.521 109.985L109.047 119.459C107.731 120.775 107.735 122.918 109.044 124.247L109.047 124.249L124.858 140.06C128.789 143.992 135.191 143.992 139.122 140.06C143.069 136.113 143.069 129.728 139.122 125.781Z" fill="#A5B4FC" stroke="#818CF8" />
					<path d="M83.185 87.2285C82.5387 87.2285 82.0027 86.6926 82.0027 86.0305C82.0027 83.3821 77.9987 83.3821 77.9987 86.0305C77.9987 86.6926 77.4627 87.2285 76.8006 87.2285C76.1543 87.2285 75.6183 86.6926 75.6183 86.0305C75.6183 80.2294 84.3831 80.2451 84.3831 86.0305C84.3831 86.6926 83.8471 87.2285 83.185 87.2285Z" fill="#4F46E5" />
					<path d="M93.3528 77.0926H88.403C87.7409 77.0926 87.2049 76.5567 87.2049 75.8946C87.2049 75.2483 87.7409 74.7123 88.403 74.7123H93.3528C94.0149 74.7123 94.5509 75.2483 94.5509 75.8946C94.5509 76.5567 94.0149 77.0926 93.3528 77.0926Z" fill="#4F46E5" />
					<path d="M71.5987 77.0925H66.6488C65.9867 77.0925 65.4507 76.5565 65.4507 75.8945C65.4507 75.2481 65.9867 74.7122 66.6488 74.7122H71.5987C72.245 74.7122 72.781 75.2481 72.781 75.8945C72.781 76.5565 72.245 77.0925 71.5987 77.0925Z" fill="#4F46E5" />
					<rect x="38.3522" y="21.5128" width="41.0256" height="2.73504" rx="1.36752" fill="#4F46E5" />
					<rect x="38.3522" y="133.65" width="54.7009" height="5.47009" rx="2.73504" fill="#A5B4FC" />
					<rect x="38.3522" y="29.7179" width="13.6752" height="2.73504" rx="1.36752" fill="#4F46E5" />
					<circle cx="56.13" cy="31.0854" r="1.36752" fill="#4F46E5" />
					<circle cx="61.6001" cy="31.0854" r="1.36752" fill="#4F46E5" />
					<circle cx="67.0702" cy="31.0854" r="1.36752" fill="#4F46E5" />
				</svg>
				<div>
					<h2 className="text-center text-black text-xl font-semibold leading-loose pb-2">There is no response available.</h2>
					<p className="text-center text-black text-base font-normal leading-relaxed pb-4">Please select form to see the responses.</p>
				</div>
			</div>
		);
	}

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
			toast.success('PDF downloaded successsfully!', {
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
			setDownloadingPDF(null);
		}, 2500);
	};

	const handleClick = (page: any) => {
		if (page >= 1 && page <= totalPages) {
			setCurrentPage(page);
		}
	};

	const renderPages = () => {
		const pages = [];
		for (let i = 1; i <= totalPages; i++) {
			pages.push(
				<li key={i}>
					<button
						onClick={() => handleClick(i)}
						className={`flex items-center justify-center px-4 h-10 leading-tight border border-blue-200 
                            ${currentPage === i
								? 'text-blue-900 bg-blue-50 hover:bg-blue-100 hover:text-blue-900 dark:bg-blue-900 dark:text-white'
								: 'text-blue-900 bg-white hover:bg-blue-100 hover:text-blue-900 dark:hover:bg-blue-900 dark:hover:text-white'}`}
					>
						{i}
					</button>
				</li>
			);
		}
		return pages;
	};
	const filteredKeys = uniqueKeys.filter(key => {
		console.warn({ selectedFormFields })
		const matchingField = Object.values(selectedFormFields).find((field: any) =>
			field.name.includes('listable') && field.text === key
		);
		return matchingField !== undefined;
	});

	return (
		<div className="mt-6 p-4 bg-white shadow-md rounded-lg customTableWrapper">
			<div className="w-full overflow-x-auto relative shadow-md sm:rounded-lg">
				<table className="min-w-[1000px] max-h-[500px] table-auto border-collapse border border-gray-300 customTable">
					<thead>
						<tr className="bg-gray-200 text-gray-700 text-left">
							{filteredKeys.map((key: string, index: number) => (
								<th key={index} className="border border-gray-300 px-4 py-4">{key}</th>
							))}
							<th className="border border-gray-300 px-4 py-2">Action</th>
						</tr>
					</thead>
					<tbody>
						{tableData.map((item: any, rowIndex: number) => (
							<tr key={rowIndex} className="text-center hover:bg-gray-100 transition-all">
								{filteredKeys.map((key: string, colIndex: number) => (
									<td key={colIndex} className="border border-gray-300 px-4 py-2 text-left table-content">
										{(item as any)[key] || 'N/A'}
									</td>
								))}
								<td className="border border-gray-300 p-3">
									<div className="button-wrapper">
										<Button
											title="Copy URL"
											onClick={() => {
												navigator.clipboard.writeText(item?.formData?.url);
												toast.success('URL coppied to clipboard!', {
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
											}}
											className="flex items-center justify-center text-white rounded-md hover:bg-red-600 transition-all w-24 mr-3"
											type="submit"
										>
											<span className="ml-2"><FaCopy size={20} /></span>
										</Button>

										{item?.formData?.submission_id ? (
											<div className="relative group">
												<button
													title="Download PDF Response"
													onClick={() =>
														handlePDFDownload(
															item?.formData?.form_id,
															item?.formData?.submission_id,
															rowIndex
														)
													}
													className="flex items-center justify-center bg-red-500 text-white rounded-md hover:bg-red-600 transition-all w-24"
													disabled={downloadingPDF === rowIndex}
												>
													{downloadingPDF === rowIndex ? (
														<svg
															className="animate-spin h-5 w-5 text-white"
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
														<FaFilePdf size={20} />
													)}
												</button>
												<div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 min-w-[140px] text-center text-white text-xs bg-black px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity
                                                    before:content-[''] before:absolute before:top-full before:left-1/2 before:-translate-x-1/2 before:border-8 before:border-transparent before:border-t-black">
													Download PDF
												</div>
											</div>
										) : (
											<div className="relative group">
												<Button
													title="Send Form"
													className="border-1 flex justify-center rounded-md border-black px-6 text-center text-white mt-5"
													type="submit"
												>
													<SendIcon />
												</Button>
												<div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 min-w-[100px] text-center text-white text-xs bg-black px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity
                                                    before:content-[''] before:absolute before:top-full before:left-1/2 before:-translate-x-1/2 before:border-8 before:border-transparent before:border-t-black">
													Send Form
												</div>
											</div>
										)}
									</div>
								</td>
							</tr>
						))}
					</tbody>
				</table>
			</div>
			<nav aria-label="Page navigation" className="flex justify-center mt-6">
				<ul className="inline-flex -space-x-px text-base h-10">
					<li onClick={() => handlePageChange(currentPage === 1 ? 1 : currentPage - 1)}>
						<a href="#" className="flex items-center justify-center px-4 h-10 ms-0 leading-tight text-gray-500 bg-white border border-e-0 border-gray-300 rounded-s-lg hover:bg-gray-100 hover:text-blue-900 dark:hover:bg-blue-900 dark:hover:text-white">Previous</a>
					</li>
					{renderPages()}
					<li onClick={() => handlePageChange(currentPage === totalPages ? totalPages : currentPage + 1)}>
						<a href="#" className="flex items-center justify-center px-4 h-10 leading-tight text-gray-500 bg-white border border-gray-300 rounded-e-lg hover:bg-gray-100 hover:text-gray-900 dark:hover:bg-blue-900 dark:hover:text-white">Next</a>
					</li>
				</ul>
			</nav>
		</div>
	);
};

const customStyles: Styles = {
	content: {
		top: "20%",
		left: "20%",
		right: "20%",
		bottom: "20%",
		marginRight: "auto",
		transform: "translate(-20%, -20%)",
		width: "60%",
		overflowY: "auto",
		borderRadius: "10px",
		padding: "20px",
		height: "80%",
		maxHeight: "90%",
	},
	overlay: {
		backgroundColor: 'rgba(0, 0, 0, 0.75)',
		zIndex: 1000,
		display: 'flex',
		alignItems: 'center',
		justifyContent: 'center'
	},
};

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
	const [searchQuery, setSearchQuery] = useState("");
	const [currentPage, setCurrentPage] = useState(1);
	const [totalPages, setTotalPages] = useState(0);
	const itemsPerPage = 5;
	const formRef = useRef<HTMLFormElement>(null);

	const handlePageChange = (pageNumber: number) => {
		setCurrentPage(pageNumber);
	};

	const openModal = () => setIsModalOpen(true);
	const openSendModal = () => setIsSendModalOpen(true);
	const closeModal = () => setIsModalOpen(false);
	const closeSendModal = () => setIsSendModalOpen(false);

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
				getTableResponse(data.formId, 1, 5, "");
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
	const [tableResponse, setTableResponse] = useState<{ data: string | any[]; uniqueKeys?: string[] } | null>(null);
	interface FormFields {
		content: any[];
	}

	useEffect(() => {
		if (selectedForm) {
			getTableResponse(selectedForm, currentPage, itemsPerPage);
		}
	}, [currentPage])

	useEffect(() => {
		if (assignedForms.length === 0) {
			setSelectedForm(assignedForms[0]?.form_id || null)
		} else {
			if (selectedForm === null) {
				setSelectedForm(assignedForms[0].form_id);
			}
		}
	}, [assignedForms])

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
				getTableResponse(data.formId, 1, 5, "");
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

	console.info("assignedFormsassignedForms", assignedForms);

	const getAssignedFormByID = async (company_id: number) => {
		const API_URL = Url + `/api/assigned-form/${company_id}`;

		try {
			const response = await axios.get(API_URL);
			if (response.status === 200) {
				setAssignedForms(response?.data)
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
		if(selectedForm){
			getTableResponse(selectedForm || null, 1, 5, "");
		}
	}, [searchQuery, selectedForm]);

	console.info({selectedForm})


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

	const getTableResponse = async (form_id: string | null, page: number, limit: number = 5, search: any = "") => {
		let API_URL =  Url +`/api/jotform/responses/${form_id}?page=${page}&limit=${limit}`;
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
		try {
			const response = await axios.get(API_URL);

			if (response.status === 200) {
				const data = response.data.items ? response.data.items : response.data;

				setTotalPages(response.data.totalPages);

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

					// Extract all unique keys across all objects
					const uniqueKeys: string[] = Array.from(
						new Set(tableData.flatMap((obj: any) => Object.keys(obj)))
					);

					setTableResponse({ data: tableData, uniqueKeys });
				} else {
					setTableResponse({ data: [], uniqueKeys: [] });
				}
			} else {
				setTableResponse({ data: [], uniqueKeys: [] });
				console.error('Unexpected response status:', response.status);
			}
		} catch (error: any) {
			setTableResponse({ data: [], uniqueKeys: [] });
			console.error('Error fetching form data:', error);
		}
	};



	const hanldeFormChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
		let value = (e.target as HTMLSelectElement).value;
		setValue("url", value);
		setSelectedForm(value);
		setCurrentPage(1)
		getTableResponse(value || null, 1, 5, "");
	}

	async function onSubmit(event: React.MouseEvent<HTMLButtonElement, MouseEvent>) {
		event.preventDefault();

		if (!selectedForm) {
			toast.error("Please select a form before submitting.");
			return;
		}

		const dynamicUrl = buildUrl(selectedForm, inputValues);
		sendJotFormMessage(dynamicUrl);
		reset();

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
	}


	const handleManualInputChange = (text: string, value: string) => {
		setManualInputValues((prev) => ({
			...prev,
			[text]: value,
		}));
	};

	const handleManualUpload = async (value: any) => {
		let formData = {
			formId: selectedForm,
			data: manualInputValues
		}
		const uploadURL =  Url + "/api/jotform/manual-upload";
		try {
			const response = await axios.post(uploadURL, formData);

			getTableResponse(selectedForm || null, 1, 5, "");

			if (response.status === 201) {
				toast.success('Response uploaded successsfully!', {
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
				console.error("Unexpected response status:", response.status);
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
			console.error("Error uploading file:", error);
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
		closeModal();
	};

	const handleBulkUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
		if (!e.target.files || e.target.files.length === 0) {
			console.error("No file selected");
			return;
		}

		const file = e.target.files[0];
		const API_URL =  Url + `/api/jotform/upload/${selectedForm || ""}`;

		const formData = new FormData();
		formData.append("formId", selectedForm || "");
		formData.append("data", file);

		try {
			const response = await axios.post(API_URL, formData, {
				headers: {
					"Content-Type": "multipart/form-data",
				},
			});
			setCurrentPage(1)
			getTableResponse(selectedForm || null, 1, 5, "");

			if (response.status === 201) {
				toast.success('Response uploaded successsfully!', {
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
				console.error("Unexpected response status:", response.status);
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
			console.error("Error uploading file:", error);
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

	const onSearchSubmit = (e: React.FormEvent<HTMLFormElement>) => {
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
		getTableResponse(selectedForm, 1, 5, finalSearch)
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

	const resetFilters = () => {
		getTableResponse(selectedForm, 1, 5, "");
		if (formRef.current) {
			formRef.current?.reset();
		}
	};

	return (
		<div className="bg-gray-50 p-6 rounded-lg shadow-md w-full mx-auto">
			<div className="flex justify-between items-end mb-4" style={{ paddingLeft: '0.6rem' }}>
				<div className="flex flex items-end gap-4" style={{ width: '100%', maxWidth: '30vw' }}>
					<select
						className="border p-3 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
						onChange={(e) => hanldeFormChange(e)}
					>
						{assignedForms.map((assignedForm) => (
							<option key={assignedForm?.form_id} value={assignedForm?.form_id}>{assignedForm?.form_name}</option>
						))}
					</select>
					<div className="relative group">
							<button onClick={() => openSendModal()}>
								<BsFillSendPlusFill size={25} color="#3b5998" />
							</button>
							<div className="absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 min-w-[120px] text-center px-2 py-1 bg-black text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity
      before:content-[''] before:absolute before:top-full before:left-1/2 before:-translate-x-1/2 before:border-8 before:border-transparent before:border-t-black">
								Send Form
							</div>
						</div>
				</div>
				{selectedForm && (<div className="flex items-end justify-end space-x-2" style={{ width: "30%" }}>
					<div className="flex items-start space-x-5">
						<div className="relative group">
							<button onClick={handleSampleCSVDownload}>
								<FaFileDownload size={25} color="#3b5998" />
							</button>
							<div className="absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 min-w-[120px] text-center px-2 py-1 bg-black text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity
      before:content-[''] before:absolute before:top-full before:left-1/2 before:-translate-x-1/2 before:border-8 before:border-transparent before:border-t-black">
								Download Sample CSV
							</div>
						</div>
						<div className="relative group cursor-pointer">
							<label htmlFor="file-upload" style={{ cursor: "pointer" }}>
								<FaFileUpload size={25} color="#3b5998" />
							</label>
							<input
								id="file-upload"
								type="file"
								accept=".csv, .xlsx, .xls"
								onChange={handleBulkUpload}
								className="hidden"
							/>
							<div className="absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 min-w-[120px] text-center px-2 py-1 bg-black text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity
      before:content-[''] before:absolute before:top-full before:left-1/2 before:-translate-x-1/2 before:border-8 before:border-transparent before:border-t-black">
								Upload File
							</div>
						</div>
						<div className="relative group">
							<button onClick={() => openModal()}>
								<LuListPlus size={25} color="#3b5998" />
							</button>
							<div className="absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 min-w-[120px] text-center px-2 py-1 bg-black text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity
      before:content-[''] before:absolute before:top-full before:left-1/2 before:-translate-x-1/2 before:border-8 before:border-transparent before:border-t-black">
								Add New Response (Manually)
							</div>
						</div>
					</div>


				</div>)}
			</div>

			<form ref={formRef} onSubmit={onSearchSubmit}>
				<div className="flex w-full items-end justify-between gap-3">
					<div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-4 gap-1">
						{selectedFormFields?.content &&
							Object.keys(selectedFormFields.content).length > 0 && (
								<>
									{Object.values(selectedFormFields.content)
										.filter((item) => item?.name?.includes("search"))
										.map((item) => (
											<div key={item.qid} className="p-2">
												<input
													name={item?.text}
													placeholder={item.text}
													type={item?.type || "text"}
													className="w-full rounded-md border-2 p-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
												/>
											</div>
										))}
								</>
							)}
					</div>

					{selectedForm &&
						selectedFormFields?.content &&
						Object?.values(selectedFormFields?.content).filter((item) =>
							item?.name?.includes("search")
						)?.length > 0 && (
							<>
								<div className="buttonsWrapperSection">
									<div className="left">
										<Button
											className="border-1 flex justify-center rounded-md border-black p-2 px-6 text-center text-white items-center bg-blue-600 hover:bg-blue-700"
											type="submit"
										>
											<FaSearch /> <span className="ml-2">Search</span>
										</Button>
									</div>
									{/* <div className="right">
										<Button
											type="button"
											className="border-1 flex justify-center rounded-md border-black p-2 px-6 text-center text-white items-center bg-blue-600 hover:bg-blue-700"
											onClick={() => resetFilters()}
										>
											Reset
										</Button>
									</div> */}
								</div>
							</>
						)}
				</div>
			</form>

			<div className="flex space-x-4 flex justify-start align-center mb-5" style={{ marginTop: "1.3rem" }}>
				<div className="mr-3">
					<input
						id="all"
						name="status"
						type="radio"
						value="all"
						className="me-2"
					/>
					<label htmlFor="all" className="text-gray-700 font-medium">All</label>
				</div>
				<div className="mr-3">
					<input
						id="completed"
						name="status"
						type="radio"
						value="completed"
						className="me-2"
					/>
					<label htmlFor="completed" className="text-gray-700 font-medium">Completed</label>
				</div>
				<div>
					<input
						id="pending"
						name="status"
						type="radio"
						value="pending"
						className="me-2"
					/>
					<label htmlFor="pending" className="text-gray-700 font-medium">Pending</label>
				</div>
			</div>


			{tableResponse && selectedFormFields?.content ? (

				<>
					<TableComponent
						tableData={Array.isArray(tableResponse.data) ? tableResponse.data : []}
						uniqueKeys={Array.isArray(tableResponse.uniqueKeys) ? tableResponse.uniqueKeys : []}
						currentPage={currentPage}
						itemsPerPage={itemsPerPage}
						onPageChange={handlePageChange}
						totalPages={totalPages}
						setCurrentPage={setCurrentPage}
						selectedFormFields={Array.isArray(selectedFormFields?.content) ? selectedFormFields.content : []}
					/>

				</>

			) : <></>}

			<Modal
				isOpen={isModalOpen}
				onRequestClose={closeModal}
				style={customStyles}
				contentLabel="Manual Upload Modal"
				ariaHideApp={false}
			>
				<div className="fixed top-0 left-0 w-full h-full bg-opacity-50 z-40">
					<div className="relative" style={{ padding: '2rem' }}>
						<h2 className="text-lg font-bold mb-4">Manual Upload</h2>
						<hr />
						<div className="space-y-4 mt-4">
							{selectedFormFields?.content &&
								Object.values(selectedFormFields.content)
									.filter(
										(item) => item?.name?.includes("prefillable"))
									.map((item) => (
										<div key={item.qid} className="flex flex-col space-y-2">
											<label className="text-gray-700 font-medium">
												{item?.text}
											</label>
											<input
												type="text"
												className="border p-2 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
												value={manualInputValues[item.text] || ""}
												onChange={(e) =>
													handleManualInputChange(
														item.text,
														e.target.value
													)
												}
											/>
										</div>
									))}
						</div>
						<div className="flex justify-end mt-6">
							<Button
								onClick={handleManualUpload}
								className="bg-blue-500 text-white px-6 py-2 rounded-md hover:bg-blue-600 flex gap-2"
							>
								Upload <RiUploadCloudFill size={25} />
							</Button>
							<Button
								onClick={closeModal}
								style={{ backgroundColor: "#DC2626" }}
								className="ml-4 bg-gray-300 text-white px-6 py-2 rounded-md hover:bg-gray-400"
							>
								Cancel
							</Button>
						</div>
					</div>
				</div>
			</Modal>

			<Modal
				isOpen={isSendModalOpen}
				onRequestClose={closeSendModal}
				style={customStyles}
				contentLabel="Send Form"
				ariaHideApp={false}
			>
				<div className="fixed top-0 left-0 w-full h-full bg-opacity-50 z-40">
					<div className="relative" style={{ padding: '2rem' }}>
						<h2 className="text-lg font-bold mb-4">Send Form</h2>
						<hr />
						<div className="space-y-4 mt-4">
							{selectedFormFields?.content &&
								Object.values(selectedFormFields.content)
									.filter(
										(item) => item?.name?.includes("prefillable"))
									.map((item) => (
										<div key={item.qid} className="flex flex-col space-y-2">
											<label className="text-gray-700 font-medium">
												{item?.text}
											</label>
											<input
												type="text"
												className="border p-2 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
												value={inputValues[item.name] || ""}
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
								Send <SendIcon />
							</Button>
							<Button
								onClick={closeSendModal}
								style={{ backgroundColor: "#DC2626" }}
								className="ml-4 bg-gray-300 text-white px-6 py-2 rounded-md hover:bg-gray-400"
							>
								Cancel
							</Button>
						</div>
					</div>
				</div>
			</Modal>

		</div>
	);
};
