'use client';

import React, { useState, useEffect } from 'react';
import { Search, Plus, Copy, ExternalLink, GraduationCap, Award, Building, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

type LinkCategory = 'Admit Cards' | 'Results' | 'Portals';

interface QuickLink {
  id: string;
  title: string;
  url: string;
  category: LinkCategory;
}

const DEFAULT_LINKS: QuickLink[] = [
  { id: '1', title: 'SSO Rajasthan', url: 'https://sso.rajasthan.gov.in', category: 'Portals' },
  { id: '2', title: 'Jan Aadhaar', url: 'https://janaadhaar.rajasthan.gov.in', category: 'Portals' },
  { id: '3', title: 'RSMSSB Admit Cards', url: 'https://rsmssb.rajasthan.gov.in/page?menuName=ApBuI6wdvnNKC6MoOgFsfXwFRsE7cKLr', category: 'Admit Cards' },
  { id: '4', title: 'SSC Admit Cards', url: 'https://ssc.nic.in/Portal/AdmitCard', category: 'Admit Cards' },
  { id: '5', title: 'RBSE 10th/12th Results', url: 'https://rajresults.nic.in/', category: 'Results' },
  { id: '6', title: 'University of Rajasthan', url: 'https://result.uniraj.ac.in/', category: 'Results' }
];

export default function QuickLinkHub() {
  const [links, setLinks] = useState<QuickLink[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  
  // Add Link Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newUrl, setNewUrl] = useState('');
  const [newCategory, setNewCategory] = useState<LinkCategory>('Portals');

  useEffect(() => {
    // Load from local storage on mount
    const savedLinks = localStorage.getItem('balaji_quick_links');
    if (savedLinks) {
      try {
        setLinks(JSON.parse(savedLinks));
      } catch (e) {
        setLinks(DEFAULT_LINKS);
      }
    } else {
      setLinks(DEFAULT_LINKS);
    }
  }, []);

  const saveLinks = (newLinks: QuickLink[]) => {
    setLinks(newLinks);
    localStorage.setItem('balaji_quick_links', JSON.stringify(newLinks));
  };

  const handleCopy = (url: string, id: string) => {
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleAddLink = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newUrl.trim()) return;
    
    // Ensure URL has http/https
    let finalUrl = newUrl.trim();
    if (!finalUrl.startsWith('http://') && !finalUrl.startsWith('https://')) {
      finalUrl = 'https://' + finalUrl;
    }

    const newLink: QuickLink = {
      id: Date.now().toString(),
      title: newTitle.trim(),
      url: finalUrl,
      category: newCategory
    };

    saveLinks([...links, newLink]);
    setNewTitle('');
    setNewUrl('');
    setIsModalOpen(false);
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Remove this link?')) {
      saveLinks(links.filter(l => l.id !== id));
    }
  };

  const filteredLinks = links.filter(link => 
    link.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
    link.url.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const categories: LinkCategory[] = ['Admit Cards', 'Results', 'Portals'];

  return (
    <div className="py-12 px-4 md:px-8 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-12 gap-6">
        <div>
          <h2 className="text-4xl md:text-5xl font-extrabold text-(--color-navy) dark:text-white mb-2">
            Quick Link Hub
          </h2>
          <p className="text-lg text-slate-600 dark:text-slate-400">
            One-click access to essential e-Mitra portals, admit cards, and results.
          </p>
        </div>
        
        <div className="flex gap-4 w-full md:w-auto">
          <div className="relative flex-grow md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search links..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:ring-2 focus:ring-(--color-orange) outline-none transition-all shadow-sm"
            />
          </div>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="flex items-center justify-center bg-(--color-orange) hover:bg-orange-600 text-white px-5 py-3 rounded-2xl font-bold shadow-lg shadow-orange-500/30 transition-all whitespace-nowrap"
          >
            <Plus className="w-5 h-5 mr-1" /> Add
          </button>
        </div>
      </div>

      <div className="space-y-10">
        {categories.map(category => {
          const categoryLinks = filteredLinks.filter(l => l.category === category);
          if (categoryLinks.length === 0) return null;

          return (
            <div key={category}>
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-lg text-(--color-orange)">
                  {category === 'Admit Cards' && <GraduationCap className="w-5 h-5" />}
                  {category === 'Results' && <Award className="w-5 h-5" />}
                  {category === 'Portals' && <Building className="w-5 h-5" />}
                </div>
                <h3 className="text-2xl font-bold text-slate-800 dark:text-white">{category}</h3>
                <div className="h-px bg-slate-200 dark:bg-slate-700 flex-grow ml-4"></div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                <AnimatePresence>
                  {categoryLinks.map(link => (
                    <motion.div
                      layout
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      key={link.id}
                      className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-xl transition-all group flex flex-col relative overflow-hidden"
                    >
                      {/* Delete button (hidden by default, shown on hover) */}
                      {!DEFAULT_LINKS.some(dl => dl.id === link.id) && (
                        <button 
                          onClick={() => handleDelete(link.id)}
                          className="absolute top-2 right-2 p-1.5 bg-red-100 text-red-600 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity text-xs font-bold"
                        >
                          Remove
                        </button>
                      )}

                      <h4 className="font-bold text-lg text-slate-800 dark:text-white mb-1 pr-12 line-clamp-1">
                        {link.title}
                      </h4>
                      <p className="text-sm text-slate-500 dark:text-slate-400 mb-6 line-clamp-1">
                        {link.url.replace(/^https?:\/\//, '')}
                      </p>
                      
                      <div className="mt-auto flex gap-3">
                        <a 
                          href={link.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-1 flex items-center justify-center bg-slate-50 dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 py-2.5 rounded-xl text-sm font-bold border border-slate-200 dark:border-slate-700 transition-colors"
                        >
                          <ExternalLink className="w-4 h-4 mr-2" /> Open
                        </a>
                        <button 
                          onClick={() => handleCopy(link.url, link.id)}
                          className={`flex-1 flex items-center justify-center py-2.5 rounded-xl text-sm font-bold border transition-colors ${
                            copiedId === link.id 
                              ? 'bg-green-50 dark:bg-green-900/30 text-green-600 border-green-200 dark:border-green-800' 
                              : 'bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-(--color-orange) border-orange-200 dark:border-orange-900/50'
                          }`}
                        >
                          {copiedId === link.id ? (
                            <><CheckCircle2 className="w-4 h-4 mr-2" /> Copied!</>
                          ) : (
                            <><Copy className="w-4 h-4 mr-2" /> Copy Link</>
                          )}
                        </button>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </div>
          );
        })}
        
        {filteredLinks.length === 0 && (
          <div className="text-center py-20 text-slate-500">
            <Search className="w-12 h-12 mx-auto mb-4 opacity-20" />
            <p className="text-xl font-medium">No links found for "{searchQuery}"</p>
          </div>
        )}
      </div>

      {/* Add Link Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white dark:bg-slate-900 w-full max-w-md rounded-3xl p-8 relative z-10 shadow-2xl border border-slate-200 dark:border-slate-800"
            >
              <h3 className="text-2xl font-bold mb-6 text-slate-800 dark:text-white">Add Quick Link</h3>
              <form onSubmit={handleAddLink} className="space-y-5">
                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Display Title</label>
                  <input 
                    type="text" 
                    required
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="e.g., CTET Admit Card 2026"
                    className="w-full p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:ring-2 focus:ring-(--color-orange) outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">URL / Link</label>
                  <input 
                    type="text" 
                    required
                    value={newUrl}
                    onChange={(e) => setNewUrl(e.target.value)}
                    placeholder="sso.rajasthan.gov.in"
                    className="w-full p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:ring-2 focus:ring-(--color-orange) outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Category</label>
                  <div className="grid grid-cols-3 gap-2">
                    {categories.map(cat => (
                      <button
                        type="button"
                        key={cat}
                        onClick={() => setNewCategory(cat)}
                        className={`py-3 px-2 rounded-xl text-xs font-bold transition-all border ${
                          newCategory === cat 
                            ? 'bg-(--color-orange) text-white border-transparent shadow-lg shadow-orange-500/30' 
                            : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex gap-4 pt-4 mt-8 border-t border-slate-100 dark:border-slate-800">
                  <button 
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="flex-1 py-4 rounded-xl font-bold text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    className="flex-1 py-4 rounded-xl font-bold text-white bg-(--color-orange) hover:bg-orange-600 shadow-lg shadow-orange-500/30 transition-all"
                  >
                    Save Link
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
