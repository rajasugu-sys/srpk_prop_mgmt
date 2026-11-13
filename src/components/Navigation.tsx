import React from 'react';
import { Building, Users, ReceiptText, FileSpreadsheet } from 'lucide-react';
import { ActiveTab } from '../types';
import { useProperty } from '../context/PropertyContext';

interface NavigationProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
}

export const Navigation: React.FC<NavigationProps> = ({ activeTab, setActiveTab }) => {
  const { houses, tenants, invoices } = useProperty();

  const activeTenantsCount = tenants.filter((t) => t.is_active_tenant).length;
  const pendingInvoicesCount = invoices.filter((i) => i.Payment_Status !== 'Paid').length;

  const tabs = [
    {
      id: 'houses' as ActiveTab,
      label: 'House Dashboard',
      shortLabel: 'Houses',
      icon: Building,
      badge: houses.length,
      badgeColor: 'bg-slate-200 text-slate-700',
    },
    {
      id: 'tenants' as ActiveTab,
      label: 'Tenant Dashboard',
      shortLabel: 'Tenants',
      icon: Users,
      badge: activeTenantsCount,
      badgeColor: 'bg-indigo-100 text-indigo-700',
    },
    {
      id: 'invoices' as ActiveTab,
      label: 'Monthly Invoices',
      shortLabel: 'Invoices',
      icon: ReceiptText,
      badge: pendingInvoicesCount > 0 ? `${pendingInvoicesCount} due` : 'All paid',
      badgeColor: pendingInvoicesCount > 0 ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800',
    },
    {
      id: 'sheets' as ActiveTab,
      label: 'Google Sheet Sync',
      shortLabel: 'Datasource',
      icon: FileSpreadsheet,
      badge: 'Live',
      badgeColor: 'bg-emerald-100 text-emerald-800',
    },
  ];

  return (
    <>
      {/* Desktop Top Tab Navigation */}
      <div className="hidden md:block bg-white border-b border-slate-200 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-2" aria-label="Tabs">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center space-x-2 py-3.5 px-4 font-semibold text-sm border-b-2 transition-colors cursor-pointer ${
                    isActive
                      ? 'border-indigo-600 text-indigo-700 bg-indigo-50/50'
                      : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-indigo-600' : 'text-slate-400'}`} />
                  <span>{tab.label}</span>
                  <span
                    className={`ml-2 px-2 py-0.5 text-xs font-medium rounded-full ${tab.badgeColor}`}
                  >
                    {tab.badge}
                  </span>
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Mobile Bottom Navigation Bar */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-slate-200 shadow-xl px-2 py-1.5 safe-bottom">
        <div className="grid grid-cols-4 gap-1">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex flex-col items-center justify-center py-1.5 px-1 rounded-xl text-center transition-all cursor-pointer ${
                  isActive
                    ? 'text-indigo-600 font-bold bg-indigo-50'
                    : 'text-slate-500 font-medium hover:text-slate-800'
                }`}
              >
                <div className="relative">
                  <Icon className={`w-5 h-5 ${isActive ? 'text-indigo-600 scale-110' : 'text-slate-500'}`} />
                  {tab.id === 'invoices' && pendingInvoicesCount > 0 && (
                    <span className="absolute -top-1 -right-2 flex h-2.5 w-2.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
                    </span>
                  )}
                </div>
                <span className="text-[10px] mt-1 tracking-tight truncate max-w-full">
                  {tab.shortLabel}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </>
  );
};
