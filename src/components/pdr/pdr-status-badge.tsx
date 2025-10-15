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

    case 'SUBMITTED':
    case 'MID_YEAR_SUBMITTED':
    case 'END_YEAR_SUBMITTED':
      return {
        text: 'Under Review',
        variant: 'warning' as const,
        description: 'Submitted for CEO review',
      };

    case 'PLAN_LOCKED':
      return {
        text: 'Approved',
        variant: 'success' as const,
        description: 'Initial plan approved - Mid-year available',
      };

    case 'MID_YEAR_APPROVED':
      return {
        text: 'Mid-Year Approved',
        variant: 'success' as const,
        description: 'Mid-year approved - End-year available',
      };

    case 'COMPLETED':
      return {
        text: 'Completed',
        variant: 'success' as const,
        description: 'PDR process completed',
      };

    default:
      return {
        text: status,
        variant: 'outline' as const,
        description: undefined,
      };
  }
}
