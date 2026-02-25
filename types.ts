
export enum UserRole {
  ADMIN = 'ADMIN',
  STAFF = 'STAFF',
  STUDENT = 'STUDENT',
  HOD = 'HOD',
  DEAN = 'DEAN',
  ASSOC_PROF_I = 'ASSOC_PROF_I',
  ASSOC_PROF_II = 'ASSOC_PROF_II',
  ASSOC_PROF_III = 'ASSOC_PROF_III'
}

export enum UserStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED'
}

export enum ThemeMode {
  LIGHT = 'LIGHT',
  DARK = 'DARK',
  SYSTEM = 'SYSTEM',
  CUSTOM = 'CUSTOM'
}

export interface UserTheme {
  mode: ThemeMode;
  primaryColor?: string;
}

export interface User {
  id: string;
  email: string;
  password?: string;
  name: string;
  role: UserRole;
  status: UserStatus;
  createdAt: string;
  department?: string;
  studyYear?: string;
  regNo?: string;
  staffId?: string;
  designation?: string;
  experience?: string;
  avatar?: string;
  theme?: UserTheme;
  passwordViewRequestStatus?: 'NONE' | 'PENDING' | 'APPROVED' | 'REJECTED';
  mentorId?: string;
  mentorName?: string;
  mentor2Id?: string;
  mentor2Name?: string;
}

export interface AcademicData {
  attendance: number;
  cgpa: number;
  sgpa: number;
  credits: number;
  greenPoints: number;
}

export enum Feature {
  USER_DIRECTORY = 'USER_DIRECTORY',
  STAFF_DIRECTORY = 'STAFF_DIRECTORY',
  STUDENT_DIRECTORY = 'STUDENT_DIRECTORY',
  COHORT_REGISTRY = 'COHORT_REGISTRY',
  ACCESS_REQUESTS = 'ACCESS_REQUESTS',
  IDENTITY_CREATOR = 'IDENTITY_CREATOR',
  INTERLINK_CONTROL = 'INTERLINK_CONTROL',
  BRANDING_HUB = 'BRANDING_HUB',
  ACCESS_MATRIX = 'ACCESS_MATRIX',
  MARK_ENTRY = 'MARK_ENTRY',
  ATTENDANCE_TRACKING = 'ATTENDANCE_TRACKING',
  STUDY_MATERIALS = 'STUDY_MATERIALS',
  STAFF_ASSIGNMENT = 'STAFF_ASSIGNMENT',
  LEAVE_MANAGEMENT = 'LEAVE_MANAGEMENT',
  ASSIGNMENTS = 'ASSIGNMENTS',
  ACADEMIC_ANALYTICS = 'ACADEMIC_ANALYTICS',
  GREEN_INSIGHTS = 'GREEN_INSIGHTS',
  MENTOR_ASSIGNMENT = 'MENTOR_ASSIGNMENT'
}

export enum AccessLevel {
  NO_ACCESS = 'NO_ACCESS',
  VIEW_ALL = 'VIEW_ALL',
  EDIT_STUDENTS = 'EDIT_STUDENTS',
  EDIT_STAFF = 'EDIT_STAFF',
  EDIT_HOD = 'EDIT_HOD',
  EDIT_DEAN = 'EDIT_DEAN',
  EDIT_STAFF_STUDENTS = 'EDIT_STAFF_STUDENTS',
  EDIT_HOD_STAFF = 'EDIT_HOD_STAFF',
  EDIT_HOD_STAFF_STUDENTS = 'EDIT_HOD_STAFF_STUDENTS',
  EDIT_ALL = 'EDIT_ALL'
}

export type PermissionMap = Record<string, AccessLevel>;

export interface Notification {
  id: string;
  userId?: string;
  message: string;
  timestamp: string;
  read: boolean;
  type: string;
}

export interface SiteSettings {
  name: string;
  description: string;
  adminEmail: string;
  themeColor: string;
  institution: string;
}

