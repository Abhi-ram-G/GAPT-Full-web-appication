# GAPT Database Entity Relationship Diagram

This diagram represents the relational structure of the Green Academic Performance Tracker (GAPT) system.

```mermaid
erDiagram
    USER ||--o{ NOTIFICATION : receives
    USER ||--o{ LEAVE_REQUEST : "requests (Student) / approves (Staff)"
    USER ||--o{ ATTENDANCE_RECORD : "marked_in"
    USER ||--|| ACADEMIC_DATA : "has (Student)"
    
    ACADEMIC_BATCH ||--o{ COURSE : contains
    COURSE ||--o{ SUBJECT : "defined_by"
    
    MARK_BATCH ||--o{ MARK_RECORD : aggregates
    SUBJECT ||--o{ MARK_RECORD : "graded_in"
    USER ||--o{ MARK_RECORD : "earns (Student)"
    
    USER {
        string id PK
        string email
        string password
        string name
        string role "ADMIN | STAFF | STUDENT | HOD | DEAN"
        string status "PENDING | APPROVED | REJECTED"
        string department
        string regNo
        string staffId
    }

    ACADEMIC_DATA {
        float cgpa
        float sgpa
        int attendance_pct
        int credits
        int greenPoints
    }

    COURSE {
        string id PK
        string name
        string degree
        string domain
        string batchType "UG | PG"
    }

    SUBJECT {
        string id PK
        string code
        string name
        int credits
        int semester
        string materials "JSON_ARRAY"
    }

    ACADEMIC_BATCH {
        string id PK
        string name
        int startYear
        int endYear
        string departmentIds "FK_ARRAY"
    }

    MARK_RECORD {
        string id PK
        string batchId FK
        string studentId FK
        string subject FK
        int marks
    }

    LEAVE_REQUEST {
        string id PK
        string studentId FK
        string mentorId FK
        string status "PENDING | APPROVED | REJECTED"
        string reason
    }

    PORTAL_CONNECTION {
        string id PK
        string name
        string url
        string status "CONNECTED | DISCONNECTED"
        string permission "READ_ONLY | READ_WRITE"
    }
```

## Data Governance Rules
1. **Referential Integrity**: All Student IDs in `MARK_RECORD` must exist in the `USER` table.
2. **Access Control**: Features are unlocked via a `PermissionMap` stored in the `MockDB`.
3. **Auditing**: `NOTIFICATION` records act as the system's audit trail for all significant status changes.
