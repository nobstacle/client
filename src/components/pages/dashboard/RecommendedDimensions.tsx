import React from "react";
import { Typography, Space } from "antd";
import { InfoCircleOutlined } from "@ant-design/icons";

const { Text } = Typography;

export const RecommendedDimensions: React.FC = () => {
  return (
    <div className="bg-blue-50 border border-blue-200 rounded-md p-3 my-2 mb-4">
      <Space direction="vertical" size={2} className="w-full">
        <div className="flex items-center gap-2 text-blue-700 font-semibold text-xs">
          <InfoCircleOutlined />
          <span>Recommended Dimensions (Landscape View)</span>
        </div>
        <div className="text-[11px] text-blue-600 leading-tight mt-1">
          For the best full-screen experience without cropping or black bars, use these dimensions:
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 mt-2">
          <div className="flex justify-between text-[11px] border-b border-blue-100 pb-1">
            <span className="text-blue-800">iPad (4:3):</span>
            <span className="font-bold text-blue-900">2048 × 1536 px</span>
          </div>
          <div className="flex justify-between text-[11px] border-b border-blue-100 pb-1">
            <span className="text-blue-800">Samsung Tab (16:10):</span>
            <span className="font-bold text-blue-900">2560 × 1600 px</span>
          </div>
          <div className="flex justify-between text-[11px] border-b border-blue-100 pb-1">
            <span className="text-blue-800">Desktop (16:9):</span>
            <span className="font-bold text-blue-900">1920 × 1080 px</span>
          </div>
          <div className="flex justify-between text-[11px] border-b border-blue-100 pb-1">
            <span className="text-blue-800 font-medium italic text-blue-700">Best All-rounder:</span>
            <span className="font-bold text-blue-900">2560 × 1600 px</span>
          </div>
        </div>
      </Space>
    </div>
  );
};
