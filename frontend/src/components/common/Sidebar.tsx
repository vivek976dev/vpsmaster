import React from 'react';
import { 
  LayoutDashboard, 
  Server, 
  Layers, 
  Globe, 
  Network, 
  Lock, 
  FolderTree, 
  Database, 
  Code2, 
  Box, 
  Mail, 
  Clock, 
  Archive, 
  ShieldAlert, 
  ScrollText, 
  Terminal, 
  Users, 
  Settings,
  ChevronRight
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  collapsed: boolean;
  setCollapsed: (collapsed: boolean) => void;
}

interface NavGroup {
  title: string;
  items: {
    id: string;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    roles?: string[];
  }[];
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab, collapsed, setCollapsed }) => {
  const { user } = useAuth();
  const role = user?.role || 'website_owner';
  const isAdmin = role === 'super_admin' || role === 'administrator';

  const navGroups: NavGroup[] = [
    {
      title: 'OVERVIEW',
      items: [
        { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { id: 'server', label: 'Server Status', icon: Server, roles: ['super_admin', 'administrator'] },
        { id: 'services', label: 'Services', icon: Layers, roles: ['super_admin', 'administrator'] },
      ],
    },
    {
      title: 'HOSTING & WEBSITES',
      items: [
        { id: 'websites', label: 'Websites', icon: Globe },
        { id: 'dns', label: 'Domains & DNS', icon: Network },
        { id: 'ssl', label: 'SSL Certificates', icon: Lock },
        { id: 'files', label: 'File Manager', icon: FolderTree },
        { id: 'databases', label: 'Databases', icon: Database },
        { id: 'php', label: 'PHP Configuration', icon: Code2, roles: ['super_admin', 'administrator'] },
      ],
    },
    {
      title: 'INFRASTRUCTURE',
      items: [
        { id: 'docker', label: 'Docker Containers', icon: Box, roles: ['super_admin', 'administrator'] },
        { id: 'email', label: 'Email Accounts', icon: Mail },
        { id: 'cron', label: 'Cron Jobs', icon: Clock },
        { id: 'backups', label: 'Backups & Restore', icon: Archive },
      ],
    },
    {
      title: 'SECURITY & LOGS',
      items: [
        { id: 'security', label: 'Firewall & Security', icon: ShieldAlert, roles: ['super_admin', 'administrator'] },
        { id: 'logs', label: 'System Logs', icon: ScrollText, roles: ['super_admin', 'administrator'] },
        { id: 'terminal', label: 'Web Terminal', icon: Terminal, roles: ['super_admin'] },
      ],
    },
    {
      title: 'ADMINISTRATION',
      items: [
        { id: 'users', label: 'Users & Roles', icon: Users, roles: ['super_admin'] },
        { id: 'settings', label: 'Panel Settings', icon: Settings, roles: ['super_admin', 'administrator'] },
      ],
    },
  ];

  return (
    <aside
      className={`bg-slate-900 border-r border-slate-800 transition-all duration-300 flex flex-col z-30 ${
        collapsed ? 'w-20' : 'w-64'
      }`}
    >
      {/* Brand header */}
      <div className="h-16 flex items-center px-5 border-b border-slate-800 justify-between">
        <div className="flex items-center space-x-3 overflow-hidden">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-sky-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-sky-500/20 shrink-0">
            <Server className="w-5 h-5 text-white" />
          </div>
          {!collapsed && (
            <div className="truncate">
              <span className="font-extrabold text-base tracking-tight bg-gradient-to-r from-white via-slate-200 to-sky-400 bg-clip-text text-transparent">
                VPSMaster
              </span>
              <span className="block text-[10px] text-sky-400 font-mono tracking-wider font-semibold">UBUNTU ENTERPRISE</span>
            </div>
          )}
        </div>
      </div>

      {/* Navigation list */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
        {navGroups.map((group, idx) => {
          const visibleItems = group.items.filter(item => !item.roles || item.roles.includes(role));
          if (visibleItems.length === 0) return null;

          return (
            <div key={idx} className="space-y-1">
              {!collapsed && (
                <div className="px-3 text-[10px] font-bold font-mono tracking-wider text-slate-500 uppercase">
                  {group.title}
                </div>
              )}
              {visibleItems.map(item => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id)}
                    title={collapsed ? item.label : undefined}
                    className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all group ${
                      isActive
                        ? 'bg-sky-500 text-white shadow-lg shadow-sky-500/25'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                    }`}
                  >
                    <Icon className={`w-4 h-4 shrink-0 transition-transform ${isActive ? 'scale-110' : 'group-hover:scale-105'}`} />
                    {!collapsed && <span className="truncate flex-1 text-left">{item.label}</span>}
                    {!collapsed && isActive && <ChevronRight className="w-3.5 h-3.5 opacity-80" />}
                  </button>
                );
              })}
            </div>
          );
        })}
      </div>

      {/* Footer server OS indicator */}
      {!collapsed && (
        <div className="p-3 border-t border-slate-800 bg-slate-950/40">
          <div className="bg-slate-800/40 border border-slate-800 rounded-lg p-2.5 flex items-center space-x-2.5">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
            <div className="text-[11px] truncate">
              <div className="font-semibold text-slate-300">Ubuntu 24.04 LTS</div>
              <div className="text-slate-500 font-mono text-[10px]">Kernel 6.8.0 Linux</div>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
};

