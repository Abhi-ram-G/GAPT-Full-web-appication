
import { User, UserRole, UserStatus, AcademicData, PortalConnection, LeaveRequest, Feature, Notification, SiteSettings, MarkBatch, MarkRecord, BatchStatus, AttendanceRecord, BatchCurriculumStatus, EditRequest, Course, AcademicBatch, Subject, AccessLevel, PermissionMap, Timetable, AcademicTask, TaskPriority, TaskStatus, AttendanceEditRequest, HourAttendance } from '../types/types';
import { ADMIN_EMAIL, DEFAULT_ADMIN_PASSWORD } from '../constants/constants';

const generateSeededData = () => {
  const users: User[] = [
    {
      id: 'admin-1',
      email: ADMIN_EMAIL,
      password: DEFAULT_ADMIN_PASSWORD,
      name: 'CHIEF ADMINISTRATOR',
      role: UserRole.ADMIN,
      status: UserStatus.APPROVED,
      createdAt: new Date().toISOString(),
      department: 'System Governance'
    },
    {
      id: 'dean-1',
      email: 'dean.bits@bitsathy.ac.in',
      password: 'deanbitsathy@',
      name: 'DR. K. SARAVANAN',
      role: UserRole.DEAN,
      status: UserStatus.APPROVED,
      createdAt: new Date().toISOString(),
      designation: 'Dean / Academic Director',
      experience: '22'
    },
    {
      id: 'hod-1',
      email: 'hod.ad@bitsathy.ac.in',
      password: '@hodbitsathy',
      name: 'DR. ARUN KUMAR S',
      role: UserRole.HOD,
      status: UserStatus.APPROVED,
      createdAt: new Date().toISOString(),
      department: 'Artificial Intelligence & Data Science (B.Tech)',
      designation: 'Head of Department',
      experience: '15'
    },
    {
      id: 'staff-1',
      email: 'prakash.stf.ad@bitsathy.ac.in',
      password: 'stfbitsathy',
      name: 'MR. PRAKASH RAJ',
      role: UserRole.STAFF,
      status: UserStatus.APPROVED,
      createdAt: new Date().toISOString(),
      department: 'Artificial Intelligence & Data Science (B.Tech)',
      designation: 'Assistant Professor',
      experience: '6'
    },
    {
      id: 'std-1',
      email: 'jai.std.ad@bitsathy.ac.in',
      password: 'stdbitsathy',
      name: 'JAI AKASH S R',
      role: UserRole.STUDENT,
      status: UserStatus.APPROVED,
      createdAt: new Date().toISOString(),
      department: 'Artificial Intelligence & Data Science (B.Tech)',
      studyYear: '1st Year',
      regNo: 'BIT24AD001',
      mentorId: 'staff-1',
      mentorName: 'MR. PRAKASH RAJ'
    },
    {
      id: 'std-2',
      email: 'ananya.std.ad@bitsathy.ac.in',
      password: 'stdbitsathy',
      name: 'ANANYA V',
      role: UserRole.STUDENT,
      status: UserStatus.APPROVED,
      createdAt: new Date().toISOString(),
      department: 'Artificial Intelligence & Data Science (B.Tech)',
      studyYear: '1st Year',
      regNo: 'BIT24AD002',
      mentorId: 'staff-1',
      mentorName: 'MR. PRAKASH RAJ'
    }
  ];

  const markBatches: MarkBatch[] = [
    {
      id: 'mb-1',
      name: 'SEM 1 INTERNAL 1',
      academicYear: '2024-25',
      status: BatchStatus.OPEN,
      subjects: ['MATHEMATICS I', 'PYTHON PROGRAMMING', 'DIGITAL LOGIC'],
      createdAt: new Date().toISOString()
    },
    {
      id: 'mb-2',
      name: 'SEM 1 END SEM',
      academicYear: '2024-25',
      status: BatchStatus.OPEN,
      subjects: ['MATHEMATICS I', 'PYTHON PROGRAMMING', 'DIGITAL LOGIC'],
      createdAt: new Date().toISOString()
    }
  ];

  const markRecords: MarkRecord[] = [
    { id: 'mr-1', batchId: 'mb-1', studentId: 'std-1', subject: 'MATHEMATICS I', marks: 85, maxMarks: 100, updatedAt: new Date().toISOString(), updatedBy: 'staff-1' },
    { id: 'mr-2', batchId: 'mb-1', studentId: 'std-1', subject: 'PYTHON PROGRAMMING', marks: 92, maxMarks: 100, updatedAt: new Date().toISOString(), updatedBy: 'staff-1' },
    { id: 'mr-3', batchId: 'mb-2', studentId: 'std-1', subject: 'MATHEMATICS I', marks: 88, maxMarks: 100, updatedAt: new Date().toISOString(), updatedBy: 'staff-1' },
    { id: 'mr-4', batchId: 'mb-2', studentId: 'std-1', subject: 'PYTHON PROGRAMMING', marks: 95, maxMarks: 100, updatedAt: new Date().toISOString(), updatedBy: 'staff-1' },
    { id: 'mr-5', batchId: 'mb-2', studentId: 'std-1', subject: 'DIGITAL LOGIC', marks: 90, maxMarks: 100, updatedAt: new Date().toISOString(), updatedBy: 'staff-1' }
  ];

  const timetables: Timetable[] = [
    {
      id: 'tt-1',
      department: 'Artificial Intelligence & Data Science (B.Tech)',
      studyYear: '1st Year',
      assignments: [
        { hour: 1, staffId: 'staff-1' },
        { hour: 2, staffId: 'staff-1' },
        { hour: 3, staffId: 'hod-1' },
        { hour: 4, staffId: 'staff-1' },
        { hour: 5, staffId: 'staff-1' },
        { hour: 6, staffId: 'hod-1' },
        { hour: 7, staffId: 'staff-1' }
      ],
      lastUpdated: new Date().toISOString()
    }
  ];

  return {
    users,
    markBatches,
    markRecords,
    timetables,
    tasks: [] as AcademicTask[]
  };
};

