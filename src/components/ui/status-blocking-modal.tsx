'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Clock, CheckCircle, AlertCircle, User } from 'lucide-react';

interface StatusBlockingModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentStatus: string;
  requiredStatus: string;
  title: string;
  description: string;
  nextSteps?: string[];
  actionButton?: {
    label: string;
    onClick: () => void;
  };
}

export function StatusBlockingModal({
  isOpen,
  onClose,
  currentStatus,
  requiredStatus,
  title,
  description,
  nextSteps = [],
  actionButton
}: StatusBlockingModalProps) {
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'OPEN_FOR_REVIEW':
        return <Clock className="h-4 w-4" />;
      case 'UNDER_REVIEW':
        return <User className="h-4 w-4" />;
      case 'MID_YEAR_CHECK':
        return <CheckCircle className="h-4 w-4" />;
      default:
        return <AlertCircle className="h-4 w-4" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'OPEN_FOR_REVIEW':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'UNDER_REVIEW':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'MID_YEAR_CHECK':
        return 'bg-green-100 text-green-800 border-green-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <AlertCircle className="h-5 w-5 text-amber-500" />
            {title}
          </DialogTitle>
          <DialogDescription className="text-base">
            {description}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Status Comparison */}
          <div className="bg-gray-50 rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-600">Current Status:</span>
              <Badge 
                variant="outline" 
                className={`flex items-center gap-1 ${getStatusColor(currentStatus)}`}
              >
                {getStatusIcon(currentStatus)}
                {currentStatus.replace(/_/g, ' ')}
              </Badge>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-600">Required Status:</span>
              <Badge 
                variant="outline" 
                className={`flex items-center gap-1 ${getStatusColor(requiredStatus)}`}
              >
                {getStatusIcon(requiredStatus)}
                {requiredStatus.replace(/_/g, ' ')}
              </Badge>
            </div>
          </div>

          {/* Next Steps */}
          {nextSteps.length > 0 && (
            <div>
              <h4 className="font-medium text-sm mb-2 text-gray-700">Next Steps:</h4>
              <ul className="space-y-1">
                {nextSteps.map((step, index) => (
                  <li key={index} className="flex items-start gap-2 text-sm text-gray-600">
                    <span className="flex-shrink-0 w-5 h-5 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-medium mt-0.5">
                      {index + 1}
                    </span>
                    {step}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 pt-4">
          <Button variant="outline" onClick={onClose}>
            Understood
          </Button>
          {actionButton && (
            <Button onClick={actionButton.onClick}>
              {actionButton.label}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}



