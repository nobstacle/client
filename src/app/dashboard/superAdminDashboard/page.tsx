"use client";

import React, { useState } from "react";

export default function SuperAdminDashboard() {
  const [filter, setFilter] = useState({ status: "all" });

  const data = [
    {
      key: "1",
      confirmation: "24512223",
      name: "Tugce",
      email: "gkckrks@gmail.com",
      phone: "971588784735",
      country: "United Arab Emirates",
      arrival: "19 February 2025",
      departure: "21 February 2025",
      rate: "320 AED",
    },
  ];

  return (
    <div className="p-6 bg-gray-100 min-h-screen">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-xl font-semibold">Super Admin Dashboard</h1>
        <button className="text-gray-600 hover:text-gray-800">⚙</button>
      </div>

      <div className="bg-white p-4 shadow rounded-md mb-6">
        <select
          defaultValue="Test Form"
          className="border p-2 rounded w-48"
        >
          <option value="test">Test Form</option>
        </select>

        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4 mt-4">
          <input type="text" placeholder="Confirmation" className="border p-2 rounded w-full" />
          <input type="text" placeholder="Name" className="border p-2 rounded w-full" />
          <input type="email" placeholder="Email" className="border p-2 rounded w-full" />
          <input type="text" placeholder="Phone Number" className="border p-2 rounded w-full" />
          <input type="text" placeholder="Country" className="border p-2 rounded w-full" />
          <input type="date" placeholder="Arrival Date" className="border p-2 rounded w-full" />
          <input type="date" placeholder="Departure Date" className="border p-2 rounded w-full" />
          <input type="text" placeholder="Daily Rate" className="border p-2 rounded w-full" />
        </div>

        <button className="mt-4 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700">Send</button>
      </div>

      <div className="bg-white p-4 shadow rounded-md mb-6 flex gap-4">
        {[
          { label: "All", value: "all" },
          { label: "Completed", value: "completed" },
          { label: "Pending", value: "pending" },
        ].map((option) => (
          <label key={option.value} className="flex items-center space-x-2">
            <input
              type="radio"
              name="status"
              value={option.value}
              checked={filter.status === option.value}
              onChange={() => setFilter({ status: option.value })}
            />
            <span>{option.label}</span>
          </label>
        ))}
      </div>

      <div className="bg-white p-4 shadow rounded-md overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-gray-200">
              <th className="p-2 border">Confirmation</th>
              <th className="p-2 border">Name</th>
              <th className="p-2 border">Email</th>
              <th className="p-2 border">Phone Number</th>
              <th className="p-2 border">Country</th>
              <th className="p-2 border">Arrival Date</th>
              <th className="p-2 border">Departure Date</th>
              <th className="p-2 border">Daily Rate</th>
              <th className="p-2 border">Actions</th>
            </tr>
          </thead>
          <tbody>
            {data.map((item, index) => (
              <tr key={index} className="border">
                <td className="p-2 border">{item.confirmation}</td>
                <td className="p-2 border">{item.name}</td>
                <td className="p-2 border">{item.email}</td>
                <td className="p-2 border">{item.phone}</td>
                <td className="p-2 border">{item.country}</td>
                <td className="p-2 border">{item.arrival}</td>
                <td className="p-2 border">{item.departure}</td>
                <td className="p-2 border">{item.rate}</td>
                <td className="p-2 border">
                  <button className="mr-2 p-2 text-blue-600">📤</button>
                  <button className="p-2 text-red-600">✈</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <button className="mt-6 bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700">
        Click to upload a file
      </button>
    </div>
  );
}