const SEEDED = generateSeededData();

const INITIAL_COURSES: Course[] = [
  {
    id: 'course-ad',
    name: 'Artificial Intelligence & Data Science',
    degree: 'B.Tech',
    domain: 'Computing',
    batchType: 'UG',
    subjects: [
      {
        id: 'subj-math1',
        code: 'MA24101',
        name: 'MATHEMATICS I',
        credits: 4,
        semester: 1,
        lessonsCount: 5,
        materials: ['Unit1_Calculus.pdf', 'Unit2_Matrices.pdf', '', '', ''],
        lessonNames: ['Differential Calculus', 'Matrices & Eigenvalues', 'Integral Calculus', 'Vector Calculus', 'Fourier Series'],
        assignedStaffIds: ['staff-1'],
        questionPapers: [{ name: 'INTERNAL 1 2023', file: 'MA24101_I1.pdf' }]
      },
      {
        id: 'subj-py',
        code: 'AD24102',
        name: 'PYTHON PROGRAMMING',
        credits: 3,
        semester: 1,
        lessonsCount: 3,
        materials: ['Basics.pdf', 'DataStructures.pdf', 'OOPS.pdf'],
        lessonNames: ['Language Basics', 'Native Data Structures', 'Object Oriented Programming'],
        assignedStaffIds: ['staff-1'],
        questionPapers: []
      }
    ]
  },
  {
    id: 'course-cs',
    name: 'Computer Science & Engineering',
    degree: 'B.E',
    domain: 'Computing',
    batchType: 'UG',
    subjects: []
  }
];

const INITIAL_BATCHES: AcademicBatch[] = [
  {
    id: 'batch-2024',
    name: 'BATCH OF 2024',
    startYear: 2024,
    endYear: 2028,
    batchType: 'UG',
    departmentIds: ['course-ad', 'course-cs']
  }
];

const DEFAULT_SETTINGS: SiteSettings = {
  name: 'GAPT',
  description: 'Green Academic Performance Tracker',
  adminEmail: ADMIN_EMAIL,
  themeColor: '#5d58ff',
  institution: 'Bannari Amman Institute of Technology'
};

