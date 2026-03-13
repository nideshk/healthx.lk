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
  maxHeight?: string;
  width?: "sm" | "md" | "lg" | "xl" | "2xl" | "3xl" | "4xl" | "5xl" | "full" | string;
};

const widthMap: Record<string, string> = {
  sm: "sm:max-w-sm",
  md: "sm:max-w-md",
  lg: "sm:max-w-lg",
  xl: "sm:max-w-xl",
  "2xl": "sm:max-w-2xl",
  "3xl": "sm:max-w-3xl",
  "4xl": "sm:max-w-4xl",
  "5xl": "sm:max-w-5xl",
  full: "sm:max-w-[95vw]",
};

export default function Modal({
  isOpen,
  onClose,
  title,
  children,
  footer,
  theme = "light",
  maxHeight = "80vh",
  width = "md",
}: ModalProps) {
  if (!isOpen) return null;

  const resolvedWidth = widthMap[width] || width;

  const containerStyles =
    theme === "dark" ? "bg-gray-900 text-gray-100" : "bg-white text-gray-900";

  const borderStyles = theme === "dark" ? "border-gray-700" : "border-gray-200";
  const footerBg = theme === "dark" ? "bg-gray-800" : "bg-gray-50";

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      {/* Outer container for centering */}
      <div
        className={cn(
          "flex flex-col rounded-2xl shadow-lg w-full max-h-[90vh] overflow-hidden",
          resolvedWidth,
          containerStyles
        )}
        style={{ maxHeight }}
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

        {/* Content (scrollable only when needed) */}
        <div
          className={cn(
            "flex-1 overflow-y-auto p-4 sm:p-5 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent"
          )}
        >
          {children}
        </div>

        {/* Footer (sticks to bottom) */}
        {footer && (
          <div
            className={cn(
              "flex-shrink-0 border-t p-4 sm:p-5",
              borderStyles,
              footerBg
            )}
          >
            <div className="flex justify-end gap-2">{footer}</div>
          </div>
        )}
      </div>
    </div>
  );
}
