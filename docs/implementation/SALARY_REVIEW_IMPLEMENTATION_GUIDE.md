# Salary Review Tab Implementation Guide

This guide explains how to integrate the Salary Review tab into the CEO's PDR review page. The implementation preserves all original functionality while making only the current base salary editable by the CEO.

## Overview

The Salary Review tab allows the CEO to:
1. Input the employee's current base salary
2. Adjust CPI and Performance-based increases using sliders
3. See the calculated new salary, super, and total package
4. Visualize where the current and new salaries fall within the salary band

## Implementation Steps

### 1. Add Required Imports

Add these imports to `src/app/(ceo)/admin/reviews/[id]/page.tsx`:

```tsx
import { Slider } from '@/components/ui/slider';
import {
  DollarSign,
  Plus,
  Minus,
} from 'lucide-react';
```

### 2. Add State Variables

Add these state variables to the component:

```tsx
// Salary review tab state
const [cpiValue, setCpiValue] = useState<number>(2.5); // Default CPI value
const [performanceValue, setPerformanceValue] = useState<number>(5.0); // Default Performance Based Increase value
const [currentSalaryInput, setCurrentSalaryInput] = useState<string>('85000'); // CEO editable current salary
const [employeeRole, setEmployeeRole] = useState<string>('Developer');
const [salaryBandPosition, setSalaryBandPosition] = useState<number>(50); // Position in salary band (%)
const [salaryBandLabel, setSalaryBandLabel] = useState<string>('Mid-range');

// Salary band min/max values
const salaryBandMin = 75000;
const salaryBandTarget = 95000;
const salaryBandMax = 115000;
```

### 3. Add Calculation Logic

Add these calculations after the state variables:

```tsx
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
```

### 4. Add Tab Trigger

Add this to the `TabsList` component:

```tsx
<TabsTrigger value="salary-review" className="flex items-center gap-2">
  <DollarSign className="h-4 w-4" />
  Salary Review
</TabsTrigger>
```

### 5. Add Tab Content

Add this `TabsContent` component after your existing tabs:

```tsx
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
```

## Key Features

1. **Editable Current Base Salary**
   - The CEO can directly edit the current base salary
   - Super and Total Package automatically recalculate

2. **Calculated New Base Salary**
   - New salary is automatically calculated based on CPI and Performance increases
   - Not editable by the CEO

3. **Interactive Sliders**
   - CPI slider: 0-10% in 0.01% increments
   - Performance slider: 0-25% in 0.1% increments

4. **Visual Salary Band**
   - Shows where current and new salaries fall within the band
   - Markers move dynamically as values change

5. **Detailed Breakdown**
   - Annual increase shown prominently in green
   - Breakdown of CPI vs Performance components

## Files

1. `src/app/(ceo)/admin/reviews/[id]/page.tsx` - Main file to modify
2. `src/components/ui/slider.tsx` - Ensure this component is available
3. `src/app/(ceo)/admin/reviews/[id]/page-with-salary-tab.tsx` - Reference implementation

## Testing

1. Navigate to the CEO review page for a PDR
2. Click on the "Salary Review" tab
3. Test editing the current base salary
4. Adjust the CPI and Performance sliders
5. Verify that all calculations update correctly
6. Check that the salary band markers move appropriately
