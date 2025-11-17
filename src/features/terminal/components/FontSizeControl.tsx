import React, { useState } from 'react';

interface FontSizeControlProps {
  initialFontSize: number;
  onFontSizeChange: (fontSize: number) => void;
  onFontSizeSave: (fontSize: number) => void;
  terminalId?: string;
}

export default function FontSizeControl({ 
  initialFontSize, 
  onFontSizeChange, 
  onFontSizeSave,
  terminalId
}: FontSizeControlProps) {
  const [fontSize, setFontSize] = useState(initialFontSize);

  const increaseFontSize = () => {
    const newFontSize = fontSize + 1;
    setFontSize(newFontSize);
    onFontSizeChange(newFontSize);
    onFontSizeSave(newFontSize);
  };

  const decreaseFontSize = () => {
    if (fontSize <= 8) return; // Minimum font size
    const newFontSize = fontSize - 1;
    setFontSize(newFontSize);
    onFontSizeChange(newFontSize);
    onFontSizeSave(newFontSize);
  };

  const resetFontSize = () => {
    const defaultFontSize = 14;
    setFontSize(defaultFontSize);
    onFontSizeChange(defaultFontSize);
    
    // Remove from localStorage to use default
    if (terminalId) {
      localStorage.removeItem(`terminal_font_size_${terminalId}`);
    } else {
      localStorage.removeItem(`terminal_font_size_default`);
    }
    onFontSizeSave(defaultFontSize);
  };

  return (
    <div className="flex items-center gap-1">
      <button
        onClick={decreaseFontSize}
        className="text-gray-400 hover:text-gray-200 transition-colors p-1"
        title="Decrease font size"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
        </svg>
      </button>
      <button 
        onClick={resetFontSize}
        className="text-gray-400 hover:text-gray-200 transition-colors p-1"
        title="Reset font size"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
      </button>
      <button 
        onClick={increaseFontSize}
        className="text-gray-400 hover:text-gray-200 transition-colors p-1"
        title="Increase font size"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
      </button>
    </div>
  );
}