const DEFAULT_PERMISSIONS: Record<UserRole, PermissionMap> = {
  [UserRole.ADMIN]: Object.values(Feature).reduce((acc, f) => ({ ...acc, [f]: AccessLevel.EDIT_ALL }), {}),
  [UserRole.DEAN]: {
    [Feature.USER_DIRECTORY]: AccessLevel.EDIT_HOD_STAFF_STUDENTS,
    [Feature.STAFF_DIRECTORY]: AccessLevel.VIEW_ALL,
    [Feature.STUDENT_DIRECTORY]: AccessLevel.VIEW_ALL,
    [Feature.COHORT_REGISTRY]: AccessLevel.VIEW_ALL,
    [Feature.ACCESS_REQUESTS]: AccessLevel.NO_ACCESS,
    [Feature.IDENTITY_CREATOR]: AccessLevel.VIEW_ALL,
    [Feature.INTERLINK_CONTROL]: AccessLevel.VIEW_ALL,
    [Feature.BRANDING_HUB]: AccessLevel.VIEW_ALL,
    [Feature.ACCESS_MATRIX]: AccessLevel.NO_ACCESS,
    [Feature.MARK_ENTRY]: AccessLevel.VIEW_ALL,
    [Feature.ATTENDANCE_TRACKING]: AccessLevel.VIEW_ALL,
    [Feature.STUDY_MATERIALS]: AccessLevel.VIEW_ALL,
    [Feature.STAFF_ASSIGNMENT]: AccessLevel.VIEW_ALL,
    [Feature.LEAVE_MANAGEMENT]: AccessLevel.EDIT_ALL,
    [Feature.ASSIGNMENTS]: AccessLevel.VIEW_ALL,
    [Feature.ACADEMIC_ANALYTICS]: AccessLevel.VIEW_ALL,
    [Feature.GREEN_INSIGHTS]: AccessLevel.VIEW_ALL,
    [Feature.MENTOR_ASSIGNMENT]: AccessLevel.VIEW_ALL
  },
  [UserRole.HOD]: {
    [Feature.USER_DIRECTORY]: AccessLevel.EDIT_STAFF_STUDENTS,
    [Feature.STAFF_DIRECTORY]: AccessLevel.VIEW_ALL,
    [Feature.STUDENT_DIRECTORY]: AccessLevel.VIEW_ALL,
    [Feature.COHORT_REGISTRY]: AccessLevel.VIEW_ALL,
    [Feature.ACCESS_REQUESTS]: AccessLevel.NO_ACCESS,
    [Feature.IDENTITY_CREATOR]: AccessLevel.NO_ACCESS,
    [Feature.INTERLINK_CONTROL]: AccessLevel.NO_ACCESS,
    [Feature.BRANDING_HUB]: AccessLevel.NO_ACCESS,
    [Feature.ACCESS_MATRIX]: AccessLevel.NO_ACCESS,
    [Feature.MARK_ENTRY]: AccessLevel.EDIT_ALL,
    [Feature.ATTENDANCE_TRACKING]: AccessLevel.EDIT_ALL,
    [Feature.STUDY_MATERIALS]: AccessLevel.EDIT_ALL,
    [Feature.STAFF_ASSIGNMENT]: AccessLevel.EDIT_ALL,
    [Feature.LEAVE_MANAGEMENT]: AccessLevel.EDIT_ALL,
    [Feature.ASSIGNMENTS]: AccessLevel.EDIT_ALL,
    [Feature.ACADEMIC_ANALYTICS]: AccessLevel.VIEW_ALL,
    [Feature.GREEN_INSIGHTS]: AccessLevel.VIEW_ALL,
    [Feature.MENTOR_ASSIGNMENT]: AccessLevel.EDIT_ALL
  },
  [UserRole.STAFF]: {
    [Feature.USER_DIRECTORY]: AccessLevel.EDIT_STUDENTS,
    [Feature.STAFF_DIRECTORY]: AccessLevel.VIEW_ALL,
    [Feature.STUDENT_DIRECTORY]: AccessLevel.VIEW_ALL,
    [Feature.COHORT_REGISTRY]: AccessLevel.NO_ACCESS,
    [Feature.ACCESS_REQUESTS]: AccessLevel.NO_ACCESS,
    [Feature.IDENTITY_CREATOR]: AccessLevel.NO_ACCESS,
    [Feature.INTERLINK_CONTROL]: AccessLevel.NO_ACCESS,
    [Feature.BRANDING_HUB]: AccessLevel.NO_ACCESS,
    [Feature.ACCESS_MATRIX]: AccessLevel.NO_ACCESS,
    [Feature.MARK_ENTRY]: AccessLevel.NO_ACCESS,
    [Feature.ATTENDANCE_TRACKING]: AccessLevel.EDIT_ALL,
    [Feature.STUDY_MATERIALS]: AccessLevel.EDIT_ALL,
    [Feature.STAFF_ASSIGNMENT]: AccessLevel.VIEW_ALL,
    [Feature.LEAVE_MANAGEMENT]: AccessLevel.EDIT_ALL,
    [Feature.ASSIGNMENTS]: AccessLevel.EDIT_ALL,
    [Feature.ACADEMIC_ANALYTICS]: AccessLevel.VIEW_ALL,
    [Feature.GREEN_INSIGHTS]: AccessLevel.VIEW_ALL,
    [Feature.MENTOR_ASSIGNMENT]: AccessLevel.NO_ACCESS
  },
  [UserRole.STUDENT]: {
    [Feature.USER_DIRECTORY]: AccessLevel.VIEW_ALL,
    [Feature.STAFF_DIRECTORY]: AccessLevel.VIEW_ALL,
    [Feature.STUDENT_DIRECTORY]: AccessLevel.VIEW_ALL,
    [Feature.COHORT_REGISTRY]: AccessLevel.NO_ACCESS,
    [Feature.ACCESS_REQUESTS]: AccessLevel.NO_ACCESS,
    [Feature.IDENTITY_CREATOR]: AccessLevel.NO_ACCESS,
    [Feature.INTERLINK_CONTROL]: AccessLevel.NO_ACCESS,
    [Feature.BRANDING_HUB]: AccessLevel.NO_ACCESS,
    [Feature.ACCESS_MATRIX]: AccessLevel.NO_ACCESS,
    [Feature.MARK_ENTRY]: AccessLevel.NO_ACCESS,
    [Feature.ATTENDANCE_TRACKING]: AccessLevel.NO_ACCESS,
    [Feature.STUDY_MATERIALS]: AccessLevel.VIEW_ALL,
    [Feature.STAFF_ASSIGNMENT]: AccessLevel.NO_ACCESS,
    [Feature.LEAVE_MANAGEMENT]: AccessLevel.EDIT_ALL,
    [Feature.ACADEMIC_ANALYTICS]: AccessLevel.VIEW_ALL,
    [Feature.GREEN_INSIGHTS]: AccessLevel.VIEW_ALL,
    [Feature.MENTOR_ASSIGNMENT]: AccessLevel.NO_ACCESS
  },
  [UserRole.ASSOC_PROF_I]: {} as any,
  [UserRole.ASSOC_PROF_II]: {} as any,
  [UserRole.ASSOC_PROF_III]: {} as any
};

