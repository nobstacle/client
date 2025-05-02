"use client";
import React, { useEffect, useState } from "react";
import { useCompanyControllerGetAllCompanies } from "../../../lib/client/api";
import axios from 'axios';
import { useSession } from "next-auth/react";
import { saveFormData } from "./util";
import { FaTrash } from "react-icons/fa";
import Swal from 'sweetalert2';
import "../../../styles/base.css";
import { Table, Button, Card, Row, Col, Input, Select, Form } from 'antd';
import 'sweetalert2/dist/sweetalert2.min.css';

let Url = process.env.NEXT_PUBLIC_BACKEND_URL;
const API_URL = process.env.NEXT_PUBLIC_API_URL || Url + '/api/assigned-form';

interface FormData {
	form_id: string;
	form_name: string;
	assigned_companies: string[];
	companies?: string[];
	report_link?: string;
}

const AsignForms: React.FC = () => {
	const [assignedForms, setAssignedForms] = useState<FormData[]>([]);
	const { data: companies, error, isLoading } = useCompanyControllerGetAllCompanies();
	const { data: userData } = useSession();

	const [formData, setFormData] = useState<FormData>({
		form_id: "",
		form_name: "",
		assigned_companies: [],
		report_link: ""
	});

	const [form] = Form.useForm(); // Ant Design's form instance

	const getAssignedFormData = async () => {
		if (!companies) return;
		try {
			const response = await axios.get(API_URL);
			if (response.status === 200) {
				const formsWithCompanies = response.data.map((form: FormData) => ({
					...form,
					companies: form.assigned_companies.map(companyId => {
						const company = companies?.find(c => c.id.toString() === companyId.toString());
						return company ? company.name : null;
					}).filter((name): name is string => name !== null),
				}));
				setAssignedForms(formsWithCompanies);
			} else {
				console.error('Unexpected response status:', response.status);
			}
		} catch (error) {
			console.error('Error fetching assigned form data:', error);
		}
	};

	useEffect(() => {
		if (userData?.user?.companyId && companies !== undefined) {
			getAssignedFormData();
		}
	}, [userData, companies]);

	const handleSubmit = async (values: any) => {
		const { form_id, form_name, assigned_companies, report_link } = values;
		if (!form_id || !form_name || assigned_companies.length === 0) {
			alert("All fields are required");
			return;
		}

		const formDataObject = {
			form_id,
			form_name,
			assigned_companies,
			report_link
		};

		try {
			const result = await saveFormData(formDataObject);
			console.log('Form data saved successfully:', result);
			getAssignedFormData();
			form.resetFields(); // Reset the form
			setFormData({ form_id: "", form_name: "", assigned_companies: [], report_link: "" }); // Clear the formData state as well
		} catch (error) {
			alert('Failed to save form data');
		}
	};

	const companyOptions = companies.map((company) => ({
		value: company.id.toString(),
		label: company.name,
	}));

	const handleCompanyChange = (selectedOptions: string[]) => {
		setFormData({ ...formData, assigned_companies: selectedOptions });
	};

	const deleteForm = (data: any) => {
		Swal.fire({
			title: "Are you sure?",
			text: "You won't be able to revert this!",
			icon: "warning",
			showCancelButton: true,
			confirmButtonText: "Delete",
			cancelButtonText: "Cancel",
			reverseButtons: false,
		}).then(async (result) => {
			if (result.isConfirmed) {
				const formData = {
					formId: data.form_id,
					companyId: data.assigned_companies,
				};
				try {
					const response = await deleteWithBody(formData);
					if (response.ok) {
						Swal.fire("Deleted!", "Form has been successfully deleted.", "success");
						getAssignedFormData();
					} else {
						const errorResponse = await response.json();
						Swal.fire("Error!", errorResponse.message || "An error occurred while deleting the form.", "error");
					}
				} catch (error) {
					Swal.fire("Error!", "There was an error while deleting the form.", "error");
				}
			}
		});
	};

	async function deleteWithBody(formData: any) {
		const response = await fetch(Url + '/api/jotform/delete-assigned-form', {
			method: 'DELETE',
			headers: {
				'Content-Type': 'application/json',
			},
			body: JSON.stringify(formData),
		});
		return response;
	}

	const columns = [
		{
			title: 'Form ID',
			dataIndex: 'form_id',
			key: 'form_id',
			align: 'center',
		},
		{
			title: 'Form Name',
			dataIndex: 'form_name',
			key: 'form_name',
			align: 'center',
		},
		{
			title: 'Assigned Companies',
			dataIndex: 'companies',
			key: 'companies',
			render: (companies) => companies?.join(', '),
			align: 'center',
		},
		{
			title: 'Action',
			key: 'action',
			render: (text, record) => (
				<button onClick={() => deleteForm(record)} className="text-white bg-red-700 hover:bg-red-800 focus:outline-none focus:ring-4 focus:ring-red-300 font-medium rounded-full text-sm px-2 py-2 text-center me-2 mb-2 dark:bg-red-600 dark:hover:bg-red-700 dark:focus:ring-red-900">
					<FaTrash size={18} />
				</button>
			),
			align: 'center',
		},
	];

	if (isLoading || !companies) {
		return <div className="text-center py-4">Loading...</div>;
	}

	if (error) {
		return <div className="text-center text-red-500 py-4">Error: {error.message}</div>;
	}

	return (
		<div className="mx-auto mt-2 p-6 bg-white shadow-lg rounded-lg">
			<Card className="p-2 mb-6">
				<h2 className="text-xl font-semibold text-gray-700 mb-4">Assign Forms</h2>
				<hr />
				<div className="mt-4">
					<Form
						form={form}
						onFinish={handleSubmit}
						initialValues={{
							form_id: formData.form_id,
							form_name: formData.form_name,
							assigned_companies: formData.assigned_companies,
							report_link: formData.report_link,
						}}
						layout="vertical"
					>
						<Row gutter={16}>
							<Col md={12} xs={24}>
								<Form.Item label="Form ID" name="form_id" rules={[{ required: true, message: "Form ID is required" }]}>
									<Input />
								</Form.Item>
							</Col>
							<Col md={12} xs={24}>
								<Form.Item label="Form Name" name="form_name" rules={[{ required: true, message: "Form Name is required" }]}>
									<Input />
								</Form.Item>
							</Col>
						</Row>

						<Row gutter={16}>
							<Col md={12} xs={24}>
								<Form.Item label="Assigned Companies" name="assigned_companies" rules={[{ required: true, message: "Please select companies" }]}>
									<Select
										mode="multiple"
										placeholder="Select companies"
										onChange={handleCompanyChange}
										value={formData.assigned_companies}
										options={companyOptions}
									/>
								</Form.Item>
							</Col>
							<Col md={12} xs={24}>
								<Form.Item label="Report Graphs" name="report_link">
									<Input placeholder="Enter report URL here" />
								</Form.Item>
							</Col>
						</Row>

						<div className="flex justify-center items-center">
							<Form.Item className="mb-0">
								<Button type="primary" htmlType="submit" className="customSearchButton text-white py-3 rounded-md transition" style={{ background: '#3b5998' }}>
									Assign
								</Button>
							</Form.Item>
						</div>
					</Form>
				</div>
			</Card>

			<div className="mt-4">
				<Table
					columns={columns}
					dataSource={assignedForms}
					rowKey="form_id"
					pagination={{ pageSize: 8 }}
					className="superAdminTable"
				/>
			</div>
		</div>
	);
};

export default AsignForms;
