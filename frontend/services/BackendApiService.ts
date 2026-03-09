import {
    User, MarkBatch, MarkRecord, AttendanceRecord, AttendanceEditRequest,
    LeaveRequest, Timetable, AcademicTask, SiteSettings, PortalConnection,
    Course, Subject, AcademicBatch, UserRole, Feature, AccessLevel
} from '../types';

const BASE_URL = import.meta.env.VITE_API_URL || '';
const FILES_BASE_URL = import.meta.env.VITE_FILES_API_URL || BASE_URL;
const API_BASE = `${BASE_URL}/api/registry`;
const AUTH_BASE = `${BASE_URL}/o`;
const FILES_BASE = `${FILES_BASE_URL}/api/files`;

const CLIENT_ID = 'GAPT_CLIENT_ID';
const CLIENT_SECRET = 'GAPT_CLIENT_SECRET';

export default class BackendApiService {
    private static getStoredToken() {
        return localStorage.getItem('token');
    }

    private static async request(url: string, options: RequestInit = {}) {
        const token = this.getStoredToken();
        const headers: HeadersInit = {
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        };

        console.log(`[API REQUEST] ${url}`, options);
        const response = await fetch(url, { ...options, headers: { ...headers, ...options.headers } });
        if (response.status === 401) {
            // Handle unauthorized (maybe redirect to login or refresh token)
            localStorage.removeItem('token');
        }
        if (!response.ok) {
            const text = await response.text();
            let errResult: any = {};
            try {
                errResult = JSON.parse(text);
            } catch (e) {
                console.error('Non-JSON Error Response:', text);
                throw new Error(`Server returned HTML instead of JSON. Check if your Backend is running and API URL is correct. Status: ${response.status}`);
            }
            throw new Error(errResult.detail || errResult.error || 'Network request failed');
        }
        return response.status === 204 ? null : response.json();
    }

    static async login(email: string, password: string): Promise<User> {
        const params = new URLSearchParams();
        params.append('grant_type', 'password');
        params.append('username', email.trim()); // Django OAuth2 expects username, which is email for our CustomUser
        params.append('password', password); // Passwords can theoretically have spaces, but trim if needed.
        params.append('client_id', CLIENT_ID);
        params.append('client_secret', CLIENT_SECRET);

        const response = await fetch(`${AUTH_BASE}/token/`, {
            method: 'POST',
            body: params,
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        });

        if (!response.ok) {
            const err = await response.json().catch(() => ({}));
            throw new Error(err.error_description || err.error || 'Login failed');
        }

        const data = await response.json();
        localStorage.setItem('token', data.access_token);

        // Fetch current user details
        return this.getCurrentUser();
    }

    static async getCurrentUser(): Promise<User> {
        return this.request(`${API_BASE}/users/me/`);
    }

    static async getUsers(): Promise<User[]> {
        return this.request(`${API_BASE}/users/`);
    }

    static async addUser(user: Partial<User>): Promise<User> {
        return this.request(`${API_BASE}/users/`, {
            method: 'POST',
            body: JSON.stringify(user)
        });
    }

    static async updateUser(id: string, updates: Partial<User>): Promise<User> {
        return this.request(`${API_BASE}/users/${id}/`, {
            method: 'PATCH',
            body: JSON.stringify(updates)
        });
    }

    static async deleteUser(id: string): Promise<void> {
        await this.request(`${API_BASE}/users/${id}/`, { method: 'DELETE' });
    }

    static async getCurriculum(): Promise<Course[]> {
        return this.request(`${API_BASE}/courses/`);
    }

    static async getCurriculumStatus(batchId: string, deptId: string): Promise<any> {
        return this.request(`${API_BASE}/curriculum-status/?batch=${batchId}&course=${deptId}`);
    }

    static async setCurriculumStatus(batchId: string, deptId: string, status: string): Promise<void> {
        await this.request(`${API_BASE}/curriculum-status/update_status/`, {
            method: 'POST',
            body: JSON.stringify({ batch_id: batchId, dept_id: deptId, status })
        });
    }

