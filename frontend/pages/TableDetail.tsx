
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import DashboardLayout from '../components/DashboardLayout';
import { ApiService } from '../store';
import { UserRole } from '../types';
import { DB_TABLES } from './Spreadsheet';

/* ── Role tabs for the Users table ── */
const USER_TABS: { role: UserRole; label: string }[] = [
    { role: UserRole.STUDENT, label: 'Students' },
    { role: UserRole.STAFF, label: 'Staff' },
    { role: UserRole.HOD, label: 'HODs' },
    { role: UserRole.DEAN, label: 'Deans' },
    { role: UserRole.ADMIN, label: 'Admins' },
];

/* ════════════════════════════════════════════
   USERS TABLE — role-tabbed sheet (Image 2)
════════════════════════════════════════════ */
const UsersSheet: React.FC = () => {
    const navigate = useNavigate();
    const [allUsers, setAllUsers] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [activeRole, setActiveRole] = useState<UserRole>(UserRole.STUDENT);
    const [search, setSearch] = useState('');

    /* Fetch */
    const fetchUsers = () => {
        setIsLoading(true);
        ApiService.getUsers()
            .then(users => setAllUsers(users.map((u: any) => ({ ...u, password: '' }))))
            .catch(() => setAllUsers([]))
            .finally(() => setIsLoading(false));
    };
    useEffect(fetchUsers, []);
    useEffect(() => setSearch(''), [activeRole]);

    /* Cell change */
    const handleCellChange = (id: string, field: string, value: string) => {
        setAllUsers(prev => prev.map(u => u.id === id ? { ...u, [field]: value } : u));
    };

    /* Filtered rows for active tab + search */
    const tabRows = allUsers.filter(u =>
        u.role?.toString().toUpperCase() === activeRole?.toString().toUpperCase()
    );
    const filteredRows = tabRows.filter(row => {
        if (!search) return true;
        const q = search.toLowerCase();
        return ['name', 'email', 'regNo', 'staffId', 'department'].some(k =>
            String((row as any)[k] ?? '').toLowerCase().includes(q)
        );
    });

    /* Save */
    const handleSave = async () => {
        setIsSaving(true);
        try {
            await ApiService.updateSpreadsheetData(allUsers);
            alert('Changes committed to database');
        } catch { alert('Failed to save changes'); }
        finally { setIsSaving(false); }
    };

    return (
        <DashboardLayout title="Institutional Data Sheets" resultCount={filteredRows.length}>
            <div className="space-y-6">

                {/* ── Header ── */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-surface-elevated p-6 rounded-3xl border border-border-subtle shadow-sm">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => navigate('/spreadsheet')}
                            className="p-2.5 bg-surface-component hover:bg-surface-deep border border-border-subtle rounded-xl transition-all text-text-muted hover:text-text-primary"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7" />
                            </svg>
                        </button>
                        <div>
                            <h2 className="text-xl font-black text-text-primary uppercase tracking-tight">
                                Master Registry Grid
                            </h2>
                            <p className="text-[10px] text-text-muted font-bold uppercase tracking-[0.2em] mt-1">
                                Real-time synchronization with core database
                            </p>
                        </div>
                    </div>
                    <div className="flex gap-3">
                        <button onClick={fetchUsers} className="px-6 py-3 bg-surface-component text-text-primary rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-surface-deep transition-all active:scale-95">
                            Refresh
                        </button>
                        <button onClick={handleSave} disabled={isSaving} className="px-8 py-3 bg-primary text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-600 transition-all active:scale-95 shadow-lg shadow-primary/20 disabled:opacity-50">
                            {isSaving ? 'Saving...' : 'Commit Changes'}
                        </button>
                    </div>
                </div>

                {/* ── Role tabs ── */}
                <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
                    {USER_TABS.map(tab => {
                        const count = allUsers.filter(u => u.role?.toString().toUpperCase() === tab.role?.toString().toUpperCase()).length;
                        const isActive = activeRole === tab.role;
                        return (
                            <button
                                key={tab.role}
                                onClick={() => setActiveRole(tab.role)}
                                className={`flex items-center gap-2 px-6 py-2.5 rounded-full text-[10px] font-black uppercase tracking-widest border transition-all whitespace-nowrap ${isActive
                                    ? 'bg-primary text-white border-primary shadow-lg shadow-primary/20'
                                    : 'bg-surface-component text-text-muted border-border-subtle hover:text-text-primary'
                                    }`}
                            >
                                {tab.label}
                                <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-black ${isActive ? 'bg-white/20' : 'bg-surface-deep'}`}>
                                    {isLoading ? '…' : count}
                                </span>
                            </button>
                        );
                    })}
                </div>

                {/* ── Search ── */}
                <div className="relative max-w-xl">
                    <input
                        type="text"
                        placeholder={`Search ${activeRole.toLowerCase()}s...`}
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="w-full bg-surface-component border border-border-subtle rounded-2xl px-10 pr-20 py-3 text-sm text-text-primary outline-none focus:border-primary/50 transition-all shadow-inner font-medium placeholder:text-text-muted/50"
                    />
                    <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-black text-primary bg-primary/10 border border-primary/20 px-2 py-0.5 rounded-full tabular-nums">
                        {filteredRows.length.toLocaleString()}
                    </span>
                </div>

                {/* ── Table ── */}
                <div className="bg-surface-elevated border border-border-subtle rounded-3xl overflow-hidden shadow-2xl">
                    <div className="overflow-x-auto custom-scrollbar">
                        <table className="w-full border-collapse text-left">
                            <thead>
                                <tr className="bg-surface-deep/50 border-b border-border-subtle">
                                    <th className="px-6 py-4 text-[10px] font-black text-text-muted uppercase tracking-widest border-r border-border-subtle w-12 text-center">#</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-text-muted uppercase tracking-widest border-r border-border-subtle">Member Name</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-text-muted uppercase tracking-widest border-r border-border-subtle">Email Address</th>
                                    {activeRole === UserRole.STUDENT && (
                                        <th className="px-6 py-4 text-[10px] font-black text-text-muted uppercase tracking-widest border-r border-border-subtle">Reg No</th>
                                    )}
                                    {(activeRole === UserRole.STAFF || activeRole === UserRole.HOD || activeRole === UserRole.DEAN) && (
                                        <th className="px-6 py-4 text-[10px] font-black text-text-muted uppercase tracking-widest border-r border-border-subtle">Staff ID</th>
                                    )}
                                    <th className="px-6 py-4 text-[10px] font-black text-text-muted uppercase tracking-widest border-r border-border-subtle">Department</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-amber-400 uppercase tracking-widest border-r border-border-subtle">
                                        Password <span className="text-[8px] text-text-muted normal-case">(type to reset)</span>
                                    </th>
                                    <th className="px-6 py-4 text-[10px] font-black text-text-muted uppercase tracking-widest">Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {isLoading ? (
                                    <tr>
                                        <td colSpan={8} className="py-20 text-center">
                                            <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin mx-auto" />
                                        </td>
                                    </tr>
                                ) : filteredRows.length === 0 ? (
                                    <tr>
                                        <td colSpan={8} className="py-16 text-center text-text-muted font-bold uppercase tracking-widest text-sm">
                                            No {USER_TABS.find(t => t.role === activeRole)?.label} found
                                        </td>
                                    </tr>
                                ) : (
                                    filteredRows.map((row, idx) => (
                                        <tr key={row.id} className="border-b border-border-subtle hover:bg-primary/5 transition-colors">
                                            <td className="px-6 py-4 text-[10px] font-bold text-text-muted border-r border-border-subtle text-center bg-surface-deep/20 tabular-nums">{idx + 1}</td>

                                            {/* Name */}
                                            <td className="p-0 border-r border-border-subtle">
                                                <input type="text" value={row.name || ''} onChange={e => handleCellChange(row.id, 'name', e.target.value)}
                                                    className="w-full px-6 py-4 bg-transparent outline-none text-sm text-text-primary focus:bg-white/5 transition-all font-black" />
                                            </td>
                                            {/* Email */}
                                            <td className="p-0 border-r border-border-subtle">
                                                <input type="email" value={row.email || ''} onChange={e => handleCellChange(row.id, 'email', e.target.value)}
                                                    className="w-full px-6 py-4 bg-transparent outline-none text-sm text-primary/80 focus:bg-white/5 transition-all font-mono" />
                                            </td>
                                            {/* Reg No (student) */}
                                            {activeRole === UserRole.STUDENT && (
                                                <td className="p-0 border-r border-border-subtle">
                                                    <input type="text" value={row.regNo || ''} onChange={e => handleCellChange(row.id, 'regNo', e.target.value)}
                                                        className="w-full px-6 py-4 bg-transparent outline-none text-sm text-primary font-mono focus:bg-white/5 transition-all" />
                                                </td>
                                            )}
                                            {/* Staff ID */}
                                            {(activeRole === UserRole.STAFF || activeRole === UserRole.HOD || activeRole === UserRole.DEAN) && (
                                                <td className="p-0 border-r border-border-subtle">
                                                    <input type="text" value={row.staffId || ''} onChange={e => handleCellChange(row.id, 'staffId', e.target.value)}
                                                        className="w-full px-6 py-4 bg-transparent outline-none text-sm text-primary font-mono focus:bg-white/5 transition-all" />
                                                </td>
                                            )}
                                            {/* Department */}
                                            <td className="p-0 border-r border-border-subtle">
                                                <input type="text" value={row.department || ''} onChange={e => handleCellChange(row.id, 'department', e.target.value)}
                                                    className="w-full px-6 py-4 bg-transparent outline-none text-sm text-text-primary focus:bg-white/5 transition-all font-medium" />
                                            </td>
                                            {/* Password */}
                                            <td className="p-0 border-r border-border-subtle">
                                                <input type="text" value={row.password || ''} placeholder="Type to reset..."
                                                    onChange={e => handleCellChange(row.id, 'password', e.target.value)}
                                                    className="w-full px-6 py-4 bg-transparent outline-none text-sm text-amber-400 font-mono focus:bg-amber-400/5 transition-all placeholder:text-text-muted/40" />
                                            </td>
                                            {/* Status */}
                                            <td className="px-6 py-4">
                                                <span className={`text-[9px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full border ${row.status?.toUpperCase() === 'APPROVED'
                                                    ? 'text-primary border-primary/30 bg-primary/10'
                                                    : row.status?.toUpperCase() === 'PENDING'
                                                        ? 'text-amber-400 border-amber-400/30 bg-amber-400/10'
                                                        : 'text-red-400 border-red-400/30 bg-red-400/10'
                                                    }`}>
                                                    {row.status || 'UNKNOWN'}
                                                </span>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Footer */}
                    {!isLoading && filteredRows.length > 0 && (
                        <div className="px-6 py-3 border-t border-border-subtle bg-surface-deep/30 flex items-center justify-between">
                            <span className="text-[10px] font-bold text-text-muted uppercase tracking-widest">
                                {filteredRows.length.toLocaleString()} of {tabRows.length.toLocaleString()} records
                            </span>
                            {search && (
                                <button onClick={() => setSearch('')} className="text-[10px] font-black text-primary uppercase tracking-widest hover:underline">
                                    Clear filter
                                </button>
                            )}
                        </div>
                    )}
                </div>

                {/* Warning */}
                <div className="bg-amber-500/10 border border-amber-500/20 p-6 rounded-[2rem] flex items-start gap-5">
                    <div className="p-3 bg-amber-500/20 rounded-xl text-amber-500 shrink-0">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                    </div>
                    <div>
                        <h4 className="text-amber-500 font-black text-sm uppercase tracking-widest mb-1">Critical Data Synchronization Notice</h4>
                        <p className="text-amber-500/70 text-xs leading-relaxed font-bold">
                            Edits here update the live institutional registry. Verify all changes before committing.
                        </p>
                    </div>
                </div>

            </div>
        </DashboardLayout>
    );
};

/* ════════════════════════════════════════════
   GENERIC TABLE DETAIL  ── same style as UsersSheet
════════════════════════════════════════════ */
const GenericSheet: React.FC<{ table: typeof DB_TABLES[0] }> = ({ table }) => {
    const navigate = useNavigate();
    const [rows, setRows] = useState<any[]>([]);
    const [originalRows, setOriginalRows] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [search, setSearch] = useState('');
    const [activeRole, setActiveRole] = useState<UserRole>(UserRole.STUDENT);
    const [selectedBatch, setSelectedBatch] = useState('ALL');
    const [selectedYear, setSelectedYear] = useState('ALL');
    const [selectedDept, setSelectedDept] = useState('ALL');

    const fetchRows = () => {
        setIsLoading(true);
        table.fetch()
            .then(data => {
                setRows(data);
                // clone to separate reference for diff tracking
                setOriginalRows(JSON.parse(JSON.stringify(data)));
            })
            .catch(() => setRows([]))
            .finally(() => setIsLoading(false));
    };
    useEffect(fetchRows, [table.id]);

    const handleCellChange = (idOrIdx: any, field: string, value: string) => {
        setRows(prev => prev.map((r, idx) => (r.id === idOrIdx || idx === idOrIdx) ? { ...r, [field]: value } : r));
    };

    const handleSave = async () => {
        if (!table.save) return;
        setIsSaving(true);
        try {
            await table.save(rows, originalRows);
            alert('Changes committed to database');
            fetchRows(); // refresh after save
        } catch { alert('Failed to save changes'); }
        finally { setIsSaving(false); }
    };

    // Filter rows based on all conditions
    const filteredRows = rows.filter(row => {
        if (table.id === 'contacts_directory') {
            if (String(row.role || '').toUpperCase() !== String(activeRole).toUpperCase()) {
                return false;
            }
            if (activeRole === UserRole.STUDENT) {
                if (selectedBatch !== 'ALL' && row.batchId !== selectedBatch) return false;
                if (selectedYear !== 'ALL' && row.studyYear !== selectedYear) return false;
                if (selectedDept !== 'ALL' && row.department !== selectedDept) return false;
            }
        }

        if (!search) return true;
        const q = search.toLowerCase();
        return table.columns.some(col => String(row[col.key] ?? '').toLowerCase().includes(q));
    });

    // Helper functions for dropdown options
    const studentRows = rows.filter(r => r.role === UserRole.STUDENT);
    const uniqueBatches = Array.from(new Set(studentRows.map(r => r.batchId).filter(Boolean)));
    const uniqueDepts = Array.from(new Set(studentRows.map(r => r.department).filter(Boolean)));

    const handleBatchChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const bId = e.target.value;
        setSelectedBatch(bId);
        if (bId !== 'ALL') {
            const student = studentRows.find(r => r.batchId === bId);
            if (student && student.studyYear) {
                setSelectedYear(student.studyYear);
            }
        } else {
            setSelectedYear('ALL');
        }
    };

    return (
        <DashboardLayout title="Institutional Data Sheets" resultCount={filteredRows.length}>
            <div className="space-y-6">

                {/* ── Header — identical to UsersSheet ── */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-surface-elevated p-6 rounded-3xl border border-border-subtle shadow-sm">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => navigate('/spreadsheet')}
                            className="p-2.5 bg-surface-component hover:bg-surface-deep border border-border-subtle rounded-xl transition-all text-text-muted hover:text-text-primary"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7" />
                            </svg>
                        </button>
                        <div>
                            <div className="flex items-center gap-3">
                                <span className="text-2xl">{table.icon}</span>
                                <h2 className="text-xl font-black text-text-primary uppercase tracking-tight">
                                    {table.label}
                                </h2>
                                <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full border ${table.editable ? 'text-emerald-400 border-emerald-400/30 bg-emerald-400/10' : 'text-text-muted border-border-subtle bg-surface-component'}`}>
                                    {table.editable ? '✏️ Editable' : '👁 View Only'}
                                </span>
                            </div>
                            <p className="text-[10px] text-text-muted font-bold uppercase tracking-[0.2em] mt-1">
                                Real-time synchronization with core database
                            </p>
                        </div>
                    </div>
                    <div className="flex gap-3">
                        <button
                            onClick={fetchRows}
                            className="px-6 py-3 bg-surface-component text-text-primary rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-surface-deep transition-all active:scale-95"
                        >
                            Refresh
                        </button>
                        {table.editable && (
                            <button
                                onClick={handleSave}
                                disabled={isSaving}
                                className="px-8 py-3 bg-primary text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-600 transition-all active:scale-95 shadow-lg shadow-primary/20 disabled:opacity-50"
                            >
                                {isSaving ? 'Saving...' : 'Commit Changes'}
                            </button>
                        )}
                    </div>
                </div>

                {/* ── Role tabs specifically for Contacts ── */}
                {table.id === 'contacts_directory' && (
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
                            {USER_TABS.map(tab => {
                                const count = rows.filter(r => String(r.role || '').toUpperCase() === String(tab.role).toUpperCase()).length;
                                const isActive = activeRole === tab.role;
                                return (
                                    <button
                                        key={tab.role}
                                        onClick={() => setActiveRole(tab.role)}
                                        className={`flex items-center gap-2 px-6 py-2.5 rounded-full text-[10px] font-black uppercase tracking-widest border transition-all whitespace-nowrap ${isActive
                                            ? 'bg-primary text-white border-primary shadow-lg shadow-primary/20'
                                            : 'bg-surface-component text-text-muted border-border-subtle hover:text-text-primary'
                                            }`}
                                    >
                                        {tab.label}
                                        <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-black ${isActive ? 'bg-white/20' : 'bg-surface-deep'}`}>
                                            {isLoading ? '…' : count}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>

                        {activeRole === UserRole.STUDENT && (
                            <div className="flex flex-wrap gap-3 bg-surface-component p-4 rounded-3xl border border-border-subtle shadow-inner">
                                <div className="flex border border-border-subtle rounded-xl overflow-hidden bg-surface-elevated flex-1 min-w-[200px]">
                                    <span className="px-4 py-3 bg-surface-deep text-[10px] font-black uppercase tracking-widest text-text-muted flex items-center justify-center border-r border-border-subtle">Batch Array</span>
                                    <select
                                        value={selectedBatch}
                                        onChange={handleBatchChange}
                                        className="w-full bg-transparent px-4 py-3 text-xs font-black uppercase text-text-primary outline-none"
                                    >
                                        <option value="ALL">ALL COHORTS</option>
                                        {uniqueBatches.map((b: any) => (
                                            <option key={b} value={b}>{b}</option>
                                        ))}
                                    </select>
                                </div>

                                {/* Year is read-only because it derives from Batch automatically */}
                                <div className="flex border border-border-subtle rounded-xl overflow-hidden bg-surface-elevated/50 opacity-80 cursor-not-allowed">
                                    <span className="px-4 py-3 bg-surface-deep text-[10px] font-black uppercase tracking-widest text-text-muted flex items-center justify-center border-r border-border-subtle">Calculated Year</span>
                                    <div className="px-6 py-3 text-xs font-black uppercase text-text-muted flex items-center justify-center pointer-events-none">
                                        {selectedYear === 'ALL' ? '---' : selectedYear}
                                    </div>
                                </div>

                                <div className="flex border border-border-subtle rounded-xl overflow-hidden bg-surface-elevated flex-[2] min-w-[250px]">
                                    <span className="px-4 py-3 bg-surface-deep text-[10px] font-black uppercase tracking-widest text-text-muted flex items-center justify-center border-r border-border-subtle">Department</span>
                                    <select
                                        value={selectedDept}
                                        onChange={e => setSelectedDept(e.target.value)}
                                        className="w-full bg-transparent px-4 py-3 text-xs font-black uppercase text-text-primary outline-none"
                                    >
                                        <option value="ALL">ALL DEPARTMENTS</option>
                                        {uniqueDepts.map((d: any) => (
                                            <option key={d} value={d}>{d}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* ── Search — identical to UsersSheet ── */}
                <div className="relative w-full">
                    <input
                        type="text"
                        placeholder={`Search ${table.label}...`}
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="w-full bg-surface-component border border-border-subtle rounded-2xl px-10 pr-20 py-3 text-sm text-text-primary outline-none focus:border-primary/50 transition-all shadow-inner font-medium placeholder:text-text-muted/50"
                    />
                    <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-black text-primary bg-primary/10 border border-primary/20 px-2 py-0.5 rounded-full tabular-nums">
                        {filteredRows.length.toLocaleString()}
                    </span>
                </div>

                {/* ── Table — identical cell & header style */}
                <div className="bg-surface-elevated border border-border-subtle rounded-3xl overflow-hidden shadow-2xl">
                    <div className="overflow-x-auto custom-scrollbar">
                        <table className="w-full border-collapse text-left">
                            <thead>
                                <tr className="bg-surface-deep/50 border-b border-border-subtle">
                                    <th className="px-6 py-4 text-[10px] font-black text-text-muted uppercase tracking-widest border-r border-border-subtle w-12 text-center">#</th>
                                    {table.columns.map(col => (
                                        <th key={col.key} className={`px-6 py-4 text-[10px] font-black uppercase tracking-widest border-r border-border-subtle last:border-r-0 whitespace-nowrap ${col.mono ? 'text-primary/70' : 'text-text-muted'}`}>
                                            {col.label}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {isLoading ? (
                                    <tr>
                                        <td colSpan={table.columns.length + 1} className="py-24 text-center">
                                            <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin mx-auto" />
                                            <p className="text-[10px] text-text-muted font-bold uppercase tracking-widest mt-4">Loading {table.label}...</p>
                                        </td>
                                    </tr>
                                ) : filteredRows.length === 0 ? (
                                    <tr>
                                        <td colSpan={table.columns.length + 1} className="py-16 text-center">
                                            <span className="text-4xl block mb-3">🗄️</span>
                                            <p className="text-sm font-bold text-text-muted uppercase tracking-widest">No records found</p>
                                        </td>
                                    </tr>
                                ) : (
                                    filteredRows.map((row, idx) => {
                                        const identifier = row.id ?? idx;
                                        return (
                                            <tr key={identifier} className="border-b border-border-subtle hover:bg-primary/5 transition-colors">
                                                {/* Row number — same style */}
                                                <td className="px-6 py-4 text-[10px] font-bold text-text-muted border-r border-border-subtle text-center bg-surface-deep/20 tabular-nums">
                                                    {idx + 1}
                                                </td>
                                                {/* Data cells — inline style */}
                                                {table.columns.map(col => (
                                                    <td key={col.key} className="p-0 border-r border-border-subtle last:border-r-0">
                                                        {!table.editable || col.readOnly ? (
                                                            <span className={`px-6 py-4 text-sm block max-w-[240px] truncate ${col.mono
                                                                ? 'font-mono text-primary/80'
                                                                : 'text-text-primary font-black'
                                                                }`}>
                                                                {String(row[col.key] ?? '')}
                                                            </span>
                                                        ) : col.options ? (
                                                            <select
                                                                value={row[col.key] || ''}
                                                                onChange={e => handleCellChange(identifier, col.key, e.target.value)}
                                                                className={`w-full px-6 py-4 bg-transparent outline-none text-sm focus:bg-white/5 transition-all text-text-primary font-black appearance-none cursor-pointer`}
                                                            >
                                                                {col.options.map(opt => (
                                                                    <option key={opt} value={opt} className="bg-surface-elevated text-text-primary">
                                                                        {opt}
                                                                    </option>
                                                                ))}
                                                            </select>
                                                        ) : (
                                                            <input
                                                                type="text"
                                                                value={row[col.key] || ''}
                                                                onChange={e => handleCellChange(identifier, col.key, e.target.value)}
                                                                className={`w-full px-6 py-4 bg-transparent outline-none text-sm focus:bg-white/5 transition-all ${col.mono ? 'font-mono text-primary' : 'text-text-primary font-black'}`}
                                                            />
                                                        )}
                                                    </td>
                                                ))}
                                            </tr>
                                        )
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Footer — same as UsersSheet */}
                    {!isLoading && filteredRows.length > 0 && (
                        <div className="px-6 py-3 border-t border-border-subtle bg-surface-deep/30 flex items-center justify-between">
                            <span className="text-[10px] font-bold text-text-muted uppercase tracking-widest">
                                {filteredRows.length.toLocaleString()} of {rows.length.toLocaleString()} records
                            </span>
                            {search && (
                                <button onClick={() => setSearch('')} className="text-[10px] font-black text-primary uppercase tracking-widest hover:underline">
                                    Clear filter
                                </button>
                            )}
                        </div>
                    )}
                </div>

                {/* Notice — matches UsersSheet warning style */}
                <div className="bg-amber-500/10 border border-amber-500/20 p-6 rounded-[2rem] flex items-start gap-5">
                    <div className="p-3 bg-amber-500/20 rounded-xl text-amber-500 shrink-0">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                    </div>
                    <div>
                        {table.editable ? (
                            <>
                                <h4 className="text-amber-500 font-black text-sm uppercase tracking-widest mb-1">Critical Data Synchronization Notice</h4>
                                <p className="text-amber-500/70 text-xs leading-relaxed font-bold">
                                    Edits here update the live institutional registry. Verify all changes before committing.
                                </p>
                            </>
                        ) : (
                            <>
                                <h4 className="text-amber-500 font-black text-sm uppercase tracking-widest mb-1">Read-Only Table</h4>
                                <p className="text-amber-500/70 text-xs leading-relaxed font-bold">
                                    This table is view-only. Data is pulled live from the database. Use dedicated management pages to make edits.
                                </p>
                            </>
                        )}
                    </div>
                </div>

            </div>
        </DashboardLayout>
    );
};

/* ════════════════════════════════════════════
   ROUTER
════════════════════════════════════════════ */
const TableDetail: React.FC = () => {
    const { tableId } = useParams<{ tableId: string }>();
    const navigate = useNavigate();

    if (tableId === 'users') return <UsersSheet />;

    const table = DB_TABLES.find(t => t.id === tableId);
    if (!table) {
        return (
            <DashboardLayout title="Not Found">
                <div className="flex flex-col items-center justify-center h-64 gap-4">
                    <p className="text-text-muted font-bold uppercase tracking-widest">Table not found</p>
                    <button onClick={() => navigate('/spreadsheet')} className="px-6 py-3 bg-primary text-white rounded-xl text-xs font-black uppercase tracking-widest">← Back</button>
                </div>
            </DashboardLayout>
        );
    }

    return <GenericSheet table={table} />;
};

export default TableDetail;
