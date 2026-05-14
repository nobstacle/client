"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Button,
  Card,
  Form,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Select,
  Space,
  Switch,
  Table,
  Tag,
  Typography,
  message,
} from "antd";
import {
  DeleteOutlined,
  EditOutlined,
  PlusOutlined,
  ReloadOutlined,
} from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import { useSession } from "next-auth/react";

const { Title, Text } = Typography;
const { TextArea } = Input;

type Orientation = "portrait" | "landscape";

type DeviceLibraryItem = {
  id: number;
  name: string;
  model?: string | null;
  widthPx: number;
  heightPx: number;
  orientationSupported: Orientation[];
  notes?: string | null;
  isActive: boolean;
};

type DeviceLibraryFormValues = {
  name: string;
  model?: string;
  widthPx: number;
  heightPx: number;
  orientationSupported: Orientation[];
  notes?: string;
  isActive: boolean;
};

const API_URL = `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/v1`;

const gcd = (a: number, b: number): number => {
  let x = Math.abs(a);
  let y = Math.abs(b);

  while (y) {
    const next = x % y;
    x = y;
    y = next;
  }

  return x || 1;
};

const getRatio = (width: number, height: number) => {
  const divisor = gcd(width, height);
  return `${width / divisor}:${height / divisor}`;
};

const orientationOptions = [
  { label: "Landscape", value: "landscape" },
  { label: "Portrait", value: "portrait" },
];

const normalizeOrientations = (value?: Orientation[] | null): Orientation[] =>
  Array.isArray(value) ? value : [];

