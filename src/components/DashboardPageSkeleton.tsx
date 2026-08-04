import { Skeleton } from "antd";

export function DashboardPageSkeleton() {
  return (
    <div className="flex h-full w-full flex-col gap-4 overflow-y-auto p-6">
      <Skeleton active paragraph={{ rows: 8 }} />
    </div>
  );
}
