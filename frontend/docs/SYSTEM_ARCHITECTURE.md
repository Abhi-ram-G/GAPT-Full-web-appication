
# GAPT System Architecture

## Overview
GAPT (Green Academic Performance Tracker) is deployed as a distributed system designed for scalability, data integrity, and high availability.

## Technical Stack
- **Frontend**: React.js (v19) with TypeScript and Tailwind CSS.
- **Academic Registry Service**: Python Django (Port 8000). Handles RBAC, Academic Records, and Transcripts.
- **Operations & Signal Service**: Node.js Express (Port 3000). Handles Notifications, Tasks, and Real-time Status.
- **Database**: MySQL 8.0. Centralized relational storage.

## Data Flow
1. **Frontend** initiates requests via `ApiService`.
2. **Registry Requests** (Users, Marks, Curriculum) are routed to Django.
3. **Operational Requests** (Notifications, Tasks, Settings) are routed to Express.
4. Both services communicate with the **MySQL** instance.

## Security
- **Django Middleware**: Enforces CSRF protection and session validation for registry data.
- **Express CORS**: Restricted to institutional origins.
- **MySQL Constraints**: Foreign keys ensure that no mark records can exist without a valid student identity.

## Scalability
The separation of the Academic Registry (CPU intensive calculations) from the Operational Hub (I/O intensive signaling) allows for independent scaling of services based on institutional load (e.g., scaling Django during exam seasons).
