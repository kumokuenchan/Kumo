import React from 'react';

interface DateTimeDisplayProps {
  value: any;
  timezone?: string;
  className?: string;
}

// Helper function to format date in specific timezone
const formatDateInTimezone = (date: Date, timezone?: string): string => {
  if (!timezone || timezone === 'UTC') {
    // Convert to MySQL format (UTC)
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const day = String(date.getUTCDate()).padStart(2, '0');
    const hours = String(date.getUTCHours()).padStart(2, '0');
    const minutes = String(date.getUTCMinutes()).padStart(2, '0');
    const seconds = String(date.getUTCSeconds()).padStart(2, '0');
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
  } else {
    // Convert to selected timezone
    const [sign, tzHours, tzMinutes] = timezone.match(/([+-])(\d{2}):(\d{2})/)?.slice(1) || ['+', '00', '00'];
    const offsetMinutes = (parseInt(tzHours) * 60) + parseInt(tzMinutes);
    const offsetMs = (sign === '+' ? 1 : -1) * offsetMinutes * 60 * 1000;
    
    const localDate = new Date(date.getTime() + date.getTimezoneOffset() * 60 * 1000 + offsetMs);
    
    const year = localDate.getFullYear();
    const month = String(localDate.getMonth() + 1).padStart(2, '0');
    const day = String(localDate.getDate()).padStart(2, '0');
    const hours = String(localDate.getHours()).padStart(2, '0');
    const minutes = String(localDate.getMinutes()).padStart(2, '0');
    const seconds = String(localDate.getSeconds()).padStart(2, '0');
    
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
  }
};

// Format datetime value to MySQL format or selected timezone
export const formatDatetimeToMySQL = (value: any, timezone?: string): string => {
  // Handle ISO datetime strings
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(value)) {
    try {
      const d = new Date(value);
      return formatDateInTimezone(d, timezone);
    } catch (e) {
      return String(value);
    }
  }
  
  // Handle Date objects
  if (value instanceof Date) {
    return formatDateInTimezone(value, timezone);
  }
  
  return String(value);
};

export default function DateTimeDisplay({ value, timezone, className }: DateTimeDisplayProps) {
  if (value === null) {
    return <span className="text-gray-400 italic">NULL</span>;
  }

  const formattedValue = formatDatetimeToMySQL(value, timezone);
  
  return (
    <span className={className || "font-mono text-xs"}>
      {formattedValue}
    </span>
  );
}