    static async deleteCourse(courseId: string): Promise<void> {
        await this.request(`${API_BASE}/courses/${courseId}/`, {
            method: 'DELETE'
        });
    }

    static async deleteBatch(batchId: string): Promise<void> {
        await this.request(`${API_BASE}/academic-batches/${batchId}/`, {
            method: 'DELETE'
        });
    }

    static async persistStructure(courses: Course[], batches: AcademicBatch[]): Promise<void> {
        await this.request(`${API_BASE}/courses/persist_structure/`, {
            method: 'POST',
            body: JSON.stringify({ courses, batches })
        });
    }

    static async getAcademicBatches(): Promise<any[]> {
        return this.request(`${API_BASE}/academic-batches/`);
    }

    static async getMarkBatches(): Promise<MarkBatch[]> {
        return this.request(`${API_BASE}/mark-batches/`);
    }

    static async addMarkBatch(batch: MarkBatch): Promise<void> {
        await this.request(`${API_BASE}/mark-batches/`, {
            method: 'POST',
            body: JSON.stringify(batch)
        });
    }

    static async updateMarkBatch(id: string, updates: Partial<MarkBatch>): Promise<void> {
        await this.request(`${API_BASE}/mark-batches/${id}/`, {
            method: 'PATCH',
            body: JSON.stringify(updates)
        });
    }

    static async updateSubjectMaterials(courseId: string, subjectId: string, materials: string[]): Promise<void> {
        await this.request(`${API_BASE}/subjects/${subjectId}/update_materials/`, {
            method: 'POST',
            body: JSON.stringify({ materials })
        });
    }

    static async getAcademicData(userId: string) {
        return this.request(`${API_BASE}/users/${userId}/academic_data/`);
    }

    static async getMarkRecords(batchId?: string): Promise<MarkRecord[]> {
        const url = batchId ? `${API_BASE}/mark-records/?batch=${batchId}` : `${API_BASE}/mark-records/`;
        return this.request(url);
    }

    static async getMarkRecordsByStudent(userId: string): Promise<MarkRecord[]> {
        return this.request(`${API_BASE}/mark-records/?student=${userId}`);
    }

    static async upsertMarkRecord(record: Partial<MarkRecord>): Promise<void> {
        await this.request(`${API_BASE}/mark-records/upsert/`, {
            method: 'POST',
            body: JSON.stringify(record)
        });
    }

    static async saveAttendanceBatch(records: Partial<AttendanceRecord>[]): Promise<void> {
        await this.request(`${API_BASE}/attendance/bulk_create/`, {
            method: 'POST',
            body: JSON.stringify(records)
        });
    }

    static async getAttendance(date?: string): Promise<AttendanceRecord[]> {
        const url = date ? `${API_BASE}/attendance/?date=${date}` : `${API_BASE}/attendance/`;
        return this.request(url);
    }

    static async getAttendanceEditRequests(): Promise<AttendanceEditRequest[]> {
        return this.request(`${API_BASE}/attendance-edit-requests/`);
    }

    static async getAttendanceEditRequest(userId: string, date: string): Promise<AttendanceEditRequest | null> {
        return this.request(`${API_BASE}/attendance-edit-requests/find_request/?user_id=${userId}&date=${date}`);
    }

    static async upsertAttendanceEditRequest(req: AttendanceEditRequest): Promise<void> {
        await this.request(`${API_BASE}/attendance-edit-requests/upsert/`, {
            method: 'POST',
            body: JSON.stringify(req)
        });
    }

    static async getTasks(): Promise<AcademicTask[]> {
        return this.request(`${API_BASE}/tasks/`);
    }

    static async addTask(task: AcademicTask): Promise<void> {
        await this.request(`${API_BASE}/tasks/`, {
            method: 'POST',
            body: JSON.stringify(task)
        });
    }

    static async updateTask(id: string, updates: Partial<AcademicTask>): Promise<void> {
        await this.request(`${API_BASE}/tasks/${id}/`, {
            method: 'PATCH',
            body: JSON.stringify(updates)
        });
    }

