import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Sparkles, FileText, MapPin, LogIn, ChevronRight, BookOpen, Quote } from 'lucide-react';
import { Link } from 'react-router-dom';
import { collection, query, orderBy, limit, onSnapshot, doc } from 'firebase/firestore';
import { db } from '../firebase';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';
import { mergeAndSortSermons } from '../utils/sermons';

interface Devotion {
  scripture: string;
  scriptureRef: string;
  content: string;
  reflectAndPray: {
    questions: string[];
    prayer: string;
  };
  insights: string;
}

export default function PublicHome() {
  const [devotion, setDevotion] = useState<Devotion | null>(null);
  const [sermons, setSermons] = useState<any[]>(() => mergeAndSortSermons([]).slice(0, 3));
  const [verse, setVerse] = useState<any>(null);

  useEffect(() => {
    // Daily Devotions Library
    const devotions: Devotion[] = [
      {
        scripture: "We also glory in our sufferings, because we know that suffering produces perseverance; perseverance, character; and character, hope.",
        scriptureRef: "Romans 5:1-5",
        content: `Jess was getting on in years when he first heard the children’s folktale about the boy and the butterfly. Right away, he understood the story’s lesson on gaining strength from struggle. In the tale, a boy is given a butterfly cocoon but told not to open it. But as the cocoon slowly twists and shudders in his hand, the boy can’t resist using scissors to split it open so the butterfly inside can escape.

Freed from the struggle, however, the butterfly falls to the ground and dies without ever flying. “What happened?” the boy cries. Jess, after a long life, understood instantly. “The boy prevented the butterfly from using the muscles needed to grow strong and fly.”

The children’s lesson may be a fable, but it affirms the bracing biblical truth taught by Paul to persecuted believers in Jesus in Rome. Paul wasn’t saying to celebrate pain or deny its heartbreak. He confirmed instead that God will use life’s troubles to build our character, growing our hope in Him.

It’s in His strength that God develops our trust in His overcoming power. The butterfly was cheated from growing stronger to fly. But in Christ, we can rejoice as struggles lift us with character to God our deliverer.`,
        reflectAndPray: {
          questions: [
            "What’s your attitude regarding struggle?",
            "How has struggle grown your trust in God?",
            "How can we find joy amidst struggling?"
          ],
          prayer: "As I face life's struggles, dear Jesus, I thank You for building my character and trust in You."
        },
        insights: "Paul’s argument throughout the book of Romans is complex, and there’s a reason that it forms the foundation of much of our theology of salvation. Chapter 5 comes as the conclusion to his opening argument—that no one is justified (made right) by God on their own. The gentiles failed, and the Jews couldn’t perfectly keep the law. Only through faith (modeled by Abraham as Paul points out in the previous chapter) can we enter into a right relationship with God. But that relationship won’t always be framed in roses. Faith results in more than the hope we have; it’s also experienced in the refinement we undergo as we endure suffering. We become more like Christ as we grow in both character and faith in the midst of our struggles."
      },
      {
        scripture: "Consider the lilies of the field, how they grow: they neither toil nor spin.",
        scriptureRef: "Matthew 6:28",
        content: "In our modern world of constant notifications and 'hustle culture', we often feel like we're on a treadmill that never stops. We worry about our careers, our social standing, and our future. But look at the natural world around you—a simple flower doesn't stress about its growth or its beauty. It simply exists in the grace it was given. When we stop 'spinning' our wheels in anxiety, we find that the same grace that sustains the lilies is more than enough for us.",
        reflectAndPray: {
          questions: [
            "What is one thing you are 'toiling' over today that you can surrender?",
            "How often do you stop to notice the simple, effortless beauty in your life?",
            "In what ways can you practice 'being' rather than just 'doing' this week?"
          ],
          prayer: "Lord, help me to rest in Your grace today, trusting that You provide for all my needs just as You do for the lilies of the field."
        },
        insights: "Jesus uses the natural world to illustrate the futility of worry. In the context of the Sermon on the Mount, this teaching follows the warning about serving two masters. By pointing to the lilies, Jesus emphasizes that our value to God far exceeds that of the flowers, yet He cares for them perfectly. This is a call to prioritize the Kingdom of God, trusting that our physical needs are seen and met by a loving Father."
      }
    ];

    // Select devotion based on day of the year (changes every day)
    const now = new Date();
    const start = new Date(now.getFullYear(), 0, 0);
    const diff = now.getTime() - start.getTime();
    const oneDay = 1000 * 60 * 60 * 24;
    const dayOfYear = Math.floor(diff / oneDay);
    
    const devotionIndex = dayOfYear % devotions.length;
    setDevotion(devotions[devotionIndex]);

    // Fetch Sermons
    const sermonsQuery = query(collection(db, 'sermons'), orderBy('uploadedAt', 'desc'), limit(3));
    const unsubscribeSermons = onSnapshot(sermonsQuery, (snapshot) => {
      const sermonList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setSermons(mergeAndSortSermons(sermonList).slice(0, 3));
    }, (err) => {
      handleFirestoreError(err, OperationType.GET, 'sermons');
      setSermons(mergeAndSortSermons([]).slice(0, 3));
    });

    // Fetch Key Verse of the Month
    const unsubscribeVerse = onSnapshot(doc(db, 'settings', 'keyVerse'), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setVerse({
          id: 'keyVerse',
          text: data.verse || data.text || '',
          reference: data.reference || ''
        });
      }
    }, (err) => {
      handleFirestoreError(err, OperationType.GET, 'settings/keyVerse');
    });

    return () => {
      unsubscribeSermons();
      unsubscribeVerse();
    };
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="max-w-4xl mx-auto px-4 py-12 space-y-16"
    >
      {/* Hero Section */}
      <section className="text-center space-y-6">
        <motion.div
          initial={{ scale: 0.9 }}
          animate={{ scale: 1 }}
          className="inline-block p-3 bg-blush rounded-full mb-4"
        >
          <Sparkles className="text-gold w-8 h-8" />
        </motion.div>
        <h1 className="text-5xl md:text-6xl font-bold text-deep-blue leading-tight">
          Welcome to <br />
          <span className="text-gold italic">Church Of Christ</span>
        </h1>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto font-light leading-relaxed">
          A sanctuary of peace, a community of love, and a journey of faith. Join us as we grow together in grace.
        </p>
      </section>

      {/* Key Verse of the Month */}
      <section className="bg-white rounded-3xl p-8 md:p-10 shadow-sm border border-beige-warm relative overflow-hidden group transition-colors duration-300">
        <div className="absolute top-0 right-0 p-8 opacity-5 text-deep-blue pointer-events-none">
          <Quote className="w-24 h-24" />
        </div>
        <div className="space-y-4 text-center max-w-2xl mx-auto relative z-10">
          <div className="flex items-center justify-center gap-2 text-gold font-medium uppercase tracking-[0.2em] text-[10px]">
            <BookOpen className="w-4 h-4" />
            Key Verse of the Month
          </div>
          <p className="text-2xl md:text-3xl text-deep-blue font-serif italic leading-relaxed">
            "{verse?.text || 'The Lord is my shepherd; I shall not want.'}"
          </p>
          <p className="text-gold font-bold tracking-widest uppercase text-xs">
            — {verse?.reference || 'Psalm 23:1'}
          </p>
        </div>
      </section>

      {/* Daily Devotion */}
      <section className="bg-white rounded-3xl p-8 md:p-12 shadow-sm border border-beige-warm relative overflow-hidden group">
        <div className="absolute top-0 left-0 w-2 h-full bg-sage" />
        <div className="space-y-12">
          <div className="flex items-center gap-2 text-sage font-medium uppercase tracking-widest text-xs">
            <Sparkles className="w-3 h-3" />
            Daily Devotion
          </div>
          
          {devotion ? (
            <div className="space-y-12">
              {/* Today's Scripture */}
              <div className="space-y-4">
                <h2 className="text-sm font-bold text-gold uppercase tracking-widest">Today's Scripture</h2>
                <div className="space-y-2">
                  <p className="text-2xl md:text-3xl text-deep-blue font-serif italic leading-relaxed">
                    "{devotion.scripture}"
                  </p>
                  <p className="text-gray-400 font-bold tracking-widest uppercase text-xs">
                    — {devotion.scriptureRef}
                  </p>
                </div>
              </div>

              {/* Today's Devotion */}
              <div className="space-y-4">
                <h2 className="text-sm font-bold text-gold uppercase tracking-widest">Today's Devotion</h2>
                <div className="prose prose-stone max-w-none">
                  {devotion.content.split('\n\n').map((paragraph, idx) => (
                    <p key={idx} className="text-gray-600 leading-relaxed font-light text-lg mb-4">
                      {paragraph}
                    </p>
                  ))}
                </div>
              </div>

              {/* Reflect & Pray */}
              <div className="bg-beige-light rounded-2xl p-8 space-y-6 border border-beige-warm/50">
                <div className="space-y-4">
                  <h3 className="text-sm font-bold text-deep-blue uppercase tracking-widest flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-gold" />
                    Reflect & Pray
                  </h3>
                  <ul className="space-y-4">
                    {devotion.reflectAndPray.questions.map((q, i) => (
                      <li key={i} className="flex gap-3 text-base text-gray-600 italic">
                        <span className="text-gold font-bold">{i + 1}.</span>
                        {q}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="pt-4 border-t border-beige-warm/50">
                  <p className="text-deep-blue font-serif italic text-lg text-center">
                    "{devotion.reflectAndPray.prayer}"
                  </p>
                </div>
              </div>

              {/* Today's Insights */}
              <div className="space-y-4 pt-8 border-t border-beige-warm/30">
                <h2 className="text-sm font-bold text-gold uppercase tracking-widest">Today's Insights</h2>
                <p className="text-gray-500 leading-relaxed font-light text-sm italic">
                  {devotion.insights}
                </p>
              </div>
            </div>
          ) : (
            <div className="animate-pulse space-y-4">
              <div className="h-8 bg-gray-100 rounded w-3/4" />
              <div className="h-4 bg-gray-100 rounded w-1/2" />
              <div className="h-24 bg-gray-100 rounded w-full" />
            </div>
          )}
        </div>
      </section>

      {/* Sermon PDFs */}
      <section className="space-y-8">
        <div className="flex items-center justify-between">
          <h2 className="text-3xl font-bold text-deep-blue">Recent Sermons</h2>
          <Link 
            to="/sermons" 
            className="text-gold font-bold text-sm uppercase tracking-widest flex items-center gap-2 hover:gap-3 transition-all"
          >
            View All
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
        <div className="grid gap-4">
          {sermons.length > 0 ? (
            sermons.map((sermon) => (
              <a
                key={sermon.id}
                href={sermon.pdfUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between p-6 bg-white rounded-2xl border border-beige-warm hover:border-gold hover:shadow-md transition-all group"
              >
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-blush rounded-xl group-hover:bg-gold/10 transition-colors">
                    <FileText className="text-gold w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-800">{sermon.title}</h3>
                    <p className="text-xs text-gray-400 uppercase tracking-wider">{sermon.author || 'Church Of Christ'}</p>
                  </div>
                </div>
                <ChevronRight className="text-gray-300 group-hover:text-gold transition-colors" />
              </a>
            ))
          ) : (
            <div className="text-center py-12 text-gray-400 italic">
              New sermons coming soon...
            </div>
          )}
        </div>
      </section>

      {/* Navigation Buttons */}
      <section className="grid md:grid-cols-2 gap-6 pt-8">
        <Link
          to="/visit"
          className="flex items-center justify-center gap-3 p-6 bg-deep-blue text-white rounded-2xl hover:bg-opacity-90 transition-all shadow-lg shadow-deep-blue/20 group"
        >
          <MapPin className="w-5 h-5 group-hover:animate-bounce" />
          <span className="font-medium">Visit Us</span>
        </Link>
        <Link
          to="/login"
          className="flex items-center justify-center gap-3 p-6 bg-white text-deep-blue border-2 border-deep-blue rounded-2xl hover:bg-beige-light transition-all group"
        >
          <LogIn className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          <span className="font-medium">Portal Login</span>
        </Link>
      </section>
    </motion.div>
  );
}
