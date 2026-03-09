
import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react';

interface CalendarWidgetProps {
  className?: string;
  selectedDate?: Date;
  onDateChange?: (date: Date) => void;
}

const CalendarWidget: React.FC<CalendarWidgetProps> = ({ className, selectedDate, onDateChange }) => {
  const [internalDate, setInternalDate] = useState(new Date());
  const [showFullCalendar, setShowFullCalendar] = useState(false);

  const currentDate = selectedDate || internalDate;

  const formatDate = (date: Date) => {
    const options: Intl.DateTimeFormatOptions = { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' };
    return date.toLocaleDateString('en-US', options).toUpperCase();
  };

  const handleDateChange = (date: Date) => {
    if (onDateChange) {
      onDateChange(date);
    } else {
      setInternalDate(date);
    }
  };

  const adjustDate = (days: number) => {
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() + days);
    handleDateChange(newDate);
  };

  // Simple calendar grid logic
  const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

  const daysInMonth = getDaysInMonth(currentDate.getFullYear(), currentDate.getMonth());
  const firstDay = getFirstDayOfMonth(currentDate.getFullYear(), currentDate.getMonth());
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const blanks = Array.from({ length: firstDay }, (_, i) => i);

  return (
    <div className={`relative ${className}`}>
      {/* Pill Date Selector */}
      <div className="bg-black border border-white/10 rounded-full px-6 py-2 flex items-center gap-4 shadow-2xl min-w-[240px] group transition-all hover:border-emerald-500/30">
        <button 
          onClick={() => adjustDate(-1)}
          className="text-text-muted hover:text-emerald-500 transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        
        <div 
          className="flex-1 text-center cursor-pointer"
          onClick={() => setShowFullCalendar(!showFullCalendar)}
        >
          <p className="text-emerald-500 font-black text-[10px] md:text-xs tracking-tighter">
            {formatDate(currentDate)}
          </p>
          <p className="text-[7px] font-black text-text-muted uppercase tracking-widest mt-0.5 group-hover:text-emerald-500/50 transition-colors">
            Change Ledger Date
          </p>
        </div>

        <button 
          onClick={() => adjustDate(1)}
          className="text-text-muted hover:text-emerald-500 transition-colors"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* Dropdown Calendar */}
      {showFullCalendar && (
        <>
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setShowFullCalendar(false)}
          ></div>
          <div className="absolute top-full right-0 mt-4 bg-surface-elevated border border-border-subtle rounded-[2rem] shadow-2xl p-6 z-50 w-72 animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="flex items-center justify-between mb-6">
              <h4 className="text-text-primary font-black text-sm uppercase tracking-tight">
                {currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
              </h4>
              <div className="flex gap-2">
                <button 
                  onClick={() => {
                    const d = new Date(currentDate);
                    d.setMonth(d.getMonth() - 1);
                    handleDateChange(d);
                  }}
                  className="p-1.5 hover:bg-surface-component rounded-lg text-text-muted"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button 
                  onClick={() => {
                    const d = new Date(currentDate);
                    d.setMonth(d.getMonth() + 1);
                    handleDateChange(d);
                  }}
                  className="p-1.5 hover:bg-surface-component rounded-lg text-text-muted"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-7 gap-1 mb-2">
              {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
                <div key={`${d}-${i}`} className="text-center text-[9px] font-black text-text-muted uppercase py-1">{d}</div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-1">
              {blanks.map(b => <div key={`b-${b}`} />)}
              {days.map(d => {
                const isToday = d === new Date().getDate() && 
                                currentDate.getMonth() === new Date().getMonth() && 
                                currentDate.getFullYear() === new Date().getFullYear();
                const isSelected = d === currentDate.getDate();
                
                return (
                  <button
                    key={d}
                    onClick={() => {
                      const newDate = new Date(currentDate);
                      newDate.setDate(d);
                      handleDateChange(newDate);
                      setShowFullCalendar(false);
                    }}
                    className={`
                      aspect-square flex items-center justify-center text-[10px] font-bold rounded-xl transition-all
                      ${isSelected ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' : 'text-text-primary hover:bg-surface-component'}
                      ${isToday && !isSelected ? 'text-emerald-500 border border-emerald-500/20' : ''}
                    `}
                  >
                    {d}
                  </button>
                );
              })}
            </div>

            <button 
              onClick={() => {
                handleDateChange(new Date());
                setShowFullCalendar(false);
              }}
              className="w-full mt-6 py-2 bg-surface-component hover:bg-surface-deep text-text-muted hover:text-emerald-500 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all border border-border-subtle"
            >
              Today
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default CalendarWidget;
