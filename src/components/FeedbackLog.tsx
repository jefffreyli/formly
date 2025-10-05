"use client";

import { useEffect, useRef, useState } from "react";

export interface LogEntry {
  id: string;
  timestamp: number;
  type: "info" | "success" | "warning" | "error" | "api";
  category: string;
  message: string;
  data?: Record<string, unknown>;
}

interface FeedbackLogProps {
  maxEntries?: number;
  className?: string;
}

export function FeedbackLog({
  maxEntries = 50,
  className = "",
}: FeedbackLogProps) {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isExpanded, setIsExpanded] = useState(true);
  const logContainerRef = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);

  // Auto-scroll to bottom when new logs arrive
  useEffect(() => {
    if (autoScroll && logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [logs, autoScroll]);

  // Expose addLog function globally for easy access
  useEffect(() => {
    (window as any).addFeedbackLog = (
      type: LogEntry["type"],
      category: string,
      message: string,
      data?: Record<string, unknown>
    ) => {
      const newLog: LogEntry = {
        id: `${Date.now()}-${Math.random()}`,
        timestamp: Date.now(),
        type,
        category,
        message,
        data,
      };

      setLogs((prev) => {
        const updated = [...prev, newLog];
        // Keep only last N entries
        if (updated.length > maxEntries) {
          return updated.slice(-maxEntries);
        }
        return updated;
      });
    };

    return () => {
      delete (window as any).addFeedbackLog;
    };
  }, [maxEntries]);

  const clearLogs = () => {
    setLogs([]);
  };

  const getTypeColor = (type: LogEntry["type"]) => {
    switch (type) {
      case "success":
        return "text-green-600 bg-green-50";
      case "error":
        return "text-red-600 bg-red-50";
      case "warning":
        return "text-yellow-600 bg-yellow-50";
      case "api":
        return "text-blue-600 bg-blue-50";
      default:
        return "text-gray-600 bg-gray-50";
    }
  };

  const getTypeIcon = (type: LogEntry["type"]) => {
    switch (type) {
      case "success":
        return "✓";
      case "error":
        return "✗";
      case "warning":
        return "⚠";
      case "api":
        return "🔗";
      default:
        return "ℹ";
    }
  };

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString("en-US", {
      hour12: false,
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      fractionalSecondDigits: 3,
    });
  };

  if (!isExpanded) {
    return (
      <div className={`${className}`}>
        <button
          onClick={() => setIsExpanded(true)}
          className="px-3 py-2 bg-gray-900/90 text-white text-xs rounded-lg backdrop-blur-sm hover:bg-gray-800 transition-colors"
        >
          📊 Show Activity Log ({logs.length})
        </button>
      </div>
    );
  }

  return (
    <div
      className={`bg-gray-900/95 backdrop-blur-sm rounded-xl shadow-2xl border border-gray-700 ${className}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-gray-700">
        <div className="flex items-center space-x-2">
          <span className="text-xs font-semibold text-white">
            🔍 Activity Log
          </span>
          <span className="text-xs text-gray-400">({logs.length})</span>
        </div>
        <div className="flex items-center space-x-2">
          <label className="flex items-center space-x-1 cursor-pointer">
            <input
              type="checkbox"
              checked={autoScroll}
              onChange={(e) => setAutoScroll(e.target.checked)}
              className="w-3 h-3"
            />
            <span className="text-xs text-gray-400">Auto-scroll</span>
          </label>
          <button
            onClick={clearLogs}
            className="text-xs text-gray-400 hover:text-white transition-colors"
          >
            Clear
          </button>
          <button
            onClick={() => setIsExpanded(false)}
            className="text-xs text-gray-400 hover:text-white transition-colors"
          >
            Minimize
          </button>
        </div>
      </div>

      {/* Log entries */}
      <div
        ref={logContainerRef}
        className="h-96 overflow-y-auto p-2 space-y-1 font-mono text-xs"
        style={{
          scrollbarWidth: "thin",
          scrollbarColor: "#4B5563 #1F2937",
        }}
      >
        {logs.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-500">
            No activity yet...
          </div>
        ) : (
          logs.map((log) => (
            <div
              key={log.id}
              className={`px-2 py-1 rounded ${getTypeColor(
                log.type
              )} flex items-start space-x-2`}
            >
              <span className="flex-shrink-0 mt-0.5">
                {getTypeIcon(log.type)}
              </span>
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline space-x-2">
                  <span className="text-gray-500 flex-shrink-0">
                    {formatTime(log.timestamp)}
                  </span>
                  <span className="font-semibold flex-shrink-0">
                    [{log.category}]
                  </span>
                  <span className="break-words">{log.message}</span>
                </div>
                {log.data && Object.keys(log.data).length > 0 && (
                  <div className="mt-1 text-xs opacity-75 pl-4">
                    {JSON.stringify(log.data, null, 2)}
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// Helper function to add logs from anywhere in the app
export function addLog(
  type: LogEntry["type"],
  category: string,
  message: string,
  data?: Record<string, unknown>
) {
  if (typeof window !== "undefined" && (window as any).addFeedbackLog) {
    (window as any).addFeedbackLog(type, category, message, data);
  }
}
