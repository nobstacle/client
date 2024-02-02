import React from "react";

export const useDisclousure = () => {
  const [isOpen, setIsOpen] = React.useState(false);

  function handleOpen() {
    setIsOpen(true);
  }

  function handleClose() {
    setIsOpen(false);
  }

  return { handleOpen, handleClose, isOpen };
};
