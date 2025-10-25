import { useState } from 'react';

interface GenerateDataDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onGenerate: (rowCount: number) => Promise<void>;
  tableName: string;
}

export default function GenerateDataDialog({
  isOpen,
  onClose,
  onGenerate,
  tableName,
}: GenerateDataDialogProps) {
  const [rowCount, setRowCount] = useState(10);
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      await onGenerate(rowCount);
      onClose();
    } catch (error) {
      console.error('Failed to generate data:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          Generate Dummy Data
        </h2>

        <p className="text-sm text-gray-600 mb-4">
          Generate dummy data for table: <span className="font-medium">{tableName}</span>
        </p>

        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Number of rows to generate
          </label>
          <input
            type="number"
            min="1"
            max="10000"
            value={rowCount}
            onChange={(e) => setRowCount(parseInt(e.target.value) || 1)}
            className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={isGenerating}
          />
          <p className="text-xs text-gray-500 mt-1">
            Enter a number between 1 and 10,000
          </p>
        </div>

        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-700 hover:text-gray-900 font-medium"
            disabled={isGenerating}
          >
            Cancel
          </button>
          <button
            onClick={handleGenerate}
            className="px-4 py-2 text-sm bg-purple-500 text-white rounded hover:bg-purple-600 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={isGenerating || rowCount < 1 || rowCount > 10000}
          >
            {isGenerating ? 'Generating...' : 'Generate'}
          </button>
        </div>
      </div>
    </div>
  );
}
