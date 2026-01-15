"use client";

import Modal from "../../../components/Modal";
import { CreateImageTemplateForm } from "../../../components/pages/dashboard/CreateImageTemplateForm";
import { useDisclousure } from "../../../hooks/useDisclosure";
import {
  useCompanyControllerGetCompany,
  useImageTemplateControllerDeleteImageTemplateOne,
  useImageTemplateControllerPatchImageTemplateOrder,
} from "../../../lib/client/api";
import { useSearchParams } from "next/navigation";
import { useSocketContext } from "../../../context/SocketContextProvider";
import { ChatType } from "../../../constant/types";
import { useSession } from "next-auth/react";
import { PlusIcon } from "../../../components/icons/PlusIcon";
import useTemplateStore from "../../../lib/zustand/store/templateStore";
import { useHasHydrated } from "../../../hooks/useHydrated";
import { useState, useMemo } from "react";
import { GetImageTemplateRes } from "../../../lib/client/model";
import { UpdateImageTemplateForm } from "../../../components/pages/dashboard/UpdateImageTemplateForm";
import { SearchTemplateForm } from "../../../components/pages/dashboard/SearchTemplateForm";
import { useSearchTemplate } from "../../../hooks/useSearchTemplate";
import {
  DraggableCardContainer,
  DraggableCardItem,
} from "../../../components/DraggableCard";
import { arrayMove } from "@dnd-kit/sortable";
import { UniqueIdentifier } from "@dnd-kit/core";
import { Card } from 'antd';
import "../../../styles/base.css";

