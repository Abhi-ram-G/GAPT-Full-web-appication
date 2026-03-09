import React, { useState, useEffect, useMemo } from 'react';
import DashboardLayout from '../components/DashboardLayout';
import { ApiService } from '../store';
import { User, UserRole } from '../types';

const Contacts: React.FC = () => {
    const [users, setUsers] = useState<User[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<UserRole>(UserRole.STUDENT);
    const [searchQuery, setSearchQuery] = useState('');
    const [copiedId, setCopiedId] = useState<string | null>(null);

    const handleCopy = (text: string, id: string) => {
        if (!text || text === 'N/A') return;
        navigator.clipboard.writeText(text);
        setCopiedId(id);
        setTimeout(() => setCopiedId(null), 2000);
    };

    const fetchContacts = async () => {
        setIsLoading(true);
        try {
            const allUsers = await ApiService.getUsers();
            // Ensure only approved users are shown in directory
            setUsers(allUsers.filter(u => u.status === 'APPROVED'));
        } catch (err) {
            console.error("Failed to fetch contacts", err);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchContacts();
    }, []);

    const roles = [
        { label: 'Students', value: UserRole.STUDENT },
        { label: 'Staff', value: UserRole.STAFF },
        { label: 'HODs', value: UserRole.HOD },
        { label: 'Deans', value: UserRole.DEAN },
        { label: 'Admins', value: UserRole.ADMIN }
    ];

    const filteredUsers = useMemo(() => {
        return users.filter(u => {
            if (u.role !== activeTab) return false;
            if (searchQuery.trim() === '') return true;
            const q = searchQuery.toLowerCase();
            return u.name.toLowerCase().includes(q) ||
                (u.regNo && u.regNo.toLowerCase().includes(q)) ||
                (u.staffId && u.staffId.toLowerCase().includes(q)) ||
                (u.phone && u.phone.includes(q)) ||
                u.email.toLowerCase().includes(q);
        });
    }, [users, activeTab, searchQuery]);

    return (
        <DashboardLayout title="Contact Directory" resultCount={filteredUsers.length}>
            <div className="max-w-7xl mx-auto space-y-8 pb-24">

                {/* Header Section */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-surface-elevated border border-border-subtle p-6 rounded-3xl shadow-sm">
                    <div>
                        <h2 className="text-2xl font-black text-text-primary uppercase tracking-tight">Institution Contacts</h2>
                        <p className="text-[10px] text-text-muted font-bold uppercase tracking-[0.2em] mt-1">
                            Global Directory Access
                        </p>
                    </div>
                    <div className="relative w-full md:w-80">
                        <input
                            type="text"
                            placeholder="Search by name, ID, or phone..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-surface-component border border-border-subtle rounded-2xl px-10 py-3 text-sm text-text-primary outline-none focus:border-primary/50 transition-all font-medium placeholder:text-text-muted/50"
                        />
                        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
                        </svg>
                    </div>
                </div>

                {/* Role Tabs */}
                <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-2">
                    {roles.map((role) => {
                        const isActive = activeTab === role.value;
                        const count = users.filter(u => u.role === role.value).length;
                        return (
                            <button
                                key={role.value}
                                onClick={() => setActiveTab(role.value)}
                                className={`flex items-center gap-2 px-6 py-2.5 rounded-full text-[10px] font-black uppercase tracking-widest border transition-all whitespace-nowrap ${isActive
                                    ? 'bg-primary text-white border-primary shadow-lg shadow-primary/20'
                                    : 'bg-surface-component text-text-muted border-border-subtle hover:text-text-primary hover:border-text-muted/30'
                                    }`}
                            >
                                {role.label}
                                <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-black ${isActive ? 'bg-white/20' : 'bg-surface-deep'}`}>
                                    {count}
                                </span>
                            </button>
                        );
                    })}
                </div>

                {/* Contacts Grid */}
                {isLoading ? (
                    <div className="flex justify-center items-center py-24">
                        <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
                    </div>
                ) : filteredUsers.length === 0 ? (
                    <div className="bg-surface-elevated border border-border-subtle rounded-3xl p-16 flex flex-col items-center justify-center text-center">
                        <div className="w-16 h-16 bg-surface-component rounded-full flex items-center justify-center mb-6">
                            <svg className="w-8 h-8 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                            </svg>
                        </div>
                        <h3 className="text-xl font-black text-text-primary uppercase tracking-tight">No Contacts Found</h3>
                        <p className="text-text-muted text-[10px] font-bold uppercase tracking-[0.2em] mt-2">Try adjusting your search criteria</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {filteredUsers.map(user => (
                            <div key={user.id} className="bg-surface-component border border-border-subtle rounded-3xl p-6 hover:border-primary/30 transition-all hover:shadow-xl hover:-translate-y-1 group">
                                <div className="flex items-center gap-4 mb-5">
                                    <div className="w-12 h-12 rounded-2xl bg-surface-deep border border-border-subtle flex items-center justify-center text-text-muted font-black text-xl group-hover:text-primary transition-colors overflow-hidden relative">
                                        {user.avatar ? (
                                            <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
                                        ) : (
                                            user.name[0]?.toUpperCase()
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h3 className="text-sm font-black text-text-primary uppercase truncate" title={user.name}>{user.name}</h3>
                                        <p className="text-[9px] text-text-muted font-mono tracking-widest mt-1 truncate uppercase">
                                            {user.role === UserRole.STUDENT ? (user.regNo || 'NO REG NO') : (user.staffId || 'NO ID')}
                                        </p>
                                    </div>
                                </div>

                                <div className="space-y-3 pt-4 border-t border-border-subtle/50">
                                    <button
                                        onClick={() => handleCopy(user.phone || '', `phone-${user.id}`)}
                                        className="w-full flex justify-between items-center gap-3 text-text-muted hover:text-primary transition-colors hover:bg-surface-elevated p-1.5 -ml-1.5 rounded-lg group/btn active:scale-95"
                                        title={user.phone ? "Click to copy" : ""}
                                    >
                                        <div className="flex items-center gap-3 min-w-0">
                                            <div className="w-6 h-6 rounded-full bg-surface-deep flex items-center justify-center shrink-0 group-hover/btn:bg-primary/10">
                                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                                                </svg>
                                            </div>
                                            <span className="text-[10px] sm:text-xs font-mono font-medium truncate">
                                                {user.phone || 'N/A'}
                                            </span>
                                        </div>
                                        {copiedId === `phone-${user.id}` ? (
                                            <svg className="w-4 h-4 text-emerald-500 mr-2 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg>
                                        ) : (
                                            <svg className="w-3.5 h-3.5 opacity-0 group-hover/btn:opacity-100 transition-opacity mr-2 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"></path></svg>
                                        )}
                                    </button>

                                    <button
                                        onClick={() => handleCopy(user.email || '', `email-${user.id}`)}
                                        className="w-full flex justify-between items-center gap-3 text-text-muted hover:text-primary transition-colors hover:bg-surface-elevated p-1.5 -ml-1.5 rounded-lg group/btn active:scale-95"
                                        title={user.email ? "Click to copy" : ""}
                                    >
                                        <div className="flex items-center gap-3 min-w-0">
                                            <div className="w-6 h-6 rounded-full bg-surface-deep flex items-center justify-center shrink-0 group-hover/btn:bg-primary/10">
                                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                                </svg>
                                            </div>
                                            <span className="text-[10px] sm:text-xs font-mono font-medium truncate">
                                                {user.email || 'N/A'}
                                            </span>
                                        </div>
                                        {copiedId === `email-${user.id}` ? (
                                            <svg className="w-4 h-4 text-emerald-500 mr-2 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg>
                                        ) : (
                                            <svg className="w-3.5 h-3.5 opacity-0 group-hover/btn:opacity-100 transition-opacity mr-2 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"></path></svg>
                                        )}
                                    </button>
                                </div>

                            </div>
                        ))}
                    </div>
                )}
            </div>
        </DashboardLayout>
    );
};

export default Contacts;