    static async deleteTask(id: string): Promise<void> {
        await this.request(`${API_BASE}/tasks/${id}/`, {
            method: 'DELETE'
        });
    }

    static async updateStudentTaskProgress(taskId: string, studentId: string, progress: string, details?: string): Promise<void> {
        await this.request(`${API_BASE}/tasks/${taskId}/update_progress/`, {
            method: 'POST',
            body: JSON.stringify({ student_id: studentId, progress, details })
        });
    }

    static async assignStaffToTask(taskId: string, staffId: string): Promise<void> {
        await this.request(`${API_BASE}/tasks/${taskId}/assign_staff/`, {
            method: 'POST',
            body: JSON.stringify({ staff_id: staffId })
        });
    }

    static async getTimetables(): Promise<Timetable[]> {
        return this.request(`${API_BASE}/timetables/`);
    }

    static async saveTimetable(tt: Timetable): Promise<void> {
        await this.request(`${API_BASE}/timetables/upsert/`, {
            method: 'POST',
            body: JSON.stringify(tt)
        });
    }


    static async assignStudentsToStaff(staffId: string, staffName: string, staff2Id: string, staff2Name: string, studentIds: string[]): Promise<void> {
        await this.request(`${API_BASE}/users/assign_students/`, {
            method: 'POST',
            body: JSON.stringify({ staff1Id: staffId, studentIds })
        });
    }

    static async updateTaskStatus(taskId: string, status: string): Promise<void> {
        await this.request(`${API_BASE}/tasks/${taskId}/`, {
            method: 'PATCH',
            body: JSON.stringify({ status })
        });
    }

    static async getNotifications(userId?: string): Promise<any[]> {
        return this.request(`${API_BASE}/notifications/`);
    }

    static async addNotification(notification: any): Promise<void> {
        await this.request(`${API_BASE}/notifications/`, {
            method: 'POST',
            body: JSON.stringify(notification)
        });
    }

    static async clearNotifications(): Promise<void> {
        await this.request(`${API_BASE}/notifications/clear_all/`, { method: 'POST' });
    }

    static async getPermissions(): Promise<Record<string, any>> {
        return this.request(`${API_BASE}/permissions/`);
    }

    static async updatePermission(role: string, feature: string, level: string): Promise<void> {
        await this.request(`${API_BASE}/permissions/update_permission/`, {
            method: 'POST',
            body: JSON.stringify({ role, feature, level })
        });
    }

    static async getSubjects(): Promise<any[]> {
        return this.request(`${API_BASE}/subjects/`);
    }


    static async getPortals(): Promise<PortalConnection[]> {
        return this.request(`${API_BASE}/portals/`);
    }

    static async addPortal(portal: PortalConnection): Promise<void> {
        await this.request(`${API_BASE}/portals/`, {
            method: 'POST',
            body: JSON.stringify(portal)
        });
    }

    static async updatePortal(id: string, updates: Partial<PortalConnection>): Promise<void> {
        await this.request(`${API_BASE}/portals/${id}/`, {
            method: 'PATCH',
            body: JSON.stringify(updates)
        });
    }

    static async deletePortal(id: string): Promise<void> {
        await this.request(`${API_BASE}/portals/${id}/`, {
            method: 'DELETE'
        });
    }

    static async getEditRequests(): Promise<any[]> {
        return this.request(`${API_BASE}/curriculum-requests/`);
    }

    static async updateEditRequest(id: string, status: string): Promise<void> {
        await this.request(`${API_BASE}/curriculum-requests/${id}/`, {
            method: 'PATCH',
            body: JSON.stringify({ status })
        });
    }

    static async getLeaveRequests(): Promise<any[]> {
        return this.request(`${API_BASE}/leave-requests/`);
    }

    static async addLeaveRequest(req: LeaveRequest): Promise<void> {
        await this.request(`${API_BASE}/leave-requests/`, {
            method: 'POST',
            body: JSON.stringify(req)
        });
    }

