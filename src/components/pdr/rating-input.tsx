import { useState } from 'react';
import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';

interface RatingInputProps {
  value?: number;
  onChange: (rating: number) => void;
  disabled?: boolean;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  className?: string;
}

const sizeClasses = {
  sm: 'w-4 h-4',
  md: 'w-5 h-5',
  lg: 'w-6 h-6',
};

const ratingLabels = {
  1: 'Poor',
  2: 'Fair',
  3: 'Good',
  4: 'Very Good',
  5: 'Excellent',
};

export function RatingInput({
  value = 0,
  onChange,
  disabled = false,
  size = 'md',
  showLabel = true,
  className,
}: RatingInputProps) {
  const [hoverRating, setHoverRating] = useState(0);

  const handleClick = (rating: number) => {
    if (!disabled) {
      onChange(rating);
    }
  };

  const handleMouseEnter = (rating: number) => {
    if (!disabled) {
      setHoverRating(rating);
    }
  };

  const handleMouseLeave = () => {
    if (!disabled) {
      setHoverRating(0);
    }
  };

  const currentRating = hoverRating || value;

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => handleClick(star)}
            onMouseEnter={() => handleMouseEnter(star)}
            onMouseLeave={handleMouseLeave}
            disabled={disabled}
            className={cn(
              'transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded',
              {
                'cursor-pointer': !disabled,
                'cursor-not-allowed opacity-50': disabled,
              }
            )}
            aria-label={`Rate ${star} star${star > 1 ? 's' : ''}`}
          >
            <Star
              className={cn(
                sizeClasses[size],
                'transition-colors duration-200',
                {
                  'fill-yellow-400 text-yellow-400': star <= currentRating,
                  'text-gray-300': star > currentRating,
                  'hover:text-yellow-400': !disabled && star <= (hoverRating || value + 1),
                }
              )}
            />
          </button>
        ))}
      </div>

      {showLabel && value > 0 && (
        <span className="text-sm text-muted-foreground">
          {ratingLabels[value as keyof typeof ratingLabels]}
        </span>
      )}

      {showLabel && !value && hoverRating > 0 && (
        <span className="text-sm text-muted-foreground">
          {ratingLabels[hoverRating as keyof typeof ratingLabels]}
        </span>
      )}
    </div>
  );
}
