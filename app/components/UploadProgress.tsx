import React from "react";

interface UploadProgressProps {
  progress: number;
  speed: number;
  uploaded: number;
  total: number;
  isVisible: boolean;
}

const UploadProgress: React.FC<UploadProgressProps> = ({
  progress,
  speed,
  uploaded,
  total,
  isVisible,
}) => {
  const formatSize = (bytes: number) => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black opacity-50 backdrop-blur-sm"></div>
      <div className="z-10 bg-white p-6 rounded-lg shadow-xl w-full max-w-md">
        <h2 className="text-xl font-semibold mb-4">Uploading...</h2>
        <div className="mb-2 flex justify-between text-sm text-gray-600">
          <span>{`${formatSize(uploaded)} / ${formatSize(total)}`}</span>
          <span>{`${speed.toFixed(2)} MB/s`}</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2.5">
          <div
            className="bg-blue-600 h-2.5 rounded-full transition-all duration-300 ease-in-out"
            style={{ width: `${progress}%` }}
          ></div>
        </div>
      </div>
    </div>
  );
};

export default UploadProgress;
