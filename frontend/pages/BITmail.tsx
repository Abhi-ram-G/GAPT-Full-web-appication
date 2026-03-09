import React, { useState, useEffect, useContext, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import DashboardLayout from '../components/DashboardLayout';
import { AuthContext } from '../AuthContext';
import { ApiService } from '../store';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Inbox,
  Star,
  Send,
  FileText,
  Trash2,
  AlertCircle,
  Search,
  Plus,
  MoreVertical,
  Archive,
  Mail,
  MailOpen,
  Clock,
  ChevronLeft,
  ChevronRight,
  MessageSquare,
  Users,
  Settings,
  X,
  Maximize2,
  Minimize2,
  Paperclip,
  Image as ImageIcon,
  Smile,
  SendHorizontal
} from 'lucide-react';

type Folder = 'inbox' | 'starred' | 'sent' | 'drafts' | 'trash' | 'spam' | 'archive' | 'snoozed';

const BITmail: React.FC = () => {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [emails, setEmails] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [activeFolder, setActiveFolder] = useState<Folder>('inbox');
  const [selectedEmail, setSelectedEmail] = useState<any>(null);
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  const EMOJI_LIST = ['😀', '😂', '🥰', '😎', '🤔', '🙌', '👍', '👎', '👏', '🔥', '🎉', '✨', '💯', '✅', '❌', '👀', '💡', '📅', '📝', '📌', '📎', '📚', '🎓', '🏢'];

  // Compose state
  const [composeData, setComposeData] = useState({
    to: '',
    subject: '',
    body: ''
  });

  useEffect(() => {
    const fetchData = async () => {
      const allEmails = await ApiService.getEmails() || [];
      setEmails(Array.isArray(allEmails) ? allEmails.filter(e => e.to === user?.email || e.from === user?.email) : []);
      const allUsers = await ApiService.getUsers();
      setUsers(allUsers);
    };
    fetchData();
  }, [user]);

  useEffect(() => {
    setSelectedIds([]);
  }, [activeFolder, searchQuery]);

  useEffect(() => {
    if (searchParams.get('compose') === 'true') {
      setIsComposeOpen(true);
      if (searchParams.get('to')) {
        setComposeData(prev => ({ ...prev, to: searchParams.get('to') || '' }));
      }
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const handleActionEmail = async (e: React.FormEvent, isDraft: boolean = false) => {
    e.preventDefault();
    if (!isDraft && (!composeData.to || !composeData.subject || !composeData.body)) {
      alert('Please fill out all fields before sending a finalized message.');
      return;
    }
    const emailPayload: any = {
      to: composeData.to || 'draft@gapt.edu',
      subject: composeData.subject || '(No Subject)',
      body: composeData.body || '',
      status: isDraft ? 'DRAFT' : 'SENT',
      trash: false
    };
    await ApiService.addEmail(emailPayload);
    // Refresh to attach properly initialized backend data
    const allEmails = await ApiService.getEmails() || [];
    setEmails(Array.isArray(allEmails) ? allEmails.filter(em => em.to === user?.email || em.from === user?.email) : []);
    setIsComposeOpen(false);
    setComposeData({ to: '', subject: '', body: '' });
  };

  const toggleStar = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const email = emails.find(e => e.id === id);
    if (email) {
      const updated = { ...email, starred: !email.starred };
      await ApiService.updateEmail(id, { starred: updated.starred });
      setEmails(prev => prev.map(e => e.id === id ? updated : e));
    }
  };

  const moveToTrash = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const email = emails.find(em => em.id === id);
    if (email?.trash) {
      // If already in trash, delete permanently
      await ApiService.deleteEmail(id);
      setEmails(prev => prev.filter(em => em.id !== id));
    } else {
      // Otherwise, move to trash
      await ApiService.updateEmail(id, { trash: true });
      setEmails(prev => prev.map(em => em.id === id ? { ...em, trash: true } : em));
    }
    if (selectedEmail?.id === id) setSelectedEmail(null);
  };

  const markAsRead = async (id: string, read: boolean) => {
    await ApiService.updateEmail(id, { read });
    setEmails(prev => prev.map(e => e.id === id ? { ...e, read } : e));
  };

  const handleBulkAction = async (action: 'trash' | 'read' | 'unread' | 'archive' | 'spam' | 'snooze') => {
    if (selectedIds.length === 0) return;

    for (const id of selectedIds) {
      const email = emails.find(em => em.id === id);
      if (!email) continue;

      let updatePayload: any = {};
      let performDelete = false;

      switch (action) {
        case 'trash':
          if (email.trash) performDelete = true;
          else updatePayload = { trash: true };
          break;
        case 'read':
          updatePayload = { read: true };
          break;
        case 'unread':
          updatePayload = { read: false };
          break;
        case 'archive':
          updatePayload = { archived: true, trash: false };
          break;
        case 'spam':
          updatePayload = { spam: true, trash: false };
          break;
        case 'snooze':
          updatePayload = { snoozed: true, trash: false };
          break;
      }

      if (performDelete) {
        await ApiService.deleteEmail(id);
        setEmails(prev => prev.filter(em => em.id !== id));
      } else if (Object.keys(updatePayload).length > 0) {
        await ApiService.updateEmail(id, updatePayload);
        setEmails(prev => prev.map(em => em.id === id ? { ...em, ...updatePayload } : em));
      }
    }
    setSelectedIds([]);
  };

  const handleReply = () => {
    if (selectedEmail) {
      setComposeData({
        to: selectedEmail.from,
        subject: `Re: ${selectedEmail.subject}`,
        body: `\n\n--- Original Message ---\nFrom: ${selectedEmail.fromName}\nSent: ${new Date(selectedEmail.timestamp).toLocaleString()}\n\n${selectedEmail.body}`
      });
      setIsComposeOpen(true);
    }
  };

  const handleForward = () => {
    if (selectedEmail) {
      setComposeData({
        to: '',
        subject: `Fwd: ${selectedEmail.subject}`,
        body: `\n\n--- Forwarded Message ---\nFrom: ${selectedEmail.fromName}\nSent: ${new Date(selectedEmail.timestamp).toLocaleString()}\n\n${selectedEmail.body}`
      });
      setIsComposeOpen(true);
    }
  };

  const filteredEmails = emails.filter(e => {
    const matchesSearch = e.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.body.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.fromName?.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;

    switch (activeFolder) {
      case 'inbox': return e.to === user?.email && !e.trash && !e.archived && !e.spam && !e.snoozed && e.status !== 'DRAFT';
      case 'starred': return e.starred && !e.trash;
      case 'sent': return e.from === user?.email && !e.trash && e.status !== 'DRAFT';
      case 'drafts': return e.from === user?.email && !e.trash && e.status === 'DRAFT';
      case 'archive': return e.archived && !e.trash;
      case 'spam': return e.spam && !e.trash;
      case 'snoozed': return e.snoozed && !e.trash;
      case 'trash': return e.trash;
      default: return true;
    }
  }).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  const unreadCount = emails.filter(e => e.to === user?.email && !e.read && !e.trash).length;

  return (
    <DashboardLayout title="BITmail">
      <div className="flex h-[calc(100vh-8rem)] bg-surface-elevated rounded-3xl overflow-hidden border border-border-subtle shadow-2xl">
        {/* Sidebar */}
        <div className="w-64 border-r border-border-subtle flex flex-col bg-surface-deep/30">
          <div className="p-4">
            <button
              onClick={() => setIsComposeOpen(true)}
              className="flex items-center gap-3 px-6 py-4 bg-white text-slate-900 rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl hover:bg-slate-100 transition-all active:scale-95"
            >
              <Plus className="w-5 h-5" strokeWidth={3} />
              Compose
            </button>
          </div>

          <nav className="flex-1 px-3 space-y-0.5 overflow-y-auto custom-scrollbar">
            <SidebarItem
              icon={<Inbox className="w-4 h-4" />}
              label="Inbox"
              active={activeFolder === 'inbox'}
              onClick={() => setActiveFolder('inbox')}
              badge={unreadCount > 0 ? unreadCount : undefined}
            />
            <SidebarItem
              icon={<Star className="w-4 h-4" />}
              label="Starred"
              active={activeFolder === 'starred'}
              onClick={() => setActiveFolder('starred')}
            />
            <SidebarItem
              icon={<Clock className="w-4 h-4" />}
              label="Snoozed"
              active={activeFolder === 'snoozed'}
              onClick={() => setActiveFolder('snoozed')}
            />
            <SidebarItem
              icon={<Send className="w-4 h-4" />}
              label="Sent"
              active={activeFolder === 'sent'}
              onClick={() => setActiveFolder('sent')}
            />
            <SidebarItem
              icon={<FileText className="w-4 h-4" />}
              label="Drafts"
              active={activeFolder === 'drafts'}
              onClick={() => setActiveFolder('drafts')}
            />
            <div className="py-2"></div>
            <SidebarItem
              icon={<Archive className="w-4 h-4" />}
              label="Archive"
              active={activeFolder === 'archive'}
              onClick={() => setActiveFolder('archive')}
            />
            <SidebarItem
              icon={<AlertCircle className="w-4 h-4" />}
              label="Spam"
              active={activeFolder === 'spam'}
              onClick={() => setActiveFolder('spam')}
            />
            <SidebarItem
              icon={<Trash2 className="w-4 h-4" />}
              label="Trash"
              active={activeFolder === 'trash'}
              onClick={() => setActiveFolder('trash')}
            />

            <div className="pt-8 pb-2 px-4 text-[10px] font-black text-text-muted uppercase tracking-[0.2em]">Labels</div>
            <SidebarItem icon={<div className="w-2 h-2 rounded-full bg-emerald-500" />} label="Institutional" onClick={() => { }} />
            <SidebarItem icon={<div className="w-2 h-2 rounded-full bg-amber-500" />} label="Urgent" onClick={() => { }} />
            <SidebarItem icon={<div className="w-2 h-2 rounded-full bg-indigo-500" />} label="Academic" onClick={() => { }} />

            <div className="pt-8 pb-2 px-4 text-[10px] font-black text-text-muted uppercase tracking-[0.2em]">Chat</div>
            <div className="px-3 space-y-2">
              {users.filter(u => u.id !== user?.id).slice(0, 5).map(u => (
                <div
                  key={u.id}
                  onClick={() => navigate(`/chat?to=${u.id}`)}
                  className="flex items-center justify-between p-2 rounded-xl hover:bg-surface-component cursor-pointer transition-all group"
                >
                  <div className="flex items-center gap-3 overflow-hidden">
                    <div className="relative shrink-0">
                      <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center text-xs font-black">
                        {u.name?.[0] || '?'}
                      </div>
                      <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 border-2 border-surface-elevated rounded-full"></div>
                    </div>
                    <span className="text-xs font-bold text-text-muted group-hover:text-text-primary transition-colors truncate">{u.name}</span>
                  </div>
                  <MessageSquare className="w-3 h-3 text-text-muted opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              ))}
            </div>
          </nav>

          <div className="p-4 border-t border-border-subtle flex items-center justify-between text-text-muted">
            <button className="p-2 hover:bg-surface-component rounded-lg transition-all"><Users className="w-4 h-4" /></button>
            <button className="p-2 hover:bg-surface-component rounded-lg transition-all"><MessageSquare className="w-4 h-4" /></button>
            <button className="p-2 hover:bg-surface-component rounded-lg transition-all"><Settings className="w-4 h-4" /></button>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col bg-surface-elevated">
          {/* Top Header */}
          <div className="h-16 border-b border-border-subtle flex items-center justify-between px-6 shrink-0">
            <div className="flex items-center gap-4 flex-1 max-w-2xl">
              <div className="relative w-full group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted group-focus-within:text-primary transition-colors" />
                <input
                  type="text"
                  placeholder="Search institutional mail..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-surface-deep border border-border-subtle rounded-2xl pl-12 pr-6 py-2.5 text-sm text-text-primary outline-none focus:border-primary/50 transition-all"
                />
              </div>
            </div>
            <div className="flex items-center gap-2 ml-4">
              <button className="p-2 text-text-muted hover:text-text-primary hover:bg-surface-component rounded-lg transition-all"><Clock className="w-5 h-5" /></button>
              <button className="p-2 text-text-muted hover:text-text-primary hover:bg-surface-component rounded-lg transition-all"><AlertCircle className="w-5 h-5" /></button>
              <div className="w-px h-6 bg-border-subtle mx-2"></div>
              <div className="flex items-center gap-1 text-[10px] font-black text-text-muted uppercase tracking-widest">
                <span>1-50 of {filteredEmails.length}</span>
                <button className="p-1 hover:bg-surface-component rounded transition-all ml-2"><ChevronLeft className="w-4 h-4" /></button>
                <button className="p-1 hover:bg-surface-component rounded transition-all"><ChevronRight className="w-4 h-4" /></button>
              </div>
            </div>
          </div>

          {/* Action Bar */}
          <div className="h-12 border-b border-border-subtle flex items-center px-6 gap-4 shrink-0 bg-surface-deep/20">
            <input
              type="checkbox"
              checked={selectedIds.length > 0 && selectedIds.length === filteredEmails.length}
              onChange={(e) => {
                if (e.target.checked) setSelectedIds(filteredEmails.map(email => email.id));
                else setSelectedIds([]);
              }}
              className="w-4 h-4 rounded border-border-subtle bg-surface-deep text-primary focus:ring-primary/40 cursor-pointer"
            />
            <div className={`flex items-center gap-1 transition-opacity ${selectedIds.length > 0 ? 'opacity-100' : 'opacity-50 pointer-events-none'}`}>
              <ActionButton icon={<Archive className="w-4 h-4" />} title="Archive" onClick={() => handleBulkAction('archive')} />
              <ActionButton icon={<AlertCircle className="w-4 h-4" />} title="Report Spam" onClick={() => handleBulkAction('spam')} />
              <ActionButton icon={<Trash2 className="w-4 h-4" />} title="Delete" onClick={() => handleBulkAction('trash')} />
              <div className="w-px h-4 bg-border-subtle mx-1"></div>
              <ActionButton icon={<MailOpen className="w-4 h-4" />} title="Mark as Read" onClick={() => handleBulkAction('read')} />
              <ActionButton icon={<Mail className="w-4 h-4" />} title="Mark as Unread" onClick={() => handleBulkAction('unread')} />
              <ActionButton icon={<Clock className="w-4 h-4" />} title="Snooze" onClick={() => handleBulkAction('snooze')} />
              <ActionButton icon={<Plus className="w-4 h-4" />} title="Add to Tasks" />
            </div>
            <div className="flex-1"></div>
            <ActionButton icon={<MoreVertical className="w-4 h-4" />} title="More" />
          </div>

          {/* Email List or Detail */}
          <div className="flex-1 overflow-y-auto custom-scrollbar relative">
            <AnimatePresence mode="wait">
              {selectedEmail ? (
                <motion.div
                  key="detail"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="p-10 max-w-5xl mx-auto w-full"
                >
                  <button
                    onClick={() => setSelectedEmail(null)}
                    className="flex items-center gap-2 text-text-muted hover:text-primary transition-colors mb-8 group"
                  >
                    <ChevronLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                    <span className="text-[10px] font-black uppercase tracking-widest">Back to {activeFolder}</span>
                  </button>

                  <div className="flex justify-between items-start mb-10">
                    <div>
                      <h2 className="text-3xl font-black text-text-primary uppercase tracking-tight mb-4">{selectedEmail.subject}</h2>
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center text-lg font-black shadow-inner">
                          {selectedEmail.fromName?.[0] || 'U'}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="text-base font-black text-text-primary uppercase">{selectedEmail.fromName}</p>
                            <span className="text-[10px] text-text-muted font-mono">&lt;{selectedEmail.from}&gt;</span>
                          </div>
                          <p className="text-[10px] text-text-muted font-bold uppercase tracking-widest mt-0.5">to {selectedEmail.to === user?.email ? 'me' : selectedEmail.to}</p>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <span className="text-[10px] text-text-muted font-black uppercase tracking-widest">{new Date(selectedEmail.timestamp).toLocaleString()}</span>
                      <div className="flex items-center gap-2">
                        <button onClick={(e) => toggleStar(selectedEmail.id, e)} className={`p-2 rounded-lg transition-all ${selectedEmail.starred ? 'text-amber-500 bg-amber-500/10' : 'text-text-muted hover:bg-surface-component'}`}>
                          <Star className="w-5 h-5" fill={selectedEmail.starred ? 'currentColor' : 'none'} />
                        </button>
                        <button className="p-2 text-text-muted hover:bg-surface-component rounded-lg transition-all"><MoreVertical className="w-5 h-5" /></button>
                      </div>
                    </div>
                  </div>

                  <div className="bg-surface-deep/40 p-10 rounded-[2.5rem] border border-border-subtle shadow-inner min-h-[400px]">
                    <p className="text-base text-text-primary leading-relaxed whitespace-pre-wrap font-medium">{selectedEmail.body}</p>
                  </div>

                  <div className="mt-10 flex gap-4">
                    <button
                      onClick={handleReply}
                      className="flex items-center gap-3 px-8 py-4 bg-surface-component text-text-primary border border-border-subtle rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-surface-deep transition-all active:scale-95"
                    >
                      <Mail className="w-4 h-4" />
                      Reply
                    </button>
                    <button
                      onClick={handleForward}
                      className="flex items-center gap-3 px-8 py-4 bg-surface-component text-text-primary border border-border-subtle rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-surface-deep transition-all active:scale-95"
                    >
                      <Send className="w-4 h-4" />
                      Forward
                    </button>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="list"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="divide-y divide-border-subtle"
                >
                  {filteredEmails.map(e => (
                    <div
                      key={e.id}
                      onClick={() => {
                        setSelectedEmail(e);
                        if (!e.read) markAsRead(e.id, true);
                      }}
                      className={`group flex items-center px-6 py-3 cursor-pointer transition-all hover:bg-surface-component hover:shadow-md relative ${!e.read ? 'bg-black/5 font-bold' : 'bg-transparent'}`}
                    >
                      <div className="flex items-center gap-4 shrink-0 mr-4" onClick={e => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(e.id)}
                          onChange={(ev) => {
                            ev.stopPropagation();
                            setSelectedIds(prev => prev.includes(e.id) ? prev.filter(id => id !== e.id) : [...prev, e.id]);
                          }}
                          className="w-4 h-4 rounded border-border-subtle bg-surface-deep text-primary focus:ring-primary/40 cursor-pointer"
                        />
                        <button onClick={(ev) => toggleStar(e.id, ev)} className={`transition-all ${e.starred ? 'text-amber-500' : 'text-text-muted hover:text-amber-500'}`}>
                          <Star className="w-4 h-4" fill={e.starred ? 'currentColor' : 'none'} />
                        </button>
                      </div>

                      <div className="w-48 shrink-0 truncate text-sm text-text-primary uppercase font-black tracking-tight">{activeFolder === 'sent' ? `To: ${e.to}` : e.fromName}</div>

                      <div className="flex-1 flex items-center gap-2 min-w-0">
                        <span className="text-sm text-text-primary truncate">{e.subject}</span>
                        <span className="text-sm text-text-muted truncate font-normal">- {e.body}</span>
                      </div>

                      <div className="w-24 shrink-0 text-right text-[10px] font-black text-text-muted uppercase tracking-widest group-hover:hidden">
                        {new Date(e.timestamp).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                      </div>

                      <div className="hidden group-hover:flex items-center gap-1 shrink-0 ml-4">
                        <ActionButton icon={<Archive className="w-4 h-4" />} title="Archive" onClick={(ev) => { ev.stopPropagation(); }} />
                        <ActionButton icon={<Trash2 className="w-4 h-4" />} title="Delete" onClick={(ev) => moveToTrash(e.id, ev)} />
                        <ActionButton icon={<Mail className="w-4 h-4" />} title="Mark as Unread" onClick={(ev) => { ev.stopPropagation(); markAsRead(e.id, false); }} />
                        <ActionButton icon={<Clock className="w-4 h-4" />} title="Snooze" onClick={(ev) => { ev.stopPropagation(); }} />
                      </div>
                    </div>
                  ))}
                  {filteredEmails.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-32 text-center">
                      <div className="w-20 h-20 rounded-full bg-surface-component flex items-center justify-center text-text-muted mb-6">
                        <Inbox className="w-10 h-10" />
                      </div>
                      <h3 className="text-lg font-black text-text-primary uppercase tracking-tighter">Your {activeFolder} is empty</h3>
                      <p className="text-sm text-text-muted mt-2 font-medium">Enjoy your clear institutional workspace.</p>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Gmail-style Floating Compose Window */}
      <AnimatePresence>
        {isComposeOpen && (
          <motion.div
            initial={{ opacity: 0, y: 100, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 100, scale: 0.95 }}
            className="fixed bottom-0 right-12 z-[100] w-[700px] h-[600px] bg-surface-elevated rounded-t-2xl shadow-2xl border border-border-subtle flex flex-col overflow-hidden"
          >
            <div className="h-12 bg-surface-deep px-4 flex items-center justify-between border-b border-border-subtle z-10 shrink-0">
              <span className="text-xs font-black text-text-primary uppercase tracking-widest">New Institutional Message</span>
              <div className="flex items-center gap-1">
                <button className="p-1.5 hover:bg-surface-component rounded transition-all text-text-muted"><Minimize2 className="w-4 h-4" /></button>
                <button className="p-1.5 hover:bg-surface-component rounded transition-all text-text-muted"><Maximize2 className="w-4 h-4" /></button>
                <button onClick={() => setIsComposeOpen(false)} className="p-1.5 hover:bg-red-500 hover:text-white rounded transition-all text-text-muted"><X className="w-4 h-4" /></button>
              </div>
            </div>

            <form onSubmit={(e) => handleActionEmail(e, false)} className="flex-1 flex flex-col">
              <div className="px-4 py-2 border-b border-border-subtle flex items-center">
                <span className="text-xs font-black text-text-muted uppercase tracking-widest mr-3">To:</span>
                <input
                  type="email"
                  list="institutional-users"
                  value={composeData.to}
                  onChange={(e) => setComposeData(prev => ({ ...prev, to: e.target.value }))}
                  required
                  placeholder="Enter Mail ID or select from directory..."
                  className="flex-1 bg-transparent text-sm text-text-primary outline-none py-2 font-bold placeholder:font-normal placeholder:text-text-muted/50"
                />
                <datalist id="institutional-users">
                  <optgroup label="Board of Directors & Deans">
                    {users.filter(u => u.email !== user?.email && (u.role === 'ADMIN' || u.role === 'DEAN')).map(u => (
                      <option key={u.id} value={u.email}>{u.name} (Role: {u.role})</option>
                    ))}
                  </optgroup>
                  <optgroup label="Heads of Departments">
                    {users.filter(u => u.email !== user?.email && u.role === 'HOD').map(u => (
                      <option key={u.id} value={u.email}>{u.name} (Dept: {u.department || 'General'})</option>
                    ))}
                  </optgroup>
                  {Array.from(new Set(users.filter(u => u.role === 'STAFF').map(u => u.department || 'General'))).map(dept => (
                    <optgroup key={`staff-${dept}`} label={`Staff - ${dept}`}>
                      {users.filter(u => u.email !== user?.email && u.role === 'STAFF' && (u.department || 'General') === dept).map(u => (
                        <option key={u.id} value={u.email}>{u.name} ({u.staffId || u.id})</option>
                      ))}
                    </optgroup>
                  ))}
                  {Array.from(new Set(users.filter(u => u.role === 'STUDENT').map(u => u.studyYear ? `Year ${u.studyYear}` : 'Other Students'))).map(year => (
                    <optgroup key={`student-${year}`} label={`Students - ${year}`}>
                      {users.filter(u => u.email !== user?.email && u.role === 'STUDENT' && (u.studyYear ? `Year ${u.studyYear}` : 'Other Students') === year).map(u => (
                        <option key={u.id} value={u.email}>{u.name} ({u.regNo || u.id})</option>
                      ))}
                    </optgroup>
                  ))}
                </datalist>
              </div>
              <div className="px-4 py-2 border-b border-border-subtle">
                <input
                  type="text"
                  placeholder="Subject"
                  value={composeData.subject}
                  onChange={(e) => setComposeData(prev => ({ ...prev, subject: e.target.value }))}
                  required
                  className="w-full bg-transparent text-sm text-text-primary outline-none py-2 font-bold"
                />
              </div>
              <div className="flex-1 p-4">
                <textarea
                  value={composeData.body}
                  onChange={(e) => setComposeData(prev => ({ ...prev, body: e.target.value }))}
                  required
                  className="w-full h-full bg-transparent text-sm text-text-primary outline-none resize-none custom-scrollbar leading-relaxed"
                  placeholder="Type your message here..."
                />
              </div>

              <div className="h-16 px-4 flex items-center justify-between border-t border-border-subtle bg-surface-deep/20">
                <div className="flex items-center gap-2">
                  <button type="submit" className="flex items-center gap-2 px-6 py-2.5 bg-primary text-white rounded-full text-xs font-black uppercase tracking-widest shadow-lg shadow-primary/20 hover:opacity-90 transition-all active:scale-95">
                    SEND
                    <SendHorizontal className="w-4 h-4" />
                  </button>
                  <button type="button" onClick={(e) => handleActionEmail(e, true)} className="px-6 py-2.5 bg-surface-component text-text-primary rounded-full text-xs font-black uppercase tracking-widest hover:bg-surface-deep transition-all active:scale-95">
                    Save Draft
                  </button>
                  <div className="flex items-center gap-1 ml-2">
                    <input type="file" id="file-upload" className="hidden" multiple />
                    <button type="button" onClick={() => document.getElementById('file-upload')?.click()} title="Attach file" className="p-2 text-text-muted hover:text-text-primary hover:bg-surface-component rounded-lg transition-all active:scale-95">
                      <Paperclip className="w-4 h-4" />
                    </button>

                    <input type="file" id="image-upload" accept="image/*" className="hidden" multiple />
                    <button type="button" onClick={() => document.getElementById('image-upload')?.click()} title="Insert image" className="p-2 text-text-muted hover:text-text-primary hover:bg-surface-component rounded-lg transition-all active:scale-95">
                      <ImageIcon className="w-4 h-4" />
                    </button>

                    <button type="button" onClick={() => setShowEmojiPicker(!showEmojiPicker)} title="Insert emoji" className="p-2 text-text-muted hover:text-text-primary hover:bg-surface-component rounded-lg transition-all active:scale-95">
                      <Smile className="w-4 h-4" />
                    </button>
                    {showEmojiPicker && (
                      <div className="absolute bottom-16 left-48 bg-surface-elevated border border-border-subtle shadow-xl rounded-xl p-3 w-64 z-[200]">
                        <div className="grid grid-cols-6 gap-2">
                          {EMOJI_LIST.map(emoji => (
                            <button
                              key={emoji}
                              type="button"
                              onClick={() => {
                                setComposeData(prev => ({ ...prev, body: prev.body + emoji }));
                                setShowEmojiPicker(false);
                              }}
                              className="text-lg hover:bg-surface-component rounded p-1 transition-all flex items-center justify-center hover:scale-110"
                            >
                              {emoji}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                <button type="button" onClick={() => setIsComposeOpen(false)} title="Discard draft" className="p-2 text-text-muted hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all active:scale-95">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </DashboardLayout>
  );
};

const SidebarItem: React.FC<{ icon: React.ReactNode, label: string, active?: boolean, onClick: () => void, badge?: number }> = ({ icon, label, active, onClick, badge }) => (
  <button
    onClick={onClick}
    className={`w-full flex items-center justify-between px-4 py-2.5 rounded-r-full transition-all group ${active ? 'bg-primary/10 text-primary font-black' : 'text-text-muted hover:bg-surface-component hover:text-text-primary'}`}
  >
    <div className="flex items-center gap-4">
      <span className={`${active ? 'text-primary' : 'text-text-muted group-hover:text-text-primary'}`}>{icon}</span>
      <span className="text-sm tracking-tight">{label}</span>
    </div>
    {badge !== undefined && (
      <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-primary/20 text-primary">{badge}</span>
    )}
  </button>
);

const ActionButton: React.FC<{ icon: React.ReactNode, title: string, onClick?: (e: React.MouseEvent) => void }> = ({ icon, title, onClick }) => (
  <button
    onClick={onClick}
    title={title}
    className="p-2 text-text-muted hover:text-text-primary hover:bg-surface-component rounded-lg transition-all"
  >
    {icon}
  </button>
);

export default BITmail;
