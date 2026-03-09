import {
  User, UserRole, UserStatus, AcademicData, Notification, MarkBatch,
  MarkRecord, BatchStatus, Course, AcademicBatch, Timetable,
  AcademicTask, TaskStatus, AttendanceEditRequest, AttendanceRecord,
  LeaveRequest, SiteSettings, BatchCurriculumStatus, PortalConnection,
  PermissionMap, Feature, AccessLevel, StudentTaskProgress, TaskPriority,
  PortalConnectionStatus, PortalPermission, LeaveStatus, LeaveType
} from './types';
import BackendApiService from './services/BackendApiService';
import { ADMIN_EMAIL, DEFAULT_ADMIN_PASSWORD } from './constants';

const DB_KEYS = {
  USERS: 'gapt_users',
  CURRICULUM: 'gapt_curriculum',
  ACADEMIC_BATCHES: 'gapt_academic_batches',
  MARK_BATCHES: 'gapt_mark_batches',
  MARK_RECORDS: 'gapt_mark_records',
  ATTENDANCE: 'gapt_attendance',
  TASKS: 'gapt_tasks',
  NOTIFICATIONS: 'gapt_notifications',
  LEAVE_REQUESTS: 'gapt_leave_requests',
  PORTALS: 'gapt_portals',
  TASK_EDIT_REQUESTS: 'gapt_task_edit_requests',
  TIMETABLES: 'gapt_timetables',
  CURRICULUM_REQUESTS: 'gapt_curriculum_requests',
  CURRICULUM_STATUS: 'gapt_curriculum_status',
  ATTENDANCE_EDIT_REQUESTS: 'gapt_attendance_edit_requests',
  SETTINGS: 'gapt_settings',
  PERMISSIONS: 'gapt_permissions',
  CHAT_MESSAGES: 'gapt_chat_messages',
  EMAILS: 'gapt_emails',
  SPREADSHEET_DATA: 'gapt_spreadsheet_data'
};

export class MockDB {
  private static get<T>(key: string, defaultValue: T): T {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : defaultValue;
  }

  private static set<T>(key: string, value: T): void {
    localStorage.setItem(key, JSON.stringify(value));
  }

