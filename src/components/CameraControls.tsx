interface CameraControlsProps {
  onStopCamera: () => void;
  className?: string;
}

export function CameraControls({
  onStopCamera,
  className = "",
}: CameraControlsProps) {
  return (
    <div className={`fixed top-6 right-6 z-10 ${className}`}>
      <button
        onClick={onStopCamera}
        className="group flex items-center justify-center w-12 h-12 bg-white/90 hover:bg-white text-foreground-primary rounded-full shadow-formly hover:shadow-formly-lg transition-all duration-200 backdrop-blur-sm"
        aria-label="Stop camera"
      >
        <svg
          className="w-5 h-5 transition-transform group-hover:scale-110"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 10h6v4H9z"
          />
        </svg>
      </button>
    </div>
  );
}
