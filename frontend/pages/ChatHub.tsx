
import React, { useState, useEffect, useContext, useRef } from 'react';
import DashboardLayout from '../components/DashboardLayout';
import { AuthContext } from '../AuthContext';
import { ApiService } from '../store';
import { motion, AnimatePresence } from 'framer-motion';

const ChatHub: React.FC = () => {
  const { user } = useContext(AuthContext);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [users, setUsers] = useState<any[]>([]);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchData = async () => {
      const allUsers = await ApiService.getUsers();
      setUsers(allUsers.filter(u => u.id !== user?.id));
      const msgs = await ApiService.getChatMessages() || [];
      setMessages(Array.isArray(msgs) ? msgs : []);
    };
    fetchData();
    const interval = setInterval(fetchData, 3000);
    return () => clearInterval(interval);
  }, [user]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, selectedUser]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedUser) return;

    const msg = {
      id: crypto.randomUUID(),
      senderId: user?.id,
      senderName: user?.name,
      receiverId: selectedUser.id,
      text: newMessage,
      timestamp: new Date().toISOString()
    };

    await ApiService.addChatMessage(msg);
    setMessages([...messages, msg]);
    setNewMessage('');
  };

  const filteredMessages = messages.filter(m =>
    (m.senderId === user?.id && m.receiverId === selectedUser?.id) ||
    (m.senderId === selectedUser?.id && m.receiverId === user?.id)
  );

  return (
    <DashboardLayout title="Institutional Chat Hub">
      <div className="flex h-[calc(100vh-12rem)] bg-surface-elevated rounded-3xl overflow-hidden border border-border-subtle shadow-2xl">
        {/* Sidebar */}
        <div className="w-80 border-r border-border-subtle flex flex-col bg-surface-deep/50">
          <div className="p-6 border-b border-border-subtle">
            <h3 className="text-lg font-black text-text-primary uppercase tracking-tighter">Contacts</h3>
            <p className="text-[10px] text-text-muted font-bold uppercase tracking-widest mt-1">Active Directory</p>
          </div>
          <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-1">
            {users.map(u => (
              <button
                key={u.id}
                onClick={() => setSelectedUser(u)}
                className={`w-full flex items-center gap-3 p-3 rounded-2xl transition-all ${selectedUser?.id === u.id ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'hover:bg-surface-component text-text-muted hover:text-text-primary'}`}
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm ${selectedUser?.id === u.id ? 'bg-white/20' : 'bg-primary/10 text-primary'}`}>
                  {u.name?.[0] || '?'}
                </div>
                <div className="text-left min-w-0">
                  <p className="text-xs font-black uppercase truncate">{u.name}</p>
                  <p className={`text-[9px] font-bold uppercase tracking-tighter truncate ${selectedUser?.id === u.id ? 'text-white/70' : 'text-text-muted'}`}>{u.role}</p>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Chat Area */}
        <div className="flex-1 flex flex-col bg-surface-elevated">
          {selectedUser ? (
            <>
              <div className="p-6 border-b border-border-subtle flex items-center justify-between bg-surface-elevated/50 backdrop-blur-md">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-primary flex items-center justify-center text-white font-black text-xl shadow-lg shadow-primary/20">
                    {selectedUser?.name?.[0] || '?'}
                  </div>
                  <div>
                    <h4 className="text-base font-black text-text-primary uppercase tracking-tight">{selectedUser.name}</h4>
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
                      <span className="text-[10px] text-text-muted font-bold uppercase tracking-widest">Secure Channel Active</span>
                    </div>
                  </div>
                </div>
              </div>

              <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar bg-surface-deep/20">
                <AnimatePresence initial={false}>
                  {filteredMessages.map(m => (
                    <motion.div
                      key={m.id}
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      className={`flex ${m.senderId === user?.id ? 'justify-end' : 'justify-start'}`}
                    >
                      <div className={`max-w-[70%] p-4 rounded-2xl shadow-sm ${m.senderId === user?.id ? 'bg-primary text-white rounded-tr-none' : 'bg-surface-component text-text-primary rounded-tl-none border border-border-subtle'}`}>
                        <p className="text-sm leading-relaxed">{m.text}</p>
                        <p className={`text-[8px] mt-2 font-bold uppercase tracking-widest ${m.senderId === user?.id ? 'text-white/60' : 'text-text-muted'}`}>
                          {new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>

              <form onSubmit={handleSendMessage} className="p-6 border-t border-border-subtle bg-surface-elevated/50">
                <div className="flex gap-3">
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Type encrypted message..."
                    className="flex-1 bg-surface-deep border border-border-subtle rounded-2xl px-6 py-4 text-sm text-text-primary outline-none focus:border-primary/50 focus:ring-4 focus:ring-primary/10 transition-all"
                  />
                  <button
                    type="submit"
                    className="bg-primary text-white px-8 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-emerald-600 transition-all active:scale-95 shadow-lg shadow-primary/20"
                  >
                    Send
                  </button>
                </div>
              </form>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-12">
              <div className="w-24 h-24 rounded-full bg-primary/5 flex items-center justify-center text-primary mb-6">
                <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"></path></svg>
              </div>
              <h3 className="text-xl font-black text-text-primary uppercase tracking-tighter">Select a contact</h3>
              <p className="text-sm text-text-muted mt-2 max-w-xs font-medium">Choose a member from the directory to start a secure institutional conversation.</p>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default ChatHub;