  static async seedDatabase() {
    const now = new Date().toISOString();

    // Seed Users
    const seedUsers: User[] = [
      { id: 'admin-1', email: ADMIN_EMAIL, password: DEFAULT_ADMIN_PASSWORD, name: 'SYSTEM ADMINISTRATOR', role: UserRole.ADMIN, status: UserStatus.APPROVED, createdAt: now, department: 'Central Administration', designation: 'Super Admin' },
      { id: 'dean-1', email: 'dean@gapt.edu', password: 'password', name: 'Dr. Robert Smith', role: UserRole.DEAN, status: UserStatus.APPROVED, createdAt: now, department: 'Academics', designation: 'Dean of Academics', experience: '20' },
      { id: 'hod-cse', email: 'hod.cse@gapt.edu', password: 'password', name: 'Dr. Alice Johnson', role: UserRole.HOD, status: UserStatus.APPROVED, createdAt: now, department: 'Computer Science', designation: 'Head of Department', experience: '15' },
      { id: 'staff-1', email: 'staff1@gapt.edu', password: 'password', name: 'Prof. Mark Davis', role: UserRole.STAFF, status: UserStatus.APPROVED, createdAt: now, department: 'Computer Science', designation: 'Assistant Professor', experience: '8' },
      { id: 'staff-2', email: 'staff2@gapt.edu', password: 'password', name: 'Prof. Sarah Wilson', role: UserRole.STAFF, status: UserStatus.APPROVED, createdAt: now, department: 'Computer Science', designation: 'Associate Professor', experience: '12' },
      { id: 'student-1', email: 'student1@gapt.edu', password: 'password', name: 'John Doe', role: UserRole.STUDENT, status: UserStatus.APPROVED, createdAt: now, department: 'Computer Science', studyYear: '3', regNo: 'CS2024001', mentorId: 'staff-1', mentorName: 'Prof. Mark Davis' },
      { id: 'student-2', email: 'student2@gapt.edu', password: 'password', name: 'Jane Smith', role: UserRole.STUDENT, status: UserStatus.APPROVED, createdAt: now, department: 'Computer Science', studyYear: '3', regNo: 'CS2024002', mentorId: 'staff-1', mentorName: 'Prof. Mark Davis' }
    ];
    this.set(DB_KEYS.USERS, seedUsers);

    // Seed Permissions
    const seedPerms: Record<string, PermissionMap> = {
      [UserRole.ADMIN]: Object.values(Feature).reduce((acc, f) => ({ ...acc, [f]: AccessLevel.EDIT_ALL }), {}),
      [UserRole.DEAN]: Object.values(Feature).reduce((acc, f) => ({ ...acc, [f]: AccessLevel.VIEW_ALL }), {}),
      [UserRole.HOD]: Object.values(Feature).reduce((acc, f) => ({ ...acc, [f]: AccessLevel.EDIT_STAFF_STUDENTS }), {}),
      [UserRole.STAFF]: Object.values(Feature).reduce((acc, f) => ({ ...acc, [f]: AccessLevel.EDIT_STUDENTS }), {}),
      [UserRole.STUDENT]: Object.values(Feature).reduce((acc, f) => ({ ...acc, [f]: AccessLevel.NO_ACCESS }), {})
    };
    this.set(DB_KEYS.PERMISSIONS, seedPerms);

    // Seed Curriculum
    const seedCourses: Course[] = [
      {
        id: 'course-cse', name: 'Computer Science and Engineering', degree: 'B.Tech', domain: 'Engineering', batchType: 'UG', subjects: [
          { id: 'sub-1', code: 'CS301', name: 'Data Structures', credits: 4, semester: 3, lessonsCount: 5, materials: [], assignedStaffIds: ['staff-1'] },
          { id: 'sub-2', code: 'CS302', name: 'Database Systems', credits: 3, semester: 3, lessonsCount: 4, materials: [], assignedStaffIds: ['staff-2'] }
        ]
      }
    ];
    this.set(DB_KEYS.CURRICULUM, seedCourses);

    // Seed Batches
    const seedBatches: AcademicBatch[] = [
      { id: 'batch-2024', name: 'Class of 2024', startYear: 2020, endYear: 2024, batchType: 'UG', departmentIds: ['course-cse'] }
    ];
    this.set(DB_KEYS.ACADEMIC_BATCHES, seedBatches);

    // Seed Tasks
    const seedTasks: AcademicTask[] = [
      {
        id: 'task-1', title: 'Implement B-Tree', description: 'Write a C++ program to implement B-Tree insertion and deletion.', dueDate: new Date(Date.now() + 86400000 * 7).toISOString(), priority: TaskPriority.HIGH, status: TaskStatus.IN_PROGRESS, subjectId: 'sub-1', subjectName: 'Data Structures', department: 'Computer Science', studyYear: '3', staffId: 'staff-1', staffName: 'Prof. Mark Davis', createdAt: now, assignedStudents: [
          { studentId: 'student-1', studentName: 'John Doe', progress: StudentTaskProgress.ONGOING },
          { studentId: 'student-2', studentName: 'Jane Smith', progress: StudentTaskProgress.COMPLETED, marks: 95 }
        ]
      }
    ];
    this.set(DB_KEYS.TASKS, seedTasks);

    // Seed Emails
    const seedEmails = [
      { id: 'email-1', from: 'admin@gapt.edu', fromName: 'SYSTEM ADMINISTRATOR', to: 'student1@gapt.edu', subject: 'Welcome to GAPT', body: 'Welcome to the Green Academic Performance Tracker. Your account has been provisioned.', timestamp: now, read: false, starred: true, trash: false },
      { id: 'email-2', from: 'dean@gapt.edu', fromName: 'Dr. Robert Smith', to: 'staff1@gapt.edu', subject: 'Faculty Meeting', body: 'Please attend the faculty meeting tomorrow at 10 AM.', timestamp: now, read: false, starred: false, trash: false }
    ];
    this.set(DB_KEYS.EMAILS, seedEmails);

    // Seed Portals
    const seedPortals: PortalConnection[] = [
      { id: 'portal-1', name: 'Library System', url: 'https://library.gapt.edu', handshakeId: 'lib-auth-1', status: PortalConnectionStatus.CONNECTED, permission: PortalPermission.READ_ONLY, lastSync: now },
      { id: 'portal-2', name: 'LMS Canvas', url: 'https://lms.gapt.edu', handshakeId: 'lms-auth-2', status: PortalConnectionStatus.CONNECTED, permission: PortalPermission.READ_WRITE, lastSync: now }
    ];
    this.set(DB_KEYS.PORTALS, seedPortals);

    // Seed Mark Batches
    const seedMarkBatches: MarkBatch[] = [
      { id: 'mb-1', name: 'Midterm Exams 2024', academicYear: '2024', status: BatchStatus.OPEN, subjects: ['sub-1'], createdAt: now }
    ];
    this.set(DB_KEYS.MARK_BATCHES, seedMarkBatches);

    // Seed Mark Records
    const seedMarkRecords: MarkRecord[] = [
      { id: 'mr-1', batchId: 'mb-1', studentId: 'student-1', subject: 'sub-1', marks: 85, maxMarks: 100, updatedAt: now, updatedBy: 'staff-1' },
      { id: 'mr-2', batchId: 'mb-1', studentId: 'student-2', subject: 'sub-1', marks: 92, maxMarks: 100, updatedAt: now, updatedBy: 'staff-1' }
    ];
    this.set(DB_KEYS.MARK_RECORDS, seedMarkRecords);

    // Seed Attendance
    const seedAttendance: AttendanceRecord[] = [
      { id: 'att-1', userId: 'student-1', date: now.split('T')[0], isPresent: true, markedBy: 'staff-1' },
      { id: 'att-2', userId: 'student-2', date: now.split('T')[0], isPresent: true, markedBy: 'staff-1' }
    ];
    this.set(DB_KEYS.ATTENDANCE, seedAttendance);

    // Seed Leave Requests
    const seedLeaveRequests: LeaveRequest[] = [
      { id: 'lr-1', studentId: 'student-1', studentName: 'John Doe', studentYear: '3', studentDegree: 'B.Tech', mentorId: 'staff-1', type: LeaveType.MEDICAL, startDate: now.split('T')[0], startTime: '09:00', endDate: new Date(Date.now() + 86400000 * 2).toISOString().split('T')[0], endTime: '16:00', reason: 'Medical Leave', status: LeaveStatus.PENDING, createdAt: now }
    ];
    this.set(DB_KEYS.LEAVE_REQUESTS, seedLeaveRequests);

    // Seed Spreadsheet Data
    const seedSpreadsheetData = [
      { id: 'row-1', col1: 'Data 1', col2: 'Data 2', col3: 'Data 3' }
    ];
    this.set(DB_KEYS.SPREADSHEET_DATA, seedSpreadsheetData);
  }

