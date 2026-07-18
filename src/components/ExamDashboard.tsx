'use client';

import React, { useEffect, useState } from 'react';
import ExamCard from './ExamCard';
import type { ExamData } from '@/app/api/exams/route';
import { Loader2, Plus, X, Inbox, Train, Building, Briefcase, ShieldAlert, Shield, Flame, GraduationCap, HeartPulse, MapPin, ChevronDown, FilterX, Calendar, Send, ExternalLink, Globe, Search } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

type Category = 'Government Jobs' | 'UG Admissions';

const MEGA_MENU_CATEGORIES = [
  {
    title: 'Core',
    items: [
      { id: 'Railway Jobs', icon: Train, keywords: ['railway', 'rrb', 'rrc', 'dfccil'] },
      { id: 'Banking Jobs', icon: Building, keywords: ['bank', 'sbi', 'ibps', 'rbi', 'nabard', 'sidbi'] },
      { id: 'SSC Jobs', icon: Briefcase, keywords: ['ssc', 'cgl', 'chsl', 'mts', 'cpo', 'stenographer'] }
    ]
  },
  {
    title: 'Forces & Safety',
    items: [
      { id: 'Defence Jobs', icon: ShieldAlert, keywords: ['army', 'navy', 'air force', 'nda', 'cds', 'coast guard', 'agniveer'] },
      { id: 'Police Jobs', icon: Shield, keywords: ['police', 'constable', 'si', 'inspector', 'crpf', 'bsf', 'cisf', 'itbp', 'ssb'] },
      { id: 'Fire/Rescue Jobs', icon: Flame, keywords: ['fire', 'rescue', 'home guard'] }
    ]
  },
  {
    title: 'Education & State',
    items: [
      { id: 'Teaching Jobs', icon: GraduationCap, keywords: ['teach', 'reet', 'b.ed', 'tet', 'ctet', 'pgt', 'tgt', 'prt', 'professor'] },
      { id: 'Health/Medical', icon: HeartPulse, keywords: ['health', 'medical', 'nursing', 'nurse', 'lab tech', 'pharmacist', 'cho', 'aiims'] },
      { id: 'Rajasthan State Jobs', icon: MapPin, keywords: ['rajasthan', 'rpsc', 'rsmssb', 'rssb', 'jaipur', 'jodhpur', 'ajmer'] }
    ]
  }
];