export class ApiService {
  private static KEY = 'gapt_db_v1_expanded';
  private static DELAY = 50;

  private static getStore() {
    const data = localStorage.getItem(this.KEY);
    if (!data) {
      return {
        users: SEEDED.users,
        portals: [],
        leaveRequests: [],
        permissions: DEFAULT_PERMISSIONS,
        notifications: [],
        settings: DEFAULT_SETTINGS,
        markBatches: SEEDED.markBatches,
        markRecords: SEEDED.markRecords,
        attendance: [],
        attendanceEditRequests: [],
        curriculumStatuses: {
          'batch-2024_course-ad': BatchCurriculumStatus.EDITABLE
        },
        editRequests: [],
        curriculum: INITIAL_COURSES,
        academicBatches: INITIAL_BATCHES,
        timetables: SEEDED.timetables,
        tasks: SEEDED.tasks
      };
    }
    return JSON.parse(data);
  }

  private static saveStore(data: any) {
    localStorage.setItem(this.KEY, JSON.stringify(data));
  }

  private static async wait() {
    return new Promise(resolve => setTimeout(resolve, this.DELAY));
  }

  static async purgeSystem(): Promise<void> {
    await this.wait();
    const cleanUsers = SEEDED.users.filter(u => u.role === UserRole.ADMIN);
    const cleanStore = {
      users: cleanUsers,
      portals: [],
      leaveRequests: [],
      permissions: DEFAULT_PERMISSIONS,
      notifications: [],
      settings: DEFAULT_SETTINGS,
      markBatches: [],
      markRecords: [],
      attendance: [],
      attendanceEditRequests: [],
      curriculumStatuses: {},
      editRequests: [],
      curriculum: [],
      academicBatches: [],
      timetables: [],
      tasks: []
    };
    this.saveStore(cleanStore);
  }

  static async getUsers(): Promise<User[]> {
    await this.wait();
    return this.getStore().users;
  }

  static async addUser(user: User): Promise<void> {
    await this.wait();
    const store = this.getStore();
    store.users.push(user);
    this.saveStore(store);
  }