  // --- Identity Management ---
  static async getUsers(): Promise<User[]> {
    const users = this.get<User[]>(DB_KEYS.USERS, []);
    if (users.length === 0) {
      await this.seedDatabase();
      return this.get<User[]>(DB_KEYS.USERS, []);
    }
    return users;
  }

  static async addUser(user: User): Promise<void> {
    const users = await this.getUsers();
    this.set(DB_KEYS.USERS, [...users, user]);
  }

  static async updateUser(id: string, updates: Partial<User>): Promise<void> {
    const users = await this.getUsers();
    this.set(DB_KEYS.USERS, users.map(u => u.id === id ? { ...u, ...updates } : u));
  }

  static async deleteUser(userId: string): Promise<void> {
    const users = await this.getUsers();
    this.set(DB_KEYS.USERS, users.filter(u => u.id !== userId));
  }

  // --- Academic Logic ---
  static async getAcademicData(userId: string): Promise<AcademicData> {
    const marks = await this.getMarkRecordsByStudent(userId);
    if (!marks.length) {
      return { attendance: 85, cgpa: 0, sgpa: 0, credits: 0, greenPoints: 85 };
    }
    const cgpa = marks.reduce((acc, m) => acc + (m.marks / m.maxMarks) * 10, 0) / marks.length;
    return {
      attendance: 88,
      cgpa: parseFloat(cgpa.toFixed(2)),
      sgpa: parseFloat(cgpa.toFixed(2)),
      credits: marks.length * 3,
      greenPoints: Math.round(cgpa * 10 + 88)
    };
  }

  static async getStudentPerformanceMatrix(userId: string): Promise<any> {
    const marks = await this.getMarkRecordsByStudent(userId);
    const batches = await this.getMarkBatches();
    const matrix: any = {};

    marks.forEach(m => {
      const b = batches.find(batch => batch.id === m.batchId);
      const semMatch = b?.name.match(/SEM (\d+)/i);
      const sem = semMatch ? `Semester ${semMatch[1]}` : 'General';

      if (!matrix[sem]) matrix[sem] = {};
      if (!matrix[sem][m.subject]) matrix[sem][m.subject] = { max: m.maxMarks };

      const bName = b?.name.toUpperCase() || '';
      if (bName.includes('INTERNAL 1')) matrix[sem][m.subject].i1 = m.marks;
      else if (bName.includes('INTERNAL 2')) matrix[sem][m.subject].i2 = m.marks;
      else matrix[sem][m.subject].es = m.marks;
    });

    return matrix;
  }

