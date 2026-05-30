import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { User } from 'firebase/auth';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  collection, 
  query, 
  onSnapshot, 
  addDoc, 
  serverTimestamp, 
  orderBy, 
  setDoc, 
  doc, 
  deleteDoc, 
  updateDoc, 
  increment, 
  writeBatch,
  getDoc
} from 'firebase/firestore';
import Markdown from 'react-markdown';
import { 
  StickyNote, 
  Heart, 
  ThumbsUp, 
  MessageSquare, 
  Plus, 
  Trash2, 
  ChevronLeft, 
  Clock, 
  Send, 
  X, 
  User as UserIcon,
  CheckCircle,
  BookOpen
} from 'lucide-react';
import { db } from '../firebase';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';

interface Article {
  id: string;
  title: string;
  content: string;
  authorName: string;
  authorPhoto: string;
  authorEmail: string;
  createdAt: any;
  reactions: {
    heart: number;
    thumbsUp: number;
  };
  commentCount: number;
}

interface Comment {
  id: string;
  text: string;
  authorName: string;
  authorPhoto: string;
  authorEmail: string;
  createdAt: any;
}

export default function BlogView({ user, isAdmin, isMember = false }: { user: User | null; isAdmin: boolean; isMember?: boolean }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [articles, setArticles] = useState<Article[]>([]);
  const [selectedArticleId, setSelectedArticleId] = useState<string | null>(null);
  const [optimisticArticle, setOptimisticArticle] = useState<Article | null>(null);
  const activeArticle = articles.find(a => a.id === selectedArticleId) || optimisticArticle;
  const [comments, setComments] = useState<Comment[]>([]);
  const [userReaction, setUserReaction] = useState<string | null>(null);
  
  const [isAdding, setIsAdding] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [newCommentInput, setNewCommentInput] = useState('');
  const [isSubmittingArticle, setIsSubmittingArticle] = useState(false);
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  // Optimistic UI — updated instantly on click, Firestore syncs behind the scenes
  const [optimisticReactions, setOptimisticReactions] = useState<{ heart: number; thumbsUp: number } | null>(null);
  const [optimisticUserReaction, setOptimisticUserReaction] = useState<string | null | undefined>(undefined);
  const [optimisticCommentCount, setOptimisticCommentCount] = useState<number | null>(null);
  const [optimisticComments, setOptimisticComments] = useState<Comment[] | null>(null);

  // Derived display values — optimistic takes priority over Firestore
  const displayReactions = optimisticReactions ?? activeArticle?.reactions ?? { heart: 0, thumbsUp: 0 };
  const displayUserReaction = optimisticUserReaction !== undefined ? optimisticUserReaction : userReaction;
  const displayCommentCount = optimisticCommentCount ?? activeArticle?.commentCount ?? 0;
  const displayComments = optimisticComments ?? comments;

  // 1. Subscribe to articles
  useEffect(() => {
    const q = query(collection(db, 'articles'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Article[];
      setArticles(list);
      // Once Firestore has the real article, drop the optimistic placeholder
      if (optimisticArticle && list.some(a => a.id === optimisticArticle.id)) {
        setOptimisticArticle(null);
      }
    }, (err) => {
      handleFirestoreError(err, OperationType.GET, 'articles');
    });

    return () => unsubscribe();
  }, [optimisticArticle]);

  // 2. Track selected article details
  useEffect(() => {
    // Reset optimistic state whenever the viewed article changes
    setOptimisticReactions(null);
    setOptimisticUserReaction(undefined);
    setOptimisticCommentCount(null);
    setOptimisticComments(null);
    if (!selectedArticleId) setOptimisticArticle(null);

    if (!selectedArticleId) {
      setComments([]);
      setUserReaction(null);
      return;
    }

    // Subscribe to comments subcollection
    const commentsQuery = query(
      collection(db, 'articles', selectedArticleId, 'comments'), 
      orderBy('createdAt', 'asc')
    );
    const unsubscribeComments = onSnapshot(commentsQuery, (snapshot) => {
      const list = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Comment[];
      setComments(list);
    }, (err) => {
      handleFirestoreError(err, OperationType.GET, `articles/${selectedArticleId}/comments`);
    });

    // Subscribe to current user's reaction document
    let unsubscribeReaction = () => {};
    if (user) {
      const reactionRef = doc(db, 'articles', selectedArticleId, 'reactions', user.uid);
      unsubscribeReaction = onSnapshot(reactionRef, (docSnap) => {
        if (docSnap.exists()) {
          setUserReaction(docSnap.data().type || null);
        } else {
          setUserReaction(null);
        }
      }, (err) => {
        console.warn("Could not read reaction for current user:", err.message);
      });
    } else {
      setUserReaction(null);
    }

    return () => {
      unsubscribeComments();
      unsubscribeReaction();
    };
  }, [selectedArticleId, user?.uid]);

  // Handle article publishing
  const handlePublishArticle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newContent.trim()) return;
    if (!user) return;

    setIsSubmittingArticle(true);
    try {
      // Pre-generate custom document reference and ID instantly
      const articlesColRef = collection(db, 'articles');
      const articleDocRef = doc(articlesColRef);
      const newArticleId = articleDocRef.id;

      const titleVal = newTitle.trim();
      const contentVal = newContent.trim();
      const authorVal = user.displayName || user.email?.split('@')[0] || 'Member';
      const photoVal = user.photoURL || '';
      const emailVal = user.email || '';

      const newArticleData = {
        title: titleVal,
        content: contentVal,
        authorName: authorVal,
        authorPhoto: photoVal,
        authorEmail: emailVal,
        createdAt: serverTimestamp(),
        reactions: { heart: 0, thumbsUp: 0 },
        commentCount: 0
      };

      // Build an optimistic article so the detail view renders instantly
      const optimisticItem: Article = {
        id: newArticleId,
        title: titleVal,
        content: contentVal,
        authorName: authorVal,
        authorPhoto: photoVal,
        authorEmail: emailVal,
        createdAt: new Date(),
        reactions: { heart: 0, thumbsUp: 0 },
        commentCount: 0
      };

      // Instantly inject into local articles list
      setArticles(prevArticles => [optimisticItem, ...prevArticles]);
      setOptimisticArticle(optimisticItem);

      // Reset form controls and close edit pane immediately
      setNewTitle('');
      setNewContent('');
      setIsSubmittingArticle(false);
      setIsAdding(false);

      // Seamlessly open the newly published article right away
      setSelectedArticleId(newArticleId);

      setSuccessMessage('Article published! ✨');
      setTimeout(() => setSuccessMessage(''), 3000);

      const targetPath = location.pathname.includes('/portal') ? '/portal/blog' : '/blog';
      if (location.pathname !== targetPath) {
        navigate(targetPath);
      }

      // Sync with Firestore in the background
      setDoc(articleDocRef, newArticleData).catch(err => {
        console.error('Publish background sync failed:', err);
        // Roll back local states if creation failed
        setArticles(prevArticles => prevArticles.filter(a => a.id !== newArticleId));
        setOptimisticArticle(null);
        if (selectedArticleId === newArticleId) {
          setSelectedArticleId(null);
        }
        handleFirestoreError(err, OperationType.CREATE, 'articles');
      });
    } catch (err) {
      console.error('Publish failed:', err);
      setIsSubmittingArticle(false);
      handleFirestoreError(err, OperationType.CREATE, 'articles');
    }
  };

  // Handle article deletion
  const handleDeleteArticle = async (articleId: string, authorEmail: string, e: React.MouseEvent) => {
    e.stopPropagation();
    
    const canDelete = user && (isAdmin || (user.email && user.email.toLowerCase() === authorEmail.toLowerCase()));
    if (!canDelete) {
      alert("Unauthorized: Only administrators or the article author can delete this article.");
      return;
    }

    if (!window.confirm("Are you sure you want to delete this article and all of its comments?")) {
      return;
    }

    try {
      await deleteDoc(doc(db, 'articles', articleId));
      if (selectedArticleId === articleId) {
        setSelectedArticleId(null);
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `articles/${articleId}`);
    }
  };

  // Toggle or submit user reactions — with instant optimistic update
  const handleToggleReaction = async (reactionType: 'heart' | 'thumbsUp') => {
    if (!user) {
      alert("Please login to react to articles! ✨");
      return;
    }
    if (!activeArticle) return;
    const articleId = activeArticle.id;

    // Base counts from whichever source is current (optimistic or Firestore)
    const base = optimisticReactions ?? activeArticle.reactions ?? { heart: 0, thumbsUp: 0 };
    const currentHeart = typeof base.heart === 'number' ? base.heart : 0;
    const currentThumbsUp = typeof base.thumbsUp === 'number' ? base.thumbsUp : 0;
    const currentUserReaction = optimisticUserReaction !== undefined ? optimisticUserReaction : userReaction;

    // --- Compute next optimistic state instantly ---
    let newHeart = currentHeart;
    let newThumbsUp = currentThumbsUp;
    let newUserReaction: string | null;

    if (currentUserReaction === reactionType) {
      // Toggle off: decrement this type, clear user reaction
      if (reactionType === 'heart') newHeart = Math.max(0, newHeart - 1);
      else newThumbsUp = Math.max(0, newThumbsUp - 1);
      newUserReaction = null;
    } else {
      // Switching from another reaction: undo the old one first
      if (currentUserReaction === 'heart') newHeart = Math.max(0, newHeart - 1);
      else if (currentUserReaction === 'thumbsUp') newThumbsUp = Math.max(0, newThumbsUp - 1);
      // Apply the new reaction
      if (reactionType === 'heart') newHeart = newHeart + 1;
      else newThumbsUp = newThumbsUp + 1;
      newUserReaction = reactionType;
    }

    // Apply optimistic update immediately — UI reflects this before any await
    setOptimisticReactions({ heart: newHeart, thumbsUp: newThumbsUp });
    setOptimisticUserReaction(newUserReaction);

    // Instantly sync the changes to our master list state in memory
    setArticles(prevArticles => prevArticles.map(a => 
      a.id === articleId 
        ? { ...a, reactions: { heart: newHeart, thumbsUp: newThumbsUp } }
        : a
    ));

    // --- Sync to Firestore in the background ---
    try {
      const reactionDocRef = doc(db, 'articles', articleId, 'reactions', user.uid);
      const articleDocRef = doc(db, 'articles', articleId);

      if (newUserReaction === null) {
        await deleteDoc(reactionDocRef);
      } else {
        await setDoc(reactionDocRef, { type: reactionType, reactedAt: serverTimestamp() });
      }

      await updateDoc(articleDocRef, {
        reactions: { heart: newHeart, thumbsUp: newThumbsUp }
      });

      // Once Firestore confirms, drop optimistic state so the real snapshot takes over
      setOptimisticReactions(null);
      setOptimisticUserReaction(undefined);
    } catch (err) {
      // Roll back on failure
      setOptimisticReactions(null);
      setOptimisticUserReaction(undefined);
      console.error('Failed to toggle reaction:', err);
      handleFirestoreError(err, OperationType.WRITE, `articles/${articleId}/reactions/${user.uid}`);
    }
  };

  // Submit comment — with instant optimistic update
  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      alert("Please login to comment on articles! ✨");
      return;
    }
    if (!activeArticle || !newCommentInput.trim()) return;

    setIsSubmittingComment(true);
    const commentText = newCommentInput.trim();
    const articleId = activeArticle.id;

    // Build an optimistic comment that shows immediately
    const optimisticComment: Comment = {
      id: `optimistic-${Date.now()}`,
      text: commentText,
      authorName: user.displayName || user.email?.split('@')[0] || 'Member',
      authorPhoto: user.photoURL || '',
      authorEmail: user.email || '',
      createdAt: null // shows "Just now"
    };

    // Apply optimistic update immediately
    const baseComments = optimisticComments ?? comments;
    const baseCount = optimisticCommentCount ?? activeArticle.commentCount ?? 0;
    setOptimisticComments([...baseComments, optimisticComment]);
    setOptimisticCommentCount(baseCount + 1);
    setNewCommentInput('');

    // Instantly sync the comment count change to our master list state in memory
    setArticles(prevArticles => prevArticles.map(a => 
      a.id === articleId 
        ? { ...a, commentCount: baseCount + 1 }
        : a
    ));

    try {
      // Write to Firestore in background
      await addDoc(collection(db, 'articles', articleId, 'comments'), {
        text: commentText,
        authorName: user.displayName || user.email?.split('@')[0] || 'Member',
        authorPhoto: user.photoURL || '',
        authorEmail: user.email || '',
        createdAt: serverTimestamp()
      });

      await updateDoc(doc(db, 'articles', articleId), {
        commentCount: increment(1)
      });

      // Firestore onSnapshot will update `comments` — drop optimistic state so it takes over
      setOptimisticComments(null);
      setOptimisticCommentCount(null);
    } catch (err) {
      // Roll back
      setOptimisticComments(null);
      setOptimisticCommentCount(null);
      setNewCommentInput(commentText); // restore what they typed
      setArticles(prevArticles => prevArticles.map(a => 
        a.id === articleId 
          ? { ...a, commentCount: Math.max(0, (a.commentCount || 0) - 1) }
          : a
      ));
      handleFirestoreError(err, OperationType.CREATE, `articles/${articleId}/comments`);
    } finally {
      setIsSubmittingComment(false);
    }
  };

  // Delete comment
  const handleDeleteComment = async (commentId: string, commentAuthorEmail: string) => {
    if (!activeArticle) return;

    const canDelete = user && (isAdmin || (user.email && user.email.toLowerCase() === commentAuthorEmail.toLowerCase()));
    if (!canDelete) {
      alert("Unauthorized: Only administrators or the comment's author can delete this comment.");
      return;
    }

    if (!window.confirm("Are you sure you want to delete this comment?")) {
      return;
    }

    const articleId = activeArticle.id;

    // Instantly update local memory before we await Firestore
    setArticles(prevArticles => prevArticles.map(a => 
      a.id === articleId 
        ? { ...a, commentCount: Math.max(0, (a.commentCount || 0) - 1) }
        : a
    ));

    try {
      await deleteDoc(doc(db, 'articles', articleId, 'comments', commentId));
      await updateDoc(doc(db, 'articles', articleId), {
        commentCount: increment(-1)
      });
    } catch (err) {
      // Rollback
      setArticles(prevArticles => prevArticles.map(a => 
        a.id === articleId 
          ? { ...a, commentCount: (a.commentCount || 0) + 1 }
          : a
      ));
      handleFirestoreError(err, OperationType.DELETE, `articles/${articleId}/comments/${commentId}`);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-8 min-h-[500px] relative"
    >
      {successMessage && (
        <motion.div
          initial={{ opacity: 0, y: -20, x: '50%' }}
          animate={{ opacity: 1, y: 0, x: '50%' }}
          exit={{ opacity: 0, y: -20, x: '50%' }}
          className="fixed top-5 right-1/2 z-[200] bg-deep-blue text-white py-4 px-6 rounded-2xl shadow-xl flex items-center gap-3 border border-gold/25"
        >
          <CheckCircle className="text-gold w-5 h-5 flex-shrink-0 animate-pulse" />
          <span className="font-bold text-sm">{successMessage}</span>
        </motion.div>
      )}
      <div className="flex items-center justify-between pb-4 border-b border-beige-warm">
        <div>
          <h1 className="text-3xl font-serif font-bold text-deep-blue">Church Blog & Articles</h1>
          <p className="text-gray-500 text-sm">Read and share inspirational writings, lessons, and thoughts.</p>
        </div>
        {!selectedArticleId && !isAdding && user && (isMember || isAdmin) && (
          <button
            onClick={() => setIsAdding(true)}
            className="flex items-center gap-2 bg-deep-blue text-white px-5 py-2.5 rounded-2xl font-medium text-sm hover:shadow-lg hover:shadow-deep-blue/20 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Write Article
          </button>
        )}
      </div>

      <AnimatePresence mode="wait">
        {/* CREATE ARTICLE FORM — only show if NOT already navigating to a new article */}
        {isAdding && !selectedArticleId && (
          <motion.div
            key="create-form"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="bg-white rounded-[40px] p-8 md:p-10 border border-beige-warm shadow-sm space-y-6"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-deep-blue">Write New Article</h2>
              <button 
                onClick={() => setIsAdding(false)} 
                className="p-2 hover:bg-beige-light rounded-full text-gray-400 hover:text-deep-blue transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handlePublishArticle} className="space-y-6">
              <div className="space-y-2">
                <label className="text-xs uppercase tracking-wider font-bold text-gray-400">Article Title</label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. Walking Faithfully in Daily Life"
                  disabled={isSubmittingArticle}
                  className="w-full bg-beige-light/50 border border-beige-warm rounded-2xl px-5 py-4 text-deep-blue placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gold/30 focus:border-gold transition-all"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs uppercase tracking-wider font-bold text-gray-400">Content (Markdown supported)</label>
                <textarea
                  required
                  rows={8}
                  value={newContent}
                  onChange={(e) => setNewContent(e.target.value)}
                  placeholder="Write your article/lesson content here. Supports formatting..."
                  disabled={isSubmittingArticle}
                  className="w-full bg-beige-light/50 border border-beige-warm rounded-2xl p-5 text-deep-blue placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gold/30 focus:border-gold transition-all font-sans leading-relaxed text-sm"
                />
              </div>

              <div className="flex gap-4 justify-end">
                <button
                  type="button"
                  onClick={() => setIsAdding(false)}
                  disabled={isSubmittingArticle}
                  className="px-6 py-3 rounded-2xl border border-beige-warm text-gray-600 font-semibold hover:bg-beige-light transition-all text-sm cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingArticle}
                  className="px-8 py-3 bg-gold text-white font-semibold rounded-2xl hover:bg-gold-dark hover:shadow-lg transition-all text-sm flex items-center gap-2 cursor-pointer"
                >
                  {isSubmittingArticle ? 'Publishing...' : 'Publish Article'}
                </button>
              </div>
            </form>
          </motion.div>
        )}

        {/* SINGLE ARTICLE DETAIL VIEW */}
        {selectedArticleId && activeArticle && (
          <motion.div
            key="details"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="grid md:grid-cols-3 gap-8 items-start"
          >
            {/* Left/Main Column: Article content */}
            <div className="md:col-span-2 space-y-6">
              <button
                onClick={() => setSelectedArticleId(null)}
                className="inline-flex items-center gap-2 text-gold font-bold text-xs uppercase tracking-wider hover:text-deep-blue transition-colors group cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                Back to Articles
              </button>

              <article className="bg-white rounded-[40px] p-8 md:p-10 border border-beige-warm shadow-sm space-y-6">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    {activeArticle.authorPhoto ? (
                      <img 
                        src={activeArticle.authorPhoto} 
                        alt={activeArticle.authorName} 
                        referrerPolicy="no-referrer"
                        className="w-10 h-10 rounded-full object-cover border border-beige-warm"
                      />
                    ) : (
                      <div className="w-10 h-10 bg-blush rounded-full flex items-center justify-center text-deep-blue font-bold">
                        {activeArticle.authorName[0]?.toUpperCase()}
                      </div>
                    )}
                    <div>
                      <h4 className="font-bold text-deep-blue text-sm">{activeArticle.authorName}</h4>
                      <p className="text-[11px] text-gray-400 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {activeArticle.createdAt ? new Date(activeArticle.createdAt.toDate ? activeArticle.createdAt.toDate() : activeArticle.createdAt).toLocaleDateString() : 'Just now'}
                      </p>
                    </div>
                  </div>

                  {user && (isAdmin || user.email?.toLowerCase() === activeArticle.authorEmail.toLowerCase()) && (
                    <button
                      onClick={(e) => handleDeleteArticle(activeArticle.id, activeArticle.authorEmail, e)}
                      className="p-2 sm:p-3 bg-red-50 text-red-500 rounded-xl hover:bg-red-500 hover:text-white transition-all cursor-pointer"
                      title="Delete Article"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>

                <div className="space-y-4">
                  <h1 className="text-3xl font-serif font-bold text-deep-blue leading-tight">
                    {activeArticle.title}
                  </h1>
                  <div className="prose max-w-none text-gray-600 text-sm leading-relaxed whitespace-pre-line">
                    <Markdown>{activeArticle.content}</Markdown>
                  </div>
                </div>

                {/* Reactions bar */}
                <div className="pt-6 border-t border-beige-warm/60 flex items-center justify-between">
                  <span className="text-xs text-gray-400 font-bold uppercase tracking-wider">
                    Interact with Article
                  </span>
                  <div className="flex gap-3">
                    <button
                      onClick={() => handleToggleReaction('heart')}
                      className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                        displayUserReaction === 'heart'
                          ? 'bg-rose-50 border-rose-200 text-rose-500'
                          : 'bg-white border-beige-warm text-gray-400 hover:text-rose-500 hover:bg-rose-50/30'
                      }`}
                    >
                      <Heart className={`w-3.5 h-3.5 ${displayUserReaction === 'heart' ? 'fill-rose-500' : ''}`} />
                      <motion.span
                        key={displayReactions.heart}
                        initial={{ scale: 1.4, opacity: 0.5 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ type: 'spring', stiffness: 400, damping: 18 }}
                      >
                        Heart ({displayReactions.heart})
                      </motion.span>
                    </button>
                    <button
                      onClick={() => handleToggleReaction('thumbsUp')}
                      className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                        displayUserReaction === 'thumbsUp'
                          ? 'bg-blue-50 border-blue-200 text-blue-500'
                          : 'bg-white border-beige-warm text-gray-400 hover:text-blue-500 hover:bg-blue-50/30'
                      }`}
                    >
                      <ThumbsUp className={`w-3.5 h-3.5 ${displayUserReaction === 'thumbsUp' ? 'fill-blue-500' : ''}`} />
                      <motion.span
                        key={displayReactions.thumbsUp}
                        initial={{ scale: 1.4, opacity: 0.5 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ type: 'spring', stiffness: 400, damping: 18 }}
                      >
                        Thumbs Up ({displayReactions.thumbsUp})
                      </motion.span>
                    </button>
                  </div>
                </div>
              </article>
            </div>

            {/* Right Column: Comments */}
            <div className="space-y-6">
              <div className="bg-white rounded-[32px] p-6 border border-beige-warm shadow-sm space-y-6">
                <div className="flex items-center gap-2 border-b border-beige-warm/60 pb-3">
                  <MessageSquare className="text-gold w-5 h-5" />
                  <h3 className="font-bold text-deep-blue text-base">
                    <motion.span
                      key={displayCommentCount}
                      initial={{ scale: 1.4, opacity: 0.5 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ type: 'spring', stiffness: 400, damping: 18 }}
                    >
                      Comments ({displayCommentCount})
                    </motion.span>
                  </h3>
                </div>

                {/* Comment list */}
                <div className="space-y-4 max-h-[350px] overflow-y-auto pr-1">
                  {displayComments.map((comment) => (
                    <motion.div 
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ type: "spring", stiffness: 300, damping: 25 }}
                      layout
                      key={comment.id} 
                      className="p-3 bg-beige-light/40 rounded-2xl border border-beige-warm/30 space-y-2 relative group"
                    >
                      <div className="flex items-center justify-between gap-1">
                        <div className="flex items-center gap-2">
                          {comment.authorPhoto ? (
                            <img 
                              src={comment.authorPhoto} 
                              alt={comment.authorName} 
                              referrerPolicy="no-referrer"
                              className="w-6 h-6 rounded-full object-cover border border-beige-warm"
                            />
                          ) : (
                            <div className="w-6 h-6 bg-blush rounded-full flex items-center justify-center text-[10px] text-deep-blue font-bold">
                              {comment.authorName[0]?.toUpperCase()}
                            </div>
                          )}
                          <div>
                            <span className="font-bold text-deep-blue text-xs block truncate max-w-[120px]">
                              {comment.authorName}
                            </span>
                            <span className="text-[9px] text-gray-400">
                              {comment.createdAt ? new Date(comment.createdAt.toDate ? comment.createdAt.toDate() : comment.createdAt).toLocaleDateString() : 'Just now'}
                            </span>
                          </div>
                        </div>

                        {user && (isAdmin || user.email?.toLowerCase() === comment.authorEmail.toLowerCase()) && (
                          <button
                            onClick={() => handleDeleteComment(comment.id, comment.authorEmail)}
                            className="text-red-400 hover:text-red-500 p-1 opacity-0 group-hover:opacity-100 transition-all cursor-pointer"
                            title="Delete Comment"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                      <p className="text-gray-600 text-xs leading-relaxed break-words pl-1">{comment.text}</p>
                    </motion.div>
                  ))}

                  {displayComments.length === 0 && (
                    <div className="text-center py-8">
                      <MessageSquare className="w-6 h-6 text-gray-200 mx-auto mb-1" />
                      <p className="text-gray-400 italic text-xs">No comments yet. Start the conversation!</p>
                    </div>
                  )}
                </div>

                {/* Add Comment Form */}
                {user ? (
                  <form onSubmit={handleAddComment} className="space-y-3 pt-3 border-t border-beige-warm/60">
                    <textarea
                      required
                      rows={2}
                      value={newCommentInput}
                      onChange={(e) => setNewCommentInput(e.target.value)}
                      placeholder="Write a warm, encouraging comment..."
                      disabled={isSubmittingComment}
                      className="w-full bg-beige-light/30 border border-beige-warm rounded-xl p-3 text-xs text-deep-blue placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-gold focus:border-gold transition-all"
                    />
                    <button
                      type="submit"
                      disabled={isSubmittingComment}
                      className="w-full py-2 bg-deep-blue text-white rounded-xl text-xs font-bold hover:bg-gold hover:shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Send className="w-3 h-3" />
                      {isSubmittingComment ? 'Sending...' : 'Post Comment'}
                    </button>
                  </form>
                ) : (
                  <div className="pt-3 border-t border-beige-warm/60 text-center space-y-2">
                    <p className="text-gray-400 text-[11px]">Join the conversation to leave a comment.</p>
                    <button
                      type="button"
                      onClick={() => navigate('/login?redirect=/blog')}
                      className="w-full py-2 bg-deep-blue hover:bg-gold text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
                    >
                      Login to Comment
                    </button>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}

        {/* ARTICLES MAIN LIST VIEWS */}
        {!selectedArticleId && !isAdding && (
          <motion.div
            key="list"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="grid sm:grid-cols-2 md:grid-cols-3 gap-6"
          >
            {articles.map((article) => {
              const excerpt = article.content.length > 110 
                ? article.content.substring(0, 110) + '...' 
                : article.content;
              const formattedDate = article.createdAt 
                ? new Date(article.createdAt.toDate ? article.createdAt.toDate() : article.createdAt).toLocaleDateString() 
                : 'Just now';

              return (
                <motion.div
                  layout
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.25 }}
                  key={article.id}
                  onClick={() => setSelectedArticleId(article.id)}
                  className="bg-white rounded-3xl p-6 border border-beige-warm hover:shadow-lg transition-all flex flex-col justify-between hover:-translate-y-1 duration-300 cursor-pointer group"
                >
                  <div className="space-y-4">
                    {/* Header: Author & Date */}
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        {article.authorPhoto ? (
                          <img 
                            src={article.authorPhoto} 
                            alt={article.authorName} 
                            referrerPolicy="no-referrer"
                            className="w-8 h-8 rounded-full object-cover border border-beige-warm"
                          />
                        ) : (
                          <div className="w-8 h-8 bg-blush rounded-full flex items-center justify-center text-xs text-deep-blue font-bold">
                            {article.authorName[0]?.toUpperCase()}
                          </div>
                        )}
                        <span className="font-bold text-xs text-deep-blue truncate max-w-[120px]">
                          {article.authorName}
                        </span>
                      </div>
                      <span className="text-[10px] text-gray-400">
                        {formattedDate}
                      </span>
                    </div>

                    {/* Content Excerpt */}
                    <div className="space-y-2">
                      <h3 className="font-serif font-bold text-lg text-deep-blue leading-tight group-hover:text-gold transition-colors line-clamp-2">
                        {article.title}
                      </h3>
                      <p className="text-gray-500 text-xs leading-relaxed line-clamp-3">
                        {excerpt}
                      </p>
                    </div>
                  </div>

                  {/* Footer Stats & Actions */}
                  <div className="pt-4 mt-4 border-t border-beige-light flex items-center justify-between">
                    <div className="flex gap-3 text-[11px] text-gray-400">
                      <span className="flex items-center gap-1.5" title="Hearts">
                        <Heart className="w-3.5 h-3.5 text-rose-400 fill-rose-100" />
                        {article.reactions?.heart || 0}
                      </span>
                      <span className="flex items-center gap-1.5" title="Thumbs Up">
                        <ThumbsUp className="w-3.5 h-3.5 text-blue-400 fill-blue-100" />
                        {article.reactions?.thumbsUp || 0}
                      </span>
                      <span className="flex items-center gap-1.5" title="Comments">
                        <MessageSquare className="w-3.5 h-3.5 text-gold fill-gold-subtle" />
                        {article.commentCount || 0}
                      </span>
                    </div>

                    <span className="text-[10px] font-bold uppercase tracking-wider text-gold group-hover:underline">
                      Read Full &rarr;
                    </span>
                  </div>
                </motion.div>
              );
            })}

            {articles.length === 0 && (
              <div className="col-span-full text-center py-20 bg-white rounded-[40px] border border-dashed border-beige-warm space-y-3">
                <BookOpen className="w-10 h-10 text-gray-300 mx-auto" />
                <p className="text-gray-400 italic">No blog articles published yet.</p>
                <button
                  onClick={() => setIsAdding(true)}
                  className="mt-2 text-xs font-bold text-gold hover:underline uppercase tracking-wider"
                >
                  Write the first one! &rarr;
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}