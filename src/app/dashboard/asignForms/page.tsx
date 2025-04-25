"use client";
import React, { useEffect, useState } from "react";
import { useCompanyControllerGetAllCompanies } from "../../../lib/client/api";
import axios from 'axios';
import { useSession } from "next-auth/react";
import { saveFormData } from "./util";
import { FaTrash } from "react-icons/fa";
import Swal from 'sweetalert2'
import Select from 'react-select';
import "../../../styles/base.css";

let Url = process.env.NEXT_PUBLIC_BACKEND_URL;

const API_URL = process.env.NEXT_PUBLIC_API_URL || Url + '/api/assigned-form';

interface Company {
	id: number;
	name: string;
}

interface FormData {
	form_id: string;
	form_name: string;
	assigned_companies: string[];
	companies?: string[];
}

const AsignForms: React.FC = () => {
	const { data: userData } = useSession();
	const [assignedForms, setAssignedForms] = useState<FormData[]>([]);
	const { data: companies, error, isLoading } = useCompanyControllerGetAllCompanies();
	const [formData, setFormData] = useState<FormData>({
		form_id: "",
		form_name: "",
		assigned_companies: [],
	});

	const getAssignedFormData = async () => {
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
		if (userData?.user?.companyId) {
			getAssignedFormData();
		}
	}, [userData]);

	const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const { name, value } = e.target;
		setFormData((prev) => ({ ...prev, [name]: value }));
	};

	const handleSelectChange = (companyId: string) => {
		setFormData((prev) => {
			const isSelected = prev.assigned_companies.includes(companyId.toString());
			const newCompanies = isSelected
				? prev.assigned_companies.filter((id) => id.toString() !== companyId.toString())
				: [...prev.assigned_companies, companyId.toString()];
			return { ...prev, assigned_companies: newCompanies };
		});
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();

		if (!formData.form_id || !formData.form_name || formData.assigned_companies.length === 0) {
			alert("All fields are required");
			return;
		}

		const formDataObject = {
			form_id: formData.form_id,
			form_name: formData.form_name,
			assigned_companies: formData.assigned_companies,
		};

		try {
			const result = await saveFormData(formDataObject);
			console.log('Form data saved successfully:', result);
			getAssignedFormData(); // Refresh the assigned forms
			setFormData({ form_id: "", form_name: "", assigned_companies: [] }); // Reset form
		} catch (error) {
			alert('Failed to save form data');
		}
	};

	if (isLoading) {
		return <div className="text-center py-4">Loading...</div>;
	}

	if (error) {
		return <div className="text-center text-red-500 py-4">Error: {error.message}</div>;
	}

	const deleteForm = (form: any) => {
		Swal.fire({
			title: "Are you sure?",
			text: "You won't be able to revert this!",
			icon: "warning",
			showCancelButton: true,
			confirmButtonText: "Yes, delete it!",
			cancelButtonText: "Cancel",
			reverseButtons: true,
		}).then((result) => {
			if (result.isConfirmed) {
				Swal.fire({
					title: "Deleted!",
					text: "Form Deleted!",
					icon: "success",
					confirmButtonColor: "#2563eb"
				});
			}
		});
	};


	const companyOptions = companies.map((company) => ({
		value: company.id.toString(),
		label: company.name,
	}));

	const handleCompanyChange = (selectedOptions: any) => {
		const selectedIds = selectedOptions.map((option: any) => option.value);
		setFormData({ ...formData, assigned_companies: selectedIds });
	};


	return (
		<div className="mx-auto mt-6 p-6 bg-white shadow-lg rounded-lg">
			<h2 className="text-xl font-semibold text-gray-700 mb-4">Assign Forms</h2>
			<form onSubmit={handleSubmit} className="space-y-4">
				<div>
					<label className="block text-gray-600 mb-1">Form ID:</label>
					<input
						type="text"
						name="form_id"
						value={formData.form_id}
						onChange={handleChange}
						className="w-full p-2 border rounded-md focus:outline-none focus:ring focus:ring-blue-300"
						required
					/>
				</div>
				<div>
					<label className="block text-gray-600 mb-1">Form Name:</label>
					<input
						type="text"
						name="form_name"
						value={formData.form_name}
						onChange={handleChange}
						className="w-full p-2 border rounded-md focus:outline-none focus:ring focus:ring-blue-300"
						required
					/>
				</div>
				<div>
					<label className="block text-gray-600 mb-1">Select Companies:</label>
					<div className="w-full bg-white">
						<Select
							isMulti
							options={companyOptions}
							value={companyOptions.filter((option) =>
								formData.assigned_companies.includes(option.value)
							)}
							onChange={handleCompanyChange}
							className="react-select-container"
							classNamePrefix="react-select customReactSelect"
						/>
						{/* {companies?.map((company: Company) => (
							<div
								key={company.id}
								onClick={() => handleSelectChange(company.id.toString())}
								className={`flex items-center justify-between p-2 cursor-pointer rounded-md hover:bg-gray-200 ${formData.assigned_companies.includes(company.id.toString()) ? "bg-blue-100 font-semibold" : ""
									}`}
							>
								<span>{company.name}</span>
								{formData.assigned_companies.includes(company.id.toString()) && (
									<span className="text-blue-500 font-bold">✔</span>
								)}
							</div>
						))} */}
					</div>
				</div>
				<div className="flex justify-center items-center">
					<button style={{ maxWidth: "20%" }} type="submit" className="w-full bg-blue-500 text-white py-2 rounded-md hover:bg-blue-600 transition">
						Assign
					</button>
				</div>
			</form>

			{/* Table Displaying Assigned Forms */}
			{assignedForms.length > 0 && (
				<div className="mt-6">
					<h3 className="text-lg font-semibold mb-2">Assigned Forms</h3>
					<div className="overflow-x-auto">
						<table className="w-full border-collapse border border-gray-300">
							<thead>
								<tr className="bg-gray-100">
									<th className="border border-gray-300 px-4 py-2">Form ID</th>
									<th className="border border-gray-300 px-4 py-2">Form Name</th>
									<th className="border border-gray-300 px-4 py-2">Assigned Companies</th>
									<th className="border border-gray-300 px-4 py-2">Action</th>
								</tr>
							</thead>
							<tbody>
								{assignedForms.map((form, index) => (
									<tr key={form.form_id} className="text-center">
										<td className="border border-gray-300 px-4 py-2">{form.form_id}</td>
										<td className="border border-gray-300 px-4 py-2">{form.form_name}</td>
										<td className="border border-gray-300 px-4 py-2">
											{form.companies?.join(', ')}
										</td>
										<td className="border border-gray-300 px-4 py-2 text-center">
											<button
												onClick={() => deleteForm(form)}
												className="inline-flex items-center justify-center gap-2 text-red-600 hover:text-red-800 font-medium transition-colors"
											>
												<FaTrash className="text-red-500" />
											</button>
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				</div>
			)}
		</div>
	);
};

export default AsignForms;