  // --- Curriculum ---
  static async getCurriculum(): Promise<Course[]> {
    return this.get<Course[]>(DB_KEYS.CURRICULUM, []);
  }

  static async getAcademicBatches(): Promise<AcademicBatch[]> {
    return this.get<AcademicBatch[]>(DB_KEYS.ACADEMIC_BATCHES, []);
  }

  static async persistStructure(courses: Course[], batches: AcademicBatch[]) {
    this.set(DB_KEYS.CURRICULUM, courses);
    this.set(DB_KEYS.ACADEMIC_BATCHES, batches);
  }

  static async getCurriculumStatus(batchId: string, deptId: string): Promise<BatchCurriculumStatus> {
    const status = this.get<Record<string, BatchCurriculumStatus>>(DB_KEYS.CURRICULUM_STATUS, {});
    return status[`${batchId}_${deptId}`] || BatchCurriculumStatus.FROZEN;
  }

  static async setCurriculumStatus(batchId: string, deptId: string, status: BatchCurriculumStatus) {
    const st = this.get<Record<string, BatchCurriculumStatus>>(DB_KEYS.CURRICULUM_STATUS, {});
    st[`${batchId}_${deptId}`] = status;
    this.set(DB_KEYS.CURRICULUM_STATUS, st);
  }

  static async updateSubjectMaterials(courseId: string, subjectId: string, materials: string[]) {
    const cur = await this.getCurriculum();
    this.set(DB_KEYS.CURRICULUM, cur.map(c => c.id === courseId ? {
      ...c, subjects: c.subjects.map(s => s.id === subjectId ? { ...s, materials } : s)
    } : c));
  }

  // --- Marks ---
  static async getMarkBatches(): Promise<MarkBatch[]> {
    return this.get<MarkBatch[]>(DB_KEYS.MARK_BATCHES, []);
  }

  static async addMarkBatch(batch: MarkBatch) {
    const b = await this.getMarkBatches();
    this.set(DB_KEYS.MARK_BATCHES, [...b, batch]);
  }

  static async updateMarkBatch(id: string, updates: Partial<MarkBatch>) {
    const b = await this.getMarkBatches();
    this.set(DB_KEYS.MARK_BATCHES, b.map(x => x.id === id ? { ...x, ...updates } : x));
  }

  static async getMarkRecords(batchId?: string): Promise<MarkRecord[]> {
    const records = this.get<MarkRecord[]>(DB_KEYS.MARK_RECORDS, []);
    return batchId ? records.filter(m => m.batchId === batchId) : records;
  }

  static async getMarkRecordsByStudent(userId: string): Promise<MarkRecord[]> {
    const records = await this.getMarkRecords();
    return records.filter(x => x.studentId === userId);
  }

  static async upsertMarkRecord(record: MarkRecord) {
    const records = await this.getMarkRecords();
    const idx = records.findIndex(x => x.studentId === record.studentId && x.batchId === record.batchId && x.subject === record.subject);
    if (idx > -1) records[idx] = record;
    else records.push(record);
    this.set(DB_KEYS.MARK_RECORDS, records);
  }

  // --- Attendance ---
  static async getAttendance(date?: string): Promise<AttendanceRecord[]> {
    const a = this.get<AttendanceRecord[]>(DB_KEYS.ATTENDANCE, []);
    return date ? a.filter(x => x.date === date) : a;
  }

  static async saveAttendanceBatch(records: AttendanceRecord[]) {
    if (!records || records.length === 0) return;
    const date = records[0].date;
    const a = await this.getAttendance();
    const filtered = a.filter(x => x.date !== date);
    this.set(DB_KEYS.ATTENDANCE, [...filtered, ...records]);
  }

  static async getAttendanceEditRequests(): Promise<AttendanceEditRequest[]> {
    return this.get<AttendanceEditRequest[]>(DB_KEYS.ATTENDANCE_EDIT_REQUESTS, []);
  }

  static async getAttendanceEditRequest(userId: string, date: string) {
    const reqs = await this.getAttendanceEditRequests();
    return reqs.find(r => r.requesterId === userId && r.date === date) || null;
  }