  static async updateUser(userId: string, updates: Partial<User>): Promise<void> {
    await this.wait();
    const store = this.getStore();
    store.users = store.users.map((u: User) => u.id === userId ? { ...u, ...updates } : u);
    this.saveStore(store);
  }

  static async assignStudentsToStaff(staff1Id: string, staff1Name: string, staff2Id: string, staff2Name: string, studentIds: string[]): Promise<void> {
    await this.wait();
    const store = this.getStore();
    store.users = store.users.map((u: User) => {
      if (studentIds.includes(u.id)) {
        return {
          ...u,
          mentorId: staff1Id,
          mentorName: staff1Name,
          mentor2Id: staff2Id,
          mentor2Name: staff2Name
        };
      }
      return u;
    });
    this.saveStore(store);
  }

  static async deleteUser(userId: string): Promise<void> {
    await this.wait();
    const store = this.getStore();
    store.users = store.users.filter((u: User) => u.id !== userId);
    this.saveStore(store);
  }

  static async deleteUsers(userIds: string[]): Promise<void> {
    await this.wait();
    const store = this.getStore();
    store.users = store.users.filter((u: User) => !userIds.includes(u.id));
    this.saveStore(store);
  }

  static async getCurriculum(): Promise<Course[]> {
    await this.wait();
    return this.getStore().curriculum;
  }

  static async getAcademicBatches(): Promise<AcademicBatch[]> {
    await this.wait();
    return this.getStore().academicBatches;
  }

  static async persistStructure(curriculum: Course[], batches: AcademicBatch[]): Promise<void> {
    await this.wait();
    const store = this.getStore();
    store.curriculum = curriculum;
    store.academicBatches = batches;
    this.saveStore(store);
  }

  static async getAttendance(date?: string): Promise<AttendanceRecord[]> {
    await this.wait();
    const records = this.getStore().attendance;
    if (date) return records.filter((r: AttendanceRecord) => r.date === date);
    return records;
  }

  static async saveAttendanceBatch(records: AttendanceRecord[]): Promise<void> {
    await this.wait();
    const store = this.getStore();
    records.forEach(newRec => {
      const idx = store.attendance.findIndex((r: AttendanceRecord) =>
        r.userId === newRec.userId && r.date === newRec.date
      );
      if (idx > -1) store.attendance[idx] = newRec;
      else store.attendance.push(newRec);
    });
    this.saveStore(store);
  }

  static async getAttendanceEditRequests(): Promise<AttendanceEditRequest[]> {
    await this.wait();
    return this.getStore().attendanceEditRequests || [];
  }

  static async getAttendanceEditRequest(userId: string, date: string): Promise<AttendanceEditRequest | null> {
    await this.wait();
    const store = this.getStore();
    return store.attendanceEditRequests?.find((r: AttendanceEditRequest) => r.requesterId === userId && r.date === date) || null;
  }

  static async upsertAttendanceEditRequest(request: AttendanceEditRequest): Promise<void> {
    await this.wait();
    const store = this.getStore();
    if (!store.attendanceEditRequests) store.attendanceEditRequests = [];
    const idx = store.attendanceEditRequests.findIndex((r: AttendanceEditRequest) => r.requesterId === request.requesterId && r.date === request.date);
    if (idx > -1) store.attendanceEditRequests[idx] = request;
    else store.attendanceEditRequests.push(request);
    this.saveStore(store);
  }

  static async getTimetables(): Promise<Timetable[]> {
    await this.wait();
    return this.getStore().timetables || [];
  }

  static async saveTimetable(timetable: Timetable): Promise<void> {
    await this.wait();
    const store = this.getStore();
    if (!store.timetables) store.timetables = [];
    const idx = store.timetables.findIndex((t: Timetable) => t.department === timetable.department && t.studyYear === timetable.studyYear);
    if (idx > -1) store.timetables[idx] = timetable;
    else store.timetables.push(timetable);
    this.saveStore(store);
  }

  static async getTasks(): Promise<AcademicTask[]> {
    await this.wait();
    return this.getStore().tasks || [];
  }

  static async addTask(task: AcademicTask): Promise<void> {
    await this.wait();
    const store = this.getStore();
    if (!store.tasks) store.tasks = [];
    store.tasks.push(task);
    this.saveStore(store);
  }

