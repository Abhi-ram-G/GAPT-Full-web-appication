
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../components/DashboardLayout';
import { ApiService } from '../store';

/* ── Shared table config (imported by TableDetail too) ── */
export type ColDef = { key: string; label: string; mono?: boolean; readOnly?: boolean; options?: string[] };
export interface TableConfig {
  id: string;
  label: string;
  icon: string;
  description: string;
  color: string;         // active pill colour
  accentBg: string;      // card accent gradient
  fetch: () => Promise<any[]>;
  columns: ColDef[];
  editable?: boolean;
  save?: (rows: any[], originalRows?: any[]) => Promise<void>;
}

export const DB_TABLES: TableConfig[] = [
  {
    id: 'users',
    label: 'Users',
    icon: '👥',
    description: 'All institutional members — students, staff, HODs, deans & admins',
    color: 'text-primary border-primary bg-primary/10',
    accentBg: 'from-primary/10 to-transparent',
    fetch: async () => {
      const users = await ApiService.getUsers();
      return users.map((u: any) => ({
        id: u.id, name: u.name || '', email: u.email || '',
        role: u.role || '', department: u.department || '',
        regNo: u.regNo || '', staffId: u.staffId || '',
        status: u.status || '', password: '',
      }));
    },
    columns: [
      { key: 'name', label: 'Name' },
      { key: 'email', label: 'Email', mono: true },
      { key: 'role', label: 'Role' },
      { key: 'department', label: 'Department' },
      { key: 'regNo', label: 'Reg No', mono: true },
      { key: 'staffId', label: 'Staff ID', mono: true },
      { key: 'status', label: 'Status' },
      { key: 'password', label: 'Password (type to reset)' },
    ],
    editable: true,
  },
  {
    id: 'contacts_directory',
    label: 'Contacts',
    icon: '📞',
    description: 'Phone numbers and emails for Students, Staff, HODs, Deans, and Admins',
    color: 'text-sky-400 border-sky-400 bg-sky-400/10',
    accentBg: 'from-sky-500/10 to-transparent',
    fetch: async () => {
      const users = await ApiService.getUsers();
      return users.map((u: any) => ({
        id: u.id,
        name: u.name || 'UNKNOWN',
        role: u.role || 'N/A',
        identifier: u.regNo || u.staffId || 'N/A',
        department: u.department || 'N/A',
        phone: u.phone || 'N/A',
        email: u.email || 'N/A',
        batchId: u.batchId || '',
        studyYear: u.studyYear || '',
      }));
    },
    columns: [
      { key: 'name', label: 'Name' },
      { key: 'role', label: 'Role' },
      { key: 'identifier', label: 'ID / Reg No', mono: true },
      { key: 'department', label: 'Department' },
      { key: 'phone', label: 'Phone Number', mono: true },
      { key: 'email', label: 'Email Address', mono: true },
    ],
  },
  {
    id: 'courses',
    label: 'Departments',
    icon: '🏛️',
    description: 'Academic departments and degree programmes registered in the system',
    color: 'text-indigo-400 border-indigo-400 bg-indigo-400/10',
    accentBg: 'from-indigo-500/10 to-transparent',
    fetch: () => ApiService.getCurriculum(),
    columns: [
      { key: 'name', label: 'Department Name' },
      { key: 'degree', label: 'Degree' },
      { key: 'code', label: 'Code', mono: true },
    ],
  },
  {
    id: 'batches',
    label: 'Academic Batches',
    icon: '📚',
    description: 'Academic batch cohorts with start/end years and programme types',
    color: 'text-violet-400 border-violet-400 bg-violet-400/10',
    accentBg: 'from-violet-500/10 to-transparent',
    fetch: () => ApiService.getAcademicBatches(),
    columns: [
      { key: 'name', label: 'Batch Name' },
      { key: 'startYear', label: 'Start Year', mono: true },
      { key: 'endYear', label: 'End Year', mono: true },
      { key: 'type', label: 'Type' },
    ],
  },
  {
    id: 'tasks',
    label: 'Tasks',
    icon: '📋',
    description: 'Academic assignments and tasks assigned across departments',
    color: 'text-sky-400 border-sky-400 bg-sky-400/10',
    accentBg: 'from-sky-500/10 to-transparent',
    fetch: () => ApiService.getTasks(),
    columns: [
      { key: 'title', label: 'Title' },
      { key: 'subjectName', label: 'Subject' },
      { key: 'dueDate', label: 'Due Date', mono: true },
      { key: 'status', label: 'Status' },
      { key: 'priority', label: 'Priority' },
    ],
  },
  {
    id: 'mark_batches',
    label: 'Mark Batches',
    icon: '📊',
    description: 'Assessment batches (Internal 1, Internal 2, End Semester) per subject',
    color: 'text-amber-400 border-amber-400 bg-amber-400/10',
    accentBg: 'from-amber-500/10 to-transparent',
    fetch: () => ApiService.getMarkBatches(),
    columns: [
      { key: 'name', label: 'Batch Name' },
      { key: 'subject', label: 'Subject' },
      { key: 'maxMarks', label: 'Max Marks', mono: true },
      { key: 'createdAt', label: 'Created At', mono: true },
    ],
  },
  {
    id: 'mark_records',
    label: 'Mark Records',
    icon: '📝',
    description: 'Individual student marks per subject and assessment batch',
    color: 'text-rose-400 border-rose-400 bg-rose-400/10',
    accentBg: 'from-rose-500/10 to-transparent',
    fetch: () => ApiService.getMarkRecords(),
    columns: [
      { key: 'studentName', label: 'Student' },
      { key: 'subject', label: 'Subject' },
      { key: 'marks', label: 'Marks', mono: true },
      { key: 'maxMarks', label: 'Max', mono: true },
      { key: 'batchName', label: 'Batch' },
    ],
  },
  {
    id: 'attendance',
    label: 'Attendance',
    icon: '📅',
    description: 'Daily subject-wise attendance records for all students',
    color: 'text-emerald-400 border-emerald-400 bg-emerald-400/10',
    accentBg: 'from-emerald-500/10 to-transparent',
    fetch: async () => {
      const [attendance, users] = await Promise.all([
        ApiService.getAttendance(),
        ApiService.getUsers()
      ]);
      const userMap = new Map(users.map(u => [u.id, u.name]));
      return attendance.map(a => {
        const row: any = { id: a.id, studentName: userMap.get(a.userId) || 'Unknown', date: a.date };
        a.hours?.forEach(h => {
          row[`hour${h.hour}`] = h.status + (h.staffName ? ` (${h.staffName})` : '');
        });
        return row;
      });
    },
    columns: [
      { key: 'studentName', label: 'Student' },
      { key: 'date', label: 'Date', mono: true },
      { key: 'hour1', label: 'Hour 1' },
      { key: 'hour2', label: 'Hour 2' },
      { key: 'hour3', label: 'Hour 3' },
      { key: 'hour4', label: 'Hour 4' },
      { key: 'hour5', label: 'Hour 5' },
      { key: 'hour6', label: 'Hour 6' },
      { key: 'hour7', label: 'Hour 7' },
    ],
  },
  {
    id: 'leave',
    label: 'Leave Requests',
    icon: '🏖️',
    description: 'Student and staff leave applications with approval status',
    color: 'text-orange-400 border-orange-400 bg-orange-400/10',
    accentBg: 'from-orange-500/10 to-transparent',
    fetch: () => ApiService.getLeaveRequests(),
    columns: [
      { key: 'studentName', label: 'Applicant' },
      { key: 'type', label: 'Type' },
      { key: 'startDate', label: 'From', mono: true },
      { key: 'endDate', label: 'To', mono: true },
      { key: 'status', label: 'Status' },
      { key: 'reason', label: 'Reason' },
    ],
  },
  {
    id: 'access_matrix',
    label: 'Access Matrix',
    icon: '🔐',
    description: 'Role-based access control and feature permissions',
    color: 'text-pink-400 border-pink-400 bg-pink-400/10',
    accentBg: 'from-pink-500/10 to-transparent',
    fetch: async () => {
      const perms = await ApiService.getPermissions();
      const rows: any[] = [];
      Object.entries(perms).forEach(([role, features]) => {
        Object.entries(features).forEach(([feature, level]) => {
          rows.push({ id: `${role}-${feature}`, role, feature, level });
        });
      });
      return rows;
    },
    columns: [
      { key: 'role', label: 'Role', readOnly: true },
      { key: 'feature', label: 'Feature Segment', readOnly: true },
      { key: 'level', label: 'Access Level', options: ['NONE', 'VIEW_OWN', 'VIEW_ALL', 'EDIT_ALL'] },
    ],
    editable: true,
    save: async (rows, originalRows = []) => {
      // Find diffs and save
      for (const row of rows) {
        const orig = originalRows.find(r => r.id === row.id);
        if (orig && orig.level !== row.level) {
          await ApiService.updatePermission(row.role, row.feature, row.level);
        }
      }
    }
  },
  {
    id: 'materials',
    label: 'Study Materials',
    icon: '📂',
    description: 'Resource files and study materials uploaded for subjects',
    color: 'text-cyan-400 border-cyan-400 bg-cyan-400/10',
    accentBg: 'from-cyan-500/10 to-transparent',
    fetch: async () => {
      const subjects = await ApiService.getSubjects();
      const rows: any[] = [];
      subjects.forEach((subj: any) => {
        const materials = subj.materials || [];
        materials.forEach((mat: any, idx: number) => {
          rows.push({
            id: `${subj.id}-${idx}`,
            subjectName: subj.name,
            subjectCode: subj.code,
            fileName: typeof mat === 'string' ? mat : mat.name || JSON.stringify(mat),
          });
        });
      });
      return rows;
    },
    columns: [
      { key: 'subjectName', label: 'Subject' },
      { key: 'subjectCode', label: 'Code', mono: true },
      { key: 'fileName', label: 'File Name', mono: true },
    ],
  },
];

