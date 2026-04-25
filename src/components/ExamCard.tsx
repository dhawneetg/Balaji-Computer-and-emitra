'use client';

import React, { useEffect, useState } from 'react';
import { Calendar, Briefcase, GraduationCap, Shield, Building, Train, ShieldAlert, Send, HeartPulse, Flame } from 'lucide-react';
import { motion } from 'framer-motion';
import type { ExamData } from '@/app/api/exams/route';

interface ExamCardProps {
  exam: ExamData;
  onClick: () => void;
}

export default function ExamCard({ exam, onClick }: ExamCardProps) {
  const [isExpired, setIsExpired] = useState(false);
  const [daysLeft, setDaysLeft] = useState(0);
  const [isSending, setIsSending] = useState(false);

  const handleWhatsAppClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isSending) return;
    
    setIsSending(true);
    try {
      const response = await fetch('/api/whatsapp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(exam)
      });
      if (response.ok) {
        alert('📢 Broadcast sent to WhatsApp!');
      } else {
        const errorData = await response.json();
        alert(`❌ Failed: ${errorData.error || 'Check if Bot is running.'}`);
      }
    } catch (err) {
      alert('❌ Error sending update.');
    } finally {
      setIsSending(false);
    }
  };

  useEffect(() => {
    let endTime = 0;
    const dateStr = exam.endDate.trim();
    if (dateStr.includes('-')) {
      const parts = dateStr.split('-');
      if (parts[0].length === 4) { 
        endTime = new Date(dateStr).getTime();
      } else if (parts[2]?.length === 4) { 
        endTime = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`).getTime();
      }
    } else {
      endTime = new Date(dateStr).getTime();
    }

    if (isNaN(endTime)) {
      setDaysLeft(0);
      setIsExpired(false);
    } else {
      const now = new Date();
      now.setHours(0, 0, 0, 0);
      const diffTime = endTime - now.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      setDaysLeft(diffDays);
      setIsExpired(diffDays < 0);
    }
  }, [exam.endDate]);

  const getIcon = () => {
    const name = exam.name.toLowerCase();
    const post = exam.post.toLowerCase();
    const combined = name + " " + post;

    if (exam.category === 'UG Admissions' || combined.includes('ug') || combined.includes('university') || combined.includes('admission')) return GraduationCap;
    if (combined.includes('police') || combined.includes('constable') || combined.includes('si')) return Shield;
    if (combined.includes('bank') || combined.includes('sbi') || combined.includes('ibps')) return Building;
    if (combined.includes('railway') || combined.includes('rrb')) return Train;
    if (combined.includes('army') || combined.includes('defence') || combined.includes('nda')) return ShieldAlert;
    if (combined.includes('teach') || combined.includes('reet')) return GraduationCap;
    if (combined.includes('health') || combined.includes('nurse') || combined.includes('medical')) return HeartPulse;
    if (combined.includes('fire') || combined.includes('rescue')) return Flame;
    return Briefcase;
  };

  const Icon = getIcon();

  return (
    <motion.div 
      layoutId={`exam-${exam.id}`}
      onClick={onClick}
      className={`relative rounded-3xl overflow-hidden flex flex-col h-full transition-all duration-500 cursor-pointer group
        ${isExpired 
          ? 'bg-slate-200/50 dark:bg-slate-900/50 grayscale opacity-90 border border-slate-300 dark:border-slate-800' 
          : 'bg-white/80 dark:bg-slate-900/80 border border-orange-400/20 shadow-xl hover:shadow-orange-500/20 hover:scale-[1.02] active:scale-95'
        }
      `}
    >
      <div className="p-6 flex flex-col items-center text-center">
        {/* Large Category Icon */}
        <motion.div 
          layoutId={`icon-box-${exam.id}`}
          className={`p-6 rounded-3xl mb-6 shadow-inner ${isExpired ? 'bg-slate-300 text-slate-500 dark:bg-slate-800/50' : 'bg-gradient-to-br from-orange-100 to-orange-200 dark:from-orange-900/50 dark:to-orange-800/50 text-(--color-orange)'}`}
        >
          <Icon className="w-12 h-12" />
        </motion.div>

        <div className="space-y-1 w-full">
          <motion.h3 
            layoutId={`name-${exam.id}`}
            className="text-xl font-black text-slate-800 dark:text-white line-clamp-1 leading-tight"
          >
            {exam.name}
          </motion.h3>
          <motion.p 
            layoutId={`post-${exam.id}`}
            className="text-sm font-bold text-slate-500 dark:text-slate-400 line-clamp-1"
          >
            {exam.post}
          </motion.p>
          <div className="pt-2">
            <span className="text-[10px] font-bold text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md whitespace-nowrap">
              Last Date: {exam.endDate}
            </span>
          </div>
        </div>

        {/* Floating Days Left Badge */}
        {!isExpired && (
          <div className="absolute top-4 right-4 flex flex-col items-center justify-center min-w-[50px] min-h-[50px] rounded-full border-2 border-(--color-orange) bg-white dark:bg-slate-900 shadow-lg">
            <span className="text-lg font-black text-(--color-orange) leading-none">{daysLeft > 99 ? '99+' : daysLeft}</span>
            <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider mt-0.5">Days</span>
          </div>
        )}

        {/* Expired Label */}
        {isExpired && (
          <div className="mt-4 px-4 py-1.5 bg-slate-300 dark:bg-slate-800 rounded-full text-[10px] font-black uppercase tracking-widest text-slate-500">
            Archive Mode
          </div>
        )}

        {/* WhatsApp Broadcast Button */}
        {!isExpired && (
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={handleWhatsAppClick}
            disabled={isSending}
            className="absolute bottom-4 right-4 p-3 rounded-full bg-green-500 text-white shadow-lg hover:bg-green-600 transition-colors z-20"
            title="Send to WhatsApp Community"
          >
            {isSending ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Send className="w-5 h-5" />
            )}
          </motion.button>
        )}
      </div>
      
      {/* Click Hint */}
      <div className="mt-auto pb-6 opacity-0 group-hover:opacity-100 transition-opacity">
        <span className="text-[10px] font-black uppercase tracking-tighter text-(--color-orange)">Click to Deep-Dive</span>
      </div>
    </motion.div>
  );
}
