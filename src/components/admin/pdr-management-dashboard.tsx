'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { MeetingBookingModal } from './meeting-booking-modal';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { toast } from '@/hooks/use-toast';
import { usePDRs, useSubmitCEOReview, useMarkPDRAsBooked } from '@/hooks/use-pdrs';
import { useNotifications } from '@/hooks/use-notifications';
import { PDRStatusBadge } from '@/components/pdr/pdr-status-badge';
import { NotificationBar } from '@/components/ui/notification-bar';
import { usePDRPermissions, usePDRActions } from '@/hooks/use-pdr-permissions';
import { PDRStatus, PDR } from '@/types';
import { 
  Eye, 
  Edit, 
  Calendar, 
  CheckCircle, 
  Clock, 
  Lock,
  Search,
  Filter,
  RefreshCw
} from 'lucide-react';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';

interface PDRFilters {
  status?: PDRStatus[];
  fyLabel?: string;
  search?: string;
  meetingBooked?: boolean;
}

export function PDRManagementDashboard() {
  const [filters, setFilters] = useState<PDRFilters>({});
  const [activeTab, setActiveTab] = useState('pending');
  const [meetingModalOpen, setMeetingModalOpen] = useState(false);
  const [selectedPDRForMeeting, setSelectedPDRForMeeting] = useState<PDR | null>(null);

  // Debug modal state changes
  React.useEffect(() => {
    console.log('🔍 Modal state changed:', { meetingModalOpen, selectedPDRForMeeting: !!selectedPDRForMeeting });
  }, [meetingModalOpen, selectedPDRForMeeting]);

  // Get PDRs based on active tab and filters
  const getStatusFilter = () => {
    switch (activeTab) {
      case 'pending':
        return ['OPEN_FOR_REVIEW']; // PDRs submitted for CEO review
      case 'review':
        return ['PLAN_LOCKED']; // PDRs reviewed by CEO
      case 'locked':
        return ['PDR_BOOKED']; // PDRs with meetings booked
      case 'booked':
        return ['COMPLETED']; // Completed PDRs
      default:
        return undefined;
    }
  };

  // Use demo data instead of real API
  const getAllPDRsFromStorage = () => {
    const pdrs = [];
    const pdrMap = new Map(); // Use Map to handle duplicates properly
    
    if (typeof window === 'undefined') return pdrs;
    
    console.log('🔍 getAllPDRsFromStorage: Scanning localStorage...');
    
    // Collect all PDR data first
    const allPDRData = [];
    
    // Get current PDR
    const currentPDR = localStorage.getItem('demo_current_pdr');
    if (currentPDR) {
      try {
        const parsed = JSON.parse(currentPDR);
        allPDRData.push({ source: 'demo_current_pdr', data: parsed });
        console.log('📄 Found demo_current_pdr:', { id: parsed.id, status: parsed.status });
      } catch (error) {
        console.error('Error parsing current PDR:', error);
      }
    }
    
    // Get all demo_pdr_ entries
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('demo_pdr_') && key !== 'demo_current_pdr') {
        try {
          const pdrData = localStorage.getItem(key);
          if (pdrData) {
            const parsed = JSON.parse(pdrData);
            allPDRData.push({ source: key, data: parsed });
            console.log(`📄 Found ${key}:`, { id: parsed.id, status: parsed.status });
          }
        } catch (error) {
          console.error(`Error parsing PDR from ${key}:`, error);
        }
      }
    }
    
    // Process PDRs and keep the most recent version of each ID
    allPDRData.forEach(({ source, data }) => {
      const existing = pdrMap.get(data.id);
      if (!existing || new Date(data.updatedAt) > new Date(existing.updatedAt)) {
        console.log(`🔄 Using PDR ${data.id} from ${source} (status: ${data.status})`);
        pdrMap.set(data.id, {
          ...data,
          createdAt: new Date(data.createdAt),
          updatedAt: new Date(data.updatedAt),
          ...(data.submittedAt && { submittedAt: new Date(data.submittedAt) }),
          user: { firstName: 'Employee', lastName: 'Demo', email: 'employee@demo.com' }
        });
      } else {
        console.log(`⏭️  Skipping older PDR ${data.id} from ${source} (status: ${data.status})`);
      }
    });
    
    const finalPDRs = Array.from(pdrMap.values());
    console.log('✅ Final PDRs for CEO dashboard:', finalPDRs.map(p => ({ id: p.id, status: p.status })));
    
    return finalPDRs;
  };

  const pdrsData = { data: getAllPDRsFromStorage() };
  const isLoading = false;
  const error = null;
  const refetch = () => {};

  const submitCEOReview = useSubmitCEOReview();
  const markAsBooked = useMarkPDRAsBooked();

  // Safely extract PDRs with proper type checking
  const pdrs = React.useMemo(() => {
    if (!pdrsData?.data) return [];
    if (!Array.isArray(pdrsData.data)) return [];
    return pdrsData.data;
  }, [pdrsData]);

  const handleSearch = (value: string) => {
    setFilters(prev => ({ ...prev, search: value }));
  };

  const handleMarkAsBooked = async (pdrId: string) => {
    console.log('🎯 handleMarkAsBooked called with pdrId:', pdrId);
    
    // Find the PDR to book
    const pdrToBook = pdrs.find(p => p.id === pdrId);
    console.log('🔍 Found PDR to book:', pdrToBook);
    
    if (!pdrToBook) {
      console.log('❌ PDR not found for ID:', pdrId);
      toast({
        title: 'Error',
        description: 'Could not find PDR to book meeting.',
        variant: 'destructive',
      });
      return;
    }

    console.log('✅ Opening modal for PDR:', pdrToBook.id);
    // Open the modal for date selection
    setSelectedPDRForMeeting(pdrToBook);
    setMeetingModalOpen(true);
    console.log('✅ Modal state set to open');
  };

  const handleConfirmMeeting = async (meetingDate: string) => {
    if (!selectedPDRForMeeting) return;

    try {
      // Call the API to book the meeting with the date
      await markAsBooked.mutateAsync({
        pdrId: selectedPDRForMeeting.id,
        meetingDate: meetingDate
      });
      
      toast({
        title: 'Meeting Scheduled',
        description: `PDR meeting scheduled for ${meetingDate}`,
      });

      // Close modal and reset
      setMeetingModalOpen(false);
      setSelectedPDRForMeeting(null);
      
      // Force refresh the dashboard to show updated status
      window.location.reload();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to schedule meeting. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const handleCloseMeetingModal = () => {
    console.log('🚪 handleCloseMeetingModal called');
    setMeetingModalOpen(false);
    setSelectedPDRForMeeting(null);
  };

  const getTabCounts = () => {
    console.log('getTabCounts - All PDRs:', pdrs);
    console.log('getTabCounts - PDR statuses:', pdrs.map(p => ({ id: p.id, status: p.status })));
    
    const counts = {
      pending: pdrs.filter(p => p.status === 'Created' || p.status === 'DRAFT').length,
      review: pdrs.filter(p => p.status === 'OPEN_FOR_REVIEW' || p.status === 'SUBMITTED').length,
      locked: pdrs.filter(p => p.status === 'PLAN_LOCKED').length,
      booked: pdrs.filter(p => p.status === 'PDR_BOOKED' || p.status === 'PDR_Booked' || p.status === 'COMPLETED').length,
    };
    
    console.log('getTabCounts - Calculated counts:', counts);
    return counts;
  };

  const counts = getTabCounts();

  // Handle loading state
  if (isLoading) {
    return (
      <div className="space-y-6">
        <NotificationBar maxNotifications={3} />
        <div className="flex items-center justify-center py-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="mt-2 text-muted-foreground">Loading PDRs...</p>
          </div>
        </div>
      </div>
    );
  }

  // Handle error state
  if (error) {
    return (
      <div className="space-y-6">
        <NotificationBar maxNotifications={3} />
        <div className="flex items-center justify-center py-8">
          <div className="text-center">
            <p className="text-red-600 mb-2">Failed to load PDRs</p>
            <Button onClick={() => refetch()} variant="outline">
              Try Again
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Notification Bar */}
      <NotificationBar maxNotifications={3} />

      {/* Header with Search and Filters */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">PDR Management</h2>
          <p className="text-muted-foreground">
            Review and manage employee performance development reviews
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search employees..."
              value={filters.search || ''}
              onChange={(e) => handleSearch(e.target.value)}
              className="pl-8 w-64"
            />
          </div>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

            {/* Tabs for different PDR states */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="pending" className="relative">
            Upcoming
            {counts.pending > 0 && (
              <Badge variant="secondary" className="ml-2 h-5 w-5 p-0 text-xs">
                {counts.pending}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="review" className="relative">
            For Review
            {counts.review > 0 && (
              <Badge variant="default" className="ml-2 h-5 w-5 p-0 text-xs">
                {counts.review}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="locked" className="relative">
            Locked
            {counts.locked > 0 && (
              <Badge variant="destructive" className="ml-2 h-5 w-5 p-0 text-xs">
                {counts.locked}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="booked" className="relative">
            Meetings Booked
            {counts.booked > 0 && (
              <Badge variant="success" className="ml-2 h-5 w-5 p-0 text-xs">
                {counts.booked}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="space-y-4">
          <PDRListCard
            title="Upcoming PDRs"
            description="PDRs that have been created but not yet submitted for review"
            pdrs={(() => {
              const filteredPdrs = pdrs.filter(p => p.status === 'Created' || p.status === 'DRAFT');
              console.log('📅 Upcoming Tab - Found PDRs:', filteredPdrs.length);
              console.log('📅 Upcoming Tab - PDR Details:', filteredPdrs.map(p => ({ 
                id: p.id, 
                status: p.status, 
                employee: p.user?.firstName + ' ' + p.user?.lastName 
              })));
              return filteredPdrs;
            })()}
            isLoading={isLoading}
            showActions={false}
            emptyMessage="No upcoming PDRs. All employees have submitted their reviews."
            emptyIcon={<CheckCircle className="h-12 w-12 text-green-400" />}
          />
        </TabsContent>

        <TabsContent value="review" className="space-y-4">
          <PDRListCard
            title="PDRs for Review"
            description="PDRs submitted by employees waiting for your review"
            pdrs={(() => {
              const filteredPdrs = pdrs.filter(p => p.status === 'OPEN_FOR_REVIEW' || p.status === 'SUBMITTED');
              console.log('📋 For Review Tab - Found PDRs:', filteredPdrs.length);
              console.log('📋 For Review Tab - PDR Details:', filteredPdrs.map(p => ({ 
                id: p.id, 
                status: p.status, 
                employee: p.user?.firstName + ' ' + p.user?.lastName 
              })));
              return filteredPdrs;
            })()}
            isLoading={isLoading}
            showActions={true}
            actionType="review"
            emptyMessage="No PDRs pending review. Check back later or review the other tabs."
            emptyIcon={<Clock className="h-12 w-12 text-blue-400" />}
          />
        </TabsContent>

        <TabsContent value="locked" className="space-y-4">
          <PDRListCard
            title="Locked PDRs"
            description="PDRs locked by you, ready for meeting booking"
            pdrs={pdrs.filter(p => p.status === 'PLAN_LOCKED')}
            isLoading={isLoading}
            showActions={true}
            actionType="booking"
            onMarkAsBooked={handleMarkAsBooked}
            emptyMessage="No locked PDRs. Complete reviews in the 'For Review' tab to lock them."
            emptyIcon={<Lock className="h-12 w-12 text-red-400" />}
          />
        </TabsContent>

        <TabsContent value="booked" className="space-y-4">
          <PDRListCard
            title="Meetings Booked"
            description="PDRs with meetings scheduled"
            pdrs={pdrs.filter(p => p.status === 'PDR_BOOKED' || p.status === 'PDR_Booked')}
            isLoading={isLoading}
            showActions={false}
            emptyMessage="No meetings booked yet. Book meetings from the 'Locked' tab."
            emptyIcon={<Calendar className="h-12 w-12 text-purple-400" />}
          />
        </TabsContent>
      </Tabs>

      {/* Meeting Booking Modal */}
      {console.log('🔍 Rendering modal with state:', { meetingModalOpen, selectedPDRForMeeting: !!selectedPDRForMeeting })}
      <MeetingBookingModal
        isOpen={meetingModalOpen}
        onClose={handleCloseMeetingModal}
        onConfirm={handleConfirmMeeting}
        pdr={selectedPDRForMeeting}
        isSubmitting={markAsBooked.isPending}
      />
    </div>
  );
}

interface PDRListCardProps {
  title: string;
  description: string;
  pdrs: PDR[];
  isLoading: boolean;
  showActions: boolean;
  actionType?: 'review' | 'booking';
  onMarkAsBooked?: (pdrId: string) => void;
  emptyMessage: string;
  emptyIcon: React.ReactNode;
}

function PDRListCard({
  title,
  description,
  pdrs,
  isLoading,
  showActions,
  actionType,
  onMarkAsBooked,
  emptyMessage,
  emptyIcon,
}: PDRListCardProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex items-center space-x-4 animate-pulse">
                <div className="h-10 w-10 bg-muted rounded-full" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-muted rounded w-1/3" />
                  <div className="h-3 bg-muted rounded w-1/2" />
                </div>
                <div className="h-8 w-20 bg-muted rounded" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        {pdrs.length === 0 ? (
          <div className="text-center py-12">
            {emptyIcon}
            <p className="text-muted-foreground mt-4">{emptyMessage}</p>
          </div>
        ) : (
          <div className="rounded-md border">
            <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
              <Table>
                <TableHeader style={{ position: 'sticky', top: 0, backgroundColor: 'hsl(var(--background))', zIndex: 10 }}>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Financial Year</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Last Updated</TableHead>
                    {actionType === 'booking' && <TableHead>Meeting</TableHead>}
                    {showActions && <TableHead className="text-right">Actions</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pdrs.map((pdr) => (
                    <PDRRow
                      key={pdr.id}
                      pdr={pdr}
                      showActions={showActions}
                      actionType={actionType}
                      onMarkAsBooked={onMarkAsBooked}
                    />
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

interface PDRRowProps {
  pdr: PDR;
  showActions: boolean;
  actionType?: 'review' | 'booking';
  onMarkAsBooked?: (pdrId: string) => void;
}

function PDRRow({ pdr, showActions, actionType, onMarkAsBooked }: PDRRowProps) {
  const { canSubmitCEOReview } = usePDRActions(pdr);
  const isBookingRow = actionType === 'booking';
  const isBooked = pdr.status === 'PDR_BOOKED' || pdr.status === 'PDR_Booked' || pdr.meetingBooked;
  
  // Allow booking for PLAN_LOCKED PDRs (regardless of what usePDRActions says)
  const canBookMeeting = pdr.status === 'PLAN_LOCKED' && !isBooked;

  return (
    <TableRow className={isBooked ? 'opacity-60' : ''}>
      <TableCell>
        <div className="flex items-center space-x-3">
          <Avatar>
            <AvatarFallback>
              {pdr.user?.firstName?.[0]}{pdr.user?.lastName?.[0]}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="font-medium">
              {pdr.user?.firstName} {pdr.user?.lastName}
            </p>
            <p className="text-sm text-muted-foreground">
              {pdr.user?.email}
            </p>
          </div>
        </div>
      </TableCell>
      <TableCell>
        <div>
          <p className="font-medium">{pdr.fyLabel}</p>
          <p className="text-sm text-muted-foreground">
            {new Date(pdr.fyStartDate).toLocaleDateString('en-AU')} - 
            {new Date(pdr.fyEndDate).toLocaleDateString('en-AU')}
          </p>
        </div>
      </TableCell>
      <TableCell>
        <PDRStatusBadge pdr={pdr} />
      </TableCell>
      <TableCell className="text-muted-foreground">
        {formatDistanceToNow(new Date(pdr.updatedAt), { addSuffix: true })}
      </TableCell>
      {isBookingRow && (
        <TableCell>
          <div className="flex items-center space-x-2">
            <Checkbox
              checked={isBooked}
              onCheckedChange={(checked) => {
                if (checked && onMarkAsBooked && canBookMeeting) {
                  onMarkAsBooked(pdr.id);
                }
              }}
              disabled={!canBookMeeting}
            />
            <Label className="text-sm">
              {isBooked ? 'Booked' : 'Mark as booked'}
            </Label>
          </div>
        </TableCell>
      )}
      {showActions && (
        <TableCell className="text-right">
          <div className="flex justify-end space-x-2">
            <Button variant="ghost" size="sm" asChild>
              <Link href={`/admin/reviews/${pdr.id}`}>
                <Eye className="h-4 w-4" />
              </Link>
            </Button>
            {actionType === 'review' && canSubmitCEOReview && (
              <Button variant="outline" size="sm" asChild>
                <Link href={`/admin/reviews/${pdr.id}/review`}>
                  <Edit className="h-4 w-4 mr-1" />
                  Review
                </Link>
              </Button>
            )}
          </div>
        </TableCell>
      )}
    </TableRow>
  );
}
