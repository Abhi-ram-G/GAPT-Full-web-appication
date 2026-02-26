import {
    User, UserRole, UserStatus, MarkBatch, MarkRecord, AttendanceRecord,
    LeaveRequest, Timetable, AcademicTask, SiteSettings, PortalConnection
} from '../types/types';

const API_BASE = '/api/registry';
const AUTH_BASE = '/o';

class BackendApiService {
    private static getStoredToken() {
        return localStorage.getItem('gapt_access_token');
    }

    private static async request(endpoint: string, options: RequestInit = {}) {
        const token = this.getStoredToken();
        const headers = {
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
            ...(options.headers || {})
        };

        const response = await fetch(`${endpoint}`, { ...options, headers });
        if (response.status === 401) {
            // Handle unauthorized (clear all session data to prevent loops)
            localStorage.removeItem('gapt_access_token');
            localStorage.removeItem('gapt_active_session');
            localStorage.removeItem('gapt_active_view');
            window.location.href = '/';
            throw new Error('Unauthorized');
        }
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.detail || 'API Request failed');
        }
        return response.json();
    }

    static async authenticate(email: string, password: string): Promise<User | null> {
        // Note: In a real OAuth2 flow, we would use grant_type=password
        // For now, we simulate the token fetch
        // Replace with actual OAuth2 call if client_id/secret are available
        try {
            const params = new URLSearchParams();
            params.append('grant_type', 'password');
            params.append('username', email);
            params.append('password', password);
            params.append('client_id', 'GAPT_CLIENT_ID'); // Replace with real ID
            params.append('client_secret', 'GAPT_CLIENT_SECRET'); // Replace with real secret

            const response = await fetch(`${AUTH_BASE}/token/`, {
                method: 'POST',
                body: params
            });

            if (!response.ok) throw new Error('Authentication failed');

            const data = await response.json();
            localStorage.setItem('gapt_access_token', data.access_token);

            // Fetch user profile
            return this.getProfile();
        } catch (err) {
            console.error('Auth Error:', err);
            // Fallback for development if OAuth2 is not fully configured
            return null;
        }
    }

    static async getProfile(): Promise<User> {
        return this.request(`${API_BASE}/users/me/`); // Need to implement /me/ in Django or filter by name
    }

    static async getUsers(): Promise<User[]> {
        return this.request(`${API_BASE}/users/`);
    }

    static async getMarkBatches(): Promise<MarkBatch[]> {
        return this.request(`${API_BASE}/mark-batches/`);
    }

    static async getMarkRecords(batchId?: string): Promise<MarkRecord[]> {
        const url = batchId ? `${API_BASE}/mark-records/?batch=${batchId}` : `${API_BASE}/mark-records/`;
        return this.request(url);
    }

    static async getAttendance(date?: string): Promise<AttendanceRecord[]> {
        const url = date ? `${API_BASE}/attendance/?date=${date}` : `${API_BASE}/attendance/`;
        return this.request(url);
    }

    static async getLeaveRequests(): Promise<LeaveRequest[]> {
        return this.request(`${API_BASE}/leaves/`);
    }

    static async addLeaveRequest(request: Partial<LeaveRequest>): Promise<void> {
        await this.request(`${API_BASE}/leaves/`, {
            method: 'POST',
            body: JSON.stringify(request)
        });
    }

    static async getTimetables(): Promise<Timetable[]> {
        return this.request(`${API_BASE}/timetables/`);
    }

    static async getTasks(): Promise<AcademicTask[]> {
        return this.request(`${API_BASE}/tasks/`);
    }

    // ... Add other methods as needed to match ApiService interface
}

export default BackendApiService;