export default function DeviceLibraryPage() {
  const [form] = Form.useForm<DeviceLibraryFormValues>();
  const { data: session } = useSession();
  const [devices, setDevices] = useState<DeviceLibraryItem[]>([]);
  const [tableLoading, setTableLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDevice, setEditingDevice] = useState<DeviceLibraryItem | null>(
    null,
  );

  const token = session?.user?.backendTokens?.at;
  const isSAdmin = session?.user?.Roles?.includes("SAdmin");

  const authHeaders = useMemo(
    () => ({
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    }),
    [token],
  );

  const fetchDevices = useCallback(async () => {
    if (!token) return;

    setTableLoading(true);
    try {
      const response = await fetch(`${API_URL}/device-library/admin`, {
        credentials: "include",
        headers: authHeaders,
      });

      if (!response.ok) {
        throw new Error(`Unable to load devices (${response.status})`);
      }

      const result = await response.json();
      setDevices(Array.isArray(result) ? result : []);
    } catch (error) {
      message.error(
        error instanceof Error ? error.message : "Unable to load devices",
      );
    } finally {
      setTableLoading(false);
    }
  }, [authHeaders, token]);

  useEffect(() => {
    void fetchDevices();
  }, [fetchDevices]);

  const openCreateModal = () => {
    setEditingDevice(null);
    form.resetFields();
    form.setFieldsValue({
      orientationSupported: ["landscape", "portrait"],
      isActive: true,
    });
    setIsModalOpen(true);
  };

  const openEditModal = (device: DeviceLibraryItem) => {
    setEditingDevice(device);
    form.setFieldsValue({
      name: device.name,
      model: device.model || undefined,
      widthPx: device.widthPx,
      heightPx: device.heightPx,
      orientationSupported: normalizeOrientations(device.orientationSupported),
      notes: device.notes || undefined,
      isActive: device.isActive,
    });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingDevice(null);
    form.resetFields();
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setSaving(true);

      const payload = {
        ...values,
        name: values.name.trim(),
        model: values.model?.trim() || undefined,
        notes: values.notes?.trim() || undefined,
        widthPx: Number(values.widthPx),
        heightPx: Number(values.heightPx),
        orientationSupported: values.orientationSupported?.length
          ? values.orientationSupported
          : ["landscape", "portrait"],
      };

      const response = await fetch(
        editingDevice
          ? `${API_URL}/device-library/${editingDevice.id}`
          : `${API_URL}/device-library`,
        {
          method: editingDevice ? "PATCH" : "POST",
          credentials: "include",
          headers: authHeaders,
          body: JSON.stringify(payload),
        },
      );

      if (!response.ok) {
        const errorBody = await response.json().catch(() => null);
        throw new Error(errorBody?.message || "Unable to save device");
      }

      message.success(
        editingDevice ? "Device updated successfully" : "Device added successfully",
      );
      closeModal();
      await fetchDevices();
    } catch (error) {
      if (error instanceof Error) {
        message.error(error.message);
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (deviceId: number) => {
    try {
      const response = await fetch(`${API_URL}/device-library/${deviceId}`, {
        method: "DELETE",
        credentials: "include",
        headers: authHeaders,
      });

      if (!response.ok) {
        const errorBody = await response.json().catch(() => null);
        throw new Error(errorBody?.message || "Unable to delete device");
      }

      message.success("Device deleted successfully");
      await fetchDevices();
    } catch (error) {
      message.error(
        error instanceof Error ? error.message : "Unable to delete device",
      );
    }
  };

  const columns: ColumnsType<DeviceLibraryItem> = [
    {
      title: "Device",
      dataIndex: "name",
      render: (_value, record) => (
        <div>
          <div className="font-medium text-gray-900">{record.name}</div>
          {record.model && (
            <Text className="text-xs text-gray-500">{record.model}</Text>
          )}
        </div>
      ),
    },
    {
      title: "Resolution",
      render: (_value, record) => (
        <div>
          <div className="font-medium">
            {record.widthPx}x{record.heightPx}
          </div>
          <Text className="text-xs text-gray-500">
            {getRatio(record.widthPx, record.heightPx)}
          </Text>
        </div>
      ),
    },
    {
      title: "Orientation",
      dataIndex: "orientationSupported",
      render: (value: Orientation[]) => {
        const orientations = normalizeOrientations(value);

        return (
          <Space size={4} wrap>
            {orientations.length
              ? orientations.map((orientation) => (
                  <Tag key={orientation}>{orientation}</Tag>
                ))
              : "-"}
          </Space>
        );
      },
    },
    {
      title: "Status",
      dataIndex: "isActive",
      render: (value: boolean) => (
        <Tag color={value ? "green" : "default"}>
          {value ? "Active" : "Inactive"}
        </Tag>
      ),
    },
    {
      title: "Notes",
      dataIndex: "notes",
      render: (value: string | null) => value || "-",
    },
    {
      title: "Actions",
      width: 120,
      render: (_value, record) => (
        <Space>
          <Button
            aria-label="Edit device"
            icon={<EditOutlined />}
            onClick={() => openEditModal(record)}
          />
          <Popconfirm
            title="Delete device?"
            description="This removes the device from recommended dimensions."
            okText="Delete"
            okButtonProps={{ danger: true }}
            onConfirm={() => handleDelete(record.id)}
          >
            <Button danger aria-label="Delete device" icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  if (!isSAdmin) {
    return (
      <div className="p-6">
        <Card>
          <Title level={4}>Device Library</Title>
          <Text>You do not have access to manage recommended devices.</Text>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 bg-gray-100 min-h-screen">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Title level={3} className="!mb-1">
            Device Library
          </Title>
          <Text className="text-gray-500">
            Manage the recommended device resolutions shown in template upload
            forms.
          </Text>
        </div>
        <Space>
          <Button icon={<ReloadOutlined />} onClick={() => fetchDevices()}>
            Refresh
          </Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreateModal}>
            Add Device
          </Button>
        </Space>
      </div>

      <Card>
        <Table
          rowKey="id"
          columns={columns}
          dataSource={devices}
          loading={tableLoading}
          scroll={{ x: true }}
          pagination={{ pageSize: 10, showSizeChanger: true }}
        />
      </Card>

      <Modal
        title={editingDevice ? "Edit Device" : "Add Device"}
        open={isModalOpen}
        onCancel={closeModal}
        onOk={handleSubmit}
        confirmLoading={saving}
        okText={editingDevice ? "Update Device" : "Add Device"}
        destroyOnClose
      >
        <Form
          form={form}
          layout="vertical"
          requiredMark={false}
          initialValues={{
            orientationSupported: ["landscape", "portrait"],
            isActive: true,
          }}
        >
          <Form.Item
            name="name"
            label="Device name"
            rules={[{ required: true, message: "Device name is required" }]}
          >
            <Input placeholder="Samsung Tab S9 Ultra" maxLength={120} />
          </Form.Item>

          <Form.Item name="model" label="Model">
            <Input placeholder="SM-X910" maxLength={120} />
          </Form.Item>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Form.Item
              name="widthPx"
              label="Width px"
              rules={[{ required: true, message: "Width is required" }]}
            >
              <InputNumber min={1} precision={0} className="w-full" />
            </Form.Item>

            <Form.Item
              name="heightPx"
              label="Height px"
              rules={[{ required: true, message: "Height is required" }]}
            >
              <InputNumber min={1} precision={0} className="w-full" />
            </Form.Item>
          </div>

          <Form.Item
            name="orientationSupported"
            label="Orientation supported"
            rules={[
              {
                required: true,
                message: "Select at least one supported orientation",
              },
            ]}
          >
            <Select mode="multiple" options={orientationOptions} />
          </Form.Item>

          <Form.Item name="notes" label="Notes">
            <TextArea
              rows={3}
              maxLength={500}
              placeholder="Samsung Tab S9 Ultra landscape recommended"
            />
          </Form.Item>

          <Form.Item
            name="isActive"
            label="Show in upload recommendations"
            valuePropName="checked"
          >
            <Switch />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