/* ─────────────────────────────────────────────────────────────── */
const Spreadsheet: React.FC = () => {
  const navigate = useNavigate();
  const [counts, setCounts] = useState<Record<string, number | null>>({});

  /* Pre-fetch just counts for each table */
  useEffect(() => {
    DB_TABLES.forEach(async tbl => {
      try {
        const rows = await tbl.fetch();
        setCounts(p => ({ ...p, [tbl.id]: rows.length }));
      } catch {
        setCounts(p => ({ ...p, [tbl.id]: 0 }));
      }
    });
  }, []);

  return (
    <DashboardLayout title="Institutional Data Sheets">
      <div className="space-y-8">

        {/* ── Page header ── */}
        <div className="bg-surface-elevated border border-border-subtle rounded-3xl p-8 shadow-sm">
          <h2 className="text-2xl font-black text-text-primary uppercase tracking-tight">
            Database Registry
          </h2>
          <p className="text-[11px] text-text-muted font-bold uppercase tracking-[0.2em] mt-2">
            {DB_TABLES.length} tables connected · Click a table to view its full data
          </p>
        </div>

        {/* ── Table cards grid ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {DB_TABLES.map(tbl => {
            const count = counts[tbl.id];
            const isLoading = count === undefined;
            return (
              <button
                key={tbl.id}
                onClick={() => navigate(`/spreadsheet/${tbl.id}`)}
                className="group text-left bg-surface-elevated border border-border-subtle rounded-3xl overflow-hidden hover:border-primary/40 hover:shadow-xl hover:shadow-primary/5 transition-all duration-300 active:scale-[0.98]"
              >
                {/* Accent top bar */}
                <div className={`h-1 w-full bg-gradient-to-r ${tbl.accentBg} group-hover:opacity-100 opacity-60 transition-opacity`} />

                <div className="p-6 space-y-4">
                  {/* Icon + count */}
                  <div className="flex items-start justify-between">
                    <span className="text-3xl">{tbl.icon}</span>
                    <span className={`text-[10px] font-black px-2.5 py-1 rounded-full border tabular-nums transition-all ${isLoading
                      ? 'text-text-muted border-border-subtle bg-surface-deep animate-pulse'
                      : tbl.color
                      }`}>
                      {isLoading ? '...' : count?.toLocaleString()}
                    </span>
                  </div>

                  {/* Label */}
                  <div>
                    <h3 className="text-sm font-black text-text-primary uppercase tracking-tight group-hover:text-primary transition-colors">
                      {tbl.label}
                    </h3>
                    <p className="text-[10px] text-text-muted font-medium mt-1 leading-relaxed">
                      {tbl.description}
                    </p>
                  </div>

                  {/* Footer */}
                  <div className="flex items-center justify-between pt-2 border-t border-border-subtle">
                    <span className={`text-[9px] font-black uppercase tracking-widest ${tbl.editable ? 'text-primary' : 'text-text-muted'}`}>
                      {tbl.editable ? '✏️ Editable' : '👁 View Only'}
                    </span>
                    <span className="text-[10px] font-black text-text-muted group-hover:text-primary transition-colors flex items-center gap-1">
                      Open →
                    </span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

      </div>
    </DashboardLayout>
  );
};

export default Spreadsheet;
