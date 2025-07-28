import React from 'react';

interface ConfirmModalProps {
  open: boolean;
  title?: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmText?: string;
  cancelText?: string;
}

const ConfirmModal: React.FC<ConfirmModalProps> = ({
  open,
  title = 'Are you sure?',
  message,
  onConfirm,
  onCancel,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
}) => {
  if (!open) return null;
  return (
    <div className="bg-opacity-40 animate-fade-in fixed inset-0 z-50 flex items-center justify-center bg-black transition-opacity">
      <div className="animate-fade-in-up flex w-full max-w-sm flex-col items-center rounded-2xl bg-white p-8 shadow-2xl">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-yellow-100">
          <svg
            className="h-8 w-8 text-yellow-500"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v2m0 4h.01M21 12c0 4.97-4.03 9-9 9s-9-4.03-9-9 4.03-9 9-9 9 4.03 9 9z"
            />
          </svg>
        </div>
        <h3 className="mb-2 text-center text-xl font-bold text-gray-900">{title}</h3>
        <p className="mb-6 text-center text-gray-700">{message}</p>
        <div className="flex w-full gap-4">
          <button
            onClick={onCancel}
            className="flex-1 rounded-lg bg-gray-100 px-4 py-2 font-semibold text-gray-700 transition hover:bg-gray-200"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 rounded-lg bg-green-500 px-4 py-2 font-semibold text-white shadow transition hover:bg-green-600"
          >
            {confirmText}
          </button>
        </div>
      </div>
      <style jsx global>{`
        .animate-fade-in {
          animation: fadeIn 0.2s;
        }
        .animate-fade-in-up {
          animation: fadeInUp 0.25s;
        }
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
};

export default ConfirmModal;
