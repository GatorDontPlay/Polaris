import { Badge } from '@/components/ui/badge';
import { getPDRStatusLabel, getPDRStatusColor } from '@/lib/utils';
import { PDRStatus } from '@/types';

interface PDRStatusBadgeProps {
  status: PDRStatus;
  className?: string;
}

export function PDRStatusBadge({ status, className }: PDRStatusBadgeProps) {
  const getVariant = (status: PDRStatus) => {
    switch (status) {
      case 'DRAFT':
        return 'secondary';
      case 'SUBMITTED':
        return 'info';
      case 'UNDER_REVIEW':
        return 'warning';
      case 'MID_YEAR_CHECK':
        return 'info';
      case 'END_YEAR_REVIEW':
        return 'warning';
      case 'COMPLETED':
        return 'success';
      case 'LOCKED':
        return 'outline';
      default:
        return 'secondary';
    }
  };

  return (
    <Badge 
      variant={getVariant(status)} 
      className={`${getPDRStatusColor(status)} ${className}`}
    >
      {getPDRStatusLabel(status)}
    </Badge>
  );
}
