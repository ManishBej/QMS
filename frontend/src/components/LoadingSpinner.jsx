import React from 'react';

const LoadingSpinner = ({ 
  size = 'medium',
  color = 'indigo',
  message = 'Loading...',
  className = ''
}) => {
  const sizeClasses = {
    small: 'w-4 h-4',
    medium: 'w-8 h-8',
    large: 'w-12 h-12'
  };

  const colorClasses = {
    indigo: 'border-indigo-600',
    slate: 'border-slate-600',
    blue: 'border-blue-600',
    green: 'border-green-600'
  };

  return (
    <div className={`flex flex-col items-center justify-center space-y-3 ${className}`}>
      <div 
        className={`
          ${sizeClasses[size]} 
          ${colorClasses[color]}
          border-2 border-t-transparent 
          rounded-full animate-spin
        `}
        role="status"
        aria-label="Loading"
      />
      {message && (
        <p className="text-sm text-slate-600 font-medium">
          {message}
        </p>
      )}
    </div>
  );
};

export default LoadingSpinner;