export default function ExamDashboard() {
  const [exams, setExams] = useState<ExamData[]>([]);
  const [manualExams, setManualExams] = useState<ExamData[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Intelligence System States
  const [activeCategory, setActiveCategory] = useState<Category>('Government Jobs');
  const [activeSubCategory, setActiveSubCategory] = useState<string | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showExpired, setShowExpired] = useState(false);
  const [selectedExam, setSelectedExam] = useState<ExamData | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modal State for Adding
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newExam, setNewExam] = useState({
    name: '',
    post: '',
    vacancy: '',
    endDate: '',
    qualification: '',
    link: '',
    category: 'Government Jobs' as Category
  });
  
  const allExams = [...manualExams, ...exams];

  useEffect(() => {
    const savedManualExams = localStorage.getItem('balaji_manual_exams');
    if (savedManualExams) {
      try {
        setManualExams(JSON.parse(savedManualExams));
      } catch (e) {
        console.error('Failed to parse manual exams');
      }
    }

    async function fetchExams() {
      try {
        const res = await fetch('/api/exams');
        const json = await res.json();
        if (json.success) {
          const fetchedExams = json.data.map((exam: ExamData) => ({
            ...exam,
            category: 'Government Jobs' as Category
          }));
          setExams(fetchedExams);
        }
      } catch (error) {
        console.error('Failed to fetch exams', error);
      } finally {
        setLoading(false);
      }
    }

    fetchExams();
  }, []);

  // Sync with URL Hash
  useEffect(() => {
    if (selectedExam) {
      window.location.hash = `exam-${selectedExam.id}`;
    } else {
      if (window.location.hash.startsWith('#exam-')) {
        window.history.pushState('', document.title, window.location.pathname + window.location.search);
      }
    }
  }, [selectedExam]);

  // Handle Initial Hash
  useEffect(() => {
    if (loading || allExams.length === 0) return;
    const hash = window.location.hash;
    if (hash.startsWith('#exam-')) {
      const id = hash.replace('#exam-', '');
      const exam = allExams.find(e => e.id === id);
      if (exam) setSelectedExam(exam);
    }
  }, [loading, allExams.length]);

  // Handle Escape key to close modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSelectedExam(null);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleManualAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newExam.name || !newExam.post) return;

    let finalLink = newExam.link.trim();
    if (finalLink && !finalLink.startsWith('http')) {
      finalLink = 'https://' + finalLink;
    }

    const newExamData: ExamData = {
      id: 'manual-' + Date.now(),
      name: newExam.name.trim(),
      post: newExam.post.trim(),
      vacancy: newExam.vacancy.trim() || 'Not Specified',
      startDate: new Date().toISOString().split('T')[0],
      endDate: newExam.endDate || 'Not Specified',
      fees: 'Refer Notification',
      qualification: newExam.qualification.trim() || 'Not Specified',
      link: finalLink || '#',
      category: newExam.category
    };

    const updatedManualExams = [newExamData, ...manualExams];
    setManualExams(updatedManualExams);
    localStorage.setItem('balaji_manual_exams', JSON.stringify(updatedManualExams));
    
    setIsAddModalOpen(false);
    setNewExam({ name: '', post: '', vacancy: '', endDate: '', qualification: '', link: '', category: activeCategory });
  };

  const handleManualDelete = (id: string) => {
    if (window.confirm('Delete this custom exam?')) {
      const updated = manualExams.filter(exam => exam.id !== id);
      setManualExams(updated);
      localStorage.setItem('balaji_manual_exams', JSON.stringify(updated));
    }
  };

  const isExamExpired = (dateStr: string) => {
    let endTime = 0;
    const cleanDate = dateStr.trim();
    if (cleanDate.includes('-')) {
      const parts = cleanDate.split('-');
      if (parts[0].length === 4) endTime = new Date(cleanDate).getTime();
      else if (parts[2]?.length === 4) endTime = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`).getTime();
    } else {
      endTime = new Date(cleanDate).getTime();
    }
    if (isNaN(endTime)) return false; 
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    return endTime < now.getTime();
  };

  const getExamSubCategory = (exam: ExamData): string => {
    const searchString = `${exam.name} ${exam.post}`.toLowerCase();
    for (const group of MEGA_MENU_CATEGORIES) {
      for (const item of group.items) {
        if (item.keywords.some(keyword => searchString.includes(keyword))) {
          return item.id;
        }
      }
    }
    return 'Other';
  };

  const getTimestamp = (dateStr: string) => {
    const cleanDate = dateStr.trim();
    if (cleanDate.includes('-')) {
      const parts = cleanDate.split('-');
      if (parts[0].length === 4) return new Date(cleanDate).getTime();
      if (parts[2]?.length === 4) return new Date(`${parts[2]}-${parts[1]}-${parts[0]}`).getTime();
    }
    const t = new Date(cleanDate).getTime();
    return isNaN(t) ? 0 : t;
  };

  
  // Smart Filtering & Sorting
  const filteredExams = allExams.filter(exam => {
    const matchesCategory = exam.category === activeCategory || (!exam.category && activeCategory === 'Government Jobs');
    const expired = isExamExpired(exam.endDate);
    const matchesLiveArchive = showExpired ? expired : !expired;
    
    let matchesSubCategory = true;
    if (activeCategory === 'Government Jobs' && activeSubCategory) {
      matchesSubCategory = getExamSubCategory(exam) === activeSubCategory;
    }

    const matchesSearch = searchTerm === '' || 
      exam.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      exam.post.toLowerCase().includes(searchTerm.toLowerCase()) ||
      exam.qualification.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesCategory && matchesLiveArchive && matchesSubCategory && matchesSearch;
  }).sort((a, b) => {
    const timeA = getTimestamp(a.endDate);
    const timeB = getTimestamp(b.endDate);
    if (showExpired) {
      return timeB - timeA;
    } else {
      if (timeA === 0) return 1;
      if (timeB === 0) return -1;
      return timeA - timeB;
    }
  });

  // Calculate total counts (Live + Archived) for the mega menu
  const getTotalCount = (subCatId: string) => {
    return allExams.filter(exam => {
      const isGovtJob = exam.category === 'Government Jobs' || !exam.category;
      return isGovtJob && getExamSubCategory(exam) === subCatId;
    }).length;
  };

  const handleCategoryChange = (cat: Category) => {
    setActiveCategory(cat);
    setActiveSubCategory(null);
  };

  const getIcon = (exam: ExamData) => {
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

  const handleWhatsAppShare = (exam: ExamData) => {
    const text = `🚀 *New Alert: ${exam.name}*\n\n*Post*: ${exam.post}\n*Vacancy*: ${exam.vacancy}\n*Qualification*: ${exam.qualification}\n*Last Date*: ${exam.endDate}\n\nApply Link: ${exam.link}\n\n_Powered by Balaji Computer & e-Mitra_`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  return (
    <section id="exams" className="py-20 px-4 md:px-8 max-w-7xl mx-auto min-h-screen flex flex-col">
      <div className="flex flex-col md:flex-row justify-between items-center mb-10 gap-6">
        <div className="text-center md:text-left">
          <h2 className="text-4xl md:text-5xl font-black text-slate-800 dark:text-white mb-2 tracking-tight">
            Intelligence System
          </h2>
          <p className="text-lg text-slate-500 dark:text-slate-400 font-medium">
            Smart-tracking for your customer's future.
          </p>
        </div>
        <button 
          onClick={() => { setNewExam({...newExam, category: activeCategory}); setIsAddModalOpen(true); }}
          className="flex items-center justify-center bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-6 py-3.5 rounded-2xl font-black shadow-xl hover:scale-105 transition-all whitespace-nowrap"
        >
          <Plus className="w-5 h-5 mr-1" /> Add Custom Exam
        </button>
      </div>

      {/* Dual-Category Architecture & Filters */}
      <div className="flex flex-col md:flex-row justify-between items-center bg-slate-100 dark:bg-slate-900/50 p-2 rounded-3xl mb-6 shadow-inner border border-slate-200 dark:border-slate-800 relative z-40">
        
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex w-full md:w-auto relative p-1 bg-white dark:bg-slate-950 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800">
            {(['Government Jobs', 'UG Admissions'] as Category[]).map((cat) => (
              <button
                key={cat}
                onClick={() => handleCategoryChange(cat)}
                className={`relative flex-1 md:w-48 py-3 text-sm font-bold rounded-xl transition-all z-10 ${activeCategory === cat ? 'text-white' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'}`}
              >
                {activeCategory === cat && (
                  <motion.div
                    layoutId="activeCategoryIndicator"
                    className="absolute inset-0 bg-(--color-orange) rounded-xl shadow-lg shadow-orange-500/20"
                    initial={false}
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  />
                )}
                <span className="relative z-20">{cat}</span>
              </button>
            ))}
          </div>

          <div className="relative w-full md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              type="text"
              placeholder="Search exams..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-white dark:bg-slate-950 rounded-2xl text-sm font-bold border border-slate-100 dark:border-slate-800 focus:ring-2 focus:ring-(--color-orange) outline-none transition-all"
            />
          </div>

          {activeCategory === 'Government Jobs' && (
            <div className="relative" onMouseEnter={() => setIsMenuOpen(true)} onMouseLeave={() => setIsMenuOpen(false)}>
              <button className={`flex items-center justify-center px-4 py-3 rounded-2xl font-bold transition-all ${isMenuOpen || activeSubCategory ? 'bg-(--color-navy) text-white shadow-lg' : 'bg-white dark:bg-slate-950 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900'}`}>
                Explore Categories <ChevronDown className={`w-4 h-4 ml-2 transition-transform duration-300 ${isMenuOpen ? 'rotate-180' : ''}`} />
              </button>

              <AnimatePresence>
                {isMenuOpen && (
                  <motion.div 
                    initial={{ opacity: 0, y: -10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -10, scale: 0.95 }}
                    transition={{ duration: 0.2 }}
                    className="absolute top-full left-0 mt-3 w-[700px] bg-slate-900/90 backdrop-blur-[16px] rounded-3xl p-6 shadow-[0_0_20px_rgba(255,107,0,0.1)] border border-slate-700/50 z-50 overflow-hidden"
                  >
                    <div className="grid grid-cols-3 gap-6">
                      {MEGA_MENU_CATEGORIES.map((column) => (
                        <div key={column.title} className="flex flex-col space-y-3">
                          <h4 className="text-xs uppercase tracking-wider font-bold text-slate-400 mb-1">{column.title}</h4>
                          {column.items.map((item) => {
                            const Icon = item.icon;
                            const count = getTotalCount(item.id);
                            const isEmpty = count === 0;
                            const isActive = activeSubCategory === item.id;
                            
                            return (
                              <button
                                key={item.id}
                                onClick={() => { setActiveSubCategory(item.id); setIsMenuOpen(false); }}
                                className={`flex items-center p-3 rounded-2xl transition-all duration-300 group
                                  ${isActive ? 'bg-(--color-orange)/20 border-(--color-orange)/50' : 'hover:bg-white/10 hover:-translate-y-0.5 border-transparent'}
                                  border ${isEmpty ? 'opacity-50 grayscale hover:grayscale-0 hover:opacity-100' : ''}
                                `}
                              >
                                <div className={`p-2 rounded-xl mr-3 transition-colors ${isActive ? 'bg-(--color-orange) text-white' : 'bg-slate-800 text-slate-300 group-hover:bg-slate-700 group-hover:text-white'}`}>
                                  <Icon className="w-5 h-5" />
                                </div>
                                <div className="text-left flex-grow">
                                  <div className={`font-bold text-sm ${isActive ? 'text-white' : 'text-slate-200'}`}>{item.id}</div>
                                </div>
                                <div className={`text-xs font-black px-2 py-1 rounded-lg ${isActive ? 'bg-(--color-orange) text-white' : (isEmpty ? 'bg-slate-800 text-slate-500' : 'bg-slate-800 text-slate-300')}`}>
                                  {count}
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
        </div>

        <div className="flex items-center gap-3 mt-4 md:mt-0 px-4 py-2">
          <span className={`text-sm font-bold transition-colors ${!showExpired ? 'text-(--color-orange)' : 'text-slate-400'}`}>Live</span>
          <button 
            onClick={() => setShowExpired(!showExpired)}
            className={`w-14 h-8 rounded-full relative transition-colors shadow-inner flex items-center px-1 ${showExpired ? 'bg-slate-300 dark:bg-slate-700' : 'bg-orange-200 dark:bg-orange-900'}`}
          >
            <motion.div 
              className={`w-6 h-6 rounded-full shadow-md ${showExpired ? 'bg-slate-500 dark:bg-slate-400' : 'bg-(--color-orange)'}`}
              animate={{ x: showExpired ? 24 : 0 }}
              transition={{ type: "spring", stiffness: 500, damping: 30 }}
            />
          </button>
          <span className={`text-sm font-bold transition-colors ${showExpired ? 'text-slate-600 dark:text-slate-300' : 'text-slate-400'}`}>Archived</span>
        </div>
      </div>

      <AnimatePresence>
        {activeCategory === 'Government Jobs' && activeSubCategory && (
          <motion.div 
            initial={{ opacity: 0, y: -10, height: 0 }}
            animate={{ opacity: 1, y: 0, height: 'auto' }}
            exit={{ opacity: 0, y: -10, height: 0 }}
            className="mb-6 flex"
          >
            <button 
              onClick={() => setActiveSubCategory(null)}
              className="flex items-center bg-(--color-navy) text-white px-4 py-2 rounded-xl font-bold text-sm shadow-lg hover:bg-slate-800 transition-colors"
            >
              <FilterX className="w-4 h-4 mr-2 text-(--color-orange)" />
              Clear Filter: {activeSubCategory}
              <X className="w-4 h-4 ml-2 opacity-70" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="relative flex-grow">
        {loading ? (
          <div className="absolute inset-0 flex justify-center items-center">
            <Loader2 className="w-12 h-12 text-(--color-orange) animate-spin" />
          </div>
        ) : (
          <AnimatePresence mode="popLayout">
            <motion.div
              key={activeCategory + showExpired.toString() + (activeSubCategory || 'all')}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.4 }}
              className="w-full"
            >
              {filteredExams.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {filteredExams.map((exam) => (
                    <ExamCard 
                      key={exam.id} 
                      exam={exam} 
                      onClick={() => setSelectedExam(exam)}
                    />
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                  <div className="w-32 h-32 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-6 shadow-inner">
                    <Inbox className="w-16 h-16 text-slate-300 dark:text-slate-600" />
                  </div>
                  <h3 className="text-2xl font-black text-slate-700 dark:text-slate-300 mb-2">
                    {showExpired ? 'Archive Empty' : 'All Caught Up!'}
                  </h3>
                  <p className="text-slate-500 max-w-sm">
                    {showExpired 
                      ? `No expired ${activeSubCategory || activeCategory.toLowerCase()} found.`
                      : `There are no active ${activeSubCategory || activeCategory.toLowerCase()} today. Check back later or view the archive.`}
                  </p>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        )}
      </div>

      {/* Deep-Dive Modal */}
      <AnimatePresence>
        {selectedExam && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-8">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedExam(null)}
              className="absolute inset-0 bg-slate-950/40 backdrop-blur-[20px]"
            />
            
            <motion.div 
              layoutId={`exam-${selectedExam.id}`}
              className="bg-white dark:bg-slate-900 w-full max-w-4xl rounded-[40px] overflow-hidden relative z-10 shadow-2xl border border-white/20 flex flex-col md:flex-row max-h-[90vh]"
            >
              {/* Left Column: Icon & Quick Info */}
              <div className="w-full md:w-1/3 bg-slate-50 dark:bg-slate-950/50 p-8 flex flex-col items-center text-center border-b md:border-b-0 md:border-r border-slate-200 dark:border-slate-800 shrink-0">
                <motion.div 
                  layoutId={`icon-box-${selectedExam.id}`}
                  className="p-10 rounded-[2.5rem] bg-gradient-to-br from-orange-100 to-orange-200 dark:from-orange-900/30 dark:to-orange-800/30 text-(--color-orange) mb-8 shadow-inner"
                >
                  {(() => {
                    const Icon = getIcon(selectedExam);
                    return <Icon className="w-20 h-20" />;
                  })()}
                </motion.div>
                
                <div className="space-y-4 w-full">
                  <div className="px-6 py-3 bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800">
                    <p className="text-[10px] uppercase font-black text-slate-400 tracking-widest mb-1">Status</p>
                    <p className={`text-sm font-black ${isExamExpired(selectedExam.endDate) ? 'text-slate-500' : 'text-green-500'}`}>
                      {isExamExpired(selectedExam.endDate) ? 'ARCHIVED ENTRY' : 'ACTIVE RECRUITMENT'}
                    </p>
                  </div>
                  
                  {!isExamExpired(selectedExam.endDate) && (
                    <div className="px-6 py-3 bg-orange-50 dark:bg-orange-900/20 rounded-2xl shadow-sm border border-orange-100 dark:border-orange-900/30">
                      <p className="text-[10px] uppercase font-black text-(--color-orange) tracking-widest mb-1">Deadline Warning</p>
                      <p className="text-xl font-black text-slate-800 dark:text-white">
                        {(() => {
                          const dateStr = selectedExam.endDate;
                          let endTime = 0;
                          if (dateStr.includes('-')) {
                            const parts = dateStr.split('-');
                            if (parts[0].length === 4) endTime = new Date(dateStr).getTime();
                            else if (parts[2]?.length === 4) endTime = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`).getTime();
                          } else endTime = new Date(dateStr).getTime();
                          const diff = Math.ceil((endTime - new Date().setHours(0,0,0,0)) / (1000 * 60 * 60 * 24));
                          return diff > 0 ? `${diff} Days Remaining` : 'Closing Today';
                        })()}
                      </p>
                    </div>
                  )}
                </div>

                <button 
                  onClick={() => setSelectedExam(null)}
                  className="mt-auto hidden md:flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 font-bold transition-colors"
                >
                  <X className="w-5 h-5 mr-2" /> Press ESC to close
                </button>
              </div>

              {/* Right Column: Full Details */}
              <div className="flex-grow p-8 md:p-12 overflow-y-auto">
                <div className="flex justify-between items-start mb-10">
                  <div className="max-w-[90%]">
                    <motion.h2 
                      layoutId={`name-${selectedExam.id}`}
                      className="text-3xl md:text-4xl font-black text-slate-800 dark:text-white leading-[1.1] mb-2"
                    >
                      {selectedExam.name}
                    </motion.h2>
                    <motion.p 
                      layoutId={`post-${selectedExam.id}`}
                      className="text-xl font-bold text-(--color-orange)"
                    >
                      {selectedExam.post}
                    </motion.p>
                  </div>
                  <button 
                    onClick={() => setSelectedExam(null)}
                    className="p-3 bg-slate-100 dark:bg-slate-800 rounded-full hover:rotate-90 transition-all duration-300 group"
                  >
                    <X className="w-6 h-6 text-slate-500 group-hover:text-slate-800 dark:group-hover:text-white" />
                  </button>
                </div>

                {/* Information Table */}
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-slate-50 dark:bg-slate-950/30 p-6 rounded-3xl border border-slate-100 dark:border-slate-800">
                      <div className="flex items-center text-(--color-orange) mb-3">
                        <Briefcase className="w-5 h-5 mr-2" />
                        <span className="text-xs font-black uppercase tracking-widest">Vacancy Details</span>
                      </div>
                      <p className="text-lg font-bold text-slate-700 dark:text-slate-200">
                        {selectedExam.vacancy}
                      </p>
                    </div>
                    
                    <div className="bg-slate-50 dark:bg-slate-950/30 p-6 rounded-3xl border border-slate-100 dark:border-slate-800">
                      <div className="flex items-center text-(--color-orange) mb-3">
                        <GraduationCap className="w-5 h-5 mr-2" />
                        <span className="text-xs font-black uppercase tracking-widest">Eligibility & Qual.</span>
                      </div>
                      <p className="text-lg font-bold text-slate-700 dark:text-slate-200">
                        {selectedExam.qualification}
                      </p>
                    </div>

                    <div className="bg-slate-50 dark:bg-slate-950/30 p-6 rounded-3xl border border-slate-100 dark:border-slate-800">
                      <div className="flex items-center text-(--color-orange) mb-3">
                        <Globe className="w-5 h-5 mr-2" />
                        <span className="text-xs font-black uppercase tracking-widest">Fee Structure</span>
                      </div>
                      <p className="text-lg font-bold text-slate-700 dark:text-slate-200">
                        {selectedExam.fees}
                      </p>
                    </div>

                    <div className="bg-slate-50 dark:bg-slate-950/30 p-6 rounded-3xl border border-slate-100 dark:border-slate-800">
                      <div className="flex items-center text-(--color-orange) mb-3">
                        <Calendar className="w-5 h-5 mr-2" />
                        <span className="text-xs font-black uppercase tracking-widest">Important Dates</span>
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm text-slate-500 font-bold">Start: {selectedExam.startDate}</p>
                        <p className="text-lg font-bold text-slate-700 dark:text-slate-200">End: {selectedExam.endDate}</p>
                      </div>
                    </div>
                  </div>

                  {/* Required Documents for UG */}
                  {selectedExam.category === 'UG Admissions' && (
                    <div className="bg-orange-50 dark:bg-orange-950/20 p-6 rounded-3xl border border-orange-100 dark:border-orange-900/30">
                      <div className="flex items-center text-(--color-orange) mb-4">
                        <MapPin className="w-5 h-5 mr-2" />
                        <span className="text-xs font-black uppercase tracking-widest">Required Documents for Shop Form</span>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        {['10th Marksheet', '12th Marksheet', 'Aadhaar Card', 'Jan Aadhaar', 'Photo', 'Signature'].map(doc => (
                          <div key={doc} className="flex items-center text-sm font-bold text-slate-700 dark:text-slate-300">
                            <div className="w-2 h-2 rounded-full bg-(--color-orange) mr-2 shrink-0" />
                            {doc}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Portal Access */}
                  <div className="bg-slate-900 text-white p-8 rounded-[2.5rem] flex flex-col md:flex-row items-center justify-between gap-6 shadow-2xl">
                    <div className="text-center md:text-left flex-grow overflow-hidden">
                      <h4 className="text-xl font-black mb-1 whitespace-nowrap">Official Portal Access</h4>
                      <p className="text-slate-400 text-sm font-medium mb-3">Verify details or apply at the link below:</p>
                      <div className="text-[11px] text-orange-400/80 font-mono break-all bg-black/40 p-3 rounded-2xl border border-white/5 shadow-inner">
                        {selectedExam.link}
                      </div>
                    </div>
                    <div className="flex gap-4 w-full md:w-auto shrink-0">
                      <a 
                        href={selectedExam.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 md:flex-none flex items-center justify-center bg-(--color-orange) hover:bg-orange-600 px-8 py-4 rounded-2xl font-black transition-all shadow-lg shadow-orange-500/20"
                      >
                        Apply Now <ExternalLink className="w-5 h-5 ml-2" />
                      </a>
                      <button 
                        onClick={() => handleWhatsAppShare(selectedExam)}
                        className="flex items-center justify-center bg-green-500 hover:bg-green-600 px-6 py-4 rounded-2xl font-black transition-all shadow-lg shadow-green-500/20"
                      >
                        <Send className="w-6 h-6" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Add Custom Exam Modal */}
      <AnimatePresence>
        {isAddModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsAddModalOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white dark:bg-slate-900 w-full max-w-xl rounded-3xl p-8 relative z-10 shadow-2xl border border-slate-200 dark:border-slate-800 max-h-[90vh] overflow-y-auto"
            >
              <h3 className="text-2xl font-bold mb-6 text-slate-800 dark:text-white">Add Custom Exam</h3>
              <form onSubmit={handleManualAdd} className="space-y-4">
                <div className="mb-4">
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Category</label>
                  <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                    {(['Government Jobs', 'UG Admissions'] as Category[]).map(cat => (
                      <button
                        type="button"
                        key={cat}
                        onClick={() => setNewExam({...newExam, category: cat})}
                        className={`flex-1 py-2 rounded-lg text-sm font-bold transition-colors ${newExam.category === cat ? 'bg-white dark:bg-slate-700 shadow-sm text-(--color-orange)' : 'text-slate-500'}`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Board/University *</label>
                    <input 
                      type="text" required value={newExam.name}
                      onChange={(e) => setNewExam({...newExam, name: e.target.value})}
                      placeholder="e.g., JNVU"
                      className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:ring-2 focus:ring-(--color-orange) outline-none transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Course/Post Name *</label>
                    <input 
                      type="text" required value={newExam.post}
                      onChange={(e) => setNewExam({...newExam, post: e.target.value})}
                      placeholder="e.g., BA 1st Year Form"
                      className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:ring-2 focus:ring-(--color-orange) outline-none transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Seats/Vacancy</label>
                    <input 
                      type="text" value={newExam.vacancy}
                      onChange={(e) => setNewExam({...newExam, vacancy: e.target.value})}
                      placeholder="e.g., Unlimited"
                      className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:ring-2 focus:ring-(--color-orange) outline-none transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Last Date</label>
                    <input 
                      type="date" value={newExam.endDate}
                      onChange={(e) => setNewExam({...newExam, endDate: e.target.value})}
                      className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:ring-2 focus:ring-(--color-orange) outline-none transition-all"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Qualification required</label>
                    <input 
                      type="text" value={newExam.qualification}
                      onChange={(e) => setNewExam({...newExam, qualification: e.target.value})}
                      placeholder="e.g., 12th Pass"
                      className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:ring-2 focus:ring-(--color-orange) outline-none transition-all"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Apply Link / Portal</label>
                    <input 
                      type="text" value={newExam.link}
                      onChange={(e) => setNewExam({...newExam, link: e.target.value})}
                      placeholder="e.g., jnvuiums.in"
                      className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:ring-2 focus:ring-(--color-orange) outline-none transition-all"
                    />
                  </div>
                </div>
                
                <div className="flex gap-4 pt-4 mt-6 border-t border-slate-100 dark:border-slate-800">
                  <button 
                    type="button" onClick={() => setIsAddModalOpen(false)}
                    className="flex-1 py-3 rounded-xl font-bold text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    className="flex-1 py-3 rounded-xl font-bold text-white bg-(--color-orange) hover:bg-orange-600 shadow-lg shadow-orange-500/30 transition-all"
                  >
                    Save Entry
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </section>
  );
}
