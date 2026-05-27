import React, { useEffect, useMemo, useState } from "react";
import { Button, Modal, Select, Table, Tooltip, Typography } from "antd";
import { QuestionCircleOutlined } from "@ant-design/icons";
import { useSession } from "next-auth/react";

const { Text } = Typography;
const DEVICE_LIBRARY_MODAL_Z_INDEX = 5000;

type DeviceLibraryItem = {
  id: number;
  name: string;
  model?: string | null;
  widthPx: number;
  heightPx: number;
  orientationSupported: string[];
  notes?: string | null;
};

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

export const RecommendedDimensions: React.FC = () => {
  const { data } = useSession();
  const [devices, setDevices] = useState<DeviceLibraryItem[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<number | undefined>();
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = data?.user?.backendTokens?.at;
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;

    if (!backendUrl) {
      setError("Backend URL is not configured");
      return;
    }

    const loadDevices = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch(`${backendUrl}/api/v1/device-library`, {
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        });

        if (!response.ok) {
          throw new Error(`Unable to load devices (${response.status})`);
        }

        const result = await response.json();
        const nextDevices = Array.isArray(result) ? result : [];
        setDevices(nextDevices);
        setSelectedDeviceId((current) =>
          nextDevices.some((device) => device.id === current)
            ? current
            : nextDevices[0]?.id,
        );
      } catch (err) {
        setDevices([]);
        setSelectedDeviceId(undefined);
        setError(err instanceof Error ? err.message : "Unable to load devices");
      } finally {
        setIsLoading(false);
      }
    };

    void loadDevices();
  }, [data?.user?.backendTokens?.at]);

  const selectedDevice = useMemo(
    () => devices.find((device) => device.id === selectedDeviceId),
    [devices, selectedDeviceId],
  );

  const options = devices.map((device) => ({
    value: device.id,
    label: [device.name, device.model].filter(Boolean).join(" - "),
  }));

  return (
    <div className="my-2 p-3 bg-gray-50 border border-gray-100 rounded-lg flex flex-col gap-2 w-full">
      <div className="flex items-center justify-between gap-2 w-full">
        <Text className="text-xs font-semibold text-gray-600 uppercase tracking-wider">
          Target Device Guidance (Optional)
        </Text>
        <Tooltip
          title="Show device dimensions table"
          zIndex={DEVICE_LIBRARY_MODAL_Z_INDEX + 1}
          getPopupContainer={() => document.body}
        >
          <Button
            type="text"
            size="small"
            icon={<QuestionCircleOutlined />}
            onClick={() => setIsOpen(true)}
            className="text-gray-400 hover:text-gray-600 flex items-center justify-center p-1"
          />
        </Tooltip>
      </div>

      <Text className="text-[11px] text-gray-500 -mt-1 leading-normal">
        Select a device to view its recommended image/video dimensions.
      </Text>

      <div className="w-full">
        <Select
          loading={isLoading}
          allowClear
          value={selectedDeviceId}
          onChange={setSelectedDeviceId}
          placeholder="Select target device for size advice..."
          options={options}
          style={{ width: "100%" }}
          popupClassName="modal-select-dropdown"
          dropdownStyle={{ zIndex: DEVICE_LIBRARY_MODAL_Z_INDEX + 1 }}
          getPopupContainer={(trigger) => trigger.parentElement ?? document.body}
          notFoundContent={isLoading ? "Loading devices..." : "No devices found"}
        />
      </div>

      {selectedDevice && (
        <div className="mt-1 p-2 bg-blue-50 border border-blue-100 rounded flex flex-col gap-0.5 animate-slide-down">
          <Text className="text-[11px] font-medium text-blue-700">
            Advice: Upload matching size for best display quality.
          </Text>
          <Text className="text-xs font-bold text-blue-900">
            Recommended: {selectedDevice.widthPx}x{selectedDevice.heightPx} px &nbsp;
            <span className="text-[11px] font-normal text-blue-600">
              ({getRatio(selectedDevice.widthPx, selectedDevice.heightPx)})
            </span>
          </Text>
          {selectedDevice.notes && (
            <Text className="text-[10px] text-gray-500 italic mt-0.5 leading-snug">
              Note: {selectedDevice.notes}
            </Text>
          )}
        </div>
      )}

      <Modal
        title="Recommended Device Dimensions"
        open={isOpen}
        footer={null}
        onCancel={() => setIsOpen(false)}
        width={720}
        zIndex={DEVICE_LIBRARY_MODAL_Z_INDEX}
        getContainer={
          typeof document === "undefined" ? false : () => document.body
        }
      >
        {error && (
          <Text className="mb-3 block text-xs text-amber-600">
            Device Library is unavailable right now: {error}
          </Text>
        )}
        <Table
          rowKey="id"
          size="small"
          loading={isLoading}
          dataSource={devices}
          pagination={false}
          scroll={{ x: true }}
          columns={[
            {
              title: "Device",
              dataIndex: "name",
              render: (_value, record) =>
                [record.name, record.model].filter(Boolean).join(" - "),
            },
            {
              title: "Resolution",
              render: (_value, record) =>
                `${record.widthPx}x${record.heightPx}`,
            },
            {
              title: "Recommended ratio",
              render: (_value, record) =>
                `${record.widthPx}x${record.heightPx} (${getRatio(
                  record.widthPx,
                  record.heightPx,
                )})`,
            },
            {
              title: "Orientation",
              dataIndex: "orientationSupported",
              render: (value: string[]) => value?.join(", ") || "-",
            },
            {
              title: "Notes",
              dataIndex: "notes",
              render: (value: string | null) => value || "-",
            },
          ]}
        />
        {!isLoading && devices.length === 0 && (
          <Text className="mt-3 block text-sm text-gray-500">
            {error
              ? "Device recommendations can still be added by Super Admin once the backend library is ready."
              : "No devices have been added to the Device Library yet."}
          </Text>
        )}
      </Modal>
    </div>
  );
};
