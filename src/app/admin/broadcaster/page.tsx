'use client';

import React, { useState, useEffect } from 'react';
import { QueueCard } from '@/components/QueueCard';
import { Zap, Shield, Inbox, CheckCircle, RefreshCcw, Settings, X, Save } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function BroadcasterInbox() {
  const [adminKey, setAdminKey] = useState<string | null>(null);
  const [passInput, setPassInput] = useState('');
  const [queue, setQueue] = useState<any[]>([]);
  const [config, setConfig] = useState({ autoPilot: false });
  const [isLoading, setIsLoading] = useState(true);
  const [editingExam, setEditingExam] = useState<any>(null);
  const [authError, setAuthError] = useState(false);

  const botUrl = process.env.NEXT_PUBLIC_BOT_URL || 'http://localhost:3001';

  const fetchQueueNow = async (key?: string) => {
    const currentKey = key || adminKey;
    if (!currentKey) return;

    try {
      const res = await fetch(`${botUrl}/api/admin/queue`, {
        headers: { 'x-admin-key': currentKey }
      });
      
      if (res.status === 401) {
        setAuthError(true);
        setAdminKey(null);
        return;
      }

      const data = await res.json();
      setQueue(data.queue || []);
      setConfig(data.config || { autoPilot: false });
      setAuthError(false);
    } catch (err) {
      console.error('Failed to fetch queue:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const savedKey = localStorage.getItem('balaji_admin_key');
    if (savedKey) {
      setAdminKey(savedKey);
      fetchQueueNow(savedKey);
    } else {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (adminKey) {
      const interval = setInterval(() => fetchQueueNow(adminKey), 30000);
      return () => clearInterval(interval);
    }
  }, [adminKey]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem('balaji_admin_key', passInput);
    setAdminKey(passInput);
    fetchQueueNow(passInput);
  };

  const handleAction = async (examId: string, action: string, updatedData?: any) => {
    if (!adminKey) return;
    try {
      const res = await fetch(`${botUrl}/api/admin/queue`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-admin-key': adminKey
        },
        body: JSON.stringify({ action, examId, updatedData })
      });
      
      if (res.ok) {
        if (action === 'discard' || action === 'approve') {
           setQueue(prev => prev.filter(e => e.id !== examId));
        } else {
           fetchQueueNow();
        }
        setEditingExam(null);
      }
    } catch (err) {
      console.error(`Failed to ${action} exam:`, err);
    }
  };

  const toggleAutoPilot = async () => {
    if (!adminKey) return;
    const newStatus = !config.autoPilot;
    try {
      const res = await fetch(`${botUrl}/api/admin/queue`, {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json',
          'x-admin-key': adminKey
        },
        body: JSON.stringify({ autoPilot: newStatus })
      });
      if (res.ok) setConfig({ autoPilot: newStatus });
    } catch (err) {
      console.error('Failed to toggle Auto-Pilot:', err);
    }
  };

  if (!adminKey) {
    return (
      <div className="min-h-screen bg-[#020617] flex items-center justify-center p-6">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-slate-900 border border-slate-800 p-8 rounded-3xl max-w-md w-full shadow-2xl"
        >
          <div className="flex justify-center mb-6">
            <div className="p-4 bg-blue-600/10 rounded-2xl">
              <Shield className="w-10 h-10 text-blue-500" />
            </div>
          </div>
          <h2 className="text-2xl font-black text-center mb-2">Admin Authentication</h2>
          <p className="text-gray-500 text-center mb-8">Enter your secure key to manage the broadcaster inbox.</p>
          
          <form onSubmit={handleLogin} className="space-y-4">
            <input 
              type="password"
              placeholder="Enter Admin Secret Key"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-4 text-center text-xl font-mono focus:border-blue-500 outline-none"
              value={passInput}
              onChange={(e) => setPassInput(e.target.value)}
              autoFocus
            />
            {authError && <p className="text-red-400 text-sm text-center font-bold">Invalid key. Please try again.</p>}
            <button className="w-full py-4 bg-blue-600 hover:bg-blue-500 rounded-xl font-black transition-all shadow-lg shadow-blue-600/20">
              Unlock Console
            </button>
          </form>
        </motion.div>
      </div>
    );
  }

  const pendingExams = queue.filter(e => e.status === 'pending');

  return (
    <div className="min-h-screen bg-[#020617] text-white p-8">
      {/* Header */}
      <div className="max-w-7xl mx-auto mb-12 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-blue-500/10 rounded-lg">
              <Inbox className="w-6 h-6 text-blue-400" />
            </div>
            <h1 className="text-3xl font-black tracking-tight">Broadcaster Inbox</h1>
          </div>
          <p className="text-gray-400">Review and verify new exam findings before broadcasting to WhatsApp.</p>
        </div>

        <div className="flex items-center gap-4 bg-slate-900/50 p-4 rounded-2xl border border-slate-800">
          <div className="flex items-center gap-3 pr-4 border-r border-slate-800">
            <div className={`p-2 rounded-lg ${config.autoPilot ? 'bg-orange-500/10' : 'bg-slate-800'}`}>
              <Zap className={`w-5 h-5 ${config.autoPilot ? 'text-orange-400' : 'text-gray-500'}`} />
            </div>
            <div>
              <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">Auto-Pilot</p>
              <p className="text-sm font-bold">{config.autoPilot ? 'Active' : 'Disabled'}</p>
            </div>
            <button
              onClick={toggleAutoPilot}
              className={`relative w-12 h-6 rounded-full transition-colors duration-200 focus:outline-none ${
                config.autoPilot ? 'bg-blue-600' : 'bg-slate-700'
              }`}
            >
              <div
                className={`absolute top-1 left-1 bg-white w-4 h-4 rounded-full transition-transform duration-200 ${
                  config.autoPilot ? 'translate-x-6' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
          <div className="flex items-center gap-3">
             <RefreshCcw 
               className={`w-5 h-5 text-gray-500 cursor-pointer hover:text-blue-400 transition-colors ${isLoading ? 'animate-spin' : ''}`} 
               onClick={(e) => {
                 e.preventDefault();
                 fetchQueueNow();
               }}
             />
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto">
        {isLoading && queue.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24">
            <Loader2 className="w-12 h-12 text-blue-500 animate-spin mb-4" />
            <p className="text-gray-500">Scanning for new exams...</p>
          </div>
        ) : pendingExams.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <AnimatePresence>
              {pendingExams.map((exam) => (
                <QueueCard
                  key={exam.id}
                  exam={exam}
                  onApprove={(id) => handleAction(id, 'approve')}
                  onDiscard={(id) => handleAction(id, 'discard')}
                  onEdit={(exam) => setEditingExam(exam)}
                />
              ))}
            </AnimatePresence>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-24 bg-slate-900/20 rounded-3xl border-2 border-dashed border-slate-800">
            <CheckCircle className="w-16 h-16 text-slate-700 mb-4" />
            <h3 className="text-xl font-bold text-slate-400">All caught up!</h3>
            <p className="text-gray-600">No pending exams in the review queue.</p>
          </div>
        )}
      </div>

      {/* Edit Modal */}
      <AnimatePresence>
        {editingExam && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-[#0f172a] border border-slate-800 rounded-3xl p-8 w-full max-w-lg shadow-2xl"
            >
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold">Edit Update</h2>
                <button onClick={() => setEditingExam(null)} className="p-2 hover:bg-slate-800 rounded-full">
                  <X className="w-6 h-6" />
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="text-xs text-gray-500 font-bold uppercase mb-1 block">Exam Name</label>
                  <input 
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-white focus:border-blue-500 outline-none"
                    value={editingExam.name}
                    onChange={(e) => setEditingExam({...editingExam, name: e.target.value})}
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500 font-bold uppercase mb-1 block">Qualification</label>
                  <input 
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-white focus:border-blue-500 outline-none"
                    value={editingExam.qualification}
                    onChange={(e) => setEditingExam({...editingExam, qualification: e.target.value})}
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500 font-bold uppercase mb-1 block">Last Date</label>
                  <input 
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-white focus:border-blue-500 outline-none"
                    value={editingExam.endDate}
                    onChange={(e) => setEditingExam({...editingExam, endDate: e.target.value})}
                  />
                </div>
              </div>

              <div className="flex gap-4 mt-8">
                <button 
                  onClick={() => setEditingExam(null)}
                  className="flex-1 px-6 py-3 bg-slate-800 rounded-xl font-bold hover:bg-slate-700 transition-all"
                >
                  Cancel
                </button>
                <button 
                  onClick={() => handleAction(editingExam.id, 'edit', editingExam)}
                  className="flex-1 px-6 py-3 bg-blue-600 rounded-xl font-bold hover:bg-blue-500 shadow-lg shadow-blue-600/20 flex items-center justify-center gap-2"
                >
                  <Save className="w-5 h-5" />
                  Save Changes
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <style jsx global>{`
        @keyframes pulse-border {
          0%, 100% { border-color: rgba(59, 130, 246, 0.3); }
          50% { border-color: rgba(59, 130, 246, 0.8); }
        }
        .animate-pulse-border {
          animation: pulse-border 2s infinite;
        }
      `}</style>
    </div>
  );
}

const Loader2 = ({ className }: { className?: string }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
);
