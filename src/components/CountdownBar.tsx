'use client';

import React, { useEffect, useState } from 'react';
import { Clock } from 'lucide-react';

interface CountdownBarProps {
  endDate: string;
}

export default function CountdownBar({ endDate }: CountdownBarProps) {
  const [daysLeft, setDaysLeft] = useState(0);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const end = new Date(endDate).getTime();
    const now = new Date().getTime();
    
    // Assume typical application window is 30 days for progress bar max
    const maxDays = 30; 
    
    const diffTime = end - now;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    const calculatedDays = Math.max(0, diffDays);
    setDaysLeft(calculatedDays);
    
    // Calculate percentage (0% if past deadline, 100% if more than maxDays left)
    const percentage = calculatedDays > maxDays ? 100 : (calculatedDays / maxDays) * 100;
    
    // Small timeout to allow CSS animation to trigger on mount
    setTimeout(() => {
      setProgress(percentage);
    }, 100);
  }, [endDate]);

  const isUrgent = daysLeft <= 5;

  return (
    <div className="mt-4">
      <div className="flex justify-between items-center mb-2">
        <span className="text-xs font-semibold flex items-center text-slate-500 dark:text-slate-400">
          <Clock className="w-3 h-3 mr-1" />
          {daysLeft > 0 ? `${daysLeft} days left` : 'Closed'}
        </span>
        {isUrgent && daysLeft > 0 && (
          <span className="text-xs font-bold text-red-500 animate-pulse">
            Urgent!
          </span>
        )}
      </div>
      <div className="h-2 w-full bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
        <div 
          className={`h-full rounded-full transition-all duration-1000 ease-out ${
            isUrgent ? 'bg-red-500' : 'bg-(--color-orange)'
          }`}
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}
