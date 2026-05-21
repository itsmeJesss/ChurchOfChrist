import React, { useState, useEffect } from 'react';
import { Routes, Route, Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { User } from 'firebase/auth';
import { collection, query, onSnapshot, addDoc, serverTimestamp, orderBy, limit, setDoc, doc, updateDoc, deleteDoc, getDocs, where } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL, deleteObject, uploadBytes } from 'firebase/storage';
import { db, storage, auth } from '../firebase';
import firebaseConfig from '../../firebase-applet-config.json';
import { LayoutDashboard, Users, FileText, Plus, Sparkles, Calendar, Phone, StickyNote, X, Upload, CheckCircle, AlertCircle, Trash2, Edit2, ExternalLink, MapPin, Info } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { INITIAL_MEMBERS } from '../initialMembers';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function MemberPortal({ user }: { user: User }) {
  const location = useLocation();
  const [memberProfile, setMemberProfile] = useState<any>(null);

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

  const adminEmails = [
    'jessica.jane.richard@gmail.com',
    'richard.raju.s@gmail.com',
    'churchofchristshivajinagarblr@gmail.com'
  ];
  const isAdmin = adminEmails.includes(user.email || '');
  const isMember = !!memberProfile || isAdmin;

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
                  <h3 className="font-bold text-deep-blue">{sermon.title}</h3>
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
    setLoading(true);
    setError(null);
    try {
      // 1. Delete associated sermons
      const sermonsQuery = query(collection(db, 'sermons'), where('author', '==', member.name));
      const sermonsSnapshot = await getDocs(sermonsQuery);
      const deleteSermonPromises = sermonsSnapshot.docs.map(async (sermonDoc) => {
        const sermonData = sermonDoc.data();
        if (sermonData.storagePath) {
          try {
            const fileRef = ref(storage, sermonData.storagePath.includes('/') ? sermonData.storagePath : `sermons/${sermonData.storagePath}`);
            await deleteObject(fileRef);
          } catch (err) {
            console.error('Failed to delete sermon file from Firebase Storage:', err);
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
  const [newSermon, setNewSermon] = useState({ title: '', author: '', file: null as File | null });
  const [deleteConfirm, setDeleteConfirm] = useState<any | null>(null);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [testStatus, setTestStatus] = useState<string | null>(null);
  const [isFirebaseStorageConfigured, setIsFirebaseStorageConfigured] = useState(true);

  useEffect(() => {
    if (!firebaseConfig.storageBucket) {
      setIsFirebaseStorageConfigured(false);
    } else {
      setIsFirebaseStorageConfigured(true);
    }
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
    setTestStatus('Testing Firebase Storage connection...');
    try {
      if (!firebaseConfig.storageBucket) {
        throw new Error('Firebase Storage bucket not configured in firebase-applet-config.json');
      }
      setTestStatus('Firebase Storage Connected and Ready!');
      setTimeout(() => setTestStatus(null), 3000);
    } catch (err: any) {
      console.error('Firebase Storage Test Failed:', err);
      setTestStatus(`Failed: ${err.message}`);
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSermon.file) return;
    
    if (!auth.currentUser) {
      setError('You must be logged in to upload sermons.');
      return;
    }

    setIsUploading(true);
    setError('');
    setProgress(0);

    try {
      const sanitizedName = newSermon.file.name.replace(/[^a-zA-Z0-9.]/g, '_');
      const storagePath = `sermons/${Date.now()}_${sanitizedName}`;
      
      console.log('Starting upload to Firebase Storage:', storagePath);
      
      const storageRef = ref(storage, storagePath);
      const uploadTask = uploadBytesResumable(storageRef, newSermon.file);

      uploadTask.on(
        'state_changed',
        (snapshot) => {
          const percentage = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          setProgress(percentage);
        },
        (err) => {
          console.error('Firebase Storage upload error:', err);
          setError(err.message || 'Failed to upload sermon');
          setIsUploading(false);
        },
        async () => {
          try {
            const publicUrl = await getDownloadURL(uploadTask.snapshot.ref);
            await addDoc(collection(db, 'sermons'), {
              title: newSermon.title,
              author: newSermon.author,
              pdfUrl: publicUrl,
              storagePath: storagePath,
              uploadDate: serverTimestamp(),
              fileSize: newSermon.file?.size,
              fileType: newSermon.file?.type
            });
            
            setNewSermon({ title: '', author: '', file: null });
            setIsUploading(false);
            setProgress(100);
            setTimeout(() => setProgress(0), 1000);
          } catch (err: any) {
            console.error('Database save error:', err);
            setError(err.message || 'Failed to save sermon details to database');
            setIsUploading(false);
          }
        }
      );
    } catch (err: any) {
      console.error('Upload initiation error:', err);
      setError(err.message || 'Failed to upload sermon');
      setIsUploading(false);
    }
  };

  const handleDeleteSermon = async (sermon: any) => {
    setLoading(true);
    try {
      if (sermon.storagePath) {
        try {
          const fileRef = ref(storage, sermon.storagePath.includes('/') ? sermon.storagePath : `sermons/${sermon.storagePath}`);
          await deleteObject(fileRef);
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
          {!isFirebaseStorageConfigured && isAdmin && (
            <div className="mt-2 p-4 bg-red-50 border border-red-200 rounded-2xl text-red-700 text-sm space-y-2">
              <div className="flex items-center gap-2 font-bold">
                <AlertCircle className="w-4 h-4" />
                Firebase Storage Configuration Required
              </div>
              <p className="text-xs leading-relaxed">
                To enable sermon uploads, make sure your Firebase Storage bucket is properly set up in your Firebase Console.
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
                <div className="p-3 bg-red-50 text-red-600 text-xs rounded-xl flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" />
                  {error}
                </div>
              )}
              
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-2">Sermon Title</label>
                <input
                  required
                  type="text"
                  value={newSermon.title}
                  onChange={(e) => setNewSermon({ ...newSermon, title: e.target.value })}
                  className="w-full px-4 py-3 bg-beige-light border border-beige-warm rounded-xl focus:outline-none focus:ring-2 focus:ring-gold/20 text-sm"
                  placeholder="e.g., The Power of Grace"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-2">Preacher/Author</label>
                <select
                  required
                  value={newSermon.author}
                  onChange={(e) => setNewSermon({ ...newSermon, author: e.target.value })}
                  className="w-full px-4 py-3 bg-beige-light border border-beige-warm rounded-xl focus:outline-none focus:ring-2 focus:ring-gold/20 text-sm appearance-none"
                >
                  <option value="">Select Preacher...</option>
                  {members.map(m => (
                    <option key={m.id} value={m.name}>{m.name}</option>
                  ))}
                  <option value="Church Of Christ">Church Of Christ (General)</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-2">Select PDF</label>
                <div className="relative group">
                  <input
                    required
                    type="file"
                    accept=".pdf"
                    onChange={(e) => setNewSermon({ ...newSermon, file: e.target.files?.[0] || null })}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                  />
                  <div className="w-full px-4 py-8 border-2 border-dashed border-beige-warm rounded-2xl flex flex-col items-center justify-center gap-2 group-hover:border-gold transition-colors">
                    <Upload className="text-gray-300 group-hover:text-gold transition-colors w-8 h-8" />
                    <span className="text-xs text-gray-400 font-medium">
                      {newSermon.file ? newSermon.file.name : "Click to select file"}
                    </span>
                  </div>
                </div>
              </div>

              {isUploading && (
                <div className="space-y-2">
                  <div className="flex justify-between text-[10px] font-bold text-gold uppercase tracking-widest">
                    <span>Uploading...</span>
                    <span>{Math.round(progress)}%</span>
                  </div>
                  <div className="w-full bg-beige-light rounded-full h-1.5 overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${progress}%` }}
                      className="bg-gold h-full"
                    />
                  </div>
                </div>
              )}

              <button
                disabled={isUploading || !newSermon.file}
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
                    <p className="font-bold text-deep-blue">{sermon.title}</p>
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
