interface ErrorMessageProps {
  error: string;
  onRetry?: () => void;
  className?: string;
}

export function ErrorMessage({
  error,
  onRetry,
  className = "",
}: ErrorMessageProps) {
  return (
    <div className={`text-center space-y-6 max-w-md mx-auto ${className}`}>
      <div className="w-16 h-16 mx-auto bg-red-50 rounded-full flex items-center justify-center">
        <svg
          className="w-8 h-8 text-red-500"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      </div>

      <div className="space-y-2">
        <h3 className="text-lg font-semibold text-foreground-primary">
          Camera Error
        </h3>
        <p className="text-foreground-secondary text-sm leading-relaxed">
          {error}
        </p>
      </div>

      {onRetry && (
        <button
          onClick={onRetry}
          className="px-6 py-3 bg-accent-primary hover:bg-accent-secondary text-white font-medium rounded-xl transition-colors duration-200"
        >
          Try Again
        </button>
      )}
    </div>
  );
}
