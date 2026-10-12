'use client';

import * as React from 'react';
import { Search, Bell } from 'lucide-react';
import { Avatar } from '@urgent/ui';

interface TopbarProps {
  breadcrumb?: React.ReactNode;
  onModeSwitch?: () => void;
  mode: 'REQUESTER' | 'RUNNER';
}

export function Topbar({ breadcrumb, onModeSwitch, mode }: TopbarProps) {
  return (
    <header className="flex items-center gap-3 px-3 py-2.5 rounded-full bg-surface shadow-[var(--shadow)]">
      {breadcrumb && (
        <div className="flex items-center gap-2 min-w-0 text-muted text-[12.5px] font-semibold whitespace-nowrap">
          {breadcrumb}
        </div>
      )}

      <div className="relative flex-1 max-w-[420px] ml-auto">
        <Search className="absolute top-3 left-3.5 w-4 h-4 text-muted pointer-events-none" />
        <input
          type="search"
          placeholder="Search..."
          className="w-full h-[42px] pl-10 pr-3.5 rounded-full bg-panel text-[13px] border-0 outline-none focus:ring-2 focus:ring-lime-600/25"
        />
      </div>

      <div className="flex items-center gap-2 ml-auto">
        {onModeSwitch && (
          <div className="inline-flex p-1 rounded-full bg-panel">
            <button
              onClick={onModeSwitch}
              className={cn(
                'px-3.5 py-2 rounded-full text-[12.5px] font-bold transition-all',
                mode === 'REQUESTER' ? 'bg-ink text-white' : 'text-muted'
              )}
            >
              Requester
            </button>
            <button
              onClick={onModeSwitch}
              className={cn(
                'px-3.5 py-2 rounded-full text-[12.5px] font-bold transition-all',
                mode === 'RUNNER' ? 'bg-ink text-white' : 'text-muted'
              )}
            >
              Runner
            </button>
          </div>
        )}

        <button className="relative grid place-items-center w-[42px] h-[42px] rounded-full bg-panel hover:bg-tint-2 transition-colors">
          <Bell className="w-5 h-5 text-ink-2" />
          <span className="absolute top-2 right-2.5 w-2 h-2 rounded-full bg-[#ff5a36] border-2 border-white" />
        </button>

        <Avatar size="default" variant="default" initials="JD" />
      </div>
    </header>
  );
}

function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(' ');
}
