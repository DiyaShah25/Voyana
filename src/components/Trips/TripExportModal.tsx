import React, { useState } from 'react';
import {
  Printer, Download, Copy, Check, X, MapPin,
  Calendar, Users, DollarSign, Clock, ShieldCheck,
  FileText, Sparkles, Plane, Compass
} from 'lucide-react';
import type { Trip } from '@/services/tripService';
import type { DebtSettlement, TripExpense } from '@/services/collaborationService';

export interface TripExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  trip: Trip;
  expenses?: TripExpense[];
  debtSummary?: { totalSpent: number; settlements: DebtSettlement[] };
}

export default function TripExportModal({
  isOpen,
  onClose,
  trip,
  expenses = [],
  debtSummary,
}: TripExportModalProps) {
  const [copiedText, setCopiedText] = useState(false);

  if (!isOpen) return null;

  const voucherRefCode = `VY-${trip.destination.substring(0, 3).toUpperCase()}-${trip.id.substring(trip.id.length - 4).toUpperCase()}`;

  const handlePrint = () => {
    window.print();
  };

  const handleCopyTextSummary = () => {
    let summary = `✈️ VOYANA TRIP ITINERARY & TRAVEL VOUCHER\n`;
    summary += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
    summary += `Trip: ${trip.title}\n`;
    summary += `Destination: ${trip.destination}${trip.country ? `, ${trip.country}` : ''}\n`;
    summary += `Dates: ${trip.startDate} to ${trip.endDate}\n`;
    summary += `Reference: ${voucherRefCode}\n`;
    summary += `Travelers (${trip.members?.length || 1}): ${trip.members?.map((m) => m.name).join(', ') || 'Megha Lalwani'}\n`;
    summary += `Budget: $${trip.budgetTarget.toLocaleString()} ${trip.currency}\n\n`;

    summary += `📅 SCHEDULE & ACTIVITIES:\n`;
    for (let day = 1; day <= 7; day++) {
      const dayActs = (trip.activities || []).filter((a) => a.dayNumber === day);
      if (dayActs.length > 0) {
        summary += `\nDay ${day}:\n`;
        dayActs.forEach((act) => {
          summary += `  • ${act.timeSlot || 'Anytime'}: ${act.title}${act.locationName ? ` (@ ${act.locationName})` : ''}${act.cost ? ` [$${act.cost}]` : ''}\n`;
        });
      }
    }

    if (debtSummary && debtSummary.settlements.length > 0) {
      summary += `\n💰 DEBT SETTLEMENT SUMMARY:\n`;
      debtSummary.settlements.forEach((s) => {
        summary += `  • ${s.from} owes ${s.to} $${s.amount}\n`;
      });
    }

    summary += `\nGenerated via Voyana Trip Management & Collaboration Hub.`;

    navigator.clipboard.writeText(summary);
    setCopiedText(true);
    setTimeout(() => setCopiedText(false), 2500);
  };

  const handleDownloadJSON = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(trip, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `${trip.destination.toLowerCase()}_trip_itinerary.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center p-3 sm:p-4 bg-slate-950/90 backdrop-blur-2xl animate-fade-in overflow-y-auto">
      <div className="relative w-full max-w-3xl bg-slate-900 border border-white/15 rounded-3xl shadow-2xl overflow-hidden my-4 flex flex-col max-h-[92vh]">
        {/* Top Actions Bar (Hidden during window.print via CSS) */}
        <div className="px-6 py-4 border-b border-white/10 bg-slate-950/60 flex items-center justify-between gap-4 print:hidden">
          <div className="flex items-center gap-2 text-white">
            <FileText size={18} className="text-indigo-400" />
            <h3 className="text-sm font-bold">Printable Itinerary & Travel Pass</h3>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyTextSummary}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 text-xs font-semibold transition-all"
            >
              {copiedText ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
              <span>{copiedText ? 'Copied' : 'Copy Text'}</span>
            </button>

            <button
              onClick={handleDownloadJSON}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 text-xs font-semibold transition-all"
              title="Download JSON Export"
            >
              <Download size={14} />
              <span>JSON</span>
            </button>

            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-md transition-all hover:scale-105"
            >
              <Printer size={14} />
              <span>Print / PDF</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-xl hover:bg-white/10"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Printable Voucher Content */}
        <div className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-6 text-slate-200 print:text-black print:p-0">
          {/* Header Card */}
          <div className="bg-gradient-to-r from-indigo-950/70 via-purple-950/60 to-slate-900 border border-indigo-500/30 rounded-2xl p-6 relative overflow-hidden print:border-black print:bg-none">
            <div className="flex flex-wrap items-center justify-between gap-4 relative z-10">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-indigo-600 flex items-center justify-center text-white font-black text-xl shadow-lg">
                  VY
                </div>
                <div>
                  <span className="text-[10px] uppercase tracking-widest font-bold text-indigo-300">
                    Official Travel Voucher
                  </span>
                  <h2 className="text-xl font-black text-white print:text-black">{trip.title}</h2>
                  <p className="text-xs text-slate-300 flex items-center gap-1 mt-0.5 print:text-slate-700">
                    <MapPin size={12} className="text-rose-400" />
                    <span>{trip.destination}{trip.country ? `, ${trip.country}` : ''}</span>
                  </p>
                </div>
              </div>

              <div className="text-right">
                <span className="text-[10px] text-slate-400 block uppercase tracking-wider font-semibold">Pass Reference</span>
                <span className="text-sm font-mono font-bold text-indigo-300 bg-indigo-950/60 border border-indigo-500/30 px-3 py-1 rounded-lg inline-block print:text-black print:border-black">
                  {voucherRefCode}
                </span>
              </div>
            </div>
          </div>

          {/* Quick Details Matrix */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-white/[0.03] border border-white/10 rounded-xl p-3 print:border-slate-300">
              <span className="text-[10px] text-slate-400 block uppercase font-semibold">Dates</span>
              <p className="text-xs font-bold text-white mt-0.5 print:text-black">{trip.startDate}</p>
              <p className="text-[10px] text-slate-400">to {trip.endDate}</p>
            </div>

            <div className="bg-white/[0.03] border border-white/10 rounded-xl p-3 print:border-slate-300">
              <span className="text-[10px] text-slate-400 block uppercase font-semibold">Travelers</span>
              <p className="text-xs font-bold text-white mt-0.5 print:text-black">
                {trip.members?.length || 1} Person(s)
              </p>
              <p className="text-[10px] text-slate-400 truncate">
                {trip.members?.map((m) => m.name).join(', ') || 'Megha Lalwani'}
              </p>
            </div>

            <div className="bg-white/[0.03] border border-white/10 rounded-xl p-3 print:border-slate-300">
              <span className="text-[10px] text-slate-400 block uppercase font-semibold">Budget Goal</span>
              <p className="text-xs font-bold text-emerald-400 mt-0.5 print:text-black">
                ${trip.budgetTarget.toLocaleString()} {trip.currency}
              </p>
              <p className="text-[10px] text-slate-400">Target allocation</p>
            </div>

            <div className="bg-white/[0.03] border border-white/10 rounded-xl p-3 print:border-slate-300">
              <span className="text-[10px] text-slate-400 block uppercase font-semibold">Status</span>
              <p className="text-xs font-bold text-indigo-300 mt-0.5 flex items-center gap-1 print:text-black">
                <ShieldCheck size={13} className="text-emerald-400" />
                <span>Verified Itinerary</span>
              </p>
              <p className="text-[10px] text-slate-400">Active Workspace</p>
            </div>
          </div>

          {/* Daily Schedules */}
          <div className="space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 border-b border-white/10 pb-2 print:text-black print:border-black">
              Day-by-Day Activity Schedule
            </h4>

            {[1, 2, 3, 4, 5, 6, 7].map((d) => {
              const dayActivities = (trip.activities || []).filter((a) => a.dayNumber === d);
              if (dayActivities.length === 0 && d > 3) return null;

              return (
                <div key={d} className="bg-white/[0.02] border border-white/5 rounded-xl p-4 print:border-slate-300">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="w-6 h-6 rounded-md bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 flex items-center justify-center text-[10px] font-bold print:text-black">
                      D{d}
                    </span>
                    <h5 className="text-xs font-bold text-white print:text-black">Day {d} Timeline</h5>
                  </div>

                  {dayActivities.length === 0 ? (
                    <p className="text-xs text-slate-500 italic">Free day / leisure exploration.</p>
                  ) : (
                    <div className="space-y-2">
                      {dayActivities.map((act) => (
                        <div
                          key={act.id}
                          className="bg-white/[0.03] border border-white/5 rounded-lg p-2.5 flex items-start justify-between gap-3 text-xs print:border-slate-200"
                        >
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-[11px] font-semibold text-indigo-300 print:text-black">
                                {act.timeSlot || 'Anytime'}
                              </span>
                              <span className="font-bold text-white print:text-black">{act.title}</span>
                              <span className="text-[10px] px-1.5 py-0.2 rounded bg-white/5 text-slate-400">
                                {act.category || 'Sightseeing'}
                              </span>
                            </div>
                            {act.locationName && (
                              <p className="text-[11px] text-slate-400 mt-0.5 print:text-slate-600">
                                📍 {act.locationName}
                              </p>
                            )}
                            {act.description && (
                              <p className="text-[11px] text-slate-400 italic mt-0.5 print:text-slate-600">
                                "{act.description}"
                              </p>
                            )}
                          </div>

                          {act.cost ? (
                            <span className="font-bold text-emerald-400 print:text-black whitespace-nowrap">
                              ${act.cost}
                            </span>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Group Expense & Debt Settlement Section */}
          {debtSummary && debtSummary.settlements.length > 0 && (
            <div className="bg-indigo-950/30 border border-indigo-500/20 rounded-xl p-4 print:border-slate-300">
              <h4 className="text-xs font-bold text-indigo-300 uppercase tracking-wider mb-2 print:text-black">
                Settlement Balances
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                {debtSummary.settlements.map((s, idx) => (
                  <div key={idx} className="flex items-center justify-between bg-black/30 p-2 rounded-lg print:border print:border-slate-200">
                    <span className="text-slate-300 print:text-black">{s.from} → {s.to}</span>
                    <span className="font-bold text-emerald-400 print:text-black">${s.amount}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Footer Voucher Seal */}
          <div className="pt-4 border-t border-white/10 flex flex-wrap items-center justify-between gap-3 text-[10px] text-slate-500 print:text-slate-600">
            <span>Powered by Voyana Travel Management OS</span>
            <span>Issued electronically for {trip.members?.[0]?.name || 'Megha Lalwani'}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
