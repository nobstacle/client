import { Dialog, Transition } from "@headlessui/react";
import { Fragment } from "react";

interface ModalPropsI {
  isOpen: boolean;
  closeModal: (v: boolean) => void;
  title: string;
  panelStyleClass?: string;
  className?: string;
}

export default function Modal({
  isOpen,
  title,
  closeModal,
  children,
  panelStyleClass,
  className
}: React.PropsWithChildren<ModalPropsI>) {
  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-[1200]" onClose={closeModal}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/25" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-start justify-center p-2 text-center sm:items-center sm:p-4">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel
                className={`w-full max-w-md transform customModal max-h-[calc(100vh-1rem)] overflow-y-auto rounded-2xl bg-white p-4 text-left align-middle shadow-xl transition-all sm:max-h-[calc(100vh-2rem)] sm:p-6 ${panelStyleClass} ${className}`}
              >
                <Dialog.Title
                  as="h3"
                  className="text-2xl font-medium leading-6 text-gray-900"
                >
                  {title}
                </Dialog.Title>
                <div>{children}</div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}
