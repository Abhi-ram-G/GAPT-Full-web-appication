
import React, { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AuthContext } from '../AuthContext';
import { ApiService } from '../store';
import {
    User as UserIcon, X, CheckCircle2, AlertCircle,
    ArrowLeft, Search, UserCheck, UserX
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const ExaminationAttendance: React.FC = () => {
    const { testId } = useParams<{ testId: string }>();
    const { user } = useContext(AuthContext);
    const navigate = useNavigate();

    const [test, setTest] = useState<any>(null);
    const [students, setStudents] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        const loadData = async () => {
            if (!testId) return;
            setIsLoading(true);
            setError(null);
            try {
                console.log(`[ATTENDANCE] Fetching data for test: ${testId}`);
                const rosterParams: any = {};
                if (user?.role === 'STAFF') {
                    rosterParams.invigilator = user.id;
                }
                const [foundTest, studentList] = await Promise.all([
                    ApiService.getExaminationTest(testId),
                    ApiService.getExaminationStudentList(testId, rosterParams)
                ]);

                // If staff and no students returned (e.g., not assigned), empty roster
                if (user?.role === 'STAFF' && rosterParams.invigilator && (!studentList || studentList.length === 0)) {
                    setStudents([]);
                    setTest(foundTest);
                    setIsLoading(false);
                    return;
                }

                if (!foundTest) {
                    setError("The test record could not be found.");
                } else {
                    setTest(foundTest);
                    setStudents(studentList);
                }
            } catch (err: any) {
                console.error("Failed to load attendance data:", err);
                setError(err.message || String(err));
            } finally {
                setIsLoading(false);
            }
        };
        loadData();
    }, [testId]);

    const handleSetAttendance = async (studentId: string, targetStatus: boolean) => {
        if (!testId) return;
        try {
            await ApiService.markTestAttendance({
                testId,
                studentId,
                isPresent: targetStatus
            });
            // Update local state for immediate feedback
            setStudents(prev => prev.map(s =>
                s.id === studentId ? { ...s, isPresent: targetStatus } : s
            ));
        } catch (err) {
            alert("Failed to update attendance");
        }
    };

    const filteredStudents = students.filter(s =>
        s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (s.regNo && s.regNo.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    if (isLoading) {
        return (
            <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center space-y-4">
                <div className="w-12 h-12 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin"></div>
                <p className="text-slate-400 animate-pulse">Loading examinee roster...</p>
            </div>
        );
    }

    if (error || !test) {
        return (
            <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-center">
                <AlertCircle className="text-rose-500 w-16 h-16 mb-4" />
                <h2 className="text-2xl font-bold text-white mb-2">{error ? "Error Loading Data" : "Test Not Found"}</h2>
                <p className="text-slate-400 mb-6">{error || "The examination record you are looking for does not exist or has been removed."}</p>
                <button
                    onClick={() => navigate('/examination-portal')}
                    className="flex items-center gap-2 px-6 py-3 bg-slate-800 text-white rounded-xl hover:bg-slate-700 transition-all font-bold"
                >
                    <ArrowLeft size={18} />
                    Back to Portal
                </button>
            </div>
        );
    }

    const presentCount = students.filter(s => s.isPresent).length;
    const absentCount = students.length - presentCount;

    return (
        <div className="min-h-screen bg-slate-950 text-white p-6 md:p-10">
            <div className="max-w-5xl mx-auto space-y-8">
                {/* Navigation Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => navigate('/examination-portal')}
                            className="w-10 h-10 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800 transition-all"
                        >
                            <ArrowLeft size={20} />
                        </button>
                        <div>
                            <div className="flex items-center gap-3 mb-1">
                                <h1 className="text-2xl md:text-3xl font-black tracking-tighter uppercase whitespace-nowrap">Mark Attendance</h1>
                                <span className="px-3 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full text-[10px] font-black uppercase tracking-widest hidden md:block">
                                    Invigilator View
                                </span>
                            </div>
                            <p className="text-slate-500 text-sm font-medium">{test.title} • {test.subjectName || test.subject}</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2 bg-slate-900/50 p-2 rounded-2xl border border-slate-800/50 backdrop-blur-sm">
                        <div className="px-4 py-2 rounded-xl bg-slate-950/50 text-center">
                            <div className="text-[10px] font-black text-slate-600 uppercase mb-1">Total</div>
                            <div className="text-lg font-black">{students.length}</div>
                        </div>
                        <div className="px-4 py-2 rounded-xl bg-emerald-500/10 text-center border border-emerald-500/20">
                            <div className="text-[10px] font-black text-emerald-500/60 uppercase mb-1">Present</div>
                            <div className="text-lg font-black text-emerald-400">{presentCount}</div>
                        </div>
                        <div className="px-4 py-2 rounded-xl bg-rose-500/10 text-center border border-rose-500/20">
                            <div className="text-[10px] font-black text-rose-500/60 uppercase mb-1">Absent</div>
                            <div className="text-lg font-black text-rose-400">{absentCount}</div>
                        </div>
                    </div>
                </div>

                {/* Search & Bulk Options */}
                <div className="flex flex-col md:flex-row gap-4">
                    <div className="relative flex-1">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={20} />
                        <input
                            type="text"
                            placeholder="Search by name or registration number..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-slate-900 border border-slate-800 rounded-2xl pl-12 pr-6 py-4 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-all"
                        />
                    </div>
                    {/* Add more filter/sort options if needed */}
                </div>

                {/* Student Roster */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <AnimatePresence>
                        {filteredStudents.length > 0 ? (
                            filteredStudents.map((student, i) => (
                                <motion.div
                                    key={student.id}
                                    layout
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: i * 0.02 }}
                                    className={`p-6 rounded-3xl border transition-all flex items-center justify-between group overflow-hidden ${student.isPresent
                                        ? 'bg-slate-900/40 border-emerald-500/20 hover:border-emerald-500/40'
                                        : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 opacity-80'
                                        }`}
                                >
                                    <div className="flex items-center gap-4">
                                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-lg transition-colors ${student.isPresent ? 'bg-emerald-500/10 text-emerald-500' : 'bg-slate-800 text-slate-500'
                                            }`}>
                                            {student.name.charAt(0)}
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-white group-hover:text-emerald-400 transition-colors uppercase tracking-tight">{student.name}</h3>
                                            <div className="flex items-center gap-2 mt-0.5">
                                                <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest">REG: {student.regNo || 'N/A'}</p>
                                                {student.assignedInvigilatorName && (
                                                    <span className="text-[9px] text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full font-black uppercase tracking-tighter inline-flex items-center gap-1 max-w-[140px] truncate">
                                                        <span className="shrink-0">Hall:</span>
                                                        <span className="truncate">{student.assignedInvigilatorName}</span>
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => handleSetAttendance(student.id, true)}
                                            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all active:scale-95 ${student.isPresent
                                                ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-900/20'
                                                : 'bg-slate-800 text-slate-400 hover:bg-emerald-600/20 hover:text-emerald-400'
                                                }`}
                                        >
                                            <UserCheck size={16} />
                                            {student.isPresent ? 'Present' : 'Present'}
                                        </button>
                                        <button
                                            onClick={() => handleSetAttendance(student.id, false)}
                                            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all active:scale-95 ${!student.isPresent
                                                ? 'bg-rose-600 text-white shadow-lg shadow-rose-900/20'
                                                : 'bg-slate-800 text-slate-400 hover:bg-rose-600/20 hover:text-rose-400'
                                                }`}
                                        >
                                            <UserX size={16} />
                                            {!student.isPresent ? 'Absent' : 'Absent'}
                                        </button>
                                    </div>
                                </motion.div>
                            ))
                        ) : (
                            <div className="col-span-full py-20 bg-slate-900/40 border border-dashed border-slate-800 rounded-3xl flex flex-col items-center justify-center text-slate-600">
                                <Search size={40} className="mb-4 opacity-10" />
                                <p className="font-bold uppercase tracking-widest">No students found</p>
                            </div>
                        )}
                    </AnimatePresence>
                </div>
            </div>
        </div>
    );
};

export default ExaminationAttendance;
