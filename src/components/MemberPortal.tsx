import React, { useState, useEffect } from 'react';
import { Routes, Route, Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { User } from 'firebase/auth';
import { collection, query, onSnapshot, addDoc, serverTimestamp, orderBy, limit, setDoc, doc, updateDoc, deleteDoc, getDocs, where } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL, deleteObject, uploadBytes } from 'firebase/storage';
import { db, storage, auth } from '../firebase';
import { supabase, isSupabaseConfigured as isSupabaseConfiguredClient } from '../supabase';
import firebaseConfig from '../../firebase-applet-config.json';
import { LayoutDashboard, Users, FileText, Plus, Sparkles, Calendar, Phone, StickyNote, X, Upload, CheckCircle, AlertCircle, Trash2, Edit2, ExternalLink, MapPin, Info } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { INITIAL_MEMBERS } from '../initialMembers';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const handleDownload = async (url: string, title: string) => {
  try {
    const response = await fetch(url);
    const blob = await response.blob();
    const blobUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = title.endsWith('.pdf') ? title : `${title}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(blobUrl);
  } catch (err) {
    console.error('Download failed, opening in new tab as fallback:', err);
    window.open(url, '_blank');
  }
};

// Constants for permissions
export const ADMIN_EMAILS = [
  'jessica.jane.richard@gmail.com',
  'richard.raju.s@gmail.com',
  'churchofchristshivajinagarblr@gmail.com'
].map(email => email.toLowerCase().trim());

export const CONGREGATION_EMAILS = [
  'gtonsing@gmail.com',
  'khvung@gmail.com',
  'chltnsg@gmail.com',
  'chinglun2008@gmail.com',
  'lucychris72@gmail.com',
  'sanchia.chris2@gmail.com',
  'rajkumarvn47@gmail.com',
  'renukasundar05@gmail.com',
  'graciatitty1971@gmail.com',
  'jssundar29@gmail.com',
  'graciatilak1999@gmail.com',
  'glorixtilak@gmail.com',
  'jessicaswenysolomon@gmail.com',
  'mvictorvenkatesh1961@gmail.com',
  'dannypraneeth@gmail.com',
  'meetguru75@gmail.com',
  'smithcrimson50@gmail.com',
  'nilats@gmail.com',
  'sunitha.mail@gmail.com',
  'stalinsiana@gmail.com',
  'selana.stalin@gmail.com',
  'priyadavid0609@gmail.com',
  'david.unnie@gmail.com',
  'wroopa.richard@gmail.com',
  'natania.richard@gmail.com'
].map(email => email.toLowerCase().trim());

export default function MemberPortal({ user }: { user: User }) {
  const location = useLocation();
  const [memberProfile, setMemberProfile] = useState<any>(null);

  const userEmailLower = (user.email || '').toLowerCase().trim();
  const isAdmin = ADMIN_EMAILS.includes(userEmailLower);

  useEffect(() => {
    // Try to find a member record linked to this user's UID
    const q = query(collection(db, 'members'), where('uid', '==', user.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        setMemberProfile({ id: snapshot.docs[0].id, ...snapshot.docs[0].data() });
      } else {
        // Also try matching by email if UID isn't set yet
        const eq = query(collection(db, 'members'), where('email', '==', user.email));
        getDocs(eq).then(snap => {
          if (!snap.empty) {
            const m = snap.docs[0];
            updateDoc(doc(db, 'members', m.id), { uid: user.uid }).catch(err => {
              console.warn('Could not auto-link member UID:', err.message);
            });
          }
        }).catch(err => {
          handleFirestoreError(err, OperationType.GET, 'members');
        });
      }
    }, (err) => {
      handleFirestoreError(err, OperationType.GET, 'members');
    });
    return () => unsubscribe();
  }, [user.uid, user.email]);

  useEffect(() => {
    // Auto-seed initially if the database members collection is completely empty and logged-in user is an admin
    if (isAdmin) {
      const q = query(collection(db, 'members'), limit(1));
      getDocs(q).then(async (snap) => {
        if (snap.empty) {
          console.log('Seeding initial members into empty database...');
          for (const member of INITIAL_MEMBERS) {
            await addDoc(collection(db, 'members'), {
              ...member,
              createdAt: serverTimestamp()
            });
          }
          console.log('Successfully auto-seeded initial members.');
        }
      }).catch(err => {
        console.warn('Auto-seed check failed:', err.message);
      });
    }
  }, [isAdmin, user.email]);

  const isMember = !!memberProfile || isAdmin || CONGREGATION_EMAILS.includes(userEmailLower);

  if (!isMember) {
    return <VisitorPortal user={user} />;
  }

  const navItems = [
    { name: 'Dashboard', path: '/portal', icon: LayoutDashboard },
    { name: 'Directory', path: '/portal/directory', icon: Users },
    { name: 'Sermons', path: '/portal/sermons', icon: FileText },
    { name: 'Events', path: '/portal/events', icon: Calendar },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 md:flex gap-8">
      {/* Sidebar Nav */}
      <aside className="md:w-64 flex-shrink-0 mb-8 md:mb-0">
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-beige-warm sticky top-28 space-y-4">
          <div className="flex items-center gap-3 px-4 py-3 mb-4">
            <div className="w-10 h-10 bg-blush rounded-full flex items-center justify-center text-deep-blue font-bold">
              {memberProfile?.name?.[0] || user.email?.[0].toUpperCase()}
            </div>
            <div className="overflow-hidden">
              <p className="text-sm font-bold text-deep-blue truncate">{memberProfile?.name || user.email}</p>
              <p className="text-xs text-gray-400 uppercase tracking-widest">
                {isAdmin ? 'Administrator' : 'Member'}
              </p>
            </div>
          </div>
          <div className="space-y-1">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all",
                  location.pathname === item.path 
                    ? "bg-deep-blue text-white shadow-lg shadow-deep-blue/20" 
                    : "text-gray-600 hover:bg-beige-light hover:text-deep-blue"
                )}
              >
                <item.icon className="w-4 h-4" />
                {item.name}
              </Link>
            ))}
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-grow">
        <AnimatePresence mode="wait">
          <Routes>
            <Route path="/" element={<Dashboard memberProfile={memberProfile} user={user} isAdmin={isAdmin} />} />
            <Route path="/directory" element={<MembersDirectory isAdmin={isAdmin} />} />
            <Route path="/sermons" element={<SermonsView isAdmin={isAdmin} />} />
            <Route path="/events" element={<EventsView isAdmin={isAdmin} />} />
          </Routes>
        </AnimatePresence>
      </div>
    </div>
  );
}

function VisitorPortal({ user }: { user: User }) {
  const [verse, setVerse] = useState<any>(null);
  const [sermons, setSermons] = useState<any[]>([]);

  useEffect(() => {
    // Fetch Verse
    const verseQuery = query(collection(db, 'verses'), orderBy('month', 'desc'), limit(1));
    const unsubscribeVerse = onSnapshot(verseQuery, (snapshot) => {
      if (!snapshot.empty) {
        setVerse({ id: snapshot.docs[0].id, ...snapshot.docs[0].data() });
      }
    }, (err) => {
      handleFirestoreError(err, OperationType.GET, 'verses');
    });

    // Fetch Sermons (Lessons)
    const sermonsQuery = query(collection(db, 'sermons'), orderBy('uploadDate', 'desc'));
    const unsubscribeSermons = onSnapshot(sermonsQuery, (snapshot) => {
      setSermons(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (err) => {
      handleFirestoreError(err, OperationType.GET, 'sermons');
    });

    return () => {
      unsubscribeVerse();
      unsubscribeSermons();
    };
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-4xl mx-auto px-4 py-12 space-y-12"
    >
      <header className="text-center space-y-4">
        <div className="inline-flex items-center gap-2 text-gold font-bold text-xs uppercase tracking-widest px-4 py-2 bg-blush rounded-full">
          <Sparkles className="w-4 h-4" />
          Welcome to our Community
        </div>
        <h1 className="text-4xl font-serif font-bold text-deep-blue">Visitor Portal</h1>
        <p className="text-gray-500 max-w-lg mx-auto">
          We are glad you are here. Explore our previous lessons and join our congregation to access more features.
        </p>
      </header>

      {/* Verse of the Month */}
      <section className="bg-white rounded-[40px] p-10 shadow-xl border border-beige-warm text-center space-y-6 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-gold opacity-20" />
        <div className="space-y-2">
          <p className="text-[10px] font-bold text-gold uppercase tracking-[0.2em]">Key Verse of the Month</p>
          <p className="text-2xl font-serif text-deep-blue italic leading-relaxed">
            "{verse?.text || 'The Lord is my shepherd; I shall not want.'}"
          </p>
          <p className="text-gold font-bold tracking-widest uppercase text-xs">
            — {verse?.reference || 'Psalm 23:1'}
          </p>
        </div>
      </section>

      {/* Registration Section */}
      <section className="bg-deep-blue rounded-[40px] p-10 text-white shadow-2xl shadow-deep-blue/20 flex flex-col md:flex-row items-center justify-between gap-8">
        <div className="space-y-2 text-center md:text-left">
          <h2 className="text-2xl font-bold font-serif">Join our Congregation</h2>
          <p className="text-blue-100 text-sm">Register to become a part of our church family and access the full member portal.</p>
        </div>
        <a 
          href="https://forms.gle/hdxX8J1se92KKmPEA" 
          target="_blank" 
          rel="noopener noreferrer"
          className="px-8 py-4 bg-gold text-white rounded-2xl font-bold flex items-center gap-2 hover:scale-105 transition-all shadow-lg shadow-gold/20"
        >
          Register Now
          <ExternalLink className="w-4 h-4" />
        </a>
      </section>

      {/* Lessons List */}
      <section className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-deep-blue font-serif">Previous Lessons</h2>
          <div className="text-xs text-gray-400 uppercase tracking-widest font-bold">
            {sermons.length} Lessons Available
          </div>
        </div>
        
        <div className="grid gap-4">
          {sermons.map((sermon) => (
            <div 
              key={sermon.id}
              className="bg-white rounded-3xl p-6 border border-beige-warm flex items-center justify-between hover:shadow-md transition-all group"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-beige-light rounded-2xl flex items-center justify-center text-gold group-hover:bg-gold group-hover:text-white transition-colors">
                  <FileText className="w-6 h-6" />
                </div>
                <div>
                  <button
                    onClick={() => handleDownload(sermon.pdfUrl, sermon.title)}
                    className="font-bold text-deep-blue hover:text-gold hover:underline text-left transition-all block"
                  >
                    {sermon.title}
                  </button>
                  <p className="text-xs text-gray-400 uppercase tracking-widest">
                    {sermon.author} • {sermon.uploadDate?.toDate().toLocaleDateString()}
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <a 
                  href={sermon.pdfUrl} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="p-3 bg-beige-light text-deep-blue rounded-xl hover:bg-deep-blue hover:text-white transition-all"
                  title="View PDF"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>
            </div>
          ))}
          {sermons.length === 0 && (
            <div className="text-center py-20 bg-white rounded-[40px] border border-dashed border-beige-warm">
              <p className="text-gray-400 italic">No lessons uploaded yet.</p>
            </div>
          )}
        </div>
      </section>
    </motion.div>
  );
}

function EventsView({ isAdmin }: { isAdmin: boolean }) {
  const [events, setEvents] = useState<any[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [newEvent, setNewEvent] = useState({ title: '', date: '', description: '', location: '' });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const q = query(collection(db, 'events'), orderBy('date', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setEvents(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (err) => {
      handleFirestoreError(err, OperationType.GET, 'events');
    });
    return () => unsubscribe();
  }, []);

  const handleAddEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) {
      alert("Unauthorized: Only administrators can create events.");
      return;
    }
    setLoading(true);
    try {
      await addDoc(collection(db, 'events'), newEvent);
      setIsAdding(false);
      setNewEvent({ title: '', date: '', description: '', location: '' });
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'events');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteEvent = async (id: string) => {
    if (!isAdmin) {
      alert("Unauthorized: Only administrators can delete events.");
      return;
    }
    if (!window.confirm('Delete this event?')) return;
    try {
      await deleteDoc(doc(db, 'events', id));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `events/${id}`);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="space-y-8"
    >
      <header className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold text-deep-blue">Planned Events</h1>
          <p className="text-sm text-gray-500 font-medium">Stay updated with our upcoming activities.</p>
        </div>
        {isAdmin && (
          <button
            onClick={() => setIsAdding(true)}
            className="flex items-center gap-2 px-6 py-3 bg-gold text-white rounded-2xl font-bold shadow-lg shadow-gold/20 hover:scale-105 transition-all"
          >
            <Plus className="w-5 h-5" />
            Add Event
          </button>
        )}
      </header>

      <div className="grid gap-6">
        {events.map((event) => (
          <div key={event.id} className="bg-white rounded-3xl p-8 shadow-sm border border-beige-warm flex flex-col md:flex-row gap-8 items-start">
            <div className="flex-shrink-0 w-24 h-24 bg-beige-light rounded-3xl flex flex-col items-center justify-center text-deep-blue border border-beige-warm">
              <span className="text-[10px] font-bold uppercase tracking-widest text-gold">
                {new Date(event.date).toLocaleString('default', { month: 'short' })}
              </span>
              <span className="text-3xl font-bold">
                {new Date(event.date).getDate()}
              </span>
            </div>
            <div className="flex-grow space-y-4">
              <div className="flex items-start justify-between">
                <h3 className="text-2xl font-bold text-deep-blue">{event.title}</h3>
                {isAdmin && (
                  <button 
                    onClick={() => handleDeleteEvent(event.id)}
                    className="p-2 text-gray-300 hover:text-red-400 transition-colors"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                )}
              </div>
              <p className="text-gray-500 leading-relaxed">{event.description}</p>
              <div className="flex flex-wrap gap-4 pt-4 border-t border-beige-warm/50">
                <div className="flex items-center gap-2 text-sm text-gray-400">
                  <Calendar className="w-4 h-4 text-gold" />
                  {new Date(event.date).toLocaleDateString('default', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                </div>
                {event.location && (
                  <div className="flex items-center gap-2 text-sm text-gray-400">
                    <MapPin className="w-4 h-4 text-gold" />
                    {event.location}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
        {events.length === 0 && (
          <div className="text-center py-20 bg-white rounded-[40px] border border-dashed border-beige-warm space-y-4">
            <Calendar className="w-12 h-12 text-gray-200 mx-auto" />
            <p className="text-gray-400 italic">No events planned for this month.</p>
          </div>
        )}
      </div>

      {/* Add Event Modal */}
      <AnimatePresence>
        {isAdding && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsAdding(false)}
              className="absolute inset-0 bg-deep-blue/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative bg-white rounded-[40px] p-8 md:p-12 w-full max-w-xl shadow-2xl border border-beige-warm"
            >
              <div className="absolute top-0 right-0 p-6">
                <button onClick={() => setIsAdding(false)} className="text-gray-300 hover:text-gold transition-colors">
                  <X className="w-8 h-8" />
                </button>
              </div>

              <div className="space-y-8">
                <div className="space-y-2">
                  <div className="inline-flex items-center gap-2 text-gold font-bold text-xs uppercase tracking-widest">
                    <Calendar className="w-4 h-4" />
                    New Event
                  </div>
                  <h2 className="text-3xl font-bold text-deep-blue font-serif">Plan Activity</h2>
                </div>

                <form onSubmit={handleAddEvent} className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-4">Event Title</label>
                    <input
                      required
                      type="text"
                      value={newEvent.title}
                      onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
                      className="w-full px-6 py-4 bg-beige-light border border-beige-warm rounded-2xl focus:outline-none focus:ring-2 focus:ring-gold/20"
                      placeholder="e.g., Sunday Worship"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-4">Date</label>
                    <input
                      required
                      type="date"
                      value={newEvent.date}
                      onChange={(e) => setNewEvent({ ...newEvent, date: e.target.value })}
                      className="w-full px-6 py-4 bg-beige-light border border-beige-warm rounded-2xl focus:outline-none focus:ring-2 focus:ring-gold/20"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-4">Location</label>
                    <input
                      type="text"
                      value={newEvent.location}
                      onChange={(e) => setNewEvent({ ...newEvent, location: e.target.value })}
                      className="w-full px-6 py-4 bg-beige-light border border-beige-warm rounded-2xl focus:outline-none focus:ring-2 focus:ring-gold/20"
                      placeholder="e.g., Church Hall"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-4">Description</label>
                    <textarea
                      value={newEvent.description}
                      onChange={(e) => setNewEvent({ ...newEvent, description: e.target.value })}
                      className="w-full px-6 py-4 bg-beige-light border border-beige-warm rounded-2xl focus:outline-none focus:ring-2 focus:ring-gold/20 min-h-[100px]"
                      placeholder="Details about the event..."
                    />
                  </div>

                  <button
                    disabled={loading}
                    type="submit"
                    className="w-full py-5 bg-deep-blue text-white rounded-2xl font-bold text-lg shadow-xl shadow-deep-blue/20 hover:scale-[1.02] transition-all disabled:opacity-50"
                  >
                    {loading ? "Planning..." : "Add to Calendar"}
                  </button>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function Dashboard({ memberProfile, user, isAdmin }: { memberProfile: any, user: User, isAdmin: boolean }) {
  const [birthdays, setBirthdays] = useState<any[]>([]);
  const [verse, setVerse] = useState<any>(null);
  const [isEditingVerse, setIsEditingVerse] = useState(false);
  const [newVerse, setNewVerse] = useState({ text: '', reference: '' });

  useEffect(() => {
    // Fetch members for birthdays
    const unsubscribeMembers = onSnapshot(collection(db, 'members'), (snapshot) => {
      const currentMonth = new Date().getMonth() + 1;
      const list = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter((m: any) => {
          const month = parseInt(m.birthday.split('-')[1]);
          return month === currentMonth;
        });
      setBirthdays(list);
    }, (err) => {
      handleFirestoreError(err, OperationType.GET, 'members');
    });

    // Fetch Verse of the Month
    const verseQuery = query(collection(db, 'verses'), orderBy('month', 'desc'), limit(1));
    const unsubscribeVerse = onSnapshot(verseQuery, (snapshot) => {
      if (!snapshot.empty) {
        const data = snapshot.docs[0].data();
        setVerse({ id: snapshot.docs[0].id, ...data });
        setNewVerse({ text: data.text, reference: data.reference });
      }
    }, (err) => {
      handleFirestoreError(err, OperationType.GET, 'verses');
    });

    return () => {
      unsubscribeMembers();
      unsubscribeVerse();
    };
  }, []);

  const handleUpdateVerse = async () => {
    if (!isAdmin) {
      alert("Unauthorized: Only administrators can update the verse of the month.");
      return;
    }
    try {
      const monthStr = new Date().toISOString().slice(0, 7); // YYYY-MM
      if (verse) {
        await updateDoc(doc(db, 'verses', verse.id), {
          ...newVerse,
          month: monthStr
        });
      } else {
        await addDoc(collection(db, 'verses'), {
          ...newVerse,
          month: monthStr
        });
      }
      setIsEditingVerse(false);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, 'verses');
    }
  };

  const handleSeedMembers = async () => {
    if (!isAdmin) {
      alert("Unauthorized: Only administrators can import members data.");
      return;
    }
    if (!window.confirm('This will import all existing members from the database. Continue?')) return;
    try {
      for (const member of INITIAL_MEMBERS) {
        // Check if member already exists by email
        const q = query(collection(db, 'members'), where('email', '==', member.email));
        const snap = await getDocs(q);
        if (snap.empty) {
          await addDoc(collection(db, 'members'), {
            ...member,
            createdAt: serverTimestamp()
          });
        }
      }
      alert('Members imported successfully!');
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'members');
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="space-y-8"
    >
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold text-deep-blue">
            Welcome, {memberProfile?.name || user.email?.split('@')[0]}
          </h1>
          <p className="text-sm text-gray-500 font-medium">
            It's a blessing to have you with us today.
          </p>
        </div>
        <div className="flex items-center gap-2 text-sage font-medium text-sm tracking-widest uppercase">
          <Sparkles className="w-4 h-4" />
          {new Date().toLocaleString('default', { month: 'long', year: 'numeric' })}
        </div>
        {isAdmin && (
          <button 
            onClick={handleSeedMembers}
            className="px-4 py-2 bg-beige-warm text-deep-blue rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-gold hover:text-white transition-all"
          >
            Import Members Data
          </button>
        )}
      </header>

      <div className="grid md:grid-cols-2 gap-8">
        {/* Birthdays Card */}
        <section className="bg-white rounded-3xl p-8 shadow-sm border border-beige-warm space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-blush rounded-2xl">
                <Calendar className="text-gold w-6 h-6" />
              </div>
              <h2 className="text-xl font-bold text-deep-blue">Birthdays This Month</h2>
            </div>
            <span className="bg-blush text-gold px-3 py-1 rounded-full text-xs font-bold">
              {birthdays.length}
            </span>
          </div>
          <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
            {birthdays.length > 0 ? (
              birthdays.map((member) => (
                <div key={member.id} className="flex items-center justify-between p-4 bg-beige-light rounded-2xl border border-beige-warm/50">
                  <div>
                    <p className="font-bold text-deep-blue">{member.name}</p>
                    <p className="text-xs text-gray-400 uppercase tracking-widest">
                      {new Date(member.birthday).toLocaleDateString('default', { day: 'numeric', month: 'long' })}
                    </p>
                  </div>
                  <Sparkles className="text-gold w-4 h-4 opacity-30" />
                </div>
              ))
            ) : (
              <p className="text-center py-8 text-gray-400 italic text-sm">No birthdays this month.</p>
            )}
          </div>
        </section>

        {/* Verse of the Month Card */}
        <section className="bg-white rounded-3xl p-8 shadow-sm border border-beige-warm space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-sage rounded-2xl">
                <Sparkles className="text-deep-blue w-6 h-6" />
              </div>
              <h2 className="text-xl font-bold text-deep-blue">Key Verse of the Month</h2>
            </div>
            {isAdmin && (
              <button 
                onClick={() => setIsEditingVerse(!isEditingVerse)}
                className="p-2 text-gray-400 hover:text-gold transition-colors"
              >
                <Edit2 className="w-4 h-4" />
              </button>
            )}
          </div>

          <AnimatePresence mode="wait">
            {isEditingVerse ? (
              <motion.div
                key="edit"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-4"
              >
                <textarea
                  value={newVerse.text}
                  onChange={(e) => setNewVerse({ ...newVerse, text: e.target.value })}
                  className="w-full p-4 bg-beige-light border border-beige-warm rounded-2xl focus:outline-none focus:ring-2 focus:ring-gold/20 min-h-[120px] text-sm"
                  placeholder="Enter verse text..."
                />
                <input
                  type="text"
                  value={newVerse.reference}
                  onChange={(e) => setNewVerse({ ...newVerse, reference: e.target.value })}
                  className="w-full p-4 bg-beige-light border border-beige-warm rounded-2xl focus:outline-none focus:ring-2 focus:ring-gold/20 text-sm"
                  placeholder="Reference (e.g., John 3:16)"
                />
                <div className="flex gap-2">
                  <button
                    onClick={handleUpdateVerse}
                    className="flex-grow py-3 bg-deep-blue text-white rounded-xl font-bold text-sm hover:bg-opacity-90 transition-all"
                  >
                    Save Changes
                  </button>
                  <button
                    onClick={() => setIsEditingVerse(false)}
                    className="px-6 py-3 bg-gray-100 text-gray-500 rounded-xl font-bold text-sm hover:bg-gray-200 transition-all"
                  >
                    Cancel
                  </button>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="view"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="text-center space-y-4 py-8"
              >
                <p className="text-2xl font-serif text-deep-blue italic leading-relaxed">
                  "{verse?.text || 'The Lord is my shepherd; I shall not want.'}"
                </p>
                <p className="text-gold font-bold tracking-widest uppercase text-xs">
                  — {verse?.reference || 'Psalm 23:1'}
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </section>
      </div>
    </motion.div>
  );
}

function MembersDirectory({ isAdmin }: { isAdmin: boolean }) {
  const [members, setMembers] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [editingMember, setEditingMember] = useState<any | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<any | null>(null);
  const [newMember, setNewMember] = useState({ name: '', birthday: '', phoneNumber: '', notes: '', email: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastSynced, setLastSynced] = useState<Date | null>(null);

  useEffect(() => {
    const q = query(collection(db, 'members'), orderBy('name', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setMembers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLastSynced(new Date());
    }, (err) => {
      handleFirestoreError(err, OperationType.GET, 'members');
    });
    return () => unsubscribe();
  }, []);

  const filteredMembers = members.filter(m => 
    m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    m.phoneNumber?.includes(searchQuery) ||
    m.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    m.notes?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) {
      alert("Unauthorized: Only administrators can add members.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await addDoc(collection(db, 'members'), {
        ...newMember,
        createdAt: serverTimestamp()
      });
      setIsAdding(false);
      setNewMember({ name: '', birthday: '', phoneNumber: '', notes: '', email: '' });
    } catch (err: any) {
      handleFirestoreError(err, OperationType.CREATE, 'members');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMember) return;
    if (!isAdmin) {
      alert("Unauthorized: Only administrators can update member records.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const { id, ...data } = editingMember;
      await updateDoc(doc(db, 'members', id), data);
      setEditingMember(null);
    } catch (err: any) {
      handleFirestoreError(err, OperationType.UPDATE, `members/${editingMember.id}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteMember = async (member: any) => {
    if (!isAdmin) {
      alert("Unauthorized: Only administrators can delete members.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      // 1. Delete associated sermons
      const sermonsQuery = query(collection(db, 'sermons'), where('author', '==', member.name));
      const sermonsSnapshot = await getDocs(sermonsQuery);
      const deleteSermonPromises = sermonsSnapshot.docs.map(async (sermonDoc) => {
        const sermonData = sermonDoc.data();
        if (sermonData.storagePath && isSupabaseConfiguredClient && supabase) {
          try {
            const { error: deleteError } = await supabase.storage
              .from('sermons')
              .remove([sermonData.storagePath]);
            if (deleteError) {
              console.error('Failed to delete sermon file from Supabase Storage:', deleteError);
            }
          } catch (err) {
            console.error('Failed to delete sermon file from Supabase Storage:', err);
          }
        }
        return deleteDoc(doc(db, 'sermons', sermonDoc.id));
      });
      await Promise.all(deleteSermonPromises);

      // 2. Delete user document if uid exists
      if (member.uid) {
        try {
          await deleteDoc(doc(db, 'users', member.uid));
        } catch (err) {
          console.error('Failed to delete user document:', err);
        }
      }

      // 3. Delete member document
      await deleteDoc(doc(db, 'members', member.id));
      setDeleteConfirm(null);
    } catch (err: any) {
      handleFirestoreError(err, OperationType.DELETE, `members/${member.id}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="space-y-8"
    >
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold text-deep-blue">Members Directory</h1>
          {lastSynced && (
            <p className="text-[10px] text-sage font-bold uppercase tracking-widest flex items-center gap-1">
              <CheckCircle className="w-3 h-3" />
              Synced to Cloud: {lastSynced.toLocaleTimeString()}
            </p>
          )}
        </div>
        <div className="flex items-center gap-3">
          <div className="relative flex-grow md:w-64">
            <input
              type="text"
              placeholder="Search members..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white border border-beige-warm rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gold/20"
            />
            <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          </div>
          {isAdmin && (
            <button
              onClick={() => setIsAdding(true)}
              className="flex items-center gap-2 px-6 py-3 bg-gold text-white rounded-2xl font-bold shadow-lg shadow-gold/20 hover:scale-105 transition-all whitespace-nowrap"
            >
              <Plus className="w-5 h-5" />
              Add Member
            </button>
          )}
        </div>
      </header>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredMembers.map((member) => (
          <motion.div
            layout
            key={member.id}
            className="bg-white rounded-3xl p-6 shadow-sm border border-beige-warm space-y-4 hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between">
              <div className="w-12 h-12 bg-sage rounded-2xl flex items-center justify-center text-deep-blue font-bold text-xl">
                {member.name[0]}
              </div>
              {isAdmin && (
                <div className="flex gap-2">
                  <button 
                    onClick={() => setEditingMember(member)}
                    className="p-2 text-gray-300 hover:text-gold transition-colors"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => setDeleteConfirm(member)}
                    className="p-2 text-gray-300 hover:text-red-400 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
            <div>
              <h3 className="text-lg font-bold text-deep-blue">{member.name}</h3>
              <div className="space-y-2 mt-4">
                <div className="flex items-center gap-3 text-sm text-gray-500">
                  <Calendar className="w-4 h-4 text-gold" />
                  {new Date(member.birthday).toLocaleDateString('default', { day: 'numeric', month: 'long', year: 'numeric' })}
                </div>
                {member.phoneNumber && (
                  <div className="flex items-center gap-3 text-sm text-gray-500">
                    <Phone className="w-4 h-4 text-gold" />
                    {member.phoneNumber}
                  </div>
                )}
                {member.notes && (
                  <div className="flex items-start gap-3 text-sm text-gray-500 pt-2 border-t border-beige-warm mt-2">
                    <StickyNote className="w-4 h-4 text-gold flex-shrink-0 mt-0.5" />
                    <p className="italic line-clamp-2">{member.notes}</p>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        ))}
        {filteredMembers.length === 0 && members.length > 0 && (
          <div className="col-span-full py-20 text-center space-y-4">
            <Users className="w-12 h-12 text-gray-200 mx-auto" />
            <p className="text-gray-400 italic">No members found matching "{searchQuery}"</p>
          </div>
        )}
      </div>

      {/* Add Member Modal */}
      <AnimatePresence>
        {isAdding && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsAdding(false)}
              className="absolute inset-0 bg-deep-blue/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative bg-white rounded-[40px] p-8 md:p-12 w-full max-w-xl shadow-2xl border border-beige-warm overflow-hidden"
            >
              <div className="absolute top-0 right-0 p-6">
                <button onClick={() => setIsAdding(false)} className="text-gray-300 hover:text-gold transition-colors">
                  <X className="w-8 h-8" />
                </button>
              </div>

              <div className="space-y-8">
                <div className="space-y-2">
                  <div className="inline-flex items-center gap-2 text-gold font-bold text-xs uppercase tracking-widest">
                    <Sparkles className="w-4 h-4" />
                    New Member
                  </div>
                  <h2 className="text-3xl font-bold text-deep-blue font-serif">Add to Community</h2>
                </div>

                <form onSubmit={handleAddMember} className="space-y-6">
                  {error && (
                    <div className="p-4 bg-red-50 text-red-600 rounded-2xl text-sm flex items-center gap-3">
                      <AlertCircle className="w-5 h-5" />
                      {error}
                    </div>
                  )}
                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-4">Full Name</label>
                      <input
                        required
                        type="text"
                        value={newMember.name}
                        onChange={(e) => setNewMember({ ...newMember, name: e.target.value })}
                        className="w-full px-6 py-4 bg-beige-light border border-beige-warm rounded-2xl focus:outline-none focus:ring-2 focus:ring-gold/20"
                        placeholder="John Doe"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-4">Birthday</label>
                      <input
                        required
                        type="date"
                        value={newMember.birthday}
                        onChange={(e) => setNewMember({ ...newMember, birthday: e.target.value })}
                        className="w-full px-6 py-4 bg-beige-light border border-beige-warm rounded-2xl focus:outline-none focus:ring-2 focus:ring-gold/20"
                      />
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-4">Email Address</label>
                      <input
                        type="email"
                        value={newMember.email}
                        onChange={(e) => setNewMember({ ...newMember, email: e.target.value })}
                        className="w-full px-6 py-4 bg-beige-light border border-beige-warm rounded-2xl focus:outline-none focus:ring-2 focus:ring-gold/20"
                        placeholder="john@example.com"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-4">Phone Number</label>
                      <input
                        type="tel"
                        value={newMember.phoneNumber}
                        onChange={(e) => setNewMember({ ...newMember, phoneNumber: e.target.value })}
                        className="w-full px-6 py-4 bg-beige-light border border-beige-warm rounded-2xl focus:outline-none focus:ring-2 focus:ring-gold/20"
                        placeholder="+91 98765 43210"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-4">Notes</label>
                    <textarea
                      value={newMember.notes}
                      onChange={(e) => setNewMember({ ...newMember, notes: e.target.value })}
                      className="w-full px-6 py-4 bg-beige-light border border-beige-warm rounded-2xl focus:outline-none focus:ring-2 focus:ring-gold/20 min-h-[100px]"
                      placeholder="Family details, special requests, etc."
                    />
                  </div>

                  <button
                    disabled={loading}
                    type="submit"
                    className="w-full py-5 bg-deep-blue text-white rounded-2xl font-bold text-lg shadow-xl shadow-deep-blue/20 hover:scale-[1.02] transition-all disabled:opacity-50"
                  >
                    {loading ? "Adding..." : "Confirm Member"}
                  </button>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Edit Member Modal */}
      <AnimatePresence>
        {editingMember && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setEditingMember(null)}
              className="absolute inset-0 bg-deep-blue/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative bg-white rounded-[40px] p-8 md:p-12 w-full max-w-xl shadow-2xl border border-beige-warm overflow-hidden"
            >
              <div className="absolute top-0 right-0 p-6">
                <button onClick={() => setEditingMember(null)} className="text-gray-300 hover:text-gold transition-colors">
                  <X className="w-8 h-8" />
                </button>
              </div>

              <div className="space-y-8">
                <div className="space-y-2">
                  <div className="inline-flex items-center gap-2 text-gold font-bold text-xs uppercase tracking-widest">
                    <Edit2 className="w-4 h-4" />
                    Edit Member
                  </div>
                  <h2 className="text-3xl font-bold text-deep-blue font-serif">Update Profile</h2>
                </div>

                <form onSubmit={handleUpdateMember} className="space-y-6">
                  {error && (
                    <div className="p-4 bg-red-50 text-red-600 rounded-2xl text-sm flex items-center gap-3">
                      <AlertCircle className="w-5 h-5" />
                      {error}
                    </div>
                  )}
                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-4">Full Name</label>
                      <input
                        required
                        type="text"
                        value={editingMember.name}
                        onChange={(e) => setEditingMember({ ...editingMember, name: e.target.value })}
                        className="w-full px-6 py-4 bg-beige-light border border-beige-warm rounded-2xl focus:outline-none focus:ring-2 focus:ring-gold/20"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-4">Birthday</label>
                      <input
                        required
                        type="date"
                        value={editingMember.birthday}
                        onChange={(e) => setEditingMember({ ...editingMember, birthday: e.target.value })}
                        className="w-full px-6 py-4 bg-beige-light border border-beige-warm rounded-2xl focus:outline-none focus:ring-2 focus:ring-gold/20"
                      />
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-4">Email Address</label>
                      <input
                        type="email"
                        value={editingMember.email || ''}
                        onChange={(e) => setEditingMember({ ...editingMember, email: e.target.value })}
                        className="w-full px-6 py-4 bg-beige-light border border-beige-warm rounded-2xl focus:outline-none focus:ring-2 focus:ring-gold/20"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-4">Phone Number</label>
                      <input
                        type="tel"
                        value={editingMember.phoneNumber}
                        onChange={(e) => setEditingMember({ ...editingMember, phoneNumber: e.target.value })}
                        className="w-full px-6 py-4 bg-beige-light border border-beige-warm rounded-2xl focus:outline-none focus:ring-2 focus:ring-gold/20"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-4">Notes</label>
                    <textarea
                      value={editingMember.notes}
                      onChange={(e) => setEditingMember({ ...editingMember, notes: e.target.value })}
                      className="w-full px-6 py-4 bg-beige-light border border-beige-warm rounded-2xl focus:outline-none focus:ring-2 focus:ring-gold/20 min-h-[100px]"
                    />
                  </div>

                  <button
                    disabled={loading}
                    type="submit"
                    className="w-full py-5 bg-deep-blue text-white rounded-2xl font-bold text-lg shadow-xl shadow-deep-blue/20 hover:scale-[1.02] transition-all disabled:opacity-50"
                  >
                    {loading ? "Updating..." : "Save Changes"}
                  </button>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {deleteConfirm && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setDeleteConfirm(null)}
              className="absolute inset-0 bg-deep-blue/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative bg-white rounded-[32px] p-8 w-full max-w-md shadow-2xl border border-beige-warm"
            >
              <div className="space-y-6 text-center">
                <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto">
                  <Trash2 className="w-8 h-8 text-red-500" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-xl font-bold text-deep-blue">Delete Member?</h3>
                  <p className="text-sm text-gray-500 leading-relaxed">
                    Are you sure you want to delete <span className="font-bold text-deep-blue">{deleteConfirm.name}</span>? 
                    This will remove their complete info across the site, including any sermons they've authored.
                  </p>
                </div>
                {error && (
                  <div className="p-3 bg-red-50 text-red-600 text-xs rounded-xl flex items-center gap-2 justify-center">
                    <AlertCircle className="w-4 h-4" />
                    {error}
                  </div>
                )}
                <div className="flex gap-3">
                  <button
                    disabled={loading}
                    onClick={() => setDeleteConfirm(null)}
                    className="flex-1 py-3 bg-gray-100 text-gray-500 rounded-xl font-bold text-sm hover:bg-gray-200 transition-all disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    disabled={loading}
                    onClick={() => handleDeleteMember(deleteConfirm)}
                    className="flex-1 py-3 bg-red-500 text-white rounded-xl font-bold text-sm hover:bg-red-600 transition-all shadow-lg shadow-red-500/20 disabled:opacity-50"
                  >
                    {loading ? "Deleting..." : "Delete"}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function SermonsView({ isAdmin }: { isAdmin: boolean }) {
  const [sermons, setSermons] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [sermonTitle, setSermonTitle] = useState('');
  const [preacher, setPreacher] = useState('Church Of Christ (General)');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [deleteConfirm, setDeleteConfirm] = useState<any | null>(null);
  const [error, setError] = useState('');
  const [storageErrorObj, setStorageErrorObj] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [testStatus, setTestStatus] = useState<string | null>(null);
  const [isSupabaseConfigured, setIsSupabaseConfigured] = useState(isSupabaseConfiguredClient);

  useEffect(() => {
    setIsSupabaseConfigured(isSupabaseConfiguredClient);
  }, []);

  useEffect(() => {
    const q = query(collection(db, 'sermons'), orderBy('uploadDate', 'desc'));
    const unsubscribeSermons = onSnapshot(q, (snapshot) => {
      setSermons(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (err) => {
      handleFirestoreError(err, OperationType.GET, 'sermons');
    });

    const mq = query(collection(db, 'members'), orderBy('name', 'asc'));
    const unsubscribeMembers = onSnapshot(mq, (snapshot) => {
      setMembers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (err) => {
      handleFirestoreError(err, OperationType.GET, 'members');
    });

    return () => {
      unsubscribeSermons();
      unsubscribeMembers();
    };
  }, []);

  const handleTestStorage = async () => {
    if (!isAdmin) {
      alert("Unauthorized: Only administrators can test storage connection.");
      return;
    }
    setTestStatus('Testing Supabase Storage connection...');
    try {
      if (!isSupabaseConfiguredClient || !supabase) {
        throw new Error('Supabase client is not configured or initialized with VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY env vars.');
      }
      const { data, error } = await supabase.storage.from('sermons').list('', { limit: 1 });
      if (error) throw error;
      
      setTestStatus('Supabase Storage Connected and Ready!');
      setIsSupabaseConfigured(true);
      setTimeout(() => setTestStatus(null), 3000);
    } catch (err: any) {
      console.error('Supabase Storage Test Failed:', err);
      setTestStatus(`Failed: ${err.message}`);
      setIsSupabaseConfigured(false);
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) {
      setError('Unauthorized: Only administrators can upload sermons.');
      return;
    }
    if (!selectedFile) return;
    
    if (!auth.currentUser) {
      setError('You must be logged in to upload sermons.');
      return;
    }

    setIsUploading(true);
    setError('');
    setStorageErrorObj(null);
    setUploadProgress(5);

    // Simulated progress build-up for compilation safety across all @supabase/supabase-js versions
    const progressInterval = setInterval(() => {
      setUploadProgress((prev) => {
        if (prev >= 85) return prev;
        return prev + (90 - prev) * 0.15; // Smooth deceleration
      });
    }, 200);

    let isRequestActive = true;

    // Timeout - 5 minutes limit to prevent freezing on large dynamic uploads or slow connections
    const timeoutId = setTimeout(() => {
      if (isRequestActive) {
        isRequestActive = false;
        clearInterval(progressInterval);
        setIsUploading(false);
        const timeoutError = new Error('Upload timed out. The storage upload took more than 5 minutes.');
        setError(timeoutError.message);
        setStorageErrorObj({ code: 'timeout', message: timeoutError.message });
        console.error('Upload timeout triggered:', timeoutError);
      }
    }, 300000);

    try {
      const sanitizedName = selectedFile.name.replace(/[^a-zA-Z0-9.]/g, '_');
      const storagePath = `${Date.now()}_${sanitizedName}`;
      
      console.log('Step 1: Uploading to Supabase...');
      if (!isSupabaseConfiguredClient || !supabase) {
        throw new Error('Supabase client is not configured or initialized. Please make sure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set.');
      }

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('sermons')
        .upload(storagePath, selectedFile, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        throw uploadError;
      }

      if (!isRequestActive) {
        return; // Already timed out
      }

      console.log('Step 2: Getting public URL...');
      const { data: publicUrlData } = supabase.storage
        .from('sermons')
        .getPublicUrl(storagePath);

      const publicUrl = publicUrlData?.publicUrl;
      if (!publicUrl) {
        throw new Error('Upload succeeded but failed to retrieve public URL from storage.');
      }
      console.log('Retrieved public URL:', publicUrl);

      console.log('Step 3: Saving to Firestore in background...');
      setUploadProgress(95);

      addDoc(collection(db, 'sermons'), {
        title: sermonTitle,
        author: preacher,
        pdfUrl: publicUrl,
        storagePath: storagePath,
        uploadDate: serverTimestamp(),
        fileSize: selectedFile?.size,
        fileType: selectedFile?.type
      }).catch((firestoreErr: any) => {
        console.error('Background Firestore save failed:', firestoreErr);
      });

      // Mark request complete, clear timeout and progress simulation
      isRequestActive = false;
      clearTimeout(timeoutId);
      clearInterval(progressInterval);

      console.log('Step 4: Complete!');
      setIsSupabaseConfigured(true);
      setSermonTitle('');
      setPreacher('Church Of Christ (General)');
      setSelectedFile(null);
      setUploadProgress(0);
      setIsUploading(false);
    } catch (err: any) {
      if (isRequestActive) {
        isRequestActive = false;
        clearTimeout(timeoutId);
        clearInterval(progressInterval);
        console.error('Upload flow exception occurred:', err);
        setError(err.message || 'An unexpected error occurred during upload.');
        setStorageErrorObj(err);
        setIsUploading(false);
      }
    }
  };

  const handleDeleteSermon = async (sermon: any) => {
    if (!isAdmin) {
      alert("Unauthorized: Only administrators can delete sermons.");
      return;
    }
    setLoading(true);
    try {
      if (sermon.storagePath && isSupabaseConfiguredClient && supabase) {
        try {
          const { error: deleteError } = await supabase.storage
            .from('sermons')
            .remove([sermon.storagePath]);
          if (deleteError) {
            console.warn('Could not delete storage file from Supabase:', deleteError);
          }
        } catch (storageErr) {
          console.warn('Could not delete storage file, probably did not exist:', storageErr);
        }
      }
      await deleteDoc(doc(db, 'sermons', sermon.id));
      setDeleteConfirm(null);
    } catch (err: any) {
      handleFirestoreError(err, OperationType.DELETE, `sermons/${sermon.id}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="space-y-8"
    >
      <header className="flex items-center justify-between">
        <div className="flex flex-col">
          <h1 className="text-3xl font-bold text-deep-blue">Sermons</h1>
          {!isSupabaseConfigured && isAdmin && (
            <div className="mt-2 p-4 bg-red-50 border border-red-200 rounded-2xl text-red-700 text-sm space-y-2">
              <div className="flex items-center gap-2 font-bold">
                <AlertCircle className="w-4 h-4" />
                Supabase Storage Configuration Required
              </div>
              <p className="text-xs leading-relaxed">
                To enable sermon uploads, make sure your Supabase project credentials (VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY) are set up in the AI Studio secrets. Also make sure the <code>sermons</code> bucket exists with public access!
              </p>
            </div>
          )}
          {isAdmin && testStatus && (
            <p className={cn(
              "text-[10px] font-bold uppercase tracking-widest mt-1",
              testStatus.includes('Connected') || testStatus.includes('Ready') ? "text-sage" : "text-red-400"
            )}>
              {testStatus}
            </p>
          )}
        </div>
        <div className="flex items-center gap-4">
          {isAdmin && (
            <button 
              onClick={handleTestStorage}
              className="text-[10px] font-bold text-gray-400 uppercase tracking-widest hover:text-gold transition-colors"
            >
              Test Storage
            </button>
          )}
          <div className="flex items-center gap-2 text-gold font-medium text-sm tracking-widest uppercase">
            <FileText className="w-4 h-4" />
            {isAdmin ? "Manage PDFs" : "Published PDFs"}
          </div>
        </div>
      </header>

      <div className={cn("grid gap-8", isAdmin ? "lg:grid-cols-3" : "grid-cols-1")}>
        {/* Upload Form - Only for Admin */}
        {isAdmin && (
          <section className="lg:col-span-1 bg-white rounded-3xl p-8 shadow-sm border border-beige-warm space-y-6 h-fit">
            <div className="space-y-2">
              <h2 className="text-xl font-bold text-deep-blue">Upload New Sermon</h2>
              <p className="text-xs text-gray-400 uppercase tracking-widest">PDF Format Only</p>
            </div>

            <form onSubmit={handleUpload} className="space-y-4">
              {error && (
                <div className="space-y-3">
                  <div className="p-4 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-start gap-2.5">
                    <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <div className="space-y-1">
                      <p className="font-bold">Upload Failed</p>
                      <p className="opacity-90">{error}</p>
                    </div>
                  </div>

                  {/* Dynamic Troubleshooter based on the Supabase Error Code / Messages */}
                  {storageErrorObj && (
                    <div className="p-4 bg-beige-light border border-beige-warm rounded-2xl text-xs text-deep-blue space-y-3">
                      <div className="font-bold flex items-center gap-1.5 text-gold text-[10px] tracking-widest uppercase">
                        <Sparkles className="w-3.5 h-3.5" />
                        Supabase Storage Troubleshooter
                      </div>
                      
                      {(storageErrorObj.statusCode === '404' || storageErrorObj.message?.toLowerCase().includes('bucket') || error.toLowerCase().includes('bucket') || error.toLowerCase().includes('not found')) && (
                        <div className="space-y-2">
                          <p className="leading-relaxed">
                            <strong>Cause:</strong> The <code>sermons</code> bucket was not found in your Supabase project.
                          </p>
                          <div className="space-y-1 text-[11px]">
                            <p className="font-bold text-gold">How to fix:</p>
                            <ol className="list-decimal list-inside pl-1 space-y-1 opacity-80">
                              <li>Navigate to your Supabase Console.</li>
                              <li>Go to <strong className="text-gold">Storage</strong> in the left sidebar.</li>
                              <li>Click <strong className="text-gold">New Bucket</strong>, name it exactly <code className="bg-white px-1 py-0.5 rounded border border-beige-warm">sermons</code>.</li>
                              <li>Toggle <strong className="text-gold">Public bucket</strong> to ON, then save.</li>
                            </ol>
                          </div>
                        </div>
                      )}

                      {(storageErrorObj.statusCode === '403' || storageErrorObj.message?.toLowerCase().includes('policy') || error.toLowerCase().includes('row violates') || error.toLowerCase().includes('security') || error.toLowerCase().includes('unauthorized')) && (
                        <div className="space-y-2">
                          <p className="leading-relaxed">
                            <strong>Cause:</strong> Row Level Security (RLS) is blocking the upload.
                          </p>
                          <div className="space-y-1 text-[11px]">
                            <p className="font-bold text-gold">How to fix:</p>
                            <ol className="list-decimal list-inside pl-1 space-y-1 opacity-80">
                              <li>In your Supabase Console, open the <strong className="text-gold">Storage</strong> section.</li>
                              <li>Select your <code className="bg-white px-1 py-0.5 rounded border border-beige-warm">sermons</code> bucket, and click <strong className="text-gold">Policies</strong>.</li>
                              <li>Add a policy allowing <strong className="text-gold">INSERT</strong> (and ideally <strong className="text-gold">SELECT</strong> / <strong className="text-gold">DELETE</strong>) access. For development, you can allow it for <code className="bg-white px-1 py-0.5 rounded border border-beige-warm">anon</code> / authenticated roles, or check "Allow public access".</li>
                            </ol>
                          </div>
                        </div>
                      )}

                      {storageErrorObj.code === 'database/fail' && (
                        <div className="space-y-1">
                          <p className="leading-relaxed">
                            <strong>Cause:</strong> File uploaded successfully but could not write metadata to Firestore. 
                          </p>
                          <p className="opacity-80">
                            Check that your <strong className="text-gold">firestore.rules</strong> allow writing to the <code>sermons</code> collection.
                          </p>
                        </div>
                      )}

                      {!['404', '403', 'database/fail'].includes(storageErrorObj.statusCode) && !error.toLowerCase().includes('bucket') && !error.toLowerCase().includes('policy') && (
                        <div className="space-y-1">
                          <p className="leading-relaxed">
                            <strong>General Troubleshooting:</strong>
                          </p>
                          <p className="opacity-80 leading-relaxed text-[11px]">
                            Please verify that your Supabase credentials in development environment secrets are active, and ensure that the <code>sermons</code> bucket exists with public access.
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
              
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-2">Sermon Title</label>
                <input
                  required
                  type="text"
                  value={sermonTitle}
                  onChange={(e) => setSermonTitle(e.target.value)}
                  className="w-full px-4 py-3 bg-beige-light border border-beige-warm rounded-xl focus:outline-none focus:ring-2 focus:ring-gold/20 text-sm"
                  placeholder="e.g., The Power of Grace"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-2">Preacher/Author</label>
                <select
                  required
                  value={preacher}
                  onChange={(e) => setPreacher(e.target.value)}
                  className="w-full px-4 py-3 bg-beige-light border border-beige-warm rounded-xl focus:outline-none focus:ring-2 focus:ring-gold/20 text-sm appearance-none"
                >
                  <option value="">Select Preacher...</option>
                  {members.map(m => (
                    <option key={m.id} value={m.name}>{m.name}</option>
                  ))}
                  <option value="Church Of Christ (General)">Church Of Christ (General)</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-2">Select PDF</label>
                <div className="relative group">
                  <input
                    key={selectedFile ? selectedFile.name : 'empty'}
                    required
                    type="file"
                    accept=".pdf"
                    onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                  />
                  <div className="w-full px-4 py-8 border-2 border-dashed border-beige-warm rounded-2xl flex flex-col items-center justify-center gap-2 group-hover:border-gold transition-colors">
                    <Upload className="text-gray-300 group-hover:text-gold transition-colors w-8 h-8" />
                    <span className="text-xs text-gray-400 font-medium">
                      {selectedFile ? selectedFile.name : "Click to select file"}
                    </span>
                  </div>
                </div>
              </div>

              {isUploading && (
                <div className="space-y-2">
                  <div className="flex justify-between text-[10px] font-bold text-gold uppercase tracking-widest">
                    <span>Uploading...</span>
                    <span>{Math.round(uploadProgress)}%</span>
                  </div>
                  <div className="w-full bg-beige-light rounded-full h-1.5 overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${uploadProgress}%` }}
                      className="bg-gold h-full"
                    />
                  </div>
                </div>
              )}

              <button
                disabled={isUploading || !selectedFile}
                type="submit"
                className="w-full py-4 bg-deep-blue text-white rounded-xl font-bold text-sm shadow-lg shadow-deep-blue/20 hover:scale-[1.02] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isUploading ? "Uploading..." : <><Upload className="w-4 h-4" /> Upload Sermon</>}
              </button>
            </form>
          </section>
        )}

        {/* Sermon List */}
        <section className={cn("bg-white rounded-3xl p-8 shadow-sm border border-beige-warm space-y-6", isAdmin ? "lg:col-span-2" : "col-span-1")}>
          <h2 className="text-xl font-bold text-deep-blue">Published Sermons</h2>
          <div className="space-y-4">
            {sermons.map((sermon) => (
              <div key={sermon.id} className="flex items-center justify-between p-4 bg-beige-light rounded-2xl border border-beige-warm/50 group">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-white rounded-xl shadow-sm">
                    <FileText className="text-gold w-5 h-5" />
                  </div>
                  <div>
                    <button
                      onClick={() => handleDownload(sermon.pdfUrl, sermon.title)}
                      className="font-bold text-deep-blue hover:text-gold hover:underline text-left transition-all block"
                    >
                      {sermon.title}
                    </button>
                    <p className="text-[10px] text-gray-400 uppercase tracking-widest">
                      {sermon.author} • {sermon.uploadDate?.toDate().toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <a 
                    href={sermon.pdfUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    title="View PDF"
                    className="p-2 text-gray-300 hover:text-gold transition-colors bg-white rounded-xl shadow-sm border border-beige-warm/50"
                  >
                    <FileText className="w-4 h-4" />
                  </a>
                  <a 
                    href={sermon.pdfUrl} 
                    download={`${sermon.title}.pdf`}
                    target="_blank" 
                    rel="noopener noreferrer"
                    title="Download PDF"
                    className="p-2 text-gray-300 hover:text-deep-blue transition-colors bg-white rounded-xl shadow-sm border border-beige-warm/50"
                  >
                    <Upload className="w-4 h-4 rotate-180" />
                  </a>
                  {isAdmin && (
                    <button 
                      onClick={() => setDeleteConfirm(sermon)}
                      title="Delete Sermon"
                      className="p-2 text-gray-300 hover:text-red-400 transition-colors bg-white rounded-xl shadow-sm border border-beige-warm/50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
            {sermons.length === 0 && (
              <p className="text-center py-12 text-gray-400 italic text-sm">No sermons published yet.</p>
            )}
          </div>
        </section>
      </div>

      {/* Sermon Delete Confirmation Modal */}
      <AnimatePresence>
        {deleteConfirm && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setDeleteConfirm(null)}
              className="absolute inset-0 bg-deep-blue/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative bg-white rounded-[32px] p-8 w-full max-w-md shadow-2xl border border-beige-warm"
            >
              <div className="space-y-6 text-center">
                <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto">
                  <Trash2 className="w-8 h-8 text-red-500" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-xl font-bold text-deep-blue">Delete Sermon?</h3>
                  <p className="text-sm text-gray-500 leading-relaxed">
                    Are you sure you want to delete <span className="font-bold text-deep-blue">{deleteConfirm.title}</span>? 
                    This action cannot be undone.
                  </p>
                </div>
                {error && (
                  <div className="p-3 bg-red-50 text-red-600 text-xs rounded-xl flex items-center gap-2 justify-center">
                    <AlertCircle className="w-4 h-4" />
                    {error}
                  </div>
                )}
                <div className="flex gap-3">
                  <button
                    disabled={loading}
                    onClick={() => setDeleteConfirm(null)}
                    className="flex-1 py-3 bg-gray-100 text-gray-500 rounded-xl font-bold text-sm hover:bg-gray-200 transition-all disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    disabled={loading}
                    onClick={() => handleDeleteSermon(deleteConfirm)}
                    className="flex-1 py-3 bg-red-500 text-white rounded-xl font-bold text-sm hover:bg-red-600 transition-all shadow-lg shadow-red-500/20 disabled:opacity-50"
                  >
                    {loading ? "Deleting..." : "Delete"}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