  static async upsertAttendanceEditRequest(req: AttendanceEditRequest) {
    const reqs = await this.getAttendanceEditRequests();
    const idx = reqs.findIndex(r => r.id === req.id);
    if (idx > -1) reqs[idx] = req;
    else reqs.push(req);
    this.set(DB_KEYS.ATTENDANCE_EDIT_REQUESTS, reqs);
  }

  // --- Tasks & Notifications ---
  static async getTasks(): Promise<AcademicTask[]> {
    return this.get<AcademicTask[]>(DB_KEYS.TASKS, []);
  }

  static async addTask(task: AcademicTask) {
    const t = await this.getTasks();
    this.set(DB_KEYS.TASKS, [...t, task]);
  }

  static async updateTask(id: string, updates: Partial<AcademicTask>) {
    const t = await this.getTasks();
    this.set(DB_KEYS.TASKS, t.map(x => x.id === id ? { ...x, ...updates } : x));
  }

  static async deleteTask(id: string) {
    const t = await this.getTasks();
    this.set(DB_KEYS.TASKS, t.filter(x => x.id !== id));
  }

  static async updateStudentTaskProgress(taskId: string, studentId: string, progress: StudentTaskProgress, details?: string) {
    const tasks = await this.getTasks();
    const updated = tasks.map(t => {
      if (t.id === taskId && t.assignedStudents) {
        return {
          ...t,
          assignedStudents: t.assignedStudents.map(s =>
            s.studentId === studentId ? { ...s, progress, details: details ?? s.details } : s
          )
        };
      }
      return t;
    });
    this.set(DB_KEYS.TASKS, updated);
  }

  static async assignStaffToTask(taskId: string, staffId: string) {
    const tasks = await this.getTasks();
    const users = await this.getUsers();
    const staff = users.find(u => u.id === staffId);
    if (!staff) return;
    this.set(DB_KEYS.TASKS, tasks.map(t => t.id === taskId ? { ...t, staffId: staff.id, staffName: staff.name } : t));
  }

  static async checkDeadlines() {
    // No-op for now
  }

  static async getNotifications(userId?: string): Promise<Notification[]> {
    const n = this.get<Notification[]>(DB_KEYS.NOTIFICATIONS, []);
    return userId ? n.filter(x => x.userId === userId || !x.userId) : n;
  }

  static async addNotification(n: Notification) {
    const notifs = await this.getNotifications();
    this.set(DB_KEYS.NOTIFICATIONS, [n, ...notifs]);
  }

  static async clearNotifications(userId?: string) {
    if (userId) {
      const n = await this.getNotifications();
      this.set(DB_KEYS.NOTIFICATIONS, n.filter(x => x.userId !== userId));
    } else {
      this.set(DB_KEYS.NOTIFICATIONS, []);
    }
  }

  // --- Other Operations ---
  static async getSettings(): Promise<SiteSettings> {
    return this.get<SiteSettings>(DB_KEYS.SETTINGS, {
      name: 'GAPT',
      institution: 'BIT',
      adminEmail: ADMIN_EMAIL,
      themeColor: '#10b981',
      description: 'Institutional Paperless Academic Registry'
    });
  }

  static async updateSettings(s: SiteSettings) {
    this.set(DB_KEYS.SETTINGS, s);
  }

  static async getPermissions(): Promise<Record<string, PermissionMap>> {
    return this.get<Record<string, PermissionMap>>(DB_KEYS.PERMISSIONS, {});
  }

  static async updatePermissions(role: UserRole, feature: Feature, level: AccessLevel) {
    const p = await this.getPermissions();
    if (!p[role]) p[role] = {};
    p[role][feature] = level;
    this.set(DB_KEYS.PERMISSIONS, p);
  }

  static async getTimetables(): Promise<Timetable[]> {
    return this.get<Timetable[]>(DB_KEYS.TIMETABLES, []);
  }

  static async saveTimetable(tt: Timetable) {
    const t = await this.getTimetables();
    const idx = t.findIndex(x => x.id === tt.id);
    if (idx > -1) t[idx] = tt;
    else t.push(tt);
    this.set(DB_KEYS.TIMETABLES, t);
  }

  static async getLeaveRequests(): Promise<LeaveRequest[]> {
    return this.get<LeaveRequest[]>(DB_KEYS.LEAVE_REQUESTS, []);
  }

