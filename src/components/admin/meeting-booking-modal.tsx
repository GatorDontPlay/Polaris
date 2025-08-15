'use client';

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { CalendarIcon } from 'lucide-react';
import { format, isAfter, isBefore, addYears } from 'date-fns';
import { cn } from '@/lib/utils';
import { PDR } from '@/types';

interface MeetingBookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (meetingDate: string) => void;
  pdr: PDR | null;
  isSubmitting?: boolean;
}

export function MeetingBookingModal({
  isOpen,
  onClose,
  onConfirm,
  pdr,
  isSubmitting = false,
}: MeetingBookingModalProps) {
  const [meetingDate, setMeetingDate] = useState<Date | undefined>(undefined);
  const [error, setError] = useState('');

  // Reset state when modal opens/closes
  React.useEffect(() => {
    if (isOpen) {
      setMeetingDate(undefined);
      setError('');
    }
  }, [isOpen]);

  const validateDate = (date: Date | undefined): boolean => {
    if (!date) {
      setError('Please select a meeting date');
      return false;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0); // Start of today
    
    const selectedDate = new Date(date);
    selectedDate.setHours(0, 0, 0, 0); // Start of selected day
    
    if (isBefore(selectedDate, today)) {
      setError('Meeting date cannot be in the past');
      return false;
    }

    const maxDate = addYears(today, 2);
    if (isAfter(selectedDate, maxDate)) {
      setError('Meeting date cannot be more than 2 years in the future');
      return false;
    }

    setError('');
    return true;
  };

  const handleDateSelect = (date: Date | undefined) => {
    setMeetingDate(date);
    if (date) {
      validateDate(date);
    } else {
      setError('');
    }
  };

  const handleConfirm = () => {
    if (!meetingDate) {
      setError('Please select a meeting date');
      return;
    }

    if (validateDate(meetingDate)) {
      const australianDate = format(meetingDate, 'dd/MM/yyyy');
      onConfirm(australianDate);
    }
  };

  const handleClose = () => {
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={() => {
      // Prevent auto-closing - only allow explicit button clicks
    }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarIcon className="h-5 w-5 text-blue-600" />
            Schedule PDR Meeting
          </DialogTitle>
          <DialogDescription>
            {pdr && (
              <>
                Schedule a meeting for <strong>{pdr.user?.firstName} {pdr.user?.lastName}</strong>'s 
                PDR ({pdr.fyLabel}).
              </>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Meeting Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !meetingDate && "text-muted-foreground",
                    error && "border-red-500"
                  )}
                  disabled={isSubmitting}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {meetingDate ? format(meetingDate, 'dd/MM/yyyy') : <span>Pick a date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={meetingDate}
                  onSelect={handleDateSelect}
                  disabled={(date) => {
                    // Simple date comparison using just the date values
                    const today = new Date();
                    const todayDateOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate());
                    
                    const checkDateOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate());
                    
                    // Two years from today
                    const maxDate = new Date(today.getFullYear() + 2, today.getMonth(), today.getDate());
                    
                    // Disable if before today or more than 2 years from now
                    return checkDateOnly < todayDateOnly || checkDateOnly > maxDate;
                  }}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
            {error && (
              <p className="text-sm text-red-600 flex items-center gap-1">
                {error}
              </p>
            )}
            <p className="text-xs text-muted-foreground">
              Select the meeting date (displayed in Australian format dd/mm/yyyy)
            </p>
          </div>

          {pdr && (
            <div className="rounded-lg bg-blue-50 p-3 space-y-1">
              <p className="text-sm font-medium text-blue-900">PDR Details:</p>
              <p className="text-sm text-blue-700">
                <strong>Employee:</strong> {pdr.user?.firstName} {pdr.user?.lastName}
              </p>
              <p className="text-sm text-blue-700">
                <strong>Financial Year:</strong> {pdr.fyLabel}
              </p>
              <p className="text-sm text-blue-700">
                <strong>Status:</strong> Plan Locked (Ready for Meeting)
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!meetingDate || !!error || isSubmitting}
            className="min-w-[100px]"
          >
            {isSubmitting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                Saving...
              </>
            ) : (
              'Save'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
