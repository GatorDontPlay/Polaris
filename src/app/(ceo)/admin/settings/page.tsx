'use client';

import { useState } from 'react';
import { AdminHeader, PageHeader } from '@/components/admin/admin-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { 
  Settings, 
  Save, 
  Users, 
  Bell, 
  Shield, 
  Calendar,
  Mail,
  Database,
  Palette,
  Globe
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function SettingsPage() {
  const { toast } = useToast();
  const [settings, setSettings] = useState({
    // General Settings
    companyName: 'PDR Advanced Demo Company',
    companyEmail: 'admin@pdradvanced.com',
    timezone: 'Australia/Sydney',
    dateFormat: 'DD/MM/YYYY',
    
    // PDR Settings
    reviewCycleDuration: '12', // months
    reminderDays: '7',
    autoLockAfterDays: '30',
    requireManagerApproval: true,
    allowSelfRating: true,
    enableMidYearReviews: true,
    
    // Notification Settings
    emailNotifications: true,
    reminderEmails: true,
    escalationEmails: true,
    weeklyDigest: true,
    
    // Security Settings
    enforceStrongPasswords: true,
    sessionTimeout: '480', // minutes
    requireTwoFactor: false,
    auditLogging: true,
  });

  const handleSave = (section: string) => {
    toast({
      title: 'Settings saved',
      description: `${section} settings have been updated successfully.`,
    });
  };

  const handleSettingChange = (key: string, value: any) => {
    setSettings(prev => ({
      ...prev,
      [key]: value
    }));
  };

  return (
    <div className="flex h-full flex-col">
      <AdminHeader 
        breadcrumbs={[
          { label: 'Dashboard', href: '/admin' },
          { label: 'Settings' }
        ]}
      />

      <div className="flex-1 p-6 space-y-6">
        <PageHeader 
          title="System Settings"
          description="Configure PDR system preferences and organizational settings"
        />

        <Card>
          <CardContent className="p-6">
            <Tabs defaultValue="general" className="space-y-4">
              <TabsList className="grid w-full grid-cols-5">
                <TabsTrigger value="general">General</TabsTrigger>
                <TabsTrigger value="pdr">PDR Settings</TabsTrigger>
                <TabsTrigger value="notifications">Notifications</TabsTrigger>
                <TabsTrigger value="security">Security</TabsTrigger>
                <TabsTrigger value="integrations">Integrations</TabsTrigger>
              </TabsList>

              {/* General Settings */}
              <TabsContent value="general" className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <Globe className="h-5 w-5" />
                    <h3 className="text-lg font-semibold">Company Information</h3>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="companyName">Company Name</Label>
                      <Input 
                        id="companyName"
                        value={settings.companyName}
                        onChange={(e) => handleSettingChange('companyName', e.target.value)}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="companyEmail">Company Email</Label>
                      <Input 
                        id="companyEmail"
                        type="email"
                        value={settings.companyEmail}
                        onChange={(e) => handleSettingChange('companyEmail', e.target.value)}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="timezone">Timezone</Label>
                      <Input 
                        id="timezone"
                        value={settings.timezone}
                        onChange={(e) => handleSettingChange('timezone', e.target.value)}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="dateFormat">Date Format</Label>
                      <Input 
                        id="dateFormat"
                        value={settings.dateFormat}
                        onChange={(e) => handleSettingChange('dateFormat', e.target.value)}
                      />
                    </div>
                  </div>
                  
                  <Button onClick={() => handleSave('General')}>
                    <Save className="mr-2 h-4 w-4" />
                    Save General Settings
                  </Button>
                </div>
              </TabsContent>

              {/* PDR Settings */}
              <TabsContent value="pdr" className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <Calendar className="h-5 w-5" />
                    <h3 className="text-lg font-semibold">Review Cycle Configuration</h3>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="reviewCycle">Review Cycle Duration (months)</Label>
                      <Input 
                        id="reviewCycle"
                        type="number"
                        value={settings.reviewCycleDuration}
                        onChange={(e) => handleSettingChange('reviewCycleDuration', e.target.value)}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="reminderDays">Reminder Days Before Due</Label>
                      <Input 
                        id="reminderDays"
                        type="number"
                        value={settings.reminderDays}
                        onChange={(e) => handleSettingChange('reminderDays', e.target.value)}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="autoLock">Auto-lock After Days</Label>
                      <Input 
                        id="autoLock"
                        type="number"
                        value={settings.autoLockAfterDays}
                        onChange={(e) => handleSettingChange('autoLockAfterDays', e.target.value)}
                      />
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-4">
                    <h4 className="font-medium">Review Permissions</h4>
                    
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <Label htmlFor="managerApproval">Require Manager Approval</Label>
                          <p className="text-sm text-muted-foreground">PDRs must be approved by managers before completion</p>
                        </div>
                        <Switch 
                          id="managerApproval"
                          checked={settings.requireManagerApproval}
                          onCheckedChange={(checked) => handleSettingChange('requireManagerApproval', checked)}
                        />
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div>
                          <Label htmlFor="selfRating">Allow Self-Rating</Label>
                          <p className="text-sm text-muted-foreground">Employees can rate their own performance</p>
                        </div>
                        <Switch 
                          id="selfRating"
                          checked={settings.allowSelfRating}
                          onCheckedChange={(checked) => handleSettingChange('allowSelfRating', checked)}
                        />
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div>
                          <Label htmlFor="midYearReviews">Enable Mid-Year Reviews</Label>
                          <p className="text-sm text-muted-foreground">Include mid-year check-ins in the review cycle</p>
                        </div>
                        <Switch 
                          id="midYearReviews"
                          checked={settings.enableMidYearReviews}
                          onCheckedChange={(checked) => handleSettingChange('enableMidYearReviews', checked)}
                        />
                      </div>
                    </div>
                  </div>
                  
                  <Button onClick={() => handleSave('PDR')}>
                    <Save className="mr-2 h-4 w-4" />
                    Save PDR Settings
                  </Button>
                </div>
              </TabsContent>

              {/* Notification Settings */}
              <TabsContent value="notifications" className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <Bell className="h-5 w-5" />
                    <h3 className="text-lg font-semibold">Email Notifications</h3>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label htmlFor="emailNotifications">Email Notifications</Label>
                        <p className="text-sm text-muted-foreground">Enable all email notifications</p>
                      </div>
                      <Switch 
                        id="emailNotifications"
                        checked={settings.emailNotifications}
                        onCheckedChange={(checked) => handleSettingChange('emailNotifications', checked)}
                      />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div>
                        <Label htmlFor="reminderEmails">Reminder Emails</Label>
                        <p className="text-sm text-muted-foreground">Send reminder emails before due dates</p>
                      </div>
                      <Switch 
                        id="reminderEmails"
                        checked={settings.reminderEmails}
                        onCheckedChange={(checked) => handleSettingChange('reminderEmails', checked)}
                      />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div>
                        <Label htmlFor="escalationEmails">Escalation Emails</Label>
                        <p className="text-sm text-muted-foreground">Send escalation emails for overdue items</p>
                      </div>
                      <Switch 
                        id="escalationEmails"
                        checked={settings.escalationEmails}
                        onCheckedChange={(checked) => handleSettingChange('escalationEmails', checked)}
                      />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div>
                        <Label htmlFor="weeklyDigest">Weekly Digest</Label>
                        <p className="text-sm text-muted-foreground">Send weekly summary emails to managers</p>
                      </div>
                      <Switch 
                        id="weeklyDigest"
                        checked={settings.weeklyDigest}
                        onCheckedChange={(checked) => handleSettingChange('weeklyDigest', checked)}
                      />
                    </div>
                  </div>
                  
                  <Button onClick={() => handleSave('Notifications')}>
                    <Save className="mr-2 h-4 w-4" />
                    Save Notification Settings
                  </Button>
                </div>
              </TabsContent>

              {/* Security Settings */}
              <TabsContent value="security" className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <Shield className="h-5 w-5" />
                    <h3 className="text-lg font-semibold">Security & Privacy</h3>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label htmlFor="strongPasswords">Enforce Strong Passwords</Label>
                        <p className="text-sm text-muted-foreground">Require complex passwords for all users</p>
                      </div>
                      <Switch 
                        id="strongPasswords"
                        checked={settings.enforceStrongPasswords}
                        onCheckedChange={(checked) => handleSettingChange('enforceStrongPasswords', checked)}
                      />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div>
                        <Label htmlFor="twoFactor">Require Two-Factor Authentication</Label>
                        <p className="text-sm text-muted-foreground">Mandatory 2FA for all admin accounts</p>
                      </div>
                      <Switch 
                        id="twoFactor"
                        checked={settings.requireTwoFactor}
                        onCheckedChange={(checked) => handleSettingChange('requireTwoFactor', checked)}
                      />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div>
                        <Label htmlFor="auditLogging">Audit Logging</Label>
                        <p className="text-sm text-muted-foreground">Log all user actions for security auditing</p>
                      </div>
                      <Switch 
                        id="auditLogging"
                        checked={settings.auditLogging}
                        onCheckedChange={(checked) => handleSettingChange('auditLogging', checked)}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="sessionTimeout">Session Timeout (minutes)</Label>
                    <Input 
                      id="sessionTimeout"
                      type="number"
                      value={settings.sessionTimeout}
                      onChange={(e) => handleSettingChange('sessionTimeout', e.target.value)}
                      className="max-w-xs"
                    />
                  </div>
                  
                  <Button onClick={() => handleSave('Security')}>
                    <Save className="mr-2 h-4 w-4" />
                    Save Security Settings
                  </Button>
                </div>
              </TabsContent>

              {/* Integrations */}
              <TabsContent value="integrations" className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <Database className="h-5 w-5" />
                    <h3 className="text-lg font-semibold">System Integrations</h3>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center justify-between">
                          <span>HRIS Integration</span>
                          <Badge>Not Connected</Badge>
                        </CardTitle>
                        <CardDescription>
                          Sync employee data with your HR Information System
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <Button variant="outline" className="w-full">
                          Configure HRIS
                        </Button>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center justify-between">
                          <span>Email Service</span>
                          <Badge className="bg-green-100 text-green-800">Connected</Badge>
                        </CardTitle>
                        <CardDescription>
                          SMTP configuration for email notifications
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <Button variant="outline" className="w-full">
                          Update Configuration
                        </Button>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center justify-between">
                          <span>SSO Provider</span>
                          <Badge>Not Connected</Badge>
                        </CardTitle>
                        <CardDescription>
                          Single Sign-On integration with your identity provider
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <Button variant="outline" className="w-full">
                          Setup SSO
                        </Button>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center justify-between">
                          <span>Analytics Platform</span>
                          <Badge>Not Connected</Badge>
                        </CardTitle>
                        <CardDescription>
                          Export performance data to analytics platforms
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <Button variant="outline" className="w-full">
                          Connect Analytics
                        </Button>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
