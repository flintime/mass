'use client';

import * as React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './select';

interface TimePickerProps {
  value: string;
  onChange: (time: string) => void;
  availableHours: string;
  interval?: number; // in minutes
}

export function TimePicker({ value, onChange, availableHours, interval = 60 }: TimePickerProps) {
  const timeSlots = React.useMemo(() => {
    const slots: string[] = [];
    const [start, end] = availableHours.split('-').map(t => t.trim());
    
    // Convert to 24-hour format
    const startTime = new Date(`2000/01/01 ${start}`);
    const endTime = new Date(`2000/01/01 ${end}`);
    
    let currentTime = startTime;
    while (currentTime < endTime) {
      slots.push(
        currentTime.toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
          hour12: true,
        })
      );
      currentTime = new Date(currentTime.getTime() + interval * 60000);
    }
    
    return slots;
  }, [availableHours, interval]);

  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger>
        <SelectValue placeholder="Select time" />
      </SelectTrigger>
      <SelectContent>
        {timeSlots.map((time) => (
          <SelectItem key={time} value={time}>
            {time}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
} 