'use client';

import { Badge } from '@/components/ui/badge';
import { PDRStatus, PDR } from '@/types';
import { usePDRStatusDisplay } from '@/hooks/use-pdr-permissions';

interface PDRStatusBadgeProps {
  status?: PDRStatus;
  pdr?: PDR;
  meetingBooked?: boolean;
  className?: string;
  showDescription?: boolean;
}

export function PDRStatusBadge({ 
  status, 
  pdr, 
  meetingBooked, 
  className,
  showDescription = false 
}: PDRStatusBadgeProps) {
  // Use the hook for consistent status display logic
  const statusDisplay = usePDRStatusDisplay(pdr);
  
  // Fallback to legacy logic if no PDR object provided
  const config = pdr ? statusDisplay : getLegacyStatusConfig(status, meetingBooked);

  return (
    <div className="flex flex-col gap-1">
      <Badge variant={config.variant} className={className}>
        {config.text}
      </Badge>
      {showDescription && config.description && (
        <span className="text-xs text-muted-foreground">
          {config.description}
        </span>
      )}
    </div>
  );
}

// Legacy status configuration for backward compatibility
function getLegacyStatusConfig(status?: PDRStatus, meetingBooked?: boolean) {
  if (!status) {
    return {
      text: 'Unknown',
      variant: 'outline' as const,
      description: undefined,
    };
  }

  switch (status) {
    case 'Created':
      return {
        text: 'Draft',
        variant: 'outline' as const,
        description: 'PDR is being created',
      };

    case 'OPEN_FOR_REVIEW':
      return {
        text: 'Under Review',
        variant: 'warning' as const,
        description: 'Submitted for CEO review',
      };

    case 'PLAN_LOCKED':
      return {
        text: 'Locked',
        variant: 'destructive' as const,
        description: 'Locked by CEO pending meeting',
      };

    case 'PDR_Booked':
      return {
        text: meetingBooked ? 'Meeting Booked' : 'Ready for Booking',
        variant: 'success' as const,
        description: meetingBooked 
          ? 'Meeting has been scheduled'
          : 'Ready for meeting booking',
      };

    case 'DRAFT':
      return {
        text: 'Draft',
        variant: 'outline' as const,
        description: 'PDR is in draft state',
      };

    case 'SUBMITTED':
      return {
        text: 'Submitted',
        variant: 'secondary' as const,
        description: 'PDR has been submitted',
      };

    case 'UNDER_REVIEW':
      return {
        text: 'Under Review',
        variant: 'warning' as const,
        description: 'PDR is being reviewed',
      };

    case 'MID_YEAR_CHECK':
      return {
        text: 'Mid-Year',
        variant: 'secondary' as const,
        description: 'Mid-year review phase',
      };

    case 'END_YEAR_REVIEW':
      return {
        text: 'End-Year',
        variant: 'secondary' as const,
        description: 'End-year review phase',
      };

    case 'COMPLETED':
      return {
        text: 'Completed',
        variant: 'success' as const,
        description: 'PDR process completed',
      };

    case 'LOCKED':
      return {
        text: 'Locked',
        variant: 'destructive' as const,
        description: 'PDR is locked',
      };

    case 'SUBMITTED_FOR_REVIEW':
      return {
        text: 'Pending Final Review',
        variant: 'warning' as const,
        description: 'Complete - awaiting final review meeting',
      };

    default:
      return {
        text: status,
        variant: 'outline' as const,
        description: undefined,
      };
  }
}
