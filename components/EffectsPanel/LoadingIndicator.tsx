import React from 'react';

interface LoadingIndicatorProps {
  message?: string;
  size?: 'small' | 'medium' | 'large';
}

/**
 * Loading indicator component with customizable message and size
 */
export default function LoadingIndicator({ 
  message = 'Loading...', 
  size = 'medium' 
}: LoadingIndicatorProps) {
  // Determine spinner size based on the size prop
  const spinnerSize = {
    small: 'w-4 h-4',
    medium: 'w-6 h-6',
    large: 'w-8 h-8'
  }[size];
  
  // Determine text size based on the size prop
  const textSize = {
    small: 'text-xs',
    medium: 'text-sm',
    large: 'text-base'
  }[size];

  return (
    <div className="flex items-center justify-center gap-2">
      <div className={`animate-spin ${spinnerSize}`}>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          className="opacity-25"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          ></circle>
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          ></path>
        </svg>
      </div>
      {message && <span className={`${textSize} font-medium`}>{message}</span>}
    </div>
  );
}
