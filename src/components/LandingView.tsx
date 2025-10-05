import { LoadingSpinner } from "./LoadingSpinner";

interface LandingViewProps {
  onStartCamera: () => void;
  isLoading?: boolean;
}

export function LandingView({
  onStartCamera,
  isLoading = false,
}: LandingViewProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-6 py-12 max-w-4xl mx-auto">
      {/* Main Content */}
      <div className="text-center space-y-8">
        {/* App Title */}
        <div className="space-y-4 animate-fade-in-up">
          <h1 className="text-6xl md:text-7xl font-light tracking-tight text-foreground-primary">
            Reply
          </h1>
          <p className="text-xl md:text-2xl text-foreground-secondary font-light max-w-lg mx-auto leading-relaxed">
            Perfect your form, accelerate recovery
          </p>
        </div>

        {/* Start Button */}
        <div className="pt-8">
          <button
            onClick={onStartCamera}
            disabled={isLoading}
            className="group relative px-12 py-4 bg-accent-primary hover:bg-accent-secondary disabled:bg-foreground-secondary disabled:cursor-not-allowed text-white text-lg font-medium rounded-2xl shadow-formly hover:shadow-formly-lg transition-all duration-300 ease-out transform hover:scale-105 disabled:hover:scale-100"
          >
            {isLoading ? (
              <div className="flex items-center space-x-3">
                <LoadingSpinner size="md" className="text-white" />
                <span>Starting Camera...</span>
              </div>
            ) : (
              <div className="flex items-center space-x-3">
                <svg
                  className="w-6 h-6 transition-transform group-hover:scale-110"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
                <span>Start Camera</span>
              </div>
            )}
          </button>
        </div>

        {/* Decorative Elements */}
        <div className="pt-16 flex justify-center">
          <div className="grid grid-cols-3 gap-8 opacity-30">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="w-2 h-2 bg-foreground-secondary rounded-full animate-pulse"
                style={{ animationDelay: `${i * 0.2}s` }}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
