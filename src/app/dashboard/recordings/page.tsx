"use client";
import { useState, useEffect } from 'react';
import useTemplateStore from "../../../lib/zustand/store/templateStore";
import { useHasHydrated } from "../../../hooks/useHydrated";
import { useSession } from "next-auth/react";
import {
  useRecordingControllerDelete,
  useRecordingControllerGetAll
} from "../../../lib/client/api";
import { Table, Card, Pagination, Button, Spin, Tag } from "antd";
import "../../../styles/base.css";
import { FaTrash, FaPlay, FaPause, FaVideo, FaMusic } from "react-icons/fa";
import Swal from "sweetalert2";
import { SendRecordingTrigger } from "../../../components/pages/dashboard/CreateRecordingsTemplate";
import { useMessageStore } from '../../../lib/zustand/store/messageStore';

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
    setRecordings,
  } = useTemplateStore();

  const { receivedRecording } = useMessageStore();

  const { data: userData } = useSession();
  const deleteRecording = useRecordingControllerDelete();

  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [playingId, setPlayingId] = useState<number | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [mediaElement, setMediaElement] = useState<HTMLAudioElement | HTMLVideoElement | null>(null);

  // Fetch recordings from API
  const {
    data: recordingsData,
    isLoading,
    refetch
  } = useRecordingControllerGetAll(
    {
      page: currentPage,
      limit: pageSize,
    },
    {
      query: {
        enabled: true,
        refetchOnWindowFocus: false,
      }
    }
  );

  useEffect(() => {
    if (receivedRecording) {
      refetch();
    }
  }, [receivedRecording, refetch]);

  useEffect(() => {
    if (recordingsData?.items) {
      setRecordings(recordingsData?.items);
    }
  }, [recordingsData, setRecordings]);

  const handlePlayRecording = (id: number, recordingUrl: string, type: string) => {
    // If already playing this recording, pause it
    if (playingId === id && mediaElement) {
      mediaElement.pause();
      setPlayingId(null);
      return;
    }

    // Stop any currently playing media
    if (mediaElement) {
      mediaElement.pause();
    }

    // Determine if it's audio or video
    const isVideo = type === 'video';

    if (isVideo) {
      // For video, open in a modal or new window
      Swal.fire({
        title: 'Video Player',
        html: `
          <video 
            controls 
            autoplay 
            style="width: 100%; max-height: 500px;"
            src="${recordingUrl}"
          >
            Your browser does not support the video tag.
          </video>
        `,
        width: '800px',
        showCloseButton: true,
        showConfirmButton: false,
        customClass: {
          container: 'video-modal'
        }
      });
      setPlayingId(id);
    } else {
      // For audio, create and play audio element
      const audio = new Audio(recordingUrl);
      audio.play();
      setMediaElement(audio);
      setPlayingId(id);

      // Reset playing state when audio ends
      audio.onended = () => {
        setPlayingId(null);
      };
    }
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
        setDeletingId(id);
        deleteRecording.mutate(
          { id },
          {
            onSuccess: () => {
              setRecordings(recordings.filter((val) => val.id !== id));
              Swal.fire("Deleted!", "Recording deleted.", "success");
              setDeletingId(null);

              // Stop media if deleted recording was playing
              if (playingId === id && mediaElement) {
                mediaElement.pause();
                setPlayingId(null);
              }

              // Refetch to update the list
              refetch();
            },
            onError: (error: any) => {
              console.error('Delete error:', error);
              Swal.fire("Error!", error?.response?.data?.message || "Failed to delete the recording.", "error");
              setDeletingId(null);
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
      width: 80,
      render: (recordingUrl: string, record: any) => (
        <button
          onClick={() => handlePlayRecording(record.id, recordingUrl, record.type)}
          className="w-8 h-8 flex items-center justify-center text-white bg-blue-600 hover:bg-blue-700 focus:ring-4 focus:ring-blue-300 font-medium rounded-full text-xs"
          title={record.type === 'video' ? 'Play Video' : 'Play Audio'}
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
      title: "Title",
      dataIndex: "title",
      key: "title",
      render: (title: string) => title || 'Untitled',
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
      width: 100,
    },
    {
      title: "Date",
      key: "createdAt",
      width: 150,
      render: (_, record) => (
        <span>{new Date(record.createdAt).toLocaleString("en-US", {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        })}</span>
      ),
    },
    {
      title: "Action",
      key: "action",
      width: 80,
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

  const handlePageChange = (page: number, pageSize?: number) => {
    setCurrentPage(page);
    if (pageSize) {
      setPageSize(pageSize);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div className="p-4 shadow-md rounded-lg customTableWrapper bg-white">
      <div className="mb-4 flex justify-between items-center">
        <div>
          <h2 className="text-lg font-semibold">Recordings</h2>
          <p className="text-sm text-gray-500">
            Total: {recordingsData?.items?.total || 0} recordings
          </p>
        </div>
        <Button
          type="primary"
          onClick={() => refetch()}
        >
          Refresh
        </Button>
      </div>

      <Table
        rowKey="id"
        columns={columns}
        dataSource={recordingsData?.items || recordingsData}
        pagination={false}
        className="jotFormTable"
        loading={isLoading}
      />

      <div className="flex justify-center mt-6">
        <Pagination
          current={currentPage}
          total={recordingsData?.data?.total || 0}
          pageSize={pageSize}
          onChange={handlePageChange}
          showSizeChanger
          pageSizeOptions={['10', '20', '50', '100']}
          showTotal={(total, range) => `${range[0]}-${range[1]} of ${total} items`}
        />
      </div>
    </div>
  );
}

export default Page;