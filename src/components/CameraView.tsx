import { useRef, useEffect } from "react";

interface CameraViewProps {
  stream: MediaStream | null;
  className?: string;
}

export function CameraView({ stream, className = "" }: CameraViewProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  return (
    <div className={`relative w-full camera-transition ${className}`}>
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="w-full h-auto rounded-2xl shadow-formly-lg animate-fade-in"
        style={{ maxHeight: "80vh" }}
      />

      {/* Skeleton overlay canvas - positioned over video */}
      <canvas
        className="absolute inset-0 w-full h-full rounded-2xl pointer-events-none"
        style={{ maxHeight: "80vh" }}
      />
    </div>
  );
}
