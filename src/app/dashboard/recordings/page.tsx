"use client";
import { useState } from 'react';
import useTemplateStore from "../../../lib/zustand/store/templateStore";
import { useHasHydrated } from "../../../hooks/useHydrated";
import { useSession } from "next-auth/react";
import { useRecordingControllerDelete } from "../../../lib/client/api";
import { Table, Card, Pagination, Button } from "antd";
import "../../../styles/base.css";
import { FaTrash, FaPlay, FaPause } from "react-icons/fa";
import Swal from "sweetalert2";
import { SendRecordingTrigger } from "../../../components/pages/dashboard/CreateRecordingsTemplate";

function Page() {
  const isHydrated = useHasHydrated();

  if (!isHydrated) return <div></div>;

  return (
    <div className="h-full overflow-y-auto p-4">
      <Card className="bg-gray-50">
        <div className="flex w-full flex-col gap-4">
          <SendRecordingTrigger />
        </div>
        <RecordingsList />
      </Card>
    </div>
  );
}

function RecordingsList() {
  const {
    recordings,
    setSearchRecordings,
    setRecordings,
    searchRecordings,
  } = useTemplateStore();

  const sourceRecordings =
    searchRecordings.length > 0 ? searchRecordings : recordings;

  const { data: userData } = useSession();
  const deleteRecording = useRecordingControllerDelete();
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [playingId, setPlayingId] = useState<number | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [totalItems, setTotalItems] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null);

  const handlePlayRecording = (id: number, recordingUrl: string) => {
    // If already playing this recording, pause it
    if (playingId === id && audioElement) {
      audioElement.pause();
      setPlayingId(null);
      return;
    }

    // Stop any currently playing audio
    if (audioElement) {
      audioElement.pause();
    }

    // Create and play new audio
    const audio = new Audio(recordingUrl);
    audio.play();
    setAudioElement(audio);
    setPlayingId(id);

    // Reset playing state when audio ends
    audio.onended = () => {
      setPlayingId(null);
    };
  };

  const handleDeleteRecording = (id: number) => {
    Swal.fire({
      title: "Are you sure?",
      text: "This will permanently delete the recording.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#3b5998",
      confirmButtonText: "Yes, delete it!",
    }).then((result) => {
      if (result.isConfirmed) {
        deleteRecording.mutate(
          { id },
          {
            onSuccess: () => {
              setSearchRecordings(searchRecordings.filter((val) => val.id !== id));
              setRecordings(recordings.filter((val) => val.id !== id));
              Swal.fire("Deleted!", "Recording deleted successfully.", "success");

              // Stop audio if deleted recording was playing
              if (playingId === id && audioElement) {
                audioElement.pause();
                setPlayingId(null);
              }
            },
            onError: () => {
              Swal.fire("Error!", "Failed to delete the recording.", "error");
            },
          }
        );
      }
    });
  };

  const columns = [
    {
      title: "Play",
      dataIndex: "recordingUrl",
      key: "play",
      render: (recordingUrl: string, record: any) => (
        <button
          onClick={() => handlePlayRecording(record.id, recordingUrl)}
          className="w-8 h-8 flex items-center justify-center text-white bg-blue-600 hover:bg-blue-700 focus:ring-4 focus:ring-blue-300 font-medium rounded-full text-xs"
        >
          {playingId === record.id ? (
            <FaPause size={12} />
          ) : (
            <FaPlay size={12} />
          )}
        </button>
      ),
    },
    {
      title: "Confirmation Number",
      dataIndex: "confirmationNumber",
      key: "confirmationNumber",
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
            onClick={() => handleDeleteRecording(record.id)}
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
    <div className="p-4 shadow-md rounded-lg customTableWrapper bg-white">
      <Table
        rowKey="id"
        columns={columns}
        dataSource={sourceRecordings}
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