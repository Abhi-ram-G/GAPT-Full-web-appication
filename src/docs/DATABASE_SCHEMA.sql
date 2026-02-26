-- GAPT Institutional Database Schema (MySQL 8.0+)
-- Generated for senior-level deployment

CREATE DATABASE IF NOT EXISTS gapt_db;
USE gapt_db;

-- 1. Governance & Identity
CREATE TABLE users (
    id CHAR(36) PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    role ENUM('ADMIN', 'STAFF', 'STUDENT', 'HOD', 'DEAN', 'ASSOC_PROF_I', 'ASSOC_PROF_II', 'ASSOC_PROF_III') NOT NULL,
    status ENUM('PENDING', 'APPROVED', 'REJECTED') DEFAULT 'PENDING',
    department VARCHAR(255),
    studyYear VARCHAR(50),
    regNo VARCHAR(100) UNIQUE,
    staffId VARCHAR(100) UNIQUE,
    designation VARCHAR(100),
    experience VARCHAR(50),
    avatar TEXT,
    theme_json JSON, -- Stores {mode, primaryColor}
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Academic Structure
CREATE TABLE courses (
    id CHAR(36) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    degree VARCHAR(50) NOT NULL,
    domain VARCHAR(100) NOT NULL,
    batch_type ENUM('UG', 'PG') NOT NULL
);

CREATE TABLE academic_batches (
    id CHAR(36) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    start_year INT NOT NULL,
    end_year INT NOT NULL,
    batch_type ENUM('UG', 'PG') NOT NULL
);

-- Junction table for Batches and Courses
CREATE TABLE batch_courses (
    batch_id CHAR(36),
    course_id CHAR(36),
    PRIMARY KEY (batch_id, course_id),
    FOREIGN KEY (batch_id) REFERENCES academic_batches(id) ON DELETE CASCADE,
    FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
);

CREATE TABLE subjects (
    id CHAR(36) PRIMARY KEY,
    course_id CHAR(36),
    code VARCHAR(50) NOT NULL,
    name VARCHAR(255) NOT NULL,
    credits INT NOT NULL,
    semester INT NOT NULL,
    lessons_count INT DEFAULT 1,
    materials_json JSON, -- Array of filenames
    lesson_names_json JSON, -- Array of module names
    FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
);

-- 3. Performance & Attendance
CREATE TABLE mark_batches (
    id CHAR(36) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    academic_year VARCHAR(50) NOT NULL,
    status ENUM('OPEN', 'FROZEN', 'BLOCKED') DEFAULT 'OPEN',
    subjects_json JSON, -- Subjects associated with this batch
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE mark_records (
    id CHAR(36) PRIMARY KEY,
    batch_id CHAR(36),
    student_id CHAR(36),
    subject_name VARCHAR(255),
    marks INT NOT NULL,
    max_marks INT NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    updated_by CHAR(36),
    FOREIGN KEY (batch_id) REFERENCES mark_batches(id),
    FOREIGN KEY (student_id) REFERENCES users(id)
);

CREATE TABLE attendance (
    id CHAR(36) PRIMARY KEY,
    user_id CHAR(36),
    date DATE NOT NULL,
    is_present BOOLEAN NOT NULL,
    marked_by CHAR(36),
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- 4. Operations & Communications
CREATE TABLE leave_requests (
    id CHAR(36) PRIMARY KEY,
    student_id CHAR(36),
    mentor_id CHAR(36),
    type ENUM('MEDICAL', 'PERSONAL', 'ACADEMIC') NOT NULL,
    start_date DATE NOT NULL,
    start_time TIME,
    end_date DATE NOT NULL,
    end_time TIME,
    reason TEXT,
    status ENUM('PENDING', 'APPROVED', 'REJECTED') DEFAULT 'PENDING',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (student_id) REFERENCES users(id),
    FOREIGN KEY (mentor_id) REFERENCES users(id)
);

CREATE TABLE notifications (
    id CHAR(36) PRIMARY KEY,
    user_id CHAR(36), -- Null for global
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    type VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE site_settings (
    id INT PRIMARY KEY DEFAULT 1,
    name VARCHAR(255),
    description TEXT,
    admin_email VARCHAR(255),
    theme_color VARCHAR(20),
    institution VARCHAR(255)
);

-- Indices for performance
CREATE INDEX idx_user_email ON users(email);
CREATE INDEX idx_mark_student ON mark_records(student_id);
CREATE INDEX idx_attendance_date ON attendance(date);
