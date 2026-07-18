'use client';

import React, { useState } from 'react';
import { Check, Edit2, Trash2, AlertTriangle, Send, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface QueueCardProps {
  exam: any;
  onApprove: (id: string) => void;
  onEdit: (exam: any) => void;
  onDiscard: (id: string) => void;
}

export const QueueCard: React.FC<QueueCardProps> = ({ exam, onApprove, onEdit, onDiscard }) => {
  const [isSending, setIsSending] = useState(false);
  const [hasSent, setHasSent] = useState(false);

  const handleApprove = async () => {
    setIsSending(true);
    try {
      await onApprove(exam.id);
      setHasSent(true);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -100 }}
      className={`relative group bg-[#0f172a] border ${
        exam.missingFields.length > 0 ? 'border-yellow-500/50' : 'border-blue-500/30'
      } rounded-2xl p-6 transition-all hover:shadow-[0_0_30px_rgba(59,130,246,0.15)] ${
        exam.status === 'pending' ? 'animate-pulse-border' : ''
      }`}
    >
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-xl font-bold text-white group-hover:text-blue-400 transition-colors">
            {exam.name}
          </h3>
          <p className="text-gray-400 text-sm mt-1">{exam.post}</p>
        </div>
        <div className="flex items-center gap-2">
          {exam.verificationScore === 100 ? (
            <span className="px-3 py-1 bg-green-500/10 text-green-400 text-xs font-bold rounded-full border border-green-500/20">
              100% Score
            </span>
          ) : (
            <span className="px-3 py-1 bg-yellow-500/10 text-yellow-400 text-xs font-bold rounded-full border border-yellow-500/20 flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" />
              {exam.verificationScore}% Score
            </span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-slate-800/50 p-3 rounded-xl">
          <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Qualification</p>
          <p className="text-sm text-gray-200 truncate">{exam.qualification}</p>
        </div>
        <div className="bg-slate-800/50 p-3 rounded-xl">
          <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Last Date</p>
          <p className="text-sm text-gray-200">{exam.endDate}</p>
        </div>
      </div>

      {exam.missingFields.length > 0 && (
        <div className="mb-6 p-3 bg-yellow-500/5 border border-yellow-500/10 rounded-xl">
          <p className="text-xs text-yellow-500 font-medium mb-1 flex items-center gap-1">
            <AlertTriangle className="w-3 h-3" /> Missing Information:
          </p>
          <div className="flex flex-wrap gap-2">
            {exam.missingFields.map((field: string) => (
              <span key={field} className="text-[10px] bg-yellow-500/10 text-yellow-500 px-2 py-0.5 rounded-md">
                {field}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="flex items-center justify-between gap-3 pt-4 border-t border-slate-800">
        <button
          onClick={() => onDiscard(exam.id)}
          className="p-2 text-gray-500 hover:text-red-400 hover:bg-red-400/10 rounded-xl transition-all"
          title="Discard"
        >
          <Trash2 className="w-5 h-5" />
        </button>
        <div className="flex gap-2">
          <button
            onClick={() => onEdit(exam)}
            className="flex items-center gap-2 px-4 py-2 bg-slate-800 text-gray-300 hover:bg-slate-700 rounded-xl transition-all text-sm font-medium"
          >
            <Edit2 className="w-4 h-4" />
            Edit
          </button>
          <button
            onClick={handleApprove}
            disabled={isSending || hasSent}
            className={`flex items-center gap-2 px-6 py-2 rounded-xl transition-all text-sm font-bold shadow-lg ${
              hasSent 
                ? 'bg-green-500 text-white cursor-default' 
                : 'bg-blue-600 text-white hover:bg-blue-500 active:scale-95'
            }`}
          >
            {isSending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : hasSent ? (
              <Check className="w-4 h-4" />
            ) : (
              <Send className="w-4 h-4" />
            )}
            {hasSent ? 'Sent' : 'Approve & Send'}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {hasSent && (
          <motion.div
            initial={{ opacity: 0, x: 0, y: 0 }}
            animate={{ opacity: [0, 1, 0], x: 200, y: -200 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="absolute top-1/2 left-1/2 pointer-events-none"
          >
            <Send className="w-8 h-8 text-blue-400" />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};
