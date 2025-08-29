'use client';

import React, { useState, useEffect } from 'react';
import { useEmployees } from '@/hooks/use-admin';
import { useDemoAuth } from '@/hooks/use-demo-auth';
import { AdminHeader, PageHeader } from '@/components/admin/admin-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  Search, 
  MoreHorizontal, 
  UserPlus, 
  Eye, 
  Edit, 
  Trash,
  Mail,
  Calendar,
  Users
} from 'lucide-react';
import { formatDateAU } from '@/lib/utils';

export default function EmployeesPage() {
  const { data: employeesResponse, isLoading } = useEmployees();
  const { user } = useDemoAuth();
  const [employees, setEmployees] = useState(employeesResponse?.data || []);
  
  // State to track edited fields
  const [editedFields, setEditedFields] = useState<Record<string, { department?: string; role?: string; status?: string }>>({});
  
  // Update employees when data loads
  React.useEffect(() => {
    if (employeesResponse?.data) {
      setEmployees(employeesResponse.data);
    }
  }, [employeesResponse?.data]);
  const [searchQuery, setSearchQuery] = useState('');

  // Filter employees based on search query
  const filteredEmployees = employees?.filter(employee =>
    `${employee.firstName} ${employee.lastName}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
    employee.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (employee.department || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (employee.role || '').toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];
  
  // Handle department change
  const handleDepartmentChange = (employeeId: string, value: string) => {
    setEditedFields(prev => ({
      ...prev,
      [employeeId]: { ...prev[employeeId], department: value }
    }));
    
    // In a real app, you would call an API to update the employee record
    // For now, we'll update the local state
    setEmployees(prev => 
      prev.map(emp => 
        emp.id === employeeId ? { ...emp, department: value } : emp
      )
    );
  };
  
  // Handle role change
  const handleRoleChange = (employeeId: string, value: string) => {
    setEditedFields(prev => ({
      ...prev,
      [employeeId]: { ...prev[employeeId], role: value }
    }));
    
    setEmployees(prev => 
      prev.map(emp => 
        emp.id === employeeId ? { ...emp, role: value } : emp
      )
    );
  };
  
  // Handle status change
  const handleStatusChange = (employeeId: string, value: string) => {
    setEditedFields(prev => ({
      ...prev,
      [employeeId]: { ...prev[employeeId], status: value }
    }));
    
    setEmployees(prev => 
      prev.map(emp => 
        emp.id === employeeId ? { ...emp, isActive: value === 'Active' } : emp
      )
    );
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'inactive':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(part => part.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  if (isLoading) {
    return (
      <div className="flex h-full flex-col">
        <AdminHeader 
          breadcrumbs={[
            { label: 'Dashboard', href: '/admin' },
            { label: 'Employees' }
          ]}
        />
        <div className="flex-1 p-6">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="mt-2 text-muted-foreground">Loading employees...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <AdminHeader 
        breadcrumbs={[
          { label: 'Dashboard', href: '/admin' },
          { label: 'Employees' }
        ]}
        actions={
          <Button>
            <UserPlus className="mr-2 h-4 w-4" />
            Add Employee
          </Button>
        }
      />

      <div className="flex-1 p-6 space-y-6">
        <PageHeader 
          title="Employee Management"
          description="Manage employee profiles, roles, and PDR assignments"
        />

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <Users className="h-8 w-8 text-blue-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-muted-foreground">Total Employees</p>
                  <p className="text-2xl font-bold">{employeesResponse?.pagination?.total || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center">
                  <div className="h-4 w-4 rounded-full bg-green-600"></div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-muted-foreground">Active</p>
                  <p className="text-2xl font-bold">
                    {employees?.filter(emp => emp.isActive).length || 0}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Recent PDRs and Due PDRs cards removed as requested */}
        </div>

        {/* Search and Filters */}
        <Card>
          <CardHeader>
            <CardTitle>Employee Directory</CardTitle>
            <CardDescription>
              View and manage all employees in your organization
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2 mb-4">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-2.5 h-4 w-4 text-muted-foreground top-1/2 transform -translate-y-1/2" />
                <Input
                  placeholder="Search employees..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8"
                />
              </div>
              <Button variant="outline">Filter</Button>
            </div>

            {/* Employee Table */}
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Last PDR</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredEmployees.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8">
                        <div className="text-muted-foreground">
                          {searchQuery ? 'No employees found matching your search.' : 'No employees found.'}
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredEmployees.map((employee) => (
                      <TableRow key={employee.id}>
                        <TableCell>
                          <div className="flex items-center space-x-3">
                            <Avatar className="h-8 w-8">
                              <AvatarFallback className="text-xs">
                                {getInitials(employee.firstName + ' ' + employee.lastName)}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <div className="font-medium">{employee.firstName + ' ' + employee.lastName}</div>
                              <div className="text-sm text-muted-foreground">{employee.email}</div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Select 
                            defaultValue={employee.department || ''}
                            onValueChange={(value) => handleDepartmentChange(employee.id, value)}
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Select department" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Design">Design</SelectItem>
                              <SelectItem value="Development">Development</SelectItem>
                              <SelectItem value="Operations">Operations</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell className="text-sm">
                          <Input 
                            defaultValue={employee.role || ''}
                            onChange={(e) => handleRoleChange(employee.id, e.target.value)}
                            className="w-full"
                          />
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <div className={`h-3 w-3 rounded-full ${employee.isActive ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div>
                            <Select 
                              defaultValue={employee.isActive ? 'Active' : 'Inactive'}
                              onValueChange={(value) => handleStatusChange(employee.id, value)}
                            >
                              <SelectTrigger className="w-full">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="Active">Active</SelectItem>
                                <SelectItem value="Inactive">Inactive</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm">
                          {employee.pdrs?.find(pdr => pdr.status === 'COMPLETED')?.updatedAt 
                            ? formatDateAU(new Date(employee.pdrs.find(pdr => pdr.status === 'COMPLETED')?.updatedAt)) 
                            : 'Never'}
                        </TableCell>
                        {/* Actions column removed as requested */}
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
