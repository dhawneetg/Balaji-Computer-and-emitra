'use client';

import React, { useState } from 'react';
import dynamic from 'next/dynamic';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, Camera, Zap, ArrowLeft, MapPin, Phone, Mail, Loader2, FileDown, Link as LinkIcon, Shield, Inbox } from 'lucide-react';

// Lazy loaded feature components
const ExamDashboard = dynamic(() => import('@/components/ExamDashboard'), {
  loading: () => (
    <div className="flex justify-center items-center h-[50vh]">
      <Loader2 className="w-10 h-10 text-(--color-orange) animate-spin" />
    </div>
  )
});

const PhotoStudio = dynamic(() => import('@/components/PhotoStudio'), {
  loading: () => (
    <div className="flex justify-center items-center h-[50vh]">
      <Loader2 className="w-10 h-10 text-(--color-orange) animate-spin" />
    </div>
  )
});

const DocumentOptimizer = dynamic(() => import('@/components/DocumentOptimizer'), {
  loading: () => (
    <div className="flex justify-center items-center h-[50vh]">
      <Loader2 className="w-10 h-10 text-(--color-orange) animate-spin" />
    </div>
  )
});

const QuickLinkHub = dynamic(() => import('@/components/QuickLinkHub'), {
  loading: () => (
    <div className="flex justify-center items-center h-[50vh]">
      <Loader2 className="w-10 h-10 text-(--color-orange) animate-spin" />
    </div>
  )
});

type Tab = 'home' | 'exams' | 'photo' | 'compressor' | 'links';

