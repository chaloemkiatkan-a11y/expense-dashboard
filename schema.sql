-- Cloudflare D1 Database Schema for Team Task Management

-- 1. Create Members Table
CREATE TABLE IF NOT EXISTS members (
    name TEXT PRIMARY KEY
);

-- 2. Create Tasks Table
CREATE TABLE IF NOT EXISTS tasks (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    deadline TEXT NOT NULL,
    assignee TEXT NOT NULL,
    status TEXT NOT NULL,
    priority TEXT NOT NULL
);

-- 3. Insert Initial Team Members (Seed Data)
INSERT OR IGNORE INTO members (name) VALUES ('สมชาย ใจดี');
INSERT OR IGNORE INTO members (name) VALUES ('สมหญิง รักงาน');
INSERT OR IGNORE INTO members (name) VALUES ('สมศักดิ์ สู้ชีวิต');
INSERT OR IGNORE INTO members (name) VALUES ('ไม่มีผู้รับผิดชอบ');

-- 4. Insert Initial Tasks (Seed Data)
INSERT OR IGNORE INTO tasks (id, title, description, deadline, assignee, status, priority) VALUES 
('task-1', 'ออกแบบหน้าหลักของแอปพลิเคชัน (UI Dashboard)', 'ออกแบบระบบ Glassmorphism UI สำหรับหน้าสถิติและ Kanban Board เพื่อเสนอผู้ใช้งาน', '2026-06-27', 'สมชาย ใจดี', 'todo', 'high'),
('task-2', 'พัฒนาฟังก์ชัน Drag and Drop', 'เขียนลอจิก JavaScript เพื่อให้สามารถลากการ์ดงานสลับคอลัมน์ได้เสมือนจริง', '2026-06-26', 'สมชาย ใจดี', 'in_progress', 'medium'),
('task-3', 'ทำสรุปรายงานยอดขายไตรมาส 2', 'รวบรวมข้อมูลยอดขายและทำสไลด์นำเสนอสำหรับการประชุมกับฝ่ายบริหาร', '2026-06-25', 'สมหญิง รักงาน', 'review', 'medium'),
('task-4', 'แก้ไขบักการอัปโหลดไฟล์', 'บักอัปโหลดไฟล์รูปภาพขนาดเกิน 5MB แล้วระบบล่ม ได้แก้ไขและทดสอบเรียบร้อย', '2026-06-23', 'สมศักดิ์ สู้ชีวิต', 'done', 'high'),
('task-5', 'อัปเดตเอกสารคู่มือผู้ใช้', 'เขียนอธิบายวิธีการใช้หน้า Kanban และการทำงานของระบบจำลองสิทธิ์การเข้าถึง', '2026-06-29', 'สมหญิง รักงาน', 'todo', 'low');