  static async updateTaskStatus(taskId: string, status: TaskStatus): Promise<void> {
    await this.wait();
    const store = this.getStore();
    if (!store.tasks) return;
    store.tasks = store.tasks.map((t: AcademicTask) => t.id === taskId ? { ...t, status } : t);
    this.saveStore(store);
  }

  static async deleteTask(taskId: string): Promise<void> {
    await this.wait();
    const store = this.getStore();
    if (!store.tasks) return;
    store.tasks = store.tasks.filter((t: AcademicTask) => t.id !== taskId);
    this.saveStore(store);
  }

  static async getMarkBatches(): Promise<MarkBatch[]> {
    await this.wait();
    return this.getStore().markBatches;
  }

  static async addMarkBatch(batch: MarkBatch): Promise<void> {
    await this.wait();
    const store = this.getStore();
    store.markBatches.push(batch);
    this.saveStore(store);
  }

  static async updateMarkBatch(batchId: string, updates: Partial<MarkBatch>): Promise<void> {
    await this.wait();
    const store = this.getStore();
    store.markBatches = store.markBatches.map((b: MarkBatch) =>
      b.id === batchId ? { ...b, ...updates } : b
    );
    this.saveStore(store);
  }

  static async getMarkRecords(batchId?: string): Promise<MarkRecord[]> {
    await this.wait();
    const records = this.getStore().markRecords;
    if (batchId) return records.filter((r: MarkRecord) => r.batchId === batchId);
    return records;
  }

  static async getMarkRecordsByStudent(studentId: string): Promise<MarkRecord[]> {
    await this.wait();
    const records = this.getStore().markRecords;
    return records.filter((r: MarkRecord) => r.studentId === studentId);
  }

  static async upsertMarkRecord(record: MarkRecord): Promise<void> {
    await this.wait();
    const store = this.getStore();
    const index = store.markRecords.findIndex((r: MarkRecord) =>
      r.batchId === record.batchId && r.studentId === record.studentId && r.subject === record.subject
    );
    if (index > -1) store.markRecords[index] = record;
    else store.markRecords.push(record);
    this.saveStore(store);
  }

  static async getPermissions(): Promise<Record<UserRole, PermissionMap>> {
    await this.wait();
    return this.getStore().permissions;
  }

  static async updatePermissions(role: UserRole, feature: Feature, level: AccessLevel): Promise<void> {
    await this.wait();
    const store = this.getStore();
    if (!store.permissions[role]) store.permissions[role] = {} as any;
    store.permissions[role][feature] = level;
    this.saveStore(store);
  }

  static async getNotifications(userId?: string): Promise<Notification[]> {
    await this.wait();
    const store = this.getStore();
    const all = store.notifications;
    if (!userId) return all;
    return all.filter((n: Notification) => !n.userId || n.userId === userId);
  }

  static async addNotification(notification: Notification): Promise<void> {
    await this.wait();
    const store = this.getStore();
    store.notifications.unshift(notification);
    this.saveStore(store);
  }

  static async clearNotifications(userId?: string): Promise<void> {
    await this.wait();
    const store = this.getStore();
    if (userId) store.notifications = store.notifications.filter((n: Notification) => n.userId !== userId);
    else store.notifications = [];
    this.saveStore(store);
  }

  static async getSettings(): Promise<SiteSettings> {
    await this.wait();
    return this.getStore().settings;
  }

  static async updateSettings(settings: SiteSettings): Promise<void> {
    await this.wait();
    const store = this.getStore();
    store.settings = settings;
    this.saveStore(store);
  }

  static async getLeaveRequests(): Promise<LeaveRequest[]> {
    await this.wait();
    return this.getStore().leaveRequests;
  }

  static async addLeaveRequest(request: LeaveRequest): Promise<void> {
    await this.wait();
    const store = this.getStore();
    store.leaveRequests.push(request);
    this.saveStore(store);
  }

  static async updateLeaveRequest(requestId: string, updates: Partial<LeaveRequest>): Promise<void> {
    await this.wait();
    const store = this.getStore();
    store.leaveRequests = store.leaveRequests.map((r: LeaveRequest) =>
      r.id === requestId ? { ...r, ...updates } : r
    );
    this.saveStore(store);
  }

