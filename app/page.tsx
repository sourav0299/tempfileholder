"use client";
import { useState, useRef, useEffect } from "react";
import DeleteButton from "./components/deleteButton";
import DownloadButton from "../app/components/downloadButton";
import { Toaster, toast } from "react-hot-toast";
import UploadProgress from "./components/UploadProgress";

interface UploadResult {
  secure_url: string;
  public_id: string;
}

export default function Home() {
  const [uploadedFiles, setUploadedFiles] = useState<Array<{ url: string; public_id: string }>>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [fileSizes, setFileSizes] = useState<Record<string, number>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadSpeed, setUploadSpeed] = useState(0);
  const [uploadedSize, setUploadedSize] = useState(0);
  const [totalSize, setTotalSize] = useState(0);
  const [isUploadProgressVisible, setIsUploadProgressVisible] = useState(false);
  const [uploadQueue, setUploadQueue] = useState<{
    [key: string]: {
      file: File;
      progress: number;
      speed: number;
      uploaded: number;
      status: 'queued' | 'uploading' | 'completed' | 'error';
      position: number;
      controller?: AbortController;
    };
  }>({});

  // Add a ref to track active uploads
  const activeUploadRef = useRef<boolean>(false);
  const uploadQueueRef = useRef(uploadQueue);

  // Separate processQueue function for better control
  const processQueue = async () => {
    console.log('Processing queue, active:', activeUploadRef.current);
    
    if (activeUploadRef.current) {
      console.log('Upload already in progress');
      return;
    }

    const nextUpload = Object.entries(uploadQueueRef.current)
      .filter(([_, data]) => data.status === 'queued')
      .sort((a, b) => a[1].position - b[1].position)[0];

    if (!nextUpload) {
      console.log('No files in queue');
      return;
    }

    const [fileId, data] = nextUpload;
    console.log('Starting upload for:', { fileId, fileName: data.file.name });
    activeUploadRef.current = true;

    try {
      // Update status to uploading
      setUploadQueue(prev => ({
        ...prev,
        [fileId]: { ...data, status: 'uploading' }
      }));

      const result = await uploadToServer(data.file, fileId);
      console.log('Upload result:', result);

      if (result) {
        // Remove completed upload from queue
        setUploadQueue(prev => {
          const newQueue = { ...prev };
          delete newQueue[fileId];
          return newQueue;
        });
        setUploadedFiles(prev => [...prev, { url: result.secure_url, public_id: result.public_id }]);
        toast.success(`${data.file.name} uploaded successfully`);
      }
    } catch (error) {
      console.error('Process queue error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to upload file');
    } finally {
      activeUploadRef.current = false;
      
      // Process next file in queue
      setTimeout(() => {
        const remainingFiles = Object.values(uploadQueueRef.current)
          .filter(data => data.status === 'queued').length;
        console.log('Remaining files to process:', remainingFiles);
        if (remainingFiles > 0) {
          processQueue();
        }
      }, 100);
    }
  };

  const handleFiles = async (files: File[]) => {
    try {
      console.log('HandleFiles called with', files.length, 'files');
      
      // Add files to upload queue with position numbers
      const newQueue = { ...uploadQueue };
      const startPosition = Math.max(
        0,
        ...Object.values(uploadQueue).map(data => data.position)
      ) + 1;

      files.forEach((file, index) => {
        const fileId = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9]/g, '_')}`;
        console.log('Adding to queue:', { fileId, fileName: file.name, size: file.size });
        
        newQueue[fileId] = {
          file,
          progress: 0,
          speed: 0,
          uploaded: 0,
          status: 'queued',
          position: startPosition + index,
          controller: undefined
        };
      });

      console.log('Setting new queue state');
      setUploadQueue(newQueue);
      
      // Force queue processing to start
      activeUploadRef.current = false;
      processQueue();
    } catch (error) {
      console.error('Error in handleFiles:', error);
      toast.error('Failed to queue files for upload');
    }
  };

  // Keep the ref in sync with the state
  useEffect(() => {
    uploadQueueRef.current = uploadQueue;
  }, [uploadQueue]);

  // Update the upload queue effect to use the processQueue function
  useEffect(() => {
    const queuedFiles = Object.values(uploadQueue)
      .filter(data => data.status === 'queued').length;
    
    if (queuedFiles > 0 && !activeUploadRef.current) {
      console.log('Queue changed, starting processing');
      processQueue();
    }
  }, [uploadQueue]);

  // Remove the localStorage load effect and add cleanup on mount/unmount
  useEffect(() => {
    // Clear any existing uploads in localStorage
    localStorage.removeItem('uploadQueue');

    // Add event listener for beforeunload
    const handleBeforeUnload = () => {
      // Cancel all active uploads
      Object.entries(uploadQueueRef.current).forEach(([fileId, data]) => {
        if (data.status === 'uploading' || data.status === 'queued') {
          if (data.controller) {
            data.controller.abort();
          }
        }
      });
      // Clear the queue from localStorage
      localStorage.removeItem('uploadQueue');
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      // Cleanup on unmount
      handleBeforeUnload();
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, []);

  useEffect(() => {
    fetchFiles();
  }, []);

  useEffect(() => {
    if (uploadedFiles.length > 0) {
      fetchFileSizes();
    }
  }, [uploadedFiles]);

  const fetchFiles = async () => {
    try {
      const response = await fetch("/api/files");
      const data = await response.json();
      if (data.success) {
        setUploadedFiles(data.files);
      } else {
        toast.error("Failed to fetch files");
      }
    } catch (error) {
      toast.error("Error fetching files");
    }
  };

  const cancelUpload = async (fileId: string) => {
    try {
      console.log('Cancelling upload:', fileId);
      
      // Get the upload data
      const upload = uploadQueueRef.current[fileId];
      if (!upload) {
        console.log('Upload not found:', fileId);
        return;
      }

      // Abort any ongoing request
      if (upload.controller) {
        upload.controller.abort();
      }

      // Update queue state immediately
      setUploadQueue(prev => {
        const newQueue = { ...prev };
        delete newQueue[fileId]; // Remove the cancelled upload
        return newQueue;
      });

      // Reset active upload flag if this was the active upload
      if (upload.status === 'uploading') {
        activeUploadRef.current = false;
      }

      toast.success('Upload cancelled');

      // Process next file in queue
      const remainingFiles = Object.values(uploadQueueRef.current)
        .filter(data => data.status === 'queued').length;

      if (remainingFiles > 0) {
        setTimeout(() => {
          processQueue();
        }, 100);
      }
    } catch (error) {
      console.error('Error during cancellation:', error);
      toast.error('Error cancelling upload');
    }
  };

  const uploadToServer = async (file: File, fileId: string): Promise<UploadResult | null> => {
    console.log('Starting upload for:', { fileId, fileName: file.name, size: file.size });
    let isCancelled = false;
    let currentController: AbortController | null = null;

    try {
      // Check if file is larger than 100MB
      const LARGE_FILE_THRESHOLD = 100 * 1024 * 1024; // 100MB
      const CHUNK_SIZE = 99 * 1024 * 1024; // 99MB chunks

      // For files under 100MB, upload directly
      if (file.size <= LARGE_FILE_THRESHOLD) {
        console.log('Small file, uploading directly');
        currentController = new AbortController();
        
        const formData = new FormData();
        formData.append('file', file);
        formData.append('fileId', fileId);
        formData.append('originalName', file.name);
        formData.append('chunkIndex', '0');
        formData.append('totalChunks', '1');
        formData.append('isComplete', 'true');

        try {
          const response = await fetch('/api/upload', {
            method: 'POST',
            body: formData,
            signal: currentController.signal
          });

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({ error: 'Upload failed' }));
            throw new Error(errorData.error || `Upload failed with status ${response.status}`);
          }

          const data = await response.json();
          console.log('Upload response:', data);

          if (!data.success) {
            throw new Error(data.error || 'Upload failed');
          }

          // Update progress to 100%
          setUploadQueue(prev => ({
            ...prev,
            [fileId]: {
              ...prev[fileId],
              progress: 100,
              uploaded: file.size,
              status: 'completed'
            }
          }));

          // Store the file URL and return the upload result
          await storeFileUrl({ secure_url: data.url, public_id: data.public_id });
          return { secure_url: data.url, public_id: data.public_id };

        } catch (error) {
          if (error instanceof Error && error.name === 'AbortError') {
            console.log('Upload aborted');
            isCancelled = true;
            return null;
          }
          throw error;
        }
      }

      // For large files, use chunked upload
      console.log('Large file, using chunked upload');
      const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
      let uploadedUrl = '';
      let startTime = Date.now();
      let totalUploaded = 0;

      for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
        // Check if upload was cancelled
        const currentQueue = uploadQueueRef.current[fileId];
        if (!currentQueue || currentQueue.status !== 'uploading' || isCancelled) {
          console.log('Upload cancelled or removed from queue');
          return null;
        }

        const start = chunkIndex * CHUNK_SIZE;
        const end = Math.min(start + CHUNK_SIZE, file.size);
        const chunk = file.slice(start, end);
        console.log('Processing chunk:', { chunkIndex, start, end, size: chunk.size });

        currentController = new AbortController();
        const formData = new FormData();
        formData.append('file', chunk);
        formData.append('chunkIndex', chunkIndex.toString());
        formData.append('totalChunks', totalChunks.toString());
        formData.append('fileId', fileId);
        formData.append('originalName', file.name);
        formData.append('isComplete', (chunkIndex === totalChunks - 1).toString());

        try {
          const response = await fetch('/api/upload', {
            method: 'POST',
            body: formData,
            signal: currentController.signal
          });

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({ error: 'Upload failed' }));
            throw new Error(errorData.error || `Chunk upload failed with status ${response.status}`);
          }

          const data = await response.json();
          console.log('Chunk upload response:', data);

          if (!data.success) {
            throw new Error(data.error || 'Chunk upload failed');
          }

          uploadedUrl = data.url || uploadedUrl;
          totalUploaded += chunk.size;

          // Update progress
          const currentTime = Date.now();
          const elapsedTime = (currentTime - startTime) / 1000;
          const speed = elapsedTime > 0 ? (chunk.size / elapsedTime) / (1024 * 1024) : 0;

          setUploadQueue(prev => ({
            ...prev,
            [fileId]: {
              ...prev[fileId],
              progress: (totalUploaded / file.size) * 100,
              speed,
              uploaded: totalUploaded
            }
          }));

          startTime = currentTime;

        } catch (error) {
          if (error instanceof Error && error.name === 'AbortError') {
            console.log('Chunk upload aborted');
            isCancelled = true;
            return null;
          }
          throw error;
        } finally {
          currentController = null;
        }
      }

      if (uploadedUrl && !isCancelled) {
        console.log('Upload completed successfully');
        await storeFileUrl({ secure_url: uploadedUrl, public_id: '' });
        return { secure_url: uploadedUrl, public_id: '' };
      }
      return null;

    } catch (error) {
      console.error('Upload error:', error);
      // Update upload status to error
      setUploadQueue(prev => ({
        ...prev,
        [fileId]: {
          ...prev[fileId],
          status: 'error',
          progress: 0,
          speed: 0,
          uploaded: 0
        }
      }));
      throw error;
    }
  };

  const storeFileUrl = async (uploadResult: UploadResult) => {
    try {
      const response = await fetch("/api/files", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ 
          url: uploadResult.secure_url,
          public_id: uploadResult.public_id
        }),
      });
      const data = await response.json();
      if (!data.success) {
        toast.error("Failed to store file URL");
      }
    } catch (error) {
      toast.error("Failed to store file URL");
    }
  };

  const handleFileDrop = async (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const files = Array.from(event.dataTransfer.files);
    await handleFiles(files);
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
  };

  const handleFileInput = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      if (event.target.files && event.target.files.length > 0) {
        console.log('File input triggered');
        const files = Array.from(event.target.files);
        console.log('Files to upload:', files.map(f => ({ name: f.name, size: f.size })));
        event.target.value = ''; // Reset input after getting files
        await handleFiles(files);
      }
    } catch (error) {
      console.error('Error in handleFileInput:', error);
      toast.error('Failed to process selected files');
    }
  };

  const handleDelete = async (file: { url: string; public_id: string }) => {
    try {
      console.log('Attempting to delete file:', file);

      // Try to delete from Cloudinary first using the stored public_id
      const cloudinaryResponse = await deleteFile(file.public_id);
      console.log('Cloudinary delete response:', cloudinaryResponse);

      if (!cloudinaryResponse.success) {
        throw new Error(cloudinaryResponse.error || 'Failed to delete from Cloudinary');
      }

      // If Cloudinary delete was successful, delete from MongoDB
      const mongoDbResponse = await fetch("/api/files", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ url: file.url }),
      });

      const mongoDbData = await mongoDbResponse.json();
      console.log('MongoDB delete response:', mongoDbData);

      if (!mongoDbData.success) {
        throw new Error("Failed to delete file reference from database");
      }

      // Update the UI only after both deletions are successful
      setUploadedFiles((prevFiles) => prevFiles.filter((f) => f.url !== file.url));
      toast.success("File deleted successfully");

    } catch (error) {
      console.error("Delete error:", error);
      const errorMessage = error instanceof Error 
        ? error.message
        : "Failed to delete file";
      toast.error(errorMessage);
    }
  };

  async function deleteFile(publicId: string) {
    try {
      console.log('Sending delete request for public ID:', publicId);
      
      const response = await fetch("/api/delete", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ publicId }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Delete API error response:', errorData);
        throw new Error(
          `Delete failed: ${errorData.error || response.statusText}`
        );
      }

      const result = await response.json();
      console.log('Delete API success response:', result);
      return result;

    } catch (error) {
      console.error('Delete file error:', error);
      return {
        error: error instanceof Error 
          ? error.message 
          : "Failed to delete file from storage"
      };
    }
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const getFileType = (url: string) => {
    if (!url) return "other";
    const extension = url.split(".").pop()?.toLowerCase();
    if (["jpg", "jpeg", "png", "gif", "webp"].includes(extension || ""))
      return "image";
    if (["mp4", "webm", "ogg"].includes(extension || "")) return "video";
    if (["mp3", "wav"].includes(extension || "")) return "audio";
    if (
      ["pdf", "doc", "docx", "xls", "xlsx", "ppt", "pptx"].includes(
        extension || ""
      )
    )
      return "document";
    return "other";
  };

  const getFileIcon = (fileType: string) => {
    switch (fileType) {
      case "image":
        return "🖼️";
      case "video":
        return "🎥";
      case "audio":
        return "🎵";
      default:
        return "📄";
    }
  };

  const getFileSize = async (url: string) => {
    try {
      const response = await fetch(url, { method: "HEAD" });
      const size = response.headers.get("Content-Length");
      return size ? parseInt(size, 10) : 0;
    } catch (error) {
      toast.error("Error fetching file size");
      return 0;
    }
  };

  const fetchFileSizes = async () => {
    const sizes: Record<string, number> = {};
    for (const url of uploadedFiles.map(file => file.url)) {
      if (!fileSizes[url]) {
        sizes[url] = await getFileSize(url);
      } else {
        sizes[url] = fileSizes[url];
      }
    }
    setFileSizes(sizes);
  };

  const getGoogleViewerUrl = (url: string) => {
    return `https://drive.google.com/viewerng/viewer?embedded=true&url=${encodeURIComponent(
      url
    )}`;
  };

  // Render upload progress for all files in queue
  const renderUploadProgress = () => {
    const activeUploads = Object.entries(uploadQueue)
      .map(([fileId, data]) => ({
        fileName: data.file.name,
        progress: data.progress,
        speed: data.speed,
        uploaded: data.uploaded,
        total: data.file.size,
        status: data.status,
        position: data.position
      }))
      .sort((a, b) => a.position - b.position);

    if (activeUploads.length === 0) return null;

    return (
      <div className="fixed bottom-4 left-4 z-50">
        <UploadProgress
          uploads={activeUploads}
          onCancel={(position) => {
            const fileId = Object.entries(uploadQueue).find(
              ([_, data]) => data.position === position
            )?.[0];
            if (fileId) {
              cancelUpload(fileId);
            }
          }}
        />
      </div>
    );
  };

  return (
    <div className="flex items-center justify-center flex-col">
      <Toaster position="top-right" />
      <div className="flex flex-col items-center justify-center py-5">
        <div className="text-xl font-bold text-blue-300">Temp-File-Holder</div>
        <div className="text-red-500">
          Note - Make sure you delete your file after using I dont want to load
          up my servers
        </div>
      </div>
      <div className="container max-w-[1200px] flex flex-col items-center mt-10">
        <div
          className="border-2 border-dashed border-gray-300 rounded-lg p-8 mb-4 text-center cursor-pointer w-full"
          onDrop={handleFileDrop}
          onDragOver={handleDragOver}
          onClick={handleClick}
        >
          <p>Drag and drop files here</p>
          <p>or</p>
          <p className="text-blue-500 hover:underline">Click here to upload</p>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileInput}
            className="hidden"
            multiple
          />
        </div>
        {renderUploadProgress()}
        {uploadedFiles.length > 0 && (
          <div className="mt-4 w-full flex items-center justify-center flex-col">
            <h2 className="text-lg font-semibold mb-2">Uploaded Files:</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              {uploadedFiles.slice(0, 9).map((file, index) => {
                const fileType = getFileType(file.url);
                return (
                  <div key={index} className="relative">
                    <div className="w-[250px] h-[250px] bg-gray-100 rounded-lg overflow-hidden">
                      <div className="w-full h-full flex items-center justify-center relative group">
                        {fileType === "image" && (
                          <img
                            src={file.url}
                            alt={`File ${index + 1}`}
                            className="object-contain w-full h-full p-2"
                          />
                        )}
                        {fileType === "video" && (
                          <video
                            src={file.url}
                            className="object-contain w-full h-full p-2"
                            controls
                          />
                        )}
                        {fileType === "audio" && (
                          <div className="flex flex-col items-center justify-center w-full h-full p-2">
                            <div className="text-4xl mb-2">
                              {getFileIcon(fileType)}
                            </div>
                            <audio src={file.url} controls className="w-full" />
                          </div>
                        )}
                        {(fileType === "document" || fileType === "other") && (
                          <div className="w-full h-full relative">
                            <iframe
                              src={`${getGoogleViewerUrl(file.url)}&embedded=true&chrome=false&rm=minimal`}
                              className="absolute inset-0 w-full h-full"
                              frameBorder="0"
                              scrolling="no"
                              title={`File ${index + 1}`}
                              style={{
                                transform: "scale(0.75)",
                                transformOrigin: "top left",
                                width: "133.33%",
                                height: "133.33%",
                              }}
                            ></iframe>
                          </div>
                        )}
                        <div className="absolute inset-0 bg-black bg-opacity-50 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                          <div className="flex gap-2">
                            <DeleteButton onDelete={() => handleDelete(file)} />
                            <DownloadButton
                              url={file.url}
                              fileSize={fileSizes[file.url] || 0}
                              className="mr-2"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                    <p className="mt-1 text-sm text-gray-500 truncate">
                      {file.url.split("/").pop()}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