export default function ImageDashboard() {
  let isMobile = typeof window !== 'undefined' && window.innerWidth <= 500;
  const [editTemplate, setEditTemplate] = useState<null | GetImageTemplateRes>(
    null,
  );
  const isHydrated = useHasHydrated();
  const { setImages, images, setSearchImages, searchImages } =
    useTemplateStore();
  const { search, clearSearch } = useSearchTemplate(images, setSearchImages);
  const params = useSearchParams();
  const { handleClose, handleOpen, isOpen } = useDisclousure();
  const {
    handleClose: updateHandleClose,
    handleOpen: updateHandleOpen,
    isOpen: updateIsOpen,
  } = useDisclousure();

  const deleteImageTemplate =
    useImageTemplateControllerDeleteImageTemplateOne();

  const { emitSendTemplate } = useSocketContext();
  const { data: companyData } = useCompanyControllerGetCompany();
  const { data: userData } = useSession();

  // Get current language
  const currentLang = params.get("lang") || companyData?.defaultLangCode || "en";

  // Group images by tag and show the default language version
  // but track availability for the current language
  const displayedImagesWithAvailability = useMemo(() => {
    const imagesSource = searchImages.length > 0 ? searchImages : images;
    
    // Group images by tag
    const groupedByTag = imagesSource.reduce((acc, image) => {
      if (!acc[image.tag]) {
        acc[image.tag] = [];
      }
      acc[image.tag].push(image);
      return acc;
    }, {} as Record<string, GetImageTemplateRes[]>);

    // For each tag, always show the default language version
    // but check if current language is available
    const displayImages: (GetImageTemplateRes & { isAvailableInCurrentLang: boolean })[] = [];
    
    Object.values(groupedByTag).forEach((tagImages) => {
      // Always use default language image for display
      const defaultLangImage = tagImages.find(img =>
        img.langCode.includes(companyData?.defaultLangCode || "en")
      ) || tagImages[0];
      
      // Check if current language is available for this tag
      const isAvailableInCurrentLang = tagImages.some(img => 
        img.langCode.includes(currentLang)
      );
      
      displayImages.push({
        ...defaultLangImage,
        isAvailableInCurrentLang
      });
    });

    // Sort by order to maintain original ordering
    return displayImages.sort((a, b) => a.order - b.order);
  }, [images, searchImages, currentLang, companyData?.defaultLangCode]);

  const sendTemplate = (id: number, isAvailable: boolean, ext: string) => {
    emitSendTemplate({
      refId: id,
      langCode: isAvailable
        ? currentLang
        : companyData?.defaultLangCode || "en",
      refType: ChatType.Image,
      station: Number(params.get("station") ?? 1),
      contentExtra: ext,
    });
  };

  const handleQrCodeClick = (id: number, url: string, tag: string, isAvailable: boolean) => {
    emitSendTemplate({
      refId: id,
      langCode: isAvailable
        ? currentLang
        : companyData?.defaultLangCode || "en",
      refType: ChatType.Image,
      station: Number(params.get("station") ?? 1),
      contentExtra: url,
      directContent: 'QR'
    });
  };

  const updateImageTemplateOrder =
    useImageTemplateControllerPatchImageTemplateOrder();

  const onDeleteCard = (id: number) => {
    deleteImageTemplate.mutate(
      { id },
      {
        onSuccess: () => {
          const newImages = images.filter((image) => image.id !== id);
          setImages(newImages);
        },
      },
    );
  };

  const onUpdateCard = (image: GetImageTemplateRes) => {
    setEditTemplate(image);
    updateHandleOpen();
  };

  const sortImages = (item1: UniqueIdentifier, item2: UniqueIdentifier) => {
    // Always work with the full images array (not filtered/displayed array)
    const oldIndex = images.findIndex((item) => item.id === item1);
    const newIndex = images.findIndex((item) => item.id === item2);

    if (oldIndex === -1 || newIndex === -1) {
      console.error('Could not find items for sorting');
      return;
    }

    // Create a shallow copy and move the item
    let reorderedImages = arrayMove(images, oldIndex, newIndex);

    // Group by tag to update order properly
    const groupedByTag = reorderedImages.reduce((acc, image) => {
      if (!acc[image.tag]) {
        acc[image.tag] = [];
      }
      acc[image.tag].push(image);
      return acc;
    }, {} as Record<string, GetImageTemplateRes[]>);

    // Get unique tags in the new order
    const uniqueTags = reorderedImages
      .map(img => img.tag)
      .filter((tag, index, self) => self.indexOf(tag) === index);

    // Rebuild the array with all language variants maintaining the new tag order
    const finalOrderedImages: GetImageTemplateRes[] = [];
    let orderCounter = 1;

    uniqueTags.forEach(tag => {
      const tagImages = groupedByTag[tag];
      tagImages.forEach(img => {
        finalOrderedImages.push({ ...img, order: orderCounter });
      });
      orderCounter++;
    });

    // Update the order in the backend
    finalOrderedImages.forEach(({ id, order }) => {
      updateImageTemplateOrder.mutate({
        data: { order },
        id,
      });
    });

    // Update the state
    setImages(finalOrderedImages);
  };

  if (isHydrated)
    return (
      <div
        className={`flex h-full w-full flex-col justify-start gap-4 overflow-y-auto ${isMobile ? 'p-2' : 'p-6'}`}>
        <div className="customSearchWrapper">
          {displayedImagesWithAvailability.length > 0 && (
            <Card className="w-full customCards">
              <div className="searchInputWidth">
                <SearchTemplateForm
                  searchOnChange={search}
                  onClear={clearSearch}
                  placeholder="Search template"
                />
              </div>
            </Card>
          )}
        </div>
        {userData?.user.Roles?.includes("Admin") && (
          <Modal
            title="Create template"
            closeModal={handleClose}
            isOpen={isOpen}
          >
            <CreateImageTemplateForm
              cb={(image, isUpdate = false) => {
                handleClose();

                if (!isUpdate) {
                  setImages([...images, image]);
                } else {
                  const updatedImages = images.map((item) =>
                    item.id === image.id
                      ? { ...item, url: image.url, langCode: image.langCode }
                      : item
                  );

                  if (!images.some((item) => item.id === image.id)) {
                    updatedImages.push(image);
                  }

                  setImages(updatedImages);
                }
              }}
            />
          </Modal>
        )}
        <div id="card-wrapper" className="flex h-full w-full">
          <div className="flex w-full flex-wrap content-start gap-4">
            <DraggableCardContainer items={displayedImagesWithAvailability} sort={sortImages}>
              {displayedImagesWithAvailability?.map((val) => (
                <DraggableCardItem
                  onUpdate={() => onUpdateCard(val)}
                  isAdmin={userData?.user.Roles?.includes("Admin")}
                  onDelete={() => onDeleteCard(val.id)}
                  onQrCodeClick={() => handleQrCodeClick(val.id, val.ext, val.tag, val.isAvailableInCurrentLang)}
                  tag={val.tag}
                  key={val.id}
                  isAvailable={val.isAvailableInCurrentLang}
                  sendOnClick={() =>
                    sendTemplate(
                      val.id,
                      val.isAvailableInCurrentLang,
                      val.ext,
                    )
                  }
                  id={val.id}
                  isDraggable={searchImages.length === 0}
                >
                  <img
                    alt="template_image"
                    style={{
                      objectFit: "cover",
                      width: "100%",
                      height: "100%",
                    }}
                    src={val.url}
                  />
                </DraggableCardItem>
              ))}
            </DraggableCardContainer>

            {editTemplate && (
              <Modal
                title="Update template"
                closeModal={updateHandleClose}
                isOpen={updateIsOpen}
              >
                <UpdateImageTemplateForm
                  defaultLangCode={currentLang}
                  sourceId={editTemplate?.id}
                  tag={editTemplate.tag}
                  cb={(image) => {
                    updateHandleClose();

                    const shallow = [...images];
                    const index = shallow.findIndex(
                      ({ id }) => id === image.id,
                    );
                    shallow[index]["url"] = image.url;
                    shallow[index]["langCode"] = image.langCode;

                    setImages(shallow);
                  }}
                />
              </Modal>
            )}
          </div>
        </div>

        {userData?.user.Roles?.includes("Admin") && (
          <div className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-50">
            <button
              onClick={handleOpen}
              className="group relative flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 bg-white/50 backdrop-blur-md hover:bg-white/60 border border-white/20 text-gray-700 hover:text-gray-900 rounded-full shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105 focus:outline-none focus:ring-4 focus:ring-white/30"
              aria-label="Create new template"
            >
              <PlusIcon className="w-6 h-6 sm:w-7 sm:h-7 opacity-100" />

              {/* Tooltip */}
              <div className="absolute right-full mr-3 px-3 py-2 bg-gray-900 text-white text-sm rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap">
                Create Template
                <div className="absolute top-1/2 left-full w-0 h-0 border-l-4 border-l-gray-900 border-y-4 border-y-transparent transform -translate-y-1/2"></div>
              </div>
            </button>
          </div>
        )}
      </div>
    );

  return <div></div>;
}