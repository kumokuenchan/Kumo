import React, { useState, useRef } from 'react';
import { X, Upload, User, Trash2 } from 'lucide-react';
import { avatarStorageService, CustomAvatar } from '../services/AvatarStorageService';

interface AvatarManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  username: string;
  currentAvatarUrl?: string;
  onAvatarChange: (avatarUrl: string) => void;
}

const AvatarManagerModal: React.FC<AvatarManagerModalProps> = ({
  isOpen,
  onClose,
  username,
  currentAvatarUrl,
  onAvatarChange,
}) => {
  const [isUploading, setIsUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const customAvatar = avatarStorageService.getCustomAvatar(username);
  const displayAvatar = previewUrl || customAvatar?.avatarUrl || currentAvatarUrl;

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.match(/^image\/(jpeg|jpg)$/)) {
      alert('Please select a JPEG image file');
      return;
    }

    setIsUploading(true);
    try {
      const avatarUrl = await avatarStorageService.uploadImage(file);
      setPreviewUrl(avatarUrl);
      avatarStorageService.saveCustomAvatar(username, avatarUrl);
      onAvatarChange(avatarUrl);
    } catch (error) {
      console.error('Failed to upload avatar:', error);
      alert(error instanceof Error ? error.message : 'Failed to upload avatar');
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemoveAvatar = () => {
    avatarStorageService.removeCustomAvatar(username);
    setPreviewUrl('');
    onAvatarChange(currentAvatarUrl || '');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md mx-4">
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Manage Avatar for {username}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          {/* Avatar Preview */}
          <div className="flex justify-center mb-6">
            <div className="relative">
              {displayAvatar ? (
                <img
                  src={displayAvatar}
                  alt={username}
                  className="w-24 h-24 rounded-full object-cover border-4 border-gray-200 dark:border-gray-700"
                />
              ) : (
                <div className="w-24 h-24 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center border-4 border-gray-300 dark:border-gray-600">
                  <User className="w-12 h-12 text-gray-400 dark:text-gray-500" />
                </div>
              )}
              
              {/* Upload/Remove buttons overlay */}
              <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 flex gap-2">
                <button
                  onClick={handleUploadClick}
                  disabled={isUploading}
                  className="p-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-colors shadow-lg disabled:opacity-50"
                  title="Upload new avatar"
                >
                  <Upload className="w-4 h-4" />
                </button>
                {customAvatar && (
                  <button
                    onClick={handleRemoveAvatar}
                    className="p-2 bg-red-600 text-white rounded-full hover:bg-red-700 transition-colors shadow-lg"
                    title="Remove custom avatar"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* File input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/jpg"
            onChange={handleFileSelect}
            className="hidden"
          />

          {/* Info */}
          <div className="text-center text-sm text-gray-600 dark:text-gray-400">
            <p className="mb-2">Upload a JPEG image to replace the default avatar</p>
            <p className="text-xs">Maximum file size: 5MB</p>
            {customAvatar && (
              <p className="text-xs text-green-600 dark:text-green-400 mt-2">
                Custom avatar uploaded {new Date(customAvatar.uploadedAt).toLocaleDateString()}
              </p>
            )}
          </div>

          {/* Loading state */}
          {isUploading && (
            <div className="mt-4 text-center text-sm text-blue-600 dark:text-blue-400">
              Uploading...
            </div>
          )}

          {/* Actions */}
          <div className="mt-6 flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AvatarManagerModal;