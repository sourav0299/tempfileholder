"use client";
import { useState, useRef, useEffect } from "react";
import DeleteButton from "./components/deleteButton";
import DownloadButton from "../app/components/downloadButton";
import { Toaster, toast } from "react-hot-toast";

export default function Home() {
  const [uploadedFiles, setUploadedFiles] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [fileSizes, setFileSizes] = useState<Record<string, number>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);

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
        setUploadedFiles(data.files.map((file: { url: string }) => file.url));
      } else {
        toast.error("Failed to fetch files");
      }
    } catch (error) {
      toast.error("Error fetching files");
    }
  };

  const uploadToServer = async (file: File) => {
    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });
      const data = await response.json();
      if (response.ok) {
        await storeFileUrl(data.url);
        toast.success("File uploaded successfully");
        return data.url;
      } else {
        throw new Error(data.error || "Upload failed");
      }
    } catch (error) {
      toast.error("Upload failed");
      return null;
    }
  };

  const storeFileUrl = async (url: string) => {
    try {
      const response = await fetch("/api/files", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ url }),
      });
      const data = await response.json();
      if (!data.success) {
        throw new Error("Failed to store file URL");
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

  const handleFileInput = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    if (event.target.files) {
      const files = Array.from(event.target.files);
      await handleFiles(files);
    }
  };

  const handleDelete = async (url: string) => {
    try {
      const response = await fetch("/api/delete", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ url }),
      });
      const data = await response.json();
      if (data.success) {
        setUploadedFiles(uploadedFiles.filter((file) => file !== url));
        setFileSizes((prevSizes) => {
          const newSizes = { ...prevSizes };
          delete newSizes[url];
          return newSizes;
        });
        toast.success("File deleted successfully");
      } else {
        throw new Error(data.error || "Delete failed");
      }
    } catch (error) {
      toast.error("Failed to delete the file. Please try again.");
    }
  };

  const handleFiles = async (files: File[]) => {
    setIsUploading(true);
    const uploadedUrls = await Promise.all(
      files.map((file) => uploadToServer(file))
    );
    const newUrls = uploadedUrls.filter((url): url is string => url !== null);
    setUploadedFiles((prev) => [...prev, ...newUrls]);
    setIsUploading(false);
    if (newUrls.length > 0) {
      toast.success(`${newUrls.length} file(s) uploaded successfully`);
    }
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const getFileType = (url: string) => {
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
      console.error("Error fetching file size:", error);
      return 0;
    }
  };

  const fetchFileSizes = async () => {
    const sizes: Record<string, number> = {};
    for (const url of uploadedFiles) {
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

  return (
    <div className="flex items-center justify-center">
      <Toaster position="top-right" />
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
        {isUploading && <p>Uploading...</p>}
        {uploadedFiles.length > 0 && (
          <div className="mt-4 w-full">
            <h2 className="text-lg font-semibold mb-2">Uploaded Files:</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {uploadedFiles.slice(0, 9).map((url, index) => {
                const fileType = getFileType(url);
                return (
                  <div key={index} className="relative">
                    <div className="w-[250px] h-[250px] bg-gray-100 rounded-lg overflow-hidden">
                      <div className="w-full h-full flex items-center justify-center relative group">
                        {fileType === "image" && (
                          <img
                            src={url}
                            alt={`File ${index + 1}`}
                            className="object-contain w-full h-full p-2"
                          />
                        )}
                        {fileType === "video" && (
                          <video
                            src={url}
                            className="object-contain w-full h-full p-2"
                            controls
                          />
                        )}
                        {fileType === "audio" && (
                          <div className="flex flex-col items-center justify-center w-full h-full p-2">
                            <div className="text-4xl mb-2">
                              {getFileIcon(fileType)}
                            </div>
                            <audio src={url} controls className="w-full" />
                          </div>
                        )}
                        {(fileType === "document" || fileType === "other") && (
                          <div className="w-full h-full relative">
                            <iframe
                              src={`${getGoogleViewerUrl(
                                url
                              )}&embedded=true&chrome=false&rm=minimal`}
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
                            <DeleteButton onDelete={() => handleDelete(url)} />
                            <DownloadButton
                              url={url}
                              fileSize={fileSizes[url] || 0}
                              className="mr-2"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                    <p className="mt-1 text-sm text-gray-500 truncate">
                      {url.split("/").pop()}
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
