'use client';

// Import the existing file content first
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { AdminHeader, PageHeader } from '@/components/admin/admin-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  User,
  Calendar,
  Target,
  TrendingUp,
  FileText,
  CheckCircle,
  Clock,
  MessageSquare,
  Lock,
  Unlock,
  ArrowLeft,
  ArrowRight,
  DollarSign,
  Plus,
  Minus,
} from 'lucide-react';
import { formatDateAU, getPDRStatusLabel } from '@/lib/utils';

import { useToast } from '@/hooks/use-toast';
import { BehaviorReviewSection, type BehaviorReviewSectionRef } from '@/components/ceo/behavior-review-section';

// Add the salary review tab implementation
// This is a placeholder for the actual implementation
// You'll need to add this to the existing file

export default function PDRReviewPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const pdrId = params.id as string;
  const behaviorReviewRef = useRef<BehaviorReviewSectionRef>(null);

  // Original state variables
  const [pdr, setPdr] = useState(null);
  const [goals, setGoals] = useState([]);
  const [behaviors, setBehaviors] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("goals");

  // Salary review tab state
  const [cpiValue, setCpiValue] = useState(2.5); // Default CPI value
  const [performanceValue, setPerformanceValue] = useState(5.0); // Default Performance Based Increase value
  const [currentSalaryInput, setCurrentSalaryInput] = useState('85000'); // CEO editable current salary
  const [employeeRole, setEmployeeRole] = useState('Developer');
  const [salaryBandPosition, setSalaryBandPosition] = useState(50); // Position in salary band (%)
  const [salaryBandLabel, setSalaryBandLabel] = useState('Mid-range');
  
  // Salary band min/max values
  const salaryBandMin = 75000;
  const salaryBandTarget = 95000;
  const salaryBandMax = 115000;
  
  // Computed values for salary review
  // Parse current salary from input
  const currentSalary = parseFloat(currentSalaryInput.replace(/,/g, '')) || 85000;
  
  // Calculate CPI increase
  const cpiIncrease = currentSalary * (cpiValue / 100);
  // Calculate performance based increase
  const performanceIncrease = currentSalary * (performanceValue / 100);
  
  // Calculate new salary with both increases
  const newSalary = currentSalary + cpiIncrease + performanceIncrease;
  const newSuper = newSalary * 0.12; // 12% super
  const newTotal = newSalary + newSuper;
  const annualIncrease = newSalary - currentSalary;
  
  // Calculate positions for salary band visualization
  const bandRange = salaryBandMax - salaryBandMin;
  const currentSalaryPosition = ((currentSalary - salaryBandMin) / bandRange) * 100;
  const newSalaryPosition = ((newSalary - salaryBandMin) / bandRange) * 100;
  
  // Ensure positions are within 0-100% range
  const boundedCurrentPosition = Math.min(100, Math.max(0, currentSalaryPosition));
  const boundedNewPosition = Math.min(100, Math.max(0, newSalaryPosition));
  
  // Determine salary band label based on new salary
  // Set label directly without useEffect to avoid potential issues
  let bandLabel = 'Mid-range';
  if (newSalary < salaryBandTarget * 0.9) {
    bandLabel = 'Lower range';
  } else if (newSalary > salaryBandTarget * 1.1) {
    bandLabel = 'Upper range';
  }
  
  // Update state values directly
  if (salaryBandLabel !== bandLabel) {
    setSalaryBandLabel(bandLabel);
  }
  if (salaryBandPosition !== boundedNewPosition) {
    setSalaryBandPosition(boundedNewPosition);
  }

  // Salary Review Tab Content
  const SalaryReviewTabContent = () => (
    <TabsContent value="salary-review" className="space-y-4">
      <Card className="bg-gradient-to-br from-card via-card to-card/95 border-border/50 shadow-lg shadow-black/5 backdrop-blur-sm">
        <CardHeader>
          <CardTitle>Salary Review & Finalization</CardTitle>
          <CardDescription>
            Complete the review process with salary adjustments and final actions
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Salary Review Section */}
          <div className="space-y-6">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-primary" />
              Compensation Review
            </h3>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Left Column - Current Info & CPI Slider */}
              <div className="space-y-4">
                <div className="bg-muted/30 p-4 rounded-md border border-border">
                  <h4 className="text-sm font-medium mb-3">Current Compensation</h4>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="text-muted-foreground">Current Base Salary:</div>
                    <div className="font-medium text-right flex items-center justify-end gap-2">
                      <span className="text-sm">$</span>
                      <Input 
                        type="text"
                        value={currentSalaryInput}
                        onChange={(e) => {
                          // Only allow numbers, commas and decimal point
                          const value = e.target.value.replace(/[^0-9.,]/g, '');
                          setCurrentSalaryInput(value);
                        }}
                        className="w-32 text-right h-7 py-1"
                      />
                      <span className="text-sm">AUD</span>
                    </div>
                    <div className="text-muted-foreground">Super (12%):</div>
                    <div className="font-medium text-right">${(currentSalary * 0.12).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})} AUD</div>
                    <div className="text-muted-foreground">Total Package:</div>
                    <div className="font-medium text-right">${(currentSalary * 1.12).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})} AUD</div>
                  </div>
                </div>
                
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <Label htmlFor="cpi-slider" className="text-sm font-medium">
                      CPI Adjustment (%)
                    </Label>
                    <span className="text-sm font-medium bg-primary/10 text-primary px-2 py-1 rounded">
                      {cpiValue.toFixed(2)}%
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setCpiValue(Math.max(0, cpiValue - 0.25))}
                    >
                      <Minus className="h-4 w-4" />
                    </Button>
                    
                    <div className="flex-1">
                      <Slider
                        id="cpi-slider"
                        min={0}
                        max={10}
                        step={0.01}
                        value={[cpiValue]}
                        onValueChange={(value) => setCpiValue(value[0])}
                        className="w-full"
                      />
                    </div>
                    
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setCpiValue(Math.min(10, cpiValue + 0.25))}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>0%</span>
                    <span>5%</span>
                    <span>10%</span>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <Label htmlFor="performance-slider" className="text-sm font-medium">
                      Performance Based Increase (%)
                    </Label>
                    <span className="text-sm font-medium bg-primary/10 text-primary px-2 py-1 rounded">
                      {performanceValue.toFixed(1)}%
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setPerformanceValue(Math.max(0, performanceValue - 0.5))}
                    >
                      <Minus className="h-4 w-4" />
                    </Button>
                    
                    <div className="flex-1">
                      <Slider
                        id="performance-slider"
                        min={0}
                        max={25}
                        step={0.1}
                        value={[performanceValue]}
                        onValueChange={(value) => {
                          setPerformanceValue(value[0]);
                        }}
                        className="w-full"
                      />
                    </div>
                    
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setPerformanceValue(Math.min(25, performanceValue + 0.5))}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>0%</span>
                    <span>12.5%</span>
                    <span>25%</span>
                  </div>
                </div>
              </div>
              
              {/* Right Column - New Salary & Cost Impact */}
              <div className="space-y-4">
                <div className="bg-primary/5 p-4 rounded-md border border-primary/20">
                  <h4 className="text-sm font-medium mb-3 text-primary">New Compensation</h4>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="text-muted-foreground">New Base Salary:</div>
                    <div className="font-medium text-right">
                      ${newSalary.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})} AUD
                    </div>
                    <div className="text-muted-foreground">Super (12%):</div>
                    <div className="font-medium text-right">${newSuper.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})} AUD</div>
                    <div className="text-muted-foreground">Total Package:</div>
                    <div className="font-medium text-right">${newTotal.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})} AUD</div>
                    <div className="text-muted-foreground mt-2">Annual Increase:</div>
                    <div className="font-bold text-green-500 text-right mt-2">
                      +${annualIncrease.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})} AUD
                    </div>
                    <div className="col-span-2 mt-1">
                      <div className="text-xs text-muted-foreground bg-muted/30 p-2 rounded-md text-right">
                        CPI: +${cpiIncrease.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})} + Performance: +${performanceIncrease.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Salary Band Indicator */}
                <div className="space-y-3">
                  <h4 className="text-sm font-medium">Salary Band Position</h4>
                  <div className="h-8 bg-muted rounded-full overflow-hidden relative">
                    <div className="absolute inset-0 flex">
                      <div className="bg-red-500/20 h-full" style={{ width: '20%' }}></div>
                      <div className="bg-amber-500/20 h-full" style={{ width: '30%' }}></div>
                      <div className="bg-green-500/20 h-full" style={{ width: '30%' }}></div>
                      <div className="bg-blue-500/20 h-full" style={{ width: '20%' }}></div>
                    </div>
                    
                    {/* Current salary marker */}
                    <div 
                      className="absolute top-0 h-full w-2 bg-gray-400 z-10"
                      style={{ 
                        left: `${boundedCurrentPosition}%`,
                        transition: 'left 0.3s ease-in-out'
                      }}
                    >
                      <div className="absolute -top-6 -translate-x-1/2 text-[10px] font-medium bg-gray-400 text-white px-1 py-0.5 rounded whitespace-nowrap">
                        Current
                      </div>
                    </div>
                    
                    {/* New salary marker (after increases) */}
                    <div 
                      className="absolute top-0 h-full w-2 bg-primary z-20"
                      style={{ 
                        left: `${boundedNewPosition}%`,
                        transition: 'left 0.3s ease-in-out'
                      }}
                    >
                      <div className="absolute -top-6 -translate-x-1/2 text-[10px] font-medium bg-primary text-white px-1 py-0.5 rounded whitespace-nowrap">
                        New
                      </div>
                    </div>
                    
                    {/* Target marker */}
                    <div 
                      className="absolute top-0 h-full w-1 bg-white z-5"
                      style={{ 
                        left: `${((salaryBandTarget - salaryBandMin) / bandRange) * 100}%`
                      }}
                    ></div>
                  </div>
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Min (${salaryBandMin.toLocaleString()})</span>
                    <span>Target (${salaryBandTarget.toLocaleString()})</span>
                    <span>Max (${salaryBandMax.toLocaleString()})</span>
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    Position: {salaryBandLabel} of band for {employeeRole}
                  </div>
                  <div className="text-xs mt-2">
                    <span className="font-medium">Current: </span>
                    <span className="text-muted-foreground">${currentSalary.toLocaleString()} (${(currentSalary - salaryBandMin).toLocaleString()} above minimum)</span>
                  </div>
                  <div className="text-xs">
                    <span className="font-medium">New: </span>
                    <span className="text-primary">${newSalary.toLocaleString()} (${(newSalary - currentSalary).toLocaleString()} increase)</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </TabsContent>
  );

  // Return the component with the salary review tab
  return (
    <div>
      {/* Add the SalaryReviewTabContent to your existing tabs */}
      <SalaryReviewTabContent />
    </div>
  );
}
