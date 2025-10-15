'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PDRStatusBadge } from '@/components/pdr/pdr-status-badge';
import { PDR } from '@/types';
import { Eye, ArrowRight } from 'lucide-react';

interface PDRHistoryTableProps {
  pdrs: PDR[];
  onView?: (pdrId: string) => void;
  onContinue?: (pdrId: string) => void;
  isLoading?: boolean;
}

function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('en-AU', {
    day: '2-digit',
    month: '2-digit', 
    year: 'numeric',
  });
}

function getRating(pdr: PDR): string {
  // Calculate average rating from goals and behaviors
  const goalRatings = pdr.goals?.filter(g => g.ceoRating).map(g => g.ceoRating!) || [];
  const behaviorRatings = pdr.behaviors?.filter(b => b.ceoRating).map(b => b.ceoRating!) || [];
  
  const allRatings = [...goalRatings, ...behaviorRatings];
  
  if (allRatings.length === 0) {return '-';}
  
  const average = allRatings.reduce((sum, rating) => sum + rating, 0) / allRatings.length;
  return `${average.toFixed(1)}/5`;
}

export function PDRHistoryTable({ 
  pdrs, 
  onView, 
  onContinue,
  isLoading 
}: PDRHistoryTableProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>PDR History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-center space-x-4 p-4 border rounded">
                <div className="h-4 bg-gray-200 rounded animate-pulse flex-1" />
                <div className="h-6 w-20 bg-gray-200 rounded animate-pulse" />
                <div className="h-4 w-16 bg-gray-200 rounded animate-pulse" />
                <div className="h-8 w-20 bg-gray-200 rounded animate-pulse" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (pdrs.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>PDR History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <p className="text-gray-600">No PDR history found.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>PDR History</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="text-left py-3 px-4 font-medium text-muted-foreground">Period</th>
                <th className="text-left py-3 px-4 font-medium text-muted-foreground">Status</th>
                <th className="text-left py-3 px-4 font-medium text-muted-foreground">Rating</th>
                <th className="text-left py-3 px-4 font-medium text-muted-foreground">Updated</th>
                <th className="text-right py-3 px-4 font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {pdrs.map((pdr) => (
                <tr key={pdr.id} className="hover:bg-muted/50 transition-colors">
                  <td className="py-3 px-4">
                    <div className="font-medium text-foreground">
                      {pdr.period?.name || 'Unknown Period'}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {pdr.period && formatDate(pdr.period.startDate)} - {pdr.period && formatDate(pdr.period.endDate)}
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <PDRStatusBadge status={pdr.status} />
                  </td>
                  <td className="py-3 px-4 text-foreground">
                    {getRating(pdr)}
                  </td>
                  <td className="py-3 px-4 text-muted-foreground">
                    {formatDate(pdr.updatedAt)}
                  </td>
                  <td className="py-3 px-4 text-right">
                    {pdr.status === 'Created' || pdr.status === 'SUBMITTED' ? (
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => onContinue?.(pdr.id)}
                      >
                        <ArrowRight className="h-4 w-4 mr-1" />
                        Continue
                      </Button>
                    ) : (
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => onView?.(pdr.id)}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        View
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
