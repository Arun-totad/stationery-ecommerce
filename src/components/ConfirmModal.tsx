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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40 transition-opacity animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-sm w-full flex flex-col items-center animate-fade-in-up">
        <div className="flex items-center justify-center w-16 h-16 rounded-full bg-yellow-100 mb-4">
          <svg className="w-8 h-8 text-yellow-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M21 12c0 4.97-4.03 9-9 9s-9-4.03-9-9 4.03-9 9-9 9 4.03 9 9z" />
          </svg>
        </div>
        <h3 className="text-xl font-bold text-gray-900 mb-2 text-center">{title}</h3>
        <p className="text-gray-700 mb-6 text-center">{message}</p>
        <div className="flex gap-4 w-full">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-2 rounded-lg bg-gray-100 text-gray-700 font-semibold hover:bg-gray-200 transition"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 px-4 py-2 rounded-lg bg-green-500 text-white font-semibold hover:bg-green-600 transition shadow"
          >
            {confirmText}
          </button>
        </div>
      </div>
      <style jsx global>{`
        .animate-fade-in { animation: fadeIn 0.2s; }
        .animate-fade-in-up { animation: fadeInUp 0.25s; }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes fadeInUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  );
};

export default ConfirmModal; 