  static async getAcademicData(userId: string): Promise<AcademicData> {
    const store = this.getStore();
    const records = (store.markRecords || []).filter((r: MarkRecord) => r.studentId === userId);
    const batches = store.markBatches || [];

    const attendanceRecords = (store.attendance || []).filter((r: AttendanceRecord) => r.userId === userId);
    let attPct = 0;
    if (attendanceRecords.length > 0) {
      let totalHours = 0;
      let presentHours = 0;
      attendanceRecords.forEach((r: AttendanceRecord) => {
        if (r.hours) {
          totalHours += r.hours.length;
          presentHours += r.hours.filter((h: HourAttendance) => h.status === 'PRESENT').length;
        } else {
          totalHours += 7;
          if (r.isPresent) presentHours += 7;
        }
      });
      attPct = Math.round((presentHours / totalHours) * 100);
    } else {
      // Default sample for populated profiles
      attPct = userId === 'std-1' ? 88 : userId === 'std-2' ? 94 : 0;
    }

    const calculateGradePoint = (marks: number, max: number) => {
      const p = (marks / max) * 100;
      if (p >= 90) return 10;
      if (p >= 80) return 9;
      if (p >= 70) return 8;
      if (p >= 60) return 7;
      if (p >= 50) return 6;
      return 0;
    };

    const endSemRecords = records.filter((r: MarkRecord) => {
      const b = batches.find((batch: MarkBatch) => batch.id === r.batchId);
      return b?.name.toUpperCase().includes('END SEM');
    });

    if (endSemRecords.length === 0) {
      return { attendance: attPct, cgpa: 0, sgpa: 0, credits: 0, greenPoints: attPct };
    }

    const totalGradePoints = endSemRecords.reduce((acc: number, curr: MarkRecord) => acc + calculateGradePoint(curr.marks, curr.maxMarks), 0);
    const gpa = totalGradePoints / endSemRecords.length;

    return {
      attendance: attPct,
      cgpa: parseFloat(gpa.toFixed(2)),
      sgpa: parseFloat(gpa.toFixed(2)),
      credits: endSemRecords.length * 3,
      greenPoints: (endSemRecords.length * 10) + attPct
    };
  }

  static async getEditRequests(): Promise<EditRequest[]> {
    await this.wait();
    return this.getStore().editRequests;
  }

  static async addEditRequest(request: EditRequest): Promise<void> {
    await this.wait();
    const store = this.getStore();
    store.editRequests.push(request);
    this.saveStore(store);
  }

  static async updateEditRequest(id: string, status: 'PENDING' | 'APPROVED' | 'REJECTED'): Promise<void> {
    await this.wait();
    const store = this.getStore();
    store.editRequests = store.editRequests.map((r: EditRequest) => r.id === id ? { ...r, status } : r);
    this.saveStore(store);
  }

  static async getCurriculumStatus(batchId: string, deptId: string): Promise<BatchCurriculumStatus> {
    await this.wait();
    const store = this.getStore();
    return store.curriculumStatuses?.[`${batchId}_${deptId}`] || BatchCurriculumStatus.FROZEN;
  }

  static async setCurriculumStatus(batchId: string, deptId: string, status: BatchCurriculumStatus): Promise<void> {
    await this.wait();
    const store = this.getStore();
    if (!store.curriculumStatuses) store.curriculumStatuses = {};
    store.curriculumStatuses[`${batchId}_${deptId}`] = status;
    this.saveStore(store);
  }

  static async getPortals(): Promise<PortalConnection[]> {
    await this.wait();
    return this.getStore().portals;
  }

  static async addPortal(portal: PortalConnection): Promise<void> {
    await this.wait();
    const store = this.getStore();
    store.portals.push(portal);
    this.saveStore(store);
  }

  static async updatePortal(id: string, updates: Partial<PortalConnection>): Promise<void> {
    await this.wait();
    const store = this.getStore();
    store.portals = store.portals.map((p: PortalConnection) => p.id === id ? { ...p, ...updates } : p);
    this.saveStore(store);
  }

  static async deletePortal(id: string): Promise<void> {
    await this.wait();
    const store = this.getStore();
    store.portals = store.portals.filter((p: PortalConnection) => p.id !== id);
    this.saveStore(store);
  }

  static async updateSubjectMaterials(courseId: string, subjectId: string, materials: string[]): Promise<void> {
    await this.wait();
    const store = this.getStore();
    store.curriculum = store.curriculum.map((c: Course) => {
      if (c.id === courseId) {
        return {
          ...c,
          subjects: c.subjects.map((s: Subject) => s.id === subjectId ? { ...s, materials } : s)
        };
      }
      return c;
    });
    this.saveStore(store);
  }
}

export const MockDB = ApiService;
