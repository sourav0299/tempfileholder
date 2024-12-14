import React from "react";
import styled from "styled-components";

interface DownloadButtonProps {
  url: string;
  fileSize: number;
  className?: string;
}

const DownloadButton: React.FC<DownloadButtonProps> = ({
  url,
  fileSize,
  className,
}) => {
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const handleDownload = async () => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = url.split("/").pop() || "download";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    } catch (error) {
      console.error("Download failed:", error);
    }
  };

  return (
    <StyledWrapper className={className}>
      <button className="Btn" onClick={handleDownload}>
        <span className="tooltip">{formatFileSize(fileSize)}</span>
        <svg
          className="svgIcon"
          viewBox="0 0 384 512"
          height="1em"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path d="M169.4 470.6c12.5 12.5 32.8 12.5 45.3 0l160-160c12.5-12.5 12.5-32.8 0-45.3s-32.8-12.5-45.3 0L224 370.8 224 64c0-17.7-14.3-32-32-32s-32 14.3-32 32l0 306.7L54.6 265.4c-12.5-12.5-32.8-12.5-45.3 0s-12.5 32.8 0 45.3l160 160z" />
        </svg>
        <span className="icon2" />
      </button>
    </StyledWrapper>
  );
};

const StyledWrapper = styled.div`
  .Btn {
    width: 50px;
    height: 50px;
    border: none;
    border-radius: 50%;
    background-color: rgb(27, 27, 27);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    position: relative;
    transition-duration: 0.3s;
    box-shadow: 2px 2px 10px rgba(0, 0, 0, 0.11);
  }

  .svgIcon {
    fill: #2196f3;
  }

  .icon2 {
    width: 18px;
    height: 5px;
    border-bottom: 2px solid #2196f3;
    border-left: 2px solid #2196f3;
    border-right: 2px solid #2196f3;
  }

  .tooltip {
    position: absolute;
    right: -80px;
    opacity: 0;
    background-color: rgb(12, 12, 12);
    color: white;
    padding: 5px 10px;
    border-radius: 5px;
    display: flex;
    align-items: center;
    justify-content: center;
    transition-duration: 0.2s;
    pointer-events: none;
    letter-spacing: 0.5px;
    white-space: nowrap;
  }

  .tooltip::before {
    position: absolute;
    content: "";
    width: 10px;
    height: 10px;
    background-color: rgb(12, 12, 12);
    background-size: 1000%;
    background-position: center;
    transform: rotate(45deg);
    left: -5px;
    transition-duration: 0.3s;
  }

  .Btn:hover .tooltip {
    opacity: 1;
    transition-duration: 0.3s;
  }

  .Btn:hover {
    background-color: #2196f3;
    transition-duration: 0.3s;
  }

  .Btn:hover .icon2 {
    border-bottom: 2px solid black;
    border-left: 2px solid black;
    border-right: 2px solid black;
  }

  .Btn:hover .svgIcon {
    fill: black;
    animation: slide-in-top 0.6s cubic-bezier(0.25, 0.46, 0.45, 0.94) both;
  }

  @keyframes slide-in-top {
    0% {
      transform: translateY(-10px);
      opacity: 0;
    }

    100% {
      transform: translateY(0px);
      opacity: 1;
    }
  }
`;

export default DownloadButton;
