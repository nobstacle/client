"use client";
import { useState } from 'react';
import useTemplateStore from "../../../lib/zustand/store/templateStore";
import { useHasHydrated } from "../../../hooks/useHydrated";
import { surveyAnswerValToColor } from "../../../utils";
import { CreateSurveyTemplate } from "../../../components/pages/dashboard/CreateSurveyTemplate";
import { useSession } from "next-auth/react";
import { useSurveyAnswerControllerDeleteSurveyAnswer } from "../../../lib/client/api";
import { Table, Tag, Card, Pagination } from "antd";
import "../../../styles/base.css";
import { FaTrash } from "react-icons/fa";
import Swal from "sweetalert2";

function Page() {
  const isHydrated = useHasHydrated();

  if (!isHydrated) return <div></div>;

  return (
    <div className="h-full overflow-y-auto p-4 ">
      <Card className=" bg-gray-50">
        <div className="flex w-full flex-col gap-4">
          <CreateSurveyTemplate />
        </div>
        <SurveyAnswers />
      </Card>
    </div>
  );
}

function SurveyAnswers() {
  const {
    surveysAnswer,
    setSearchSurveysAnswers,
    setSurveyAnswers,
    searchSurveysAnswers,
  } = useTemplateStore();

  const sourceAnswers =
    searchSurveysAnswers.length > 0 ? searchSurveysAnswers : surveysAnswer;

  const { data: userData } = useSession();
  const deleteSurveyAnswer = useSurveyAnswerControllerDeleteSurveyAnswer();
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [totalItems, setTotalItems] = useState(0);
  const [pageSize, setPageSize] = useState(10);

  const handleDeleteSurveyAnswer = (id: number) => {
    Swal.fire({
      title: "Are you sure?",
      text: "This will permanently delete the survey answer.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#3b5998",
      confirmButtonText: "Yes, delete it!",
    }).then((result) => {
      if (result.isConfirmed) {
        deleteSurveyAnswer.mutate(
          { id },
          {
            onSuccess: () => {
              setSearchSurveysAnswers(searchSurveysAnswers.filter((val) => val.id !== id));
              setSurveyAnswers(surveysAnswer.filter((val) => val.id !== id));
              Swal.fire("Deleted!", "Survey answer deleted successfully.", "success");
            },
            onError: () => {
              Swal.fire("Error!", "Failed to delete the survey answer.", "error");
            },
          }
        );
      }
    });
  };

  const columns = [
    {
      title: "Value",
      dataIndex: "value",
      key: "value",
      render: (value: number) => (
        <Tag
          color={surveyAnswerValToColor(value)}
className="flex items-center justify-center w-8 h-8 rounded-full text-white text-sm font-medium"
        >
          <b>{value.toString().charAt(0).toUpperCase()}</b>
        </Tag>

      ),
    },
    {
      title: "Tag",
      dataIndex: "tag",
      key: "tag",
    },
    {
      title: "Station",
      key: "stationNo",
      dataIndex: "stationNo",
    },
    {
      title: "Date",
      key: "createdAt",
      render: (_, record) => (
        <span>{new Date(record.createdAt).toLocaleString("tr-TR")}</span>
      ),
    },
    {
      title: "Action",
      key: "action",
      render: (_, record) =>
        userData?.user.Roles?.includes("Admin") ? (
          <button
            onClick={() => handleDeleteSurveyAnswer(record.id)}
            disabled={deletingId === record.id}
            className={`
              w-8 h-8 flex items-center justify-center 
              text-white bg-red-700 hover:bg-red-800 
              focus:ring-4 focus:ring-red-300 font-medium 
              rounded-full text-xs
              ${deletingId === record.id ? "opacity-80 cursor-not-allowed" : ""}
            `}
          >
            {deletingId === record.id ? (
              <svg
                className="animate-spin h-3 w-3 text-white"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                ></path>
              </svg>
            ) : (
              <FaTrash size={12} />
            )}
          </button>
        ) : null,
    },
  ];

  const handlePageChange = (pageNumber: number) => {
    setCurrentPage(pageNumber);
  };

  return (
    <div className="p-4 shadow-md rounded-lg customTableWrapper customSurveyTable bg-white">
      <Table
        rowKey="id"
        columns={columns}
        dataSource={sourceAnswers}
        pagination={false}
        className="jotFormTable"
      />
      <div className="flex justify-center mt-6">
        <Pagination
          current={currentPage}
          total={totalItems}
          pageSize={pageSize}
          onChange={handlePageChange}
          showSizeChanger
          pageSizeOptions={['10', '20', '50', '100']}
        />
      </div>
    </div>
  );
}

export default Page;
