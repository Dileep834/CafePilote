import React, { useState } from 'react';
import { useTableStore } from '../store/useTableStore';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Users, QrCode, Coffee, LayoutGrid, ListFilter } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { TableStatus } from '@/types';

export function TablesDashboard() {
  const { tables, updateTableStatus, generateQR } = useTableStore();
  const [filter, setFilter] = useState<TableStatus | 'all'>('all');

  const filteredTables = filter === 'all' ? tables : tables.filter(t => t.status === filter);

  const getStatusColor = (status: TableStatus) => {
    switch(status) {
      case 'available': return 'bg-green-100 text-green-700 border-green-200';
      case 'occupied': return 'bg-red-100 text-red-700 border-red-200';
      case 'reserved': return 'bg-purple-100 text-purple-700 border-purple-200';
      case 'cleaning': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
    }
  };

  const getStatusDot = (status: TableStatus) => {
    switch(status) {
      case 'available': return 'bg-green-500';
      case 'occupied': return 'bg-red-500';
      case 'reserved': return 'bg-purple-500';
      case 'cleaning': return 'bg-yellow-500';
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-50/50 p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <LayoutGrid className="w-6 h-6 text-purple-600" />
            Table Management
          </h1>
          <p className="text-slate-500">Manage dine-in tables and customer QR codes</p>
        </div>
        <Button className="bg-purple-600 hover:bg-purple-700 text-white rounded-xl shadow-[0_4px_15px_rgba(147,51,234,0.15)] h-11 px-6">
          <Plus className="w-5 h-5 mr-2" />
          <span className="font-bold">Add Table</span>
        </Button>
      </div>

      {/* Filters */}
      <div className="flex gap-2 bg-white p-2 rounded-2xl shadow-sm border border-slate-200 w-fit">
        {['all', 'available', 'occupied', 'reserved', 'cleaning'].map((status) => (
          <button
            key={status}
            onClick={() => setFilter(status as any)}
            className={cn(
              "px-4 py-2 rounded-xl text-sm font-bold capitalize transition-colors flex items-center gap-2",
              filter === status ? "bg-slate-100 text-slate-900 shadow-inner" : "text-slate-500 hover:bg-slate-50"
            )}
          >
            {status !== 'all' && (
              <div className={cn("w-2 h-2 rounded-full", getStatusDot(status as TableStatus))} />
            )}
            {status}
          </button>
        ))}
      </div>

      {/* Table Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
        {filteredTables.map(table => (
          <Card 
            key={table.id}
            className={cn(
              "relative group overflow-hidden border-2 transition-all duration-300 hover:-translate-y-1 cursor-pointer",
              getStatusColor(table.status),
              table.status === 'occupied' ? "shadow-[0_8px_30px_rgba(239,68,68,0.15)]" : "shadow-sm hover:shadow-md"
            )}
          >
            <div className="p-5 flex flex-col items-center justify-center text-center space-y-3">
              <div className="absolute top-3 right-3 flex items-center gap-1 opacity-70">
                <Users className="w-4 h-4" />
                <span className="text-xs font-bold">{table.capacity}</span>
              </div>
              
              <div className={cn(
                "flex flex-col items-center justify-center shadow-inner bg-white/60 backdrop-blur-sm border-4 transition-all",
                table.type === 'round' ? "w-20 h-20 rounded-full" : 
                table.type === 'sofa' ? "w-24 h-16 rounded-2xl" : 
                "w-20 h-20 rounded-xl",
                table.status === 'occupied' ? "border-red-400" :
                table.status === 'reserved' ? "border-purple-400" :
                table.status === 'cleaning' ? "border-yellow-400" :
                "border-green-400"
              )}>
                <h3 className="text-xl font-black tracking-tight">{table.tableNumber}</h3>
                <p className="text-[10px] font-bold uppercase tracking-wider opacity-60 mt-0.5">{table.type}</p>
              </div>
              
              <div>
                <p className="text-xs font-bold uppercase tracking-wider opacity-80 mt-1">{table.status}</p>
              </div>

              {/* Action Buttons overlay on hover */}
              <div className="absolute inset-x-0 bottom-0 p-3 bg-white/95 backdrop-blur-sm translate-y-full group-hover:translate-y-0 transition-transform flex justify-center gap-2 border-t border-black/5">
                {table.qrCodeToken ? (
                  <Button size="sm" variant="outline" className="w-full h-8 text-xs font-bold bg-white" onClick={(e) => { e.stopPropagation(); alert(`QR Link: /menu/${table.outletId}/${table.qrCodeToken}`); }}>
                    <QrCode className="w-3.5 h-3.5 mr-1" /> View QR
                  </Button>
                ) : (
                  <Button size="sm" variant="default" className="w-full h-8 text-xs font-bold bg-slate-800 hover:bg-slate-900" onClick={(e) => { e.stopPropagation(); generateQR(table.id); }}>
                    Generate QR
                  </Button>
                )}
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