export enum BatchStatus {
  OPEN = 'OPEN',
  FROZEN = 'FROZEN',
  BLOCKED = 'BLOCKED'
}

export interface MarkBatch {
  id: string;
  name: string;
  academicYear: string;
  status: BatchStatus;
  subjects: string[];
  createdAt: string;
}

export interface MarkRecord {
  id: string;
  batchId: string;
  studentId: string;
  subject: string;
  marks: number;
  maxMarks: number;
  updatedAt: string;
  updatedBy: string;
}

export type HourStatus = 'PRESENT' | 'ABSENT' | 'OTHER';

export interface HourAttendance {
  hour: number;
  status: HourStatus;
  detail?: string;
}

export interface AttendanceRecord {
  id: string;
  userId: string;
  date: string;
  isPresent: boolean; // Aggregated for legacy support
  hours?: HourAttendance[];
  markedBy: string;
}

export interface AttendanceEditRequest {
  id: string;
  requesterId: string;
  requesterName: string;
  deptName: string;
  date: string;
  adminApproved: boolean;
  deanApproved: boolean;
  hodApproved: boolean;
  timestamp: string;
}

export enum BatchCurriculumStatus {
  EDITABLE = 'EDITABLE',
  FROZEN = 'FROZEN'
}

export interface EditRequest {
  id: string;
  hodId: string;
  hodName: string;
  deptId: string;
  deptName: string;
  batchId: string;
  batchName: string;
  timestamp: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
}

export interface QuestionPaper {
  name: string;
  file: string;
}

export interface Subject {
  id: string;
  code: string;
  name: string;
  credits: number;
  semester: number;
  lessonsCount: number;
  materials: string[];
  lessonNames?: string[];
  assignedStaffIds: string[];
  questionPapers?: QuestionPaper[];
}

export interface Course {
  id: string;
  name: string;
  degree: string;
  domain: string;
  batchType: 'UG' | 'PG';
  subjects: Subject[];
}

export interface AcademicBatch {
  id: string;
  name: string;
  startYear: number;
  endYear: number;
  batchType: 'UG' | 'PG';
  departmentIds: string[];
}

export interface HourAssignment {
  hour: number;
  staffId: string;
}

export interface Timetable {
  id: string;
  department: string;
  studyYear: string;
  assignments: HourAssignment[];
  lastUpdated: string;
}

export enum TaskPriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH'
}

export enum TaskStatus {
  TODO = 'TO DO',
  IN_PROGRESS = 'IN PROGRESS',
  COMPLETED = 'COMPLETED'
}

export interface AcademicTask {
  id: string;
  title: string;
  description: string;
  dueDate: string; // ISO String
  priority: TaskPriority;
  status: TaskStatus;
  subjectId: string;
  subjectName: string;
  department: string;
  studyYear: string;
  staffId: string;
  staffName: string;
  createdAt: string;
}

export enum PortalConnectionStatus {
  CONNECTED = 'CONNECTED',
  DISCONNECTED = 'DISCONNECTED',
  PENDING = 'PENDING'
}

export enum PortalPermission {
  READ_ONLY = 'READ_ONLY',
  READ_WRITE = 'READ_WRITE'
}

export interface PortalConnection {
  id: string;
  name: string;
  url: string;
  handshakeId: string;
  status: PortalConnectionStatus;
  permission: PortalPermission;
  lastSync?: string;
}

export enum LeaveType {
  MEDICAL = 'MEDICAL',
  PERSONAL = 'PERSONAL',
  ACADEMIC = 'ACADEMIC'
}

export enum LeaveStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED'
}

export interface LeaveRequest {
  id: string;
  studentId: string;
  studentName: string;
  studentYear: string;
  studentDegree: string;
  mentorId: string;
  type: LeaveType;
  startDate: string;
  startTime: string;
  endDate: string;
  endTime: string;
  reason: string;
  status: LeaveStatus;
  createdAt: string;
}
