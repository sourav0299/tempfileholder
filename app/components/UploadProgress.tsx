import React from 'react';

interface UploadProgressProps {
  uploads: {
    fileName: string;
    progress: number;
    speed: number;
    uploaded: number;
    total: number;
    status: 'queued' | 'uploading' | 'completed' | 'error';
    position: number;
  }[];
  onCancel?: (position: number) => void;
}

const formatBytes = (bytes: number, decimals = 2) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};

const formatTime = (seconds: number): string => {
  if (!isFinite(seconds) || seconds < 0) return 'Calculating...';
  if (seconds === 0) return '0s';

  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  const parts = [];
  if (hrs > 0) parts.push(`${hrs}h`);
  if (mins > 0) parts.push(`${mins}m`);
  if (secs > 0 || parts.length === 0) parts.push(`${secs}s`);

  return parts.join(' ');
};

const CircularProgress: React.FC<{ progress: number }> = ({ progress }) => {
  const radius = 30;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  return (
    <div className="relative w-20 h-20">
      <svg className="w-full h-full transform -rotate-90">
        <circle
          className="text-gray-200"
          strokeWidth="8"
          stroke="currentColor"
          fill="transparent"
          r={radius}
          cx="40"
          cy="40"
        />
        <circle
          className="text-blue-500 transition-all duration-300"
          strokeWidth="8"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          stroke="currentColor"
          fill="transparent"
          r={radius}
          cx="40"
          cy="40"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-sm font-semibold">{Math.round(progress)}%</span>
      </div>
    </div>
  );
};

const UploadProgress: React.FC<UploadProgressProps> = ({ uploads, onCancel }) => {
  if (uploads.length === 0) return null;

  const totalBytes = uploads.reduce((sum, upload) => sum + upload.total, 0);
  const uploadedBytes = uploads.reduce((sum, upload) => sum + upload.uploaded, 0);
  const totalProgress = (uploadedBytes / totalBytes) * 100;
  const currentSpeed = uploads
    .filter(upload => upload.status === 'uploading')
    .reduce((sum, upload) => sum + upload.speed, 0);
  
  const remainingBytes = totalBytes - uploadedBytes;
  const timeRemaining = currentSpeed > 0 ? remainingBytes / (currentSpeed * 1024 * 1024) : 0;

  const activeUploads = uploads.filter(u => u.status === 'uploading').length;
  const queuedUploads = uploads.filter(u => u.status === 'queued').length;

  return (
    <div className="bg-white rounded-lg shadow-md p-4 w-80">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-4">
          <CircularProgress progress={totalProgress} />
          <div className="text-sm">
            <div className="font-medium text-gray-900">
              {activeUploads > 0 ? 'Uploading...' : 'Queued'}
            </div>
            <div className="text-gray-500">
              {formatBytes(uploadedBytes)} / {formatBytes(totalBytes)}
            </div>
          </div>
        </div>
      </div>

      <div className="text-sm text-gray-600 mb-3">
        <div className="flex justify-between mb-1">
          <span>Speed:</span>
          <span className="font-medium">
            {currentSpeed > 0 ? `${currentSpeed.toFixed(1)} MB/s` : '-'}
          </span>
        </div>
        <div className="flex justify-between">
          <span>Time remaining:</span>
          <span className="font-medium">
            {currentSpeed > 0 ? formatTime(timeRemaining) : '-'}
          </span>
        </div>
      </div>

      {uploads.length > 0 && (
        <div className="border-t border-gray-200 pt-3">
          <div className="text-sm font-medium text-gray-700 mb-2">
            Queue ({queuedUploads + activeUploads} files)
          </div>
          <div className="max-h-32 overflow-y-auto">
            {uploads.map((upload, index) => (
              <div
                key={index}
                className="flex items-center justify-between py-1 text-sm"
              >
                <div className="flex items-center space-x-2 truncate">
                  <span className="w-4 text-gray-400">
                    {upload.status === 'uploading' ? '→' : '#'}
                  </span>
                  <span className="truncate text-gray-600" title={upload.fileName}>
                    {upload.fileName}
                  </span>
                </div>
                {upload.status === 'uploading' && onCancel && (
                  <button
                    onClick={() => onCancel(upload.position)}
                    className="text-red-500 hover:text-red-700 text-xs"
                  >
                    Cancel
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default UploadProgress;