    static async updateLeaveRequest(id: string, updates: Partial<LeaveRequest>): Promise<void> {
        await this.request(`${API_BASE}/leave-requests/${id}/`, {
            method: 'PATCH',
            body: JSON.stringify(updates)
        });
    }

    static async getSettings(): Promise<SiteSettings> {
        return this.request(`${API_BASE}/site-settings/`);
    }

    static async getEmails(): Promise<any[]> {
        return this.request(`${API_BASE}/emails/`);
    }

    static async addEmail(email: any): Promise<void> {
        await this.request(`${API_BASE}/emails/`, {
            method: 'POST',
            body: JSON.stringify(email)
        });
    }

    static async updateEmail(id: string, updates: any): Promise<void> {
        await this.request(`${API_BASE}/emails/${id}/`, {
            method: 'PATCH',
            body: JSON.stringify(updates)
        });
    }

    static async deleteEmail(id: string): Promise<void> {
        await this.request(`${API_BASE}/emails/${id}/`, {
            method: 'DELETE'
        });
    }

    // ─── Spreadsheet ─────────────────────────────────────────────────────────
    // Reads all users from the real /users/ endpoint and maps them to sheet rows.
    static async getSpreadsheetData(): Promise<any[]> {
        const users: User[] = await this.getUsers();
        return users.map(u => ({
            id: u.id,
            name: u.name || '',
            email: u.email || '',
            role: u.role || '',
            department: u.department || '',
            regNo: (u as any).regNo || '',
            staffId: (u as any).staffId || '',
            status: (u as any).status || '',
            password: '',   // never returned by API for security; leave blank = no change
        }));
    }

    // Smart diff: only PATCHes rows that actually changed.
    static async updateSpreadsheetData(rows: any[]): Promise<void> {
        const original: User[] = await this.getUsers();
        const origMap = new Map(original.map(u => [String(u.id), u]));

        await Promise.all(
            rows.map(async row => {
                const orig = origMap.get(String(row.id));
                if (!orig) return;

                const changed: Record<string, any> = {};
                if (row.name !== (orig.name || '')) changed.name = row.name;
                if (row.email !== (orig.email || '')) changed.email = row.email;
                if (row.department !== (orig.department || '')) changed.department = row.department;
                if (row.regNo !== ((orig as any).regNo || '')) changed.reg_no = row.regNo;
                if (row.staffId !== ((orig as any).staffId || '')) changed.staff_id = row.staffId;
                // Only send password if admin explicitly typed a new one
                if (row.password && row.password.trim() !== '') changed.password = row.password.trim();

                if (Object.keys(changed).length > 0) {
                    await this.updateUser(String(row.id), changed as any);
                }
            })
        );
    }

    static async purgeSystem(): Promise<void> {
        await this.request(`${API_BASE}/site-settings/purge/`, {
            method: 'POST'
        });
    }
    static async updatePermissions(role: UserRole, feature: Feature, level: AccessLevel): Promise<void> {
        await this.request(`${API_BASE}/permissions/update_permission/`, {
            method: 'POST',
            body: JSON.stringify({ role, feature, level })
        });
    }

    static async updateSettings(settings: SiteSettings): Promise<void> {
        await this.request(`${API_BASE}/site-settings/`, {
            method: 'PATCH',
            body: JSON.stringify(settings)
        });
    }

    static async getChatMessages(): Promise<any[]> {
        return this.request(`${API_BASE}/chat-messages/`);
    }

    static async addChatMessage(msg: any): Promise<void> {
        await this.request(`${API_BASE}/chat-messages/`, {
            method: 'POST',
            body: JSON.stringify(msg)
        });
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

    static async uploadFile(file: File): Promise<string> {
        const formData = new FormData();
        formData.append('file', file);

        const response = await fetch(`${FILES_BASE}/upload`, {
            method: 'POST',
            body: formData,
        });

        if (!response.ok) throw new Error('File upload failed');
        const data = await response.json();
        return data.filename;
    }
}
