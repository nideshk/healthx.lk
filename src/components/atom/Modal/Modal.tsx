// components/ui/Modal.tsx
import { ReactNode } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

type ModalProps = {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  footer?: ReactNode;
  theme?: "light" | "dark";
};

export default function Modal({
  isOpen,
  onClose,
  title,
  children,
  footer,
  theme = "light",
}: ModalProps) {
  if (!isOpen) return null;

  const containerStyles =
    theme === "dark" ? "bg-gray-900 text-gray-100" : "bg-white text-gray-900";

  const borderStyles = theme === "dark" ? "border-gray-700" : "border-gray-200";
  const footerBg = theme === "dark" ? "bg-gray-800" : "bg-gray-50";

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      {/* Center wrapper */}
      <div className="w-full h-full flex items-end sm:items-center justify-center">
        <div
          className={cn(
            "flex flex-col rounded-t-2xl sm:rounded-2xl shadow-lg w-full sm:max-w-md sm:h-[90vh] max-h-[90vh] overflow-hidden",
            containerStyles
          )}
        >
          {/* Header */}
          <div
            className={cn(
              "flex-shrink-0 sticky top-0 z-10 p-4 flex items-center justify-between border-b",
              borderStyles,
              containerStyles
            )}
          >
            {title && <h2 className="text-lg font-semibold truncate">{title}</h2>}
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-800 dark:hover:text-gray-300 transition"
            >
              <X size={20} />
            </button>
          </div>

          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-5">
            {children}
          </div>

          {/* Footer */}
          {footer && (
            <div
              className={cn(
                "flex-shrink-0 sticky bottom-0 border-t p-4 sm:p-5 rounded-b-2xl",
                borderStyles,
                footerBg
              )}
            >
              <div className="flex justify-end gap-2">{footer}</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
