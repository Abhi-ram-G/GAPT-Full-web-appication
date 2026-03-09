
import React, { useState, useEffect, useContext } from 'react';
import { useSearchParams } from 'react-router-dom';
import DashboardLayout from '../components/DashboardLayout';
import { AuthContext } from '../AuthContext';
import { ApiService } from '../store';
import { motion, AnimatePresence } from 'framer-motion';

const EmailCenter: React.FC = () => {
  const { user } = useContext(AuthContext);
  const [searchParams, setSearchParams] = useSearchParams();
  const [emails, setEmails] = useState<any[]>([]);
  const [isComposeOpen, setIsComposeOpen] = useState(searchParams.get('compose') === 'true');
  const [selectedEmail, setSelectedEmail] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);

  // Compose state
  const [to, setTo] = useState(searchParams.get('to') || '');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');

  useEffect(() => {
    if (searchParams.get('compose') === 'true') {
      setIsComposeOpen(true);
      if (searchParams.get('to')) {
        setTo(searchParams.get('to') || '');
      }
      // Clear params after opening to prevent re-opening on refresh
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  useEffect(() => {
    const fetchData = async () => {
      const allEmails = await ApiService.getEmails();
      setEmails(allEmails.filter(e => e.to === user?.email || e.from === user?.email));
      const allUsers = await ApiService.getUsers();
      setUsers(allUsers);
    };
    fetchData();
  }, [user]);

  const handleSendEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    const email = {
      id: crypto.randomUUID(),
      from: user?.email,
      fromName: user?.name,
      to,
      subject,
      body,
      timestamp: new Date().toISOString(),
      read: false
    };
    await ApiService.addEmail(email);
    setEmails([...emails, email]);
    setIsComposeOpen(false);
    setTo('');
    setSubject('');
    setBody('');
  };

  const inbox = emails.filter(e => e.to === user?.email).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  const sent = emails.filter(e => e.from === user?.email).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  const [activeTab, setActiveTab] = useState<'inbox' | 'sent'>('inbox');
  const currentEmails = activeTab === 'inbox' ? inbox : sent;

  return (
    <DashboardLayout title="Institutional Mail Center">
      <div className="flex h-[calc(100vh-12rem)] bg-surface-elevated rounded-3xl overflow-hidden border border-border-subtle shadow-2xl">
        {/* Sidebar */}
        <div className="w-64 border-r border-border-subtle flex flex-col bg-surface-deep/50">
          <div className="p-6">
            <button
              onClick={() => setIsComposeOpen(true)}
              className="w-full bg-primary text-white py-4 rounded-2xl font-black uppercase text-xs tracking-widest shadow-lg shadow-primary/20 hover:bg-emerald-600 transition-all active:scale-95 flex items-center justify-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 4v16m8-8H4"></path></svg>
              Compose
            </button>
          </div>
          <nav className="flex-1 px-3 space-y-1">
            <button
              onClick={() => setActiveTab('inbox')}
              className={`w-full flex items-center justify-between p-4 rounded-xl transition-all ${activeTab === 'inbox' ? 'bg-primary/10 text-primary font-bold' : 'text-text-muted hover:bg-surface-component'}`}
            >
              <div className="flex items-center gap-3">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0a2 2 0 01-2 2H6a2 2 0 01-2-2m16 0l-8 5-8-5"></path></svg>
                <span className="text-sm">Inbox</span>
              </div>
              {inbox.filter(e => !e.read).length > 0 && (
                <span className="bg-primary text-white text-[10px] px-2 py-0.5 rounded-full">{inbox.filter(e => !e.read).length}</span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('sent')}
              className={`w-full flex items-center gap-3 p-4 rounded-xl transition-all ${activeTab === 'sent' ? 'bg-primary/10 text-primary font-bold' : 'text-text-muted hover:bg-surface-component'}`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"></path></svg>
              <span className="text-sm">Sent</span>
            </button>
          </nav>
        </div>

        {/* List */}
        <div className="w-96 border-r border-border-subtle flex flex-col bg-surface-elevated">
          <div className="p-6 border-b border-border-subtle">
            <h3 className="text-lg font-black text-text-primary uppercase tracking-tighter">{activeTab}</h3>
          </div>
          <div className="flex-1 overflow-y-auto custom-scrollbar">
            {currentEmails.map(e => (
              <button
                key={e.id}
                onClick={() => setSelectedEmail(e)}
                className={`w-full p-6 text-left border-b border-border-subtle transition-all hover:bg-surface-component ${selectedEmail?.id === e.id ? 'bg-primary/5 border-l-4 border-l-primary' : ''}`}
              >
                <div className="flex justify-between items-start mb-1">
                  <span className="text-xs font-black text-text-primary uppercase truncate max-w-[150px]">{activeTab === 'inbox' ? e.fromName : e.to}</span>
                  <span className="text-[9px] text-text-muted font-bold">{new Date(e.timestamp).toLocaleDateString()}</span>
                </div>
                <p className="text-xs font-bold text-text-primary truncate mb-1">{e.subject}</p>
                <p className="text-[10px] text-text-muted truncate leading-relaxed">{e.body}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 flex flex-col bg-surface-deep/20">
          {selectedEmail ? (
            <div className="p-10 max-w-4xl mx-auto w-full">
              <div className="flex justify-between items-start mb-10">
                <div>
                  <h2 className="text-2xl font-black text-text-primary uppercase tracking-tight mb-2">{selectedEmail.subject}</h2>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold">
                      {selectedEmail.fromName?.[0] || 'U'}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-text-primary">{selectedEmail.fromName}</p>
                      <p className="text-[10px] text-text-muted font-mono">{selectedEmail.from} &rarr; {selectedEmail.to}</p>
                    </div>
                  </div>
                </div>
                <span className="text-xs text-text-muted font-bold uppercase tracking-widest">{new Date(selectedEmail.timestamp).toLocaleString()}</span>
              </div>
              <div className="bg-surface-elevated p-8 rounded-3xl border border-border-subtle shadow-sm min-h-[300px]">
                <p className="text-sm text-text-primary leading-loose whitespace-pre-wrap">{selectedEmail.body}</p>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-12">
              <div className="w-24 h-24 rounded-full bg-primary/5 flex items-center justify-center text-primary mb-6">
                <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path></svg>
              </div>
              <h3 className="text-xl font-black text-text-primary uppercase tracking-tighter">Select an email</h3>
              <p className="text-sm text-text-muted mt-2 max-w-xs font-medium">Read institutional communications and official announcements here.</p>
            </div>
          )}
        </div>
      </div>

      {/* Compose Modal */}
      <AnimatePresence>
        {isComposeOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsComposeOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-2xl bg-surface-elevated rounded-[2.5rem] shadow-2xl overflow-hidden border border-border-subtle"
            >
              <div className="p-8 border-b border-border-subtle bg-surface-deep/50 flex justify-between items-center">
                <h3 className="text-xl font-black text-text-primary uppercase tracking-tight">New Message</h3>
                <button onClick={() => setIsComposeOpen(false)} className="text-text-muted hover:text-text-primary transition-colors">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                </button>
              </div>
              <form onSubmit={handleSendEmail} className="p-8 space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-text-muted uppercase tracking-widest px-1">Recipient Email</label>
                  <input
                    type="email"
                    list="email-center-recipients"
                    value={to}
                    onChange={(e) => setTo(e.target.value)}
                    required
                    placeholder="Enter Mail ID or select from directory..."
                    className="w-full bg-surface-deep border border-border-subtle rounded-2xl px-6 py-4 text-sm text-text-primary outline-none focus:border-primary/50 transition-all font-bold placeholder:font-normal placeholder:text-text-muted/50"
                  />
                  <datalist id="email-center-recipients">
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
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-text-muted uppercase tracking-widest px-1">Subject Line</label>
                  <input
                    type="text"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    required
                    placeholder="Brief summary of communication..."
                    className="w-full bg-surface-deep border border-border-subtle rounded-2xl px-6 py-4 text-sm text-text-primary outline-none focus:border-primary/50 transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-text-muted uppercase tracking-widest px-1">Message Body</label>
                  <textarea
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    required
                    rows={8}
                    placeholder="Detailed institutional message..."
                    className="w-full bg-surface-deep border border-border-subtle rounded-2xl px-6 py-4 text-sm text-text-primary outline-none focus:border-primary/50 transition-all resize-none"
                  />
                </div>
                <div className="pt-4">
                  <button
                    type="submit"
                    className="w-full bg-primary text-white py-5 rounded-2xl font-black uppercase text-sm tracking-widest shadow-xl shadow-primary/20 hover:bg-emerald-600 transition-all active:scale-95"
                  >
                    Dispatch Message
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </DashboardLayout>
  );
};

export default EmailCenter;
