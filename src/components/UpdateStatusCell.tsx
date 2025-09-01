// components/UpsellStatusCell.tsx
"use client";

import { Select, Tag, message } from "antd";
import { useState } from "react";
    let Url = process.env.NEXT_PUBLIC_BACKEND_URL;
    
const { Option } = Select;

export const UpsellStatusCell = ({ status, record, token, isAdmin, onStatusUpdated }) => {
  const [loading, setLoading] = useState(false);

  const handleChange = async (value: string) => {
    setLoading(true);
    try {
      const res = await fetch(Url + `/api/v1/uploads/approve-upsell/${record.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: value }),
      });

      if (!res.ok) throw new Error("Failed to update");

      message.success("Status updated successfully");
      onStatusUpdated?.(); // e.g. re-fetch the table
    } catch (error) {
      console.error(error);
      message.error("Failed to update status");
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case "approved":
        return "green";
      case "pending":
        return "orange";
      case "rejected":
        return "red";
      case "cancelled":
        return "orange";
      default:
        return "default";
    }
  };

  return isAdmin === 'Admin' ? (
    <Select
      defaultValue={status}
      style={{ width: 120 }}
      onChange={handleChange}
      loading={loading}
    >
      <Option value="PENDING">PENDING</Option>
      <Option value="APPROVED">APPROVED</Option>
      <Option value="REJECTED">REJECTED</Option>
      <Option value="CANCELLED">CANCELLED</Option>
    </Select>
  ) : (
    <Tag color={getStatusColor(status)}>{status || "UNKNOWN"}</Tag>
  );
};