  static async addLeaveRequest(req: LeaveRequest) {
    const l = await this.getLeaveRequests();
    this.set(DB_KEYS.LEAVE_REQUESTS, [...l, req]);
  }

  static async updateLeaveRequest(id: string, updates: Partial<LeaveRequest>) {
    const l = await this.getLeaveRequests();
    this.set(DB_KEYS.LEAVE_REQUESTS, l.map(x => x.id === id ? { ...x, ...updates } : x));
  }

  static async getPortals(): Promise<PortalConnection[]> {
    return this.get<PortalConnection[]>(DB_KEYS.PORTALS, []);
  }

  static async addPortal(p: PortalConnection) {
    const portals = await this.getPortals();
    this.set(DB_KEYS.PORTALS, [...portals, p]);
  }

  static async updatePortal(id: string, updates: any) {
    const portals = await this.getPortals();
    this.set(DB_KEYS.PORTALS, portals.map(p => p.id === id ? { ...p, ...updates } : p));
  }

  static async deletePortal(id: string) {
    const portals = await this.getPortals();
    this.set(DB_KEYS.PORTALS, portals.filter(p => p.id !== id));
  }

  // --- Chat, Email & Spreadsheet ---
  static async getChatMessages(): Promise<any[]> {
    return this.get<any[]>(DB_KEYS.CHAT_MESSAGES, []);
  }

  static async addChatMessage(msg: any) {
    const msgs = await this.getChatMessages();
    this.set(DB_KEYS.CHAT_MESSAGES, [...msgs, msg]);
  }

  static async getEmails(): Promise<any[]> {
    return this.get<any[]>(DB_KEYS.EMAILS, []);
  }

  static async addEmail(email: any) {
    const emails = await this.getEmails();
    this.set(DB_KEYS.EMAILS, [...emails, email]);
  }

  static async updateEmail(id: string, updates: any) {
    const emails = await this.getEmails();
    this.set(DB_KEYS.EMAILS, emails.map(e => e.id === id ? { ...e, ...updates } : e));
  }

  static async deleteEmail(id: string) {
    const emails = await this.getEmails();
    this.set(DB_KEYS.EMAILS, emails.filter(e => e.id !== id));
  }

  static async getSpreadsheetData(): Promise<any[]> {
    const data = this.get<any[]>(DB_KEYS.SPREADSHEET_DATA, []);
    if (data.length === 0) {
      // Initial data from users
      const users = await this.getUsers();
      const initialData = users.map(u => ({
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role,
        department: u.department || 'N/A'
      }));
      this.set(DB_KEYS.SPREADSHEET_DATA, initialData);
      return initialData;
    }
    return data;
  }

  static async updateSpreadsheetData(newData: any[]) {
    this.set(DB_KEYS.SPREADSHEET_DATA, newData);
    // Sync back to users if needed
    const users = await this.getUsers();
    const updatedUsers = users.map(u => {
      const row = newData.find(r => r.id === u.id);
      if (row) {
        return { ...u, name: row.name, email: row.email, role: row.role, department: row.department };
      }
      return u;
    });
    this.set(DB_KEYS.USERS, updatedUsers);
  }

  static async getTaskEditRequests(): Promise<any[]> {
    return this.get<any[]>(DB_KEYS.TASK_EDIT_REQUESTS, []);
  }

  static async assignStudentsToStaff(mentor1Id: string, mentor1Name: string, mentor2Id: string, mentor2Name: string, studentIds: string[]) {
    const users = await this.getUsers();
    this.set(DB_KEYS.USERS, users.map(u => studentIds.includes(u.id) ? { ...u, mentorId: mentor1Id, mentorName: mentor1Name, mentor2Id: mentor2Id, mentor2Name: mentor2Name } : u));
  }

  static async getEditRequests(): Promise<any[]> {
    return this.get<any[]>(DB_KEYS.CURRICULUM_REQUESTS, []);
  }

  static async updateEditRequest(id: string, status: string) {
    const reqs = await this.getEditRequests();
    this.set(DB_KEYS.CURRICULUM_REQUESTS, reqs.map(r => r.id === id ? { ...r, status } : r));
  }

  static async purgeSystem() {
    const users = await this.getUsers();
    const admin = users.find(u => u.role === UserRole.ADMIN);
    localStorage.clear();
    if (admin) {
      this.set(DB_KEYS.USERS, [admin]);
    }
  }
}

export const ApiService = BackendApiService;