export default function Home() {
  const [activeTab, setActiveTab] = useState<Tab>('home');

  const pageVariants = {
    initial: { opacity: 0, scale: 0.98 },
    in: { opacity: 1, scale: 1 },
    out: { opacity: 0, scale: 0.98 }
  };

  const pageTransition = {
    type: "tween",
    ease: "easeOut",
    duration: 0.3
  } as const;

  return (
    <div className="min-h-screen flex flex-col font-sans relative">

      {/* Premium Background Design */}
      <div className="fixed inset-0 w-full h-full z-[-1] print:hidden overflow-hidden bg-[#020617]">
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_0%,rgba(30,58,138,0.3),transparent_50%)]" />
        <div className="absolute bottom-0 right-0 w-full h-full bg-[radial-gradient(circle_at_100%_100%,rgba(255,107,0,0.05),transparent_40%)]" />
        
        {/* Animated Glowing Orbs */}
        <motion.div 
          animate={{ 
            scale: [1, 1.2, 1],
            opacity: [0.1, 0.2, 0.1],
          }}
          transition={{ duration: 8, repeat: Infinity }}
          className="absolute top-1/4 -left-20 w-96 h-96 bg-blue-600 rounded-full blur-[120px]"
        />
        <motion.div 
          animate={{ 
            scale: [1, 1.1, 1],
            opacity: [0.05, 0.1, 0.05],
          }}
          transition={{ duration: 10, repeat: Infinity, delay: 2 }}
          className="absolute bottom-1/4 -right-20 w-[500px] h-[500px] bg-orange-600 rounded-full blur-[150px]"
        />
      </div>

      {/* Floating Back Button (Only visible in feature tabs) */}
      <AnimatePresence>
        {activeTab !== 'home' && (
          <motion.button
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            onClick={() => setActiveTab('home')}
            className="fixed top-6 left-6 z-50 flex items-center text-sm font-bold text-white bg-black/50 hover:bg-black/70 px-5 py-3 rounded-full backdrop-blur-xl border border-white/20 shadow-2xl transition-all group print:hidden"
          >
            <ArrowLeft className="w-5 h-5 mr-2 group-hover:-translate-x-1 transition-transform" />
            Back to Home
          </motion.button>
        )}
      </AnimatePresence>

      {/* Main Content Area */}
      <main className="flex-grow print:hidden relative flex flex-col">
        <AnimatePresence mode="wait">

          {activeTab === 'home' && (
            <motion.section
              key="home"
              initial="initial"
              animate="in"
              exit="out"
              variants={pageVariants}
              transition={pageTransition}
              className="flex-grow flex flex-col items-center justify-center text-center px-4 py-20"
            >
              <div className="max-w-4xl mx-auto w-full">
                <div className="inline-flex items-center px-5 py-2 rounded-full bg-black/40 backdrop-blur-xl border border-white/10 text-white text-sm font-semibold mb-8 shadow-2xl">
                  <span className="flex h-2.5 w-2.5 rounded-full bg-(--color-orange) mr-3 animate-pulse shadow-[0_0_8px_rgba(255,107,0,0.8)]"></span>
                  Praveen Gehlot
                </div>

                <h1 className="text-5xl md:text-8xl font-extrabold text-white tracking-tight mb-6 leading-tight drop-shadow-2xl">
                  Balaji Computer & <br />
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-(--color-orange) to-yellow-400 drop-shadow-sm">
                    E-Mitra
                  </span>
                </h1>

                <p className="text-xl md:text-2xl text-white/80 max-w-2xl mx-auto mb-12 leading-relaxed drop-shadow-md">
                  Track government exams with real-time updates or instantly generate passport photos. etc.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-8 w-full">
                  <motion.button
                    whileHover={{ scale: 1.03, translateY: -3 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setActiveTab('exams')}
                    className="group flex flex-col items-center justify-center bg-(--color-orange) text-white p-6 rounded-3xl font-bold shadow-[0_0_20px_rgba(255,107,0,0.4)] border border-orange-400/50 transition-all"
                  >
                    <span className="flex items-center text-xl mb-2">Upcoming Exams <ChevronRight className="w-5 h-5 ml-1 group-hover:translate-x-1 transition-transform" /></span>
                    <span className="text-sm font-normal text-orange-100">Live Scraper Dashboard</span>
                  </motion.button>

                  <motion.button
                    whileHover={{ scale: 1.03, translateY: -3 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setActiveTab('photo')}
                    className="group flex flex-col items-center justify-center bg-black/40 backdrop-blur-xl hover:bg-black/60 text-white p-6 rounded-3xl font-bold border border-white/20 shadow-[0_0_20px_rgba(0,0,0,0.3)] transition-all"
                  >
                    <span className="flex items-center text-xl mb-2"><Camera className="w-5 h-5 mr-2 group-hover:rotate-12 transition-transform" /> Photo Studio</span>
                    <span className="text-sm font-normal text-slate-300">AI Background & 4x6 Print</span>
                  </motion.button>

                  <motion.button
                    whileHover={{ scale: 1.03, translateY: -3 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setActiveTab('compressor')}
                    className="group flex flex-col items-center justify-center bg-black/40 backdrop-blur-xl hover:bg-black/60 text-white p-6 rounded-3xl font-bold border border-white/20 shadow-[0_0_20px_rgba(0,0,0,0.3)] transition-all"
                  >
                    <span className="flex items-center text-xl mb-2"><FileDown className="w-5 h-5 mr-2 group-hover:-translate-y-1 transition-transform" /> Document Optimizer</span>
                    <span className="text-sm font-normal text-slate-300">Compress PDF & Images</span>
                  </motion.button>

                  <motion.button
                    whileHover={{ scale: 1.03, translateY: -3 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setActiveTab('links')}
                    className="group flex flex-col items-center justify-center bg-black/40 backdrop-blur-xl hover:bg-black/60 text-white p-6 rounded-3xl font-bold border border-white/20 shadow-[0_0_20px_rgba(0,0,0,0.3)] transition-all"
                  >
                    <span className="flex items-center text-xl mb-2"><LinkIcon className="w-5 h-5 mr-2 group-hover:rotate-45 transition-transform" /> Quick Link Hub</span>
                    <span className="text-sm font-normal text-slate-300">Admit Cards & Portals</span>
                  </motion.button>

                  <motion.a
                    href="/admin/broadcaster"
                    whileHover={{ scale: 1.03, translateY: -3 }}
                    whileTap={{ scale: 0.98 }}
                    className="group flex flex-col items-center justify-center bg-blue-600/20 backdrop-blur-xl hover:bg-blue-600/40 text-blue-400 p-6 rounded-3xl font-bold border border-blue-500/30 shadow-[0_0_20px_rgba(59,130,246,0.2)] transition-all"
                  >
                    <span className="flex items-center text-xl mb-2"><Inbox className="w-5 h-5 mr-2 group-hover:scale-110 transition-transform" /> Broadcaster Inbox</span>
                    <span className="text-sm font-normal text-blue-300/70">Review & Send Updates</span>
                  </motion.a>
                </div>
              </div>
            </motion.section>
          )}

          {activeTab === 'exams' && (
            <motion.div
              key="exams"
              initial="initial"
              animate="in"
              exit="out"
              variants={pageVariants}
              transition={pageTransition}
              className="w-full bg-white dark:bg-slate-950 flex-grow pt-24 pb-20 shadow-[0_-20px_50px_rgba(0,0,0,0.5)] z-10 relative rounded-t-3xl"
            >
              <ExamDashboard />
            </motion.div>
          )}

          {activeTab === 'photo' && (
            <motion.div
              key="photo"
              initial="initial"
              animate="in"
              exit="out"
              variants={pageVariants}
              transition={pageTransition}
              className="w-full bg-slate-50 dark:bg-slate-950 flex-grow pt-24 pb-20 shadow-[0_-20px_50px_rgba(0,0,0,0.5)] z-10 relative rounded-t-3xl"
            >
              <PhotoStudio />
            </motion.div>
          )}

          {activeTab === 'compressor' && (
            <motion.div
              key="compressor"
              initial="initial"
              animate="in"
              exit="out"
              variants={pageVariants}
              transition={pageTransition}
              className="w-full bg-slate-50 dark:bg-slate-950 flex-grow pt-24 pb-20 shadow-[0_-20px_50px_rgba(0,0,0,0.5)] z-10 relative rounded-t-3xl"
            >
              <DocumentOptimizer />
            </motion.div>
          )}

          {activeTab === 'links' && (
            <motion.div
              key="links"
              initial="initial"
              animate="in"
              exit="out"
              variants={pageVariants}
              transition={pageTransition}
              className="w-full bg-slate-50 dark:bg-slate-950 flex-grow pt-24 pb-20 shadow-[0_-20px_50px_rgba(0,0,0,0.5)] z-10 relative rounded-t-3xl"
            >
              <QuickLinkHub />
            </motion.div>
          )}

        </AnimatePresence>
      </main>

      {/* Glassmorphic Footer Redesign */}
      <motion.footer
        initial={{ y: 50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.8, delay: 0.2 }}
        className="bg-black/70 backdrop-blur-md text-white py-12 print:hidden relative z-20 border-t border-white/10 mt-auto"
      >
        <div className="max-w-7xl mx-auto px-4 md:px-8 grid grid-cols-1 md:grid-cols-3 gap-10 md:gap-6 items-center">

          {/* Left: Branding */}
          <div className="flex flex-col items-center md:items-start text-center md:text-left">
            <div className="flex items-center space-x-3 mb-3">
              <div className="bg-(--color-orange) p-2 rounded-lg shadow-[0_0_15px_rgba(255,107,0,0.5)]">
                <Zap className="w-6 h-6 text-white" />
              </div>
              <span className="text-2xl font-extrabold tracking-tight">Balaji e-Mitra</span>
            </div>
            <p className="text-slate-300 text-sm italic">"Your Digital Success Partner"</p>
          </div>

          {/* Center: Navigation Links */}
          <div className="flex flex-row flex-wrap justify-center gap-6">
            <button
              onClick={() => setActiveTab('home')}
              className="text-slate-300 hover:text-(--color-orange) transition-colors font-medium relative group"
            >
              Home
              <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-(--color-orange) transition-all group-hover:w-full"></span>
            </button>
            <button
              onClick={() => setActiveTab('exams')}
              className="text-slate-300 hover:text-(--color-orange) transition-colors font-medium relative group"
            >
              Exams
              <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-(--color-orange) transition-all group-hover:w-full"></span>
            </button>
            <button
              onClick={() => setActiveTab('photo')}
              className="text-slate-300 hover:text-(--color-orange) transition-colors font-medium relative group"
            >
              Photo Studio
              <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-(--color-orange) transition-all group-hover:w-full"></span>
            </button>
            <button
              onClick={() => setActiveTab('compressor')}
              className="text-slate-300 hover:text-(--color-orange) transition-colors font-medium relative group"
            >
              Compressor
              <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-(--color-orange) transition-all group-hover:w-full"></span>
            </button>
            <button
              onClick={() => setActiveTab('links')}
              className="text-slate-300 hover:text-(--color-orange) transition-colors font-medium relative group"
            >
              Quick Links
              <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-(--color-orange) transition-all group-hover:w-full"></span>
            </button>
          </div>

          {/* Right: Contact Details */}
          <div className="flex flex-col items-center md:items-end text-sm text-slate-300 space-y-2">
            <div className="flex items-center group cursor-pointer hover:text-white transition-colors">
              <Phone className="w-4 h-4 mr-2 text-(--color-orange) group-hover:scale-110 transition-transform" />
              <span>+91 9694969180</span>
            </div>
            <div className="flex items-center group cursor-pointer hover:text-white transition-colors">
              <MapPin className="w-4 h-4 mr-2 text-(--color-orange) group-hover:scale-110 transition-transform" />
              <span>Sirohi, Rajasthan</span>
            </div>
            <div className="flex items-center group cursor-pointer hover:text-white transition-colors pt-2">
              <Mail className="w-4 h-4 mr-2 text-(--color-orange) group-hover:scale-110 transition-transform" />
              <span>sirohi.emitra@gmail.com</span>
            </div>
          </div>
        </div>

        {/* Admin Link Area */}
        <div className="max-w-7xl mx-auto px-4 md:px-8 pt-8 mt-8 border-t border-white/5 flex justify-center md:justify-end">
          <a 
            href="/admin/broadcaster" 
            className="flex items-center gap-2 text-[10px] text-slate-600 hover:text-blue-400 transition-colors uppercase tracking-[0.2em] font-bold"
          >
            <Shield className="w-3 h-3" />
            Admin Console
          </a>
        </div>
      </motion.footer>
    </div>
  );
}
