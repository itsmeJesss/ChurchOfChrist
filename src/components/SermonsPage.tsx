import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { FileText, Search, Calendar, User, ChevronRight, Download } from 'lucide-react';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';
import { mergeAndSortSermons } from '../utils/sermons';

export default function SermonsPage() {
  const [sermons, setSermons] = useState<any[]>(() => mergeAndSortSermons([]));
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = collection(db, 'sermons');
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const dbSermons = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setSermons(mergeAndSortSermons(dbSermons));
      setLoading(false);
    }, (err) => {
      console.warn('Could not read sermons in real-time, using fallback:', err);
      setSermons(mergeAndSortSermons([]));
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const filteredSermons = sermons.filter(s => 
    s.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.author.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ duration: 0.28, ease: [0.25, 0.1, 0.25, 1] }}
      className="max-w-4xl mx-auto px-4 py-12 space-y-12"
    >
      <header className="text-center space-y-4">
        <h1 className="text-4xl md:text-5xl font-bold text-deep-blue">Sermon Library</h1>
        <p className="text-gray-600 font-light max-w-xl mx-auto">
          Explore our collection of spiritual teachings and messages to nourish your faith journey.
        </p>
      </header>

      {/* Search Bar */}
      <div className="relative max-w-md mx-auto">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
        <input
          type="text"
          placeholder="Search by title or preacher..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-12 pr-6 py-4 bg-white border border-beige-warm rounded-2xl shadow-sm focus:outline-none focus:ring-2 focus:ring-gold/20 transition-all"
        />
      </div>

      {/* Sermon List */}
      <div className="grid gap-6">
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-24 bg-beige-light animate-pulse rounded-2xl" />
            ))}
          </div>
        ) : filteredSermons.length > 0 ? (
          filteredSermons.map((sermon) => (
            <motion.div
              layout
              key={sermon.id}
              className="bg-white rounded-3xl p-6 shadow-sm border border-beige-warm hover:shadow-md transition-all group"
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="flex items-center gap-5">
                  <div className="p-4 bg-blush rounded-2xl group-hover:bg-gold/10 transition-colors">
                    <FileText className="text-gold w-8 h-8" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-xl font-bold text-deep-blue">{sermon.title}</h3>
                    <div className="flex flex-wrap items-center gap-4 text-xs text-gray-400 uppercase tracking-widest font-medium">
                      <div className="flex items-center gap-1.5">
                        <User className="w-3 h-3 text-gold" />
                        {sermon.author}
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3 h-3 text-gold" />
                        {sermon.uploadDate?.toDate().toLocaleDateString('default', { day: 'numeric', month: 'long', year: 'numeric' })}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex gap-3">
                  <a
                    href={sermon.pdfUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-3 bg-beige-light text-deep-blue rounded-xl font-bold text-sm hover:bg-gold hover:text-white transition-all"
                  >
                    <Download className="w-4 h-4" />
                    Download PDF
                  </a>
                </div>
              </div>
            </motion.div>
          ))
        ) : (
          <div className="text-center py-20 space-y-4">
            <div className="w-20 h-20 bg-beige-light rounded-full flex items-center justify-center mx-auto">
              <FileText className="w-10 h-10 text-gray-300" />
            </div>
            <p className="text-gray-400 italic">No sermons found matching your search.</p>
          </div>
        )}
      </div>
    </motion.div>
  );
}
