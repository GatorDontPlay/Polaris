'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useDemoAuth } from '@/hooks/use-demo-auth';
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
  SidebarTrigger,
  useSidebar,
} from '@/components/ui/sidebar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
// Theme toggle removed as we're keeping dark mode only
import {
  LayoutDashboard,
  FileText,
  Target,
  Settings,
  LogOut,
  User,
  ChevronDown,
  History,
  Bell,
  HelpCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const navigation = [
  {
    name: 'Dashboard',
    href: '/dashboard',
    icon: LayoutDashboard,
    badge: null,
  },
  {
    name: 'How To',
    href: '/dashboard/how-to',
    icon: HelpCircle,
    badge: null,
  },
  {
    name: 'My PDRs',
    href: '/dashboard/pdrs',
    icon: FileText,
    badge: null,
  },
  {
    name: 'Goals',
    href: '/dashboard/goals',
    icon: Target,
    badge: null,
  },
];

export function EmployeeSidebar() {
  const pathname = usePathname();
  const { user, logout } = useDemoAuth();
  const { state } = useSidebar();
  const isCollapsed = state === "collapsed";

  const handleLogout = async () => {
    await logout();
  };

  const getUserInitials = (firstName?: string, lastName?: string) => {
    if (!firstName || !lastName) {return 'U';}
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  return (
    <Sidebar collapsible="icon" className="border-r">
      <SidebarHeader className="border-b">
        <div className="flex flex-col items-center gap-2 px-4 py-3">
          <div className="group-data-[collapsible=icon]:hidden">
            <Image
              src="/company-logo.svg"
              alt="Company Logo"
              width={160}
              height={48}
              className="h-10 w-auto"
            />
            <span className="text-white font-black text-lg tracking-wide block text-center mt-2">
              POLARIS
            </span>
          </div>
          <SidebarTrigger className="text-white hover:bg-white/10" />
        </div>
      </SidebarHeader>

      <SidebarContent className="px-3 py-4">
        <SidebarMenu className="space-y-2">
          {navigation.map((item) => {
            // Special case for Dashboard to ensure it's only active on the exact route
            const isActive = item.name === 'Dashboard' 
              ? pathname === item.href 
              : pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <SidebarMenuItem key={item.name}>
                <SidebarMenuButton
                  asChild
                  isActive={isActive}
                  tooltip={item.name}
                  className={cn(
                    "text-white/70 hover:text-white hover:bg-white/10",
                    isActive && "bg-primary/20 text-white border border-primary/30"
                  )}
                >
                  <Link href={item.href}>
                    <item.icon className="h-5 w-5" />
                    <span className="group-data-[collapsible=icon]:sr-only">{item.name}</span>
                    {item.badge && (
                      <Badge 
                        variant={isActive ? "default" : "secondary"} 
                        className={cn(
                          "ml-auto text-xs h-5 px-2 group-data-[collapsible=icon]:hidden",
                          isActive ? "bg-primary text-primary-foreground" : "bg-white/20 text-white"
                        )}
                      >
                        {item.badge}
                      </Badge>
                    )}
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>
      </SidebarContent>

      <SidebarFooter className="border-t">
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton 
                  size="lg"
                  className="text-white hover:bg-white/10"
                >
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="text-xs bg-primary text-primary-foreground">
                      {getUserInitials(user?.firstName, user?.lastName)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="grid flex-1 text-left text-sm leading-tight group-data-[collapsible=icon]:hidden">
                    <span className="truncate font-semibold text-white">
                      {user?.firstName} {user?.lastName}
                    </span>
                    <span className="truncate text-xs text-white/70">
                      {user?.email}
                    </span>
                  </div>
                  <ChevronDown className="ml-auto size-4 text-white/70 group-data-[collapsible=icon]:hidden" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="w-56"
                side="right"
                sideOffset={8}
              >
                <DropdownMenuItem asChild>
                  <Link href="/dashboard/profile" className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Profile
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/dashboard/settings" className="flex items-center gap-2">
                    <Settings className="h-4 w-4" />
                    Settings
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <div className="px-2 py-1">
                  {/* Theme toggle removed as we're keeping dark mode only */}
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={handleLogout}
                  className="flex items-center gap-2 text-destructive focus:text-destructive"
                >
                  <LogOut className="h-4 w-4" />
                  Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
