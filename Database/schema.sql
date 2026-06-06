-- MySQL schema and procedures dumped on 2026-06-06T11:27:46.128Z
-- Database: lms_portal

SET FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS `admins`;
CREATE TABLE `admins` (
  `id` int NOT NULL AUTO_INCREMENT,
  `username` varchar(50) NOT NULL,
  `password_hash` varchar(255) NOT NULL,
  `name` varchar(100) NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `username` (`username`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `announcements`;
CREATE TABLE `announcements` (
  `id` int NOT NULL AUTO_INCREMENT,
  `title` varchar(150) NOT NULL,
  `content` text NOT NULL,
  `target_type` enum('college','department','class') NOT NULL,
  `target_id` int DEFAULT NULL,
  `created_by` int NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `target_id` (`target_id`),
  KEY `created_by` (`created_by`),
  KEY `idx_announcement_target` (`target_type`,`target_id`),
  CONSTRAINT `announcements_ibfk_1` FOREIGN KEY (`target_id`) REFERENCES `departments` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `announcements_ibfk_2` FOREIGN KEY (`created_by`) REFERENCES `admins` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `assignment_submissions`;
CREATE TABLE `assignment_submissions` (
  `id` int NOT NULL AUTO_INCREMENT,
  `assignment_id` int NOT NULL,
  `student_id` int NOT NULL,
  `file_url` varchar(255) NOT NULL,
  `status` enum('pending','verified','rejected') NOT NULL DEFAULT 'pending',
  `submitted_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `marks_obtained` decimal(5,2) DEFAULT NULL,
  `feedback` text,
  `verified_by` int DEFAULT NULL,
  `verified_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_assignment_student` (`assignment_id`,`student_id`),
  KEY `idx_submissions_student` (`student_id`),
  KEY `idx_submission_verified` (`verified_by`,`verified_at`),
  CONSTRAINT `assignment_submissions_ibfk_1` FOREIGN KEY (`assignment_id`) REFERENCES `assignments` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `assignment_submissions_ibfk_2` FOREIGN KEY (`student_id`) REFERENCES `students` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `assignment_submissions_ibfk_3` FOREIGN KEY (`verified_by`) REFERENCES `teachers` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `assignments`;
CREATE TABLE `assignments` (
  `id` int NOT NULL AUTO_INCREMENT,
  `title` varchar(150) NOT NULL,
  `description` text,
  `subject_id` int NOT NULL,
  `class_id` int NOT NULL,
  `due_date` date NOT NULL,
  `created_by` int NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `subject_id` (`subject_id`),
  KEY `created_by` (`created_by`),
  KEY `idx_assignments_class` (`class_id`),
  CONSTRAINT `assignments_ibfk_1` FOREIGN KEY (`subject_id`) REFERENCES `subjects` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `assignments_ibfk_2` FOREIGN KEY (`class_id`) REFERENCES `classes` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `assignments_ibfk_3` FOREIGN KEY (`created_by`) REFERENCES `teachers` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `attendance`;
CREATE TABLE `attendance` (
  `id` int NOT NULL AUTO_INCREMENT,
  `student_id` int NOT NULL,
  `subject_id` int NOT NULL,
  `class_id` int NOT NULL,
  `date` date NOT NULL,
  `hour_no` tinyint NOT NULL,
  `status` enum('present','absent','late') NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_student_subject_date_hour` (`student_id`,`subject_id`,`date`,`hour_no`),
  KEY `class_id` (`class_id`),
  KEY `idx_attendance_subject` (`subject_id`,`date`),
  KEY `idx_attendance_student` (`student_id`,`date`),
  CONSTRAINT `attendance_ibfk_1` FOREIGN KEY (`student_id`) REFERENCES `students` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `attendance_ibfk_2` FOREIGN KEY (`subject_id`) REFERENCES `subjects` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `attendance_ibfk_3` FOREIGN KEY (`class_id`) REFERENCES `classes` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `audit_logs`;
CREATE TABLE `audit_logs` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_type` enum('admin','teacher','student') NOT NULL,
  `user_id` int NOT NULL,
  `action` varchar(255) NOT NULL,
  `table_name` varchar(100) NOT NULL,
  `record_id` int NOT NULL,
  `timestamp` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_audit_user` (`user_type`,`user_id`),
  KEY `idx_audit_table` (`table_name`,`record_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `class_subjects`;
CREATE TABLE `class_subjects` (
  `id` int NOT NULL AUTO_INCREMENT,
  `class_id` int NOT NULL,
  `subject_id` int NOT NULL,
  `teacher_id` int NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_class_subject` (`class_id`,`subject_id`,`teacher_id`),
  KEY `subject_id` (`subject_id`),
  KEY `teacher_id` (`teacher_id`),
  CONSTRAINT `class_subjects_ibfk_1` FOREIGN KEY (`class_id`) REFERENCES `classes` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `class_subjects_ibfk_2` FOREIGN KEY (`subject_id`) REFERENCES `subjects` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `class_subjects_ibfk_3` FOREIGN KEY (`teacher_id`) REFERENCES `teachers` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `class_teachers`;
CREATE TABLE `class_teachers` (
  `id` int NOT NULL AUTO_INCREMENT,
  `teacher_id` int NOT NULL,
  `class_id` int NOT NULL,
  `role` enum('class_teacher','subject_teacher') NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_teacher_class` (`teacher_id`,`class_id`,`role`),
  KEY `class_id` (`class_id`),
  CONSTRAINT `class_teachers_ibfk_1` FOREIGN KEY (`teacher_id`) REFERENCES `teachers` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `class_teachers_ibfk_2` FOREIGN KEY (`class_id`) REFERENCES `classes` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `classes`;
CREATE TABLE `classes` (
  `id` int NOT NULL AUTO_INCREMENT,
  `department_id` int NOT NULL,
  `year` tinyint NOT NULL,
  `section` char(1) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_dept_year_section` (`department_id`,`year`,`section`),
  CONSTRAINT `classes_ibfk_1` FOREIGN KEY (`department_id`) REFERENCES `departments` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `departments`;
CREATE TABLE `departments` (
  `id` int NOT NULL AUTO_INCREMENT,
  `code` varchar(10) NOT NULL,
  `name` varchar(100) NOT NULL,
  `max_sections` tinyint NOT NULL DEFAULT '3',
  `students_per_class` int NOT NULL DEFAULT '60',
  `academic_year` varchar(9) NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `code` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `final_results`;
CREATE TABLE `final_results` (
  `id` int NOT NULL AUTO_INCREMENT,
  `student_id` int NOT NULL,
  `subject_id` int NOT NULL,
  `final_percent` decimal(5,2) NOT NULL,
  `cgpa` decimal(3,2) NOT NULL,
  `grade` enum('A+','A','B+','B','C','D','F') NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_student_subject_final` (`student_id`,`subject_id`),
  KEY `subject_id` (`subject_id`),
  CONSTRAINT `final_results_ibfk_1` FOREIGN KEY (`student_id`) REFERENCES `students` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `final_results_ibfk_2` FOREIGN KEY (`subject_id`) REFERENCES `subjects` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `internal_marks`;
CREATE TABLE `internal_marks` (
  `id` int NOT NULL AUTO_INCREMENT,
  `student_id` int NOT NULL,
  `subject_id` int NOT NULL,
  `test_number` tinyint NOT NULL,
  `marks` smallint NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_student_subject_test` (`student_id`,`subject_id`,`test_number`),
  KEY `subject_id` (`subject_id`),
  KEY `idx_internal_student` (`student_id`),
  CONSTRAINT `internal_marks_ibfk_1` FOREIGN KEY (`student_id`) REFERENCES `students` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `internal_marks_ibfk_2` FOREIGN KEY (`subject_id`) REFERENCES `subjects` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `internal_marks_chk_1` CHECK ((`test_number` between 1 and 3)),
  CONSTRAINT `internal_marks_chk_2` CHECK ((`marks` between 0 and 50))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `notes`;
CREATE TABLE `notes` (
  `id` int NOT NULL AUTO_INCREMENT,
  `class_id` int NOT NULL,
  `subject_id` int NOT NULL,
  `file_url` varchar(255) NOT NULL,
  `uploaded_by` int NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `title` varchar(150) NOT NULL,
  `description` text,
  `material_type` enum('notes','ppt','lab_manual','question_bank','previous_paper','assignment_solution') NOT NULL DEFAULT 'notes',
  PRIMARY KEY (`id`),
  KEY `subject_id` (`subject_id`),
  KEY `uploaded_by` (`uploaded_by`),
  KEY `idx_notes_class` (`class_id`),
  KEY `idx_notes_type` (`material_type`),
  CONSTRAINT `notes_ibfk_1` FOREIGN KEY (`class_id`) REFERENCES `classes` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `notes_ibfk_2` FOREIGN KEY (`subject_id`) REFERENCES `subjects` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `notes_ibfk_3` FOREIGN KEY (`uploaded_by`) REFERENCES `teachers` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `notifications`;
CREATE TABLE `notifications` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_type` enum('admin','teacher','student') NOT NULL,
  `user_id` int NOT NULL,
  `title` varchar(150) NOT NULL,
  `message` text NOT NULL,
  `is_read` tinyint(1) NOT NULL DEFAULT '0',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `user_id` (`user_id`),
  KEY `idx_notif_user` (`user_type`,`user_id`,`is_read`),
  CONSTRAINT `notifications_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `admins` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `practical_marks`;
CREATE TABLE `practical_marks` (
  `id` int NOT NULL AUTO_INCREMENT,
  `student_id` int NOT NULL,
  `subject_id` int NOT NULL,
  `marks` smallint NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_student_subject` (`student_id`,`subject_id`),
  KEY `subject_id` (`subject_id`),
  KEY `idx_practical_student` (`student_id`),
  CONSTRAINT `practical_marks_ibfk_1` FOREIGN KEY (`student_id`) REFERENCES `students` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `practical_marks_ibfk_2` FOREIGN KEY (`subject_id`) REFERENCES `subjects` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `practical_marks_chk_1` CHECK ((`marks` between 0 and 300))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `queries`;
CREATE TABLE `queries` (
  `id` int NOT NULL AUTO_INCREMENT,
  `student_id` int NOT NULL,
  `teacher_id` int NOT NULL,
  `subject_id` int DEFAULT NULL,
  `title` varchar(150) NOT NULL,
  `message` text NOT NULL,
  `reply` text,
  `status` enum('open','resolved') NOT NULL DEFAULT 'open',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `replied_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `teacher_id` (`teacher_id`),
  KEY `subject_id` (`subject_id`),
  KEY `idx_queries_student` (`student_id`),
  CONSTRAINT `queries_ibfk_1` FOREIGN KEY (`student_id`) REFERENCES `students` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `queries_ibfk_2` FOREIGN KEY (`teacher_id`) REFERENCES `teachers` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `queries_ibfk_3` FOREIGN KEY (`subject_id`) REFERENCES `subjects` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `query_messages`;
CREATE TABLE `query_messages` (
  `id` int NOT NULL AUTO_INCREMENT,
  `query_id` int NOT NULL,
  `sender_type` enum('student','teacher','admin') NOT NULL,
  `sender_id` int NOT NULL,
  `message` text NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `query_id` (`query_id`),
  KEY `idx_qmsg_sender` (`sender_type`,`sender_id`),
  CONSTRAINT `query_messages_ibfk_1` FOREIGN KEY (`query_id`) REFERENCES `queries` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `semester_gpa`;
CREATE TABLE `semester_gpa` (
  `id` int NOT NULL AUTO_INCREMENT,
  `student_id` int NOT NULL,
  `semester_id` int NOT NULL,
  `gpa` decimal(3,2) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_student_semester` (`student_id`,`semester_id`),
  KEY `semester_id` (`semester_id`),
  CONSTRAINT `semester_gpa_ibfk_1` FOREIGN KEY (`student_id`) REFERENCES `students` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `semester_gpa_ibfk_2` FOREIGN KEY (`semester_id`) REFERENCES `semesters` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `semester_marks`;
CREATE TABLE `semester_marks` (
  `id` int NOT NULL AUTO_INCREMENT,
  `student_id` int NOT NULL,
  `subject_id` int NOT NULL,
  `marks` smallint NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_student_subject_sem` (`student_id`,`subject_id`),
  KEY `subject_id` (`subject_id`),
  KEY `idx_semester_student` (`student_id`),
  CONSTRAINT `semester_marks_ibfk_1` FOREIGN KEY (`student_id`) REFERENCES `students` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `semester_marks_ibfk_2` FOREIGN KEY (`subject_id`) REFERENCES `subjects` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `semester_marks_chk_1` CHECK ((`marks` between 0 and 100))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `semesters`;
CREATE TABLE `semesters` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(20) NOT NULL,
  `start_date` date NOT NULL,
  `end_date` date NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `name` (`name`)
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `student_cgpa`;
CREATE TABLE `student_cgpa` (
  `id` int NOT NULL AUTO_INCREMENT,
  `student_id` int NOT NULL,
  `cgpa` decimal(3,2) NOT NULL,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `student_id` (`student_id`),
  CONSTRAINT `student_cgpa_ibfk_1` FOREIGN KEY (`student_id`) REFERENCES `students` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `student_class_history`;
CREATE TABLE `student_class_history` (
  `id` int NOT NULL AUTO_INCREMENT,
  `student_id` int NOT NULL,
  `class_id` int NOT NULL,
  `academic_year` varchar(9) NOT NULL,
  `semester_id` int NOT NULL,
  `start_date` date NOT NULL,
  `end_date` date DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_student_class` (`student_id`,`class_id`,`academic_year`,`semester_id`),
  KEY `class_id` (`class_id`),
  KEY `semester_id` (`semester_id`),
  CONSTRAINT `student_class_history_ibfk_1` FOREIGN KEY (`student_id`) REFERENCES `students` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `student_class_history_ibfk_2` FOREIGN KEY (`class_id`) REFERENCES `classes` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `student_class_history_ibfk_3` FOREIGN KEY (`semester_id`) REFERENCES `semesters` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `students`;
CREATE TABLE `students` (
  `id` int NOT NULL AUTO_INCREMENT,
  `unique_id` varchar(20) NOT NULL,
  `name` varchar(100) NOT NULL,
  `dob` date NOT NULL,
  `department_id` int NOT NULL,
  `year` tinyint NOT NULL,
  `class_id` int DEFAULT NULL,
  `password_hash` varchar(255) NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_id` (`unique_id`),
  KEY `department_id` (`department_id`),
  KEY `class_id` (`class_id`),
  CONSTRAINT `students_ibfk_1` FOREIGN KEY (`department_id`) REFERENCES `departments` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `students_ibfk_2` FOREIGN KEY (`class_id`) REFERENCES `classes` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `subject_teachers`;
CREATE TABLE `subject_teachers` (
  `id` int NOT NULL AUTO_INCREMENT,
  `teacher_id` int NOT NULL,
  `subject_id` int NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_teacher_subject` (`teacher_id`,`subject_id`),
  KEY `subject_id` (`subject_id`),
  CONSTRAINT `subject_teachers_ibfk_1` FOREIGN KEY (`teacher_id`) REFERENCES `teachers` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `subject_teachers_ibfk_2` FOREIGN KEY (`subject_id`) REFERENCES `subjects` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `subjects`;
CREATE TABLE `subjects` (
  `id` int NOT NULL AUTO_INCREMENT,
  `department_id` int NOT NULL,
  `code` varchar(20) NOT NULL,
  `name` varchar(100) NOT NULL,
  `semester_id` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `code` (`code`),
  KEY `department_id` (`department_id`),
  KEY `semester_id` (`semester_id`),
  CONSTRAINT `subjects_ibfk_1` FOREIGN KEY (`department_id`) REFERENCES `departments` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `subjects_ibfk_2` FOREIGN KEY (`semester_id`) REFERENCES `semesters` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `teachers`;
CREATE TABLE `teachers` (
  `id` int NOT NULL AUTO_INCREMENT,
  `unique_id` varchar(20) NOT NULL,
  `name` varchar(100) NOT NULL,
  `dob` date NOT NULL,
  `department_id` int NOT NULL,
  `password_hash` varchar(255) NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_id` (`unique_id`),
  KEY `department_id` (`department_id`),
  CONSTRAINT `teachers_ibfk_1` FOREIGN KEY (`department_id`) REFERENCES `departments` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

SET FOREIGN_KEY_CHECKS = 1;

-- ==========================================
-- STORED PROCEDURES
-- ==========================================

DROP PROCEDURE IF EXISTS sp_mark_attendance;
DELIMITER $$
CREATE PROCEDURE sp_mark_attendance(
    IN p_student_id   INT,
    IN p_subject_id   INT,
    IN p_class_id     INT,
    IN p_date         DATE,
    IN p_hour_no      TINYINT,
    IN p_status       ENUM('present','absent','late'),
    OUT p_msg         VARCHAR(255)
)
sp_mark_attendance: BEGIN
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        SET p_msg = 'Error: Failed to record attendance';
    END;

    START TRANSACTION;

    IF NOT EXISTS (SELECT 1 FROM students WHERE id = p_student_id) THEN
        SET p_msg = 'Error: Student does not exist';
        ROLLBACK;
        LEAVE sp_mark_attendance;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM subjects WHERE id = p_subject_id) THEN
        SET p_msg = 'Error: Subject does not exist';
        ROLLBACK;
        LEAVE sp_mark_attendance;
    END IF;

    INSERT INTO attendance (student_id, subject_id, class_id, date, hour_no, status)
    VALUES (p_student_id, p_subject_id, p_class_id, p_date, p_hour_no, p_status)
    ON DUPLICATE KEY UPDATE status = p_status;

    COMMIT;
    SET p_msg = 'Attendance recorded successfully';
END$$
DELIMITER ;

DROP PROCEDURE IF EXISTS sp_calculate_semester_gpa;
DELIMITER $$
CREATE PROCEDURE sp_calculate_semester_gpa(
    IN p_student_id   INT,
    IN p_semester_id  INT,
    OUT p_gpa         DECIMAL(3,2),
    OUT p_msg         VARCHAR(255)
)
sp_calculate_semester_gpa: BEGIN
    DECLARE v_sum_points INT DEFAULT 0;
    DECLARE v_count_subjects INT DEFAULT 0;
    DECLARE v_gpa DECIMAL(3,2) DEFAULT 0.00;

    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        SET p_gpa = 0.00;
        SET p_msg = 'Error: Failed to calculate semester GPA';
    END;

    START TRANSACTION;

    SELECT 
        IFNULL(SUM(
            CASE fr.grade
                WHEN 'A+' THEN 10
                WHEN 'A' THEN 9
                WHEN 'B+' THEN 8
                WHEN 'B' THEN 7
                WHEN 'C' THEN 6
                WHEN 'D' THEN 5
                ELSE 0
            END
        ), 0),
        COUNT(fr.id)
    INTO v_sum_points, v_count_subjects
    FROM final_results fr
    JOIN subjects sub ON fr.subject_id = sub.id
    WHERE fr.student_id = p_student_id AND sub.semester_id = p_semester_id;

    IF v_count_subjects = 0 THEN
        SET p_gpa = 0.00;
        SET p_msg = 'Info: No graded subjects found for this student and semester';
        ROLLBACK;
        LEAVE sp_calculate_semester_gpa;
    END IF;

    SET v_gpa = ROUND(v_sum_points / v_count_subjects, 2);
    SET p_gpa = v_gpa;

    INSERT INTO semester_gpa (student_id, semester_id, gpa)
    VALUES (p_student_id, p_semester_id, v_gpa)
    ON DUPLICATE KEY UPDATE gpa = v_gpa;

    INSERT INTO student_cgpa (student_id, cgpa)
    SELECT p_student_id, ROUND(AVG(gpa), 2)
    FROM semester_gpa
    WHERE student_id = p_student_id
    ON DUPLICATE KEY UPDATE cgpa = VALUES(cgpa);

    COMMIT;
    SET p_msg = 'GPA calculated successfully';
END$$
DELIMITER ;

DROP PROCEDURE IF EXISTS sp_publish_results;
DELIMITER $$
CREATE PROCEDURE sp_publish_results(
    IN p_semester_id  INT,
    OUT p_msg         VARCHAR(255)
)
sp_publish_results: BEGIN
    DECLARE done INT DEFAULT FALSE;
    DECLARE v_student_id INT;
    
    DECLARE cur1 CURSOR FOR 
        SELECT DISTINCT student_id 
        FROM final_results fr
        JOIN subjects sub ON fr.subject_id = sub.id
        WHERE sub.semester_id = p_semester_id;
        
    DECLARE CONTINUE HANDLER FOR NOT FOUND SET done = TRUE;

    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        SET p_msg = 'Error: Failed to publish semester results';
    END;

    START TRANSACTION;

    -- Calculate & Insert final results
    INSERT INTO final_results (student_id, subject_id, final_percent, cgpa, grade)
    SELECT 
        s.id AS student_id,
        sub.id AS subject_id,
        ROUND(
            CASE 
                WHEN pm.id IS NOT NULL THEN
                    (((COALESCE(im1.marks, 0) + COALESCE(im2.marks, 0) + COALESCE(im3.marks, 0)) - LEAST(COALESCE(im1.marks, 0), COALESCE(im2.marks, 0), COALESCE(im3.marks, 0))) * 0.4) +
                    (COALESCE(pm.marks, 0) / 10.0) +
                    (COALESCE(sm.marks, 0) * 0.3)
                ELSE
                    (((COALESCE(im1.marks, 0) + COALESCE(im2.marks, 0) + COALESCE(im3.marks, 0)) - LEAST(COALESCE(im1.marks, 0), COALESCE(im2.marks, 0), COALESCE(im3.marks, 0))) * 0.4) +
                    (COALESCE(sm.marks, 0) * 0.6)
            END, 2
        ) AS final_percent,
        ROUND(
            CASE 
                WHEN pm.id IS NOT NULL THEN
                    (((COALESCE(im1.marks, 0) + COALESCE(im2.marks, 0) + COALESCE(im3.marks, 0)) - LEAST(COALESCE(im1.marks, 0), COALESCE(im2.marks, 0), COALESCE(im3.marks, 0))) * 0.4) +
                    (COALESCE(pm.marks, 0) / 10.0) +
                    (COALESCE(sm.marks, 0) * 0.3)
                ELSE
                    (((COALESCE(im1.marks, 0) + COALESCE(im2.marks, 0) + COALESCE(im3.marks, 0)) - LEAST(COALESCE(im1.marks, 0), COALESCE(im2.marks, 0), COALESCE(im3.marks, 0))) * 0.4) +
                    (COALESCE(sm.marks, 0) * 0.6)
            END / 10.0, 2
        ) AS cgpa,
        CASE 
            WHEN CASE 
                WHEN pm.id IS NOT NULL THEN
                    (((COALESCE(im1.marks, 0) + COALESCE(im2.marks, 0) + COALESCE(im3.marks, 0)) - LEAST(COALESCE(im1.marks, 0), COALESCE(im2.marks, 0), COALESCE(im3.marks, 0))) * 0.4) +
                    (COALESCE(pm.marks, 0) / 10.0) +
                    (COALESCE(sm.marks, 0) * 0.3)
                ELSE
                    (((COALESCE(im1.marks, 0) + COALESCE(im2.marks, 0) + COALESCE(im3.marks, 0)) - LEAST(COALESCE(im1.marks, 0), COALESCE(im2.marks, 0), COALESCE(im3.marks, 0))) * 0.4) +
                    (COALESCE(sm.marks, 0) * 0.6)
            END >= 90.00 THEN 'A+'
            WHEN CASE 
                WHEN pm.id IS NOT NULL THEN
                    (((COALESCE(im1.marks, 0) + COALESCE(im2.marks, 0) + COALESCE(im3.marks, 0)) - LEAST(COALESCE(im1.marks, 0), COALESCE(im2.marks, 0), COALESCE(im3.marks, 0))) * 0.4) +
                    (COALESCE(pm.marks, 0) / 10.0) +
                    (COALESCE(sm.marks, 0) * 0.3)
                ELSE
                    (((COALESCE(im1.marks, 0) + COALESCE(im2.marks, 0) + COALESCE(im3.marks, 0)) - LEAST(COALESCE(im1.marks, 0), COALESCE(im2.marks, 0), COALESCE(im3.marks, 0))) * 0.4) +
                    (COALESCE(sm.marks, 0) * 0.6)
            END >= 80.00 THEN 'A'
            WHEN CASE 
                WHEN pm.id IS NOT NULL THEN
                    (((COALESCE(im1.marks, 0) + COALESCE(im2.marks, 0) + COALESCE(im3.marks, 0)) - LEAST(COALESCE(im1.marks, 0), COALESCE(im2.marks, 0), COALESCE(im3.marks, 0))) * 0.4) +
                    (COALESCE(pm.marks, 0) / 10.0) +
                    (COALESCE(sm.marks, 0) * 0.3)
                ELSE
                    (((COALESCE(im1.marks, 0) + COALESCE(im2.marks, 0) + COALESCE(im3.marks, 0)) - LEAST(COALESCE(im1.marks, 0), COALESCE(im2.marks, 0), COALESCE(im3.marks, 0))) * 0.4) +
                    (COALESCE(sm.marks, 0) * 0.6)
            END >= 70.00 THEN 'B+'
            WHEN CASE 
                WHEN pm.id IS NOT NULL THEN
                    (((COALESCE(im1.marks, 0) + COALESCE(im2.marks, 0) + COALESCE(im3.marks, 0)) - LEAST(COALESCE(im1.marks, 0), COALESCE(im2.marks, 0), COALESCE(im3.marks, 0))) * 0.4) +
                    (COALESCE(pm.marks, 0) / 10.0) +
                    (COALESCE(sm.marks, 0) * 0.3)
                ELSE
                    (((COALESCE(im1.marks, 0) + COALESCE(im2.marks, 0) + COALESCE(im3.marks, 0)) - LEAST(COALESCE(im1.marks, 0), COALESCE(im2.marks, 0), COALESCE(im3.marks, 0))) * 0.4) +
                    (COALESCE(sm.marks, 0) * 0.6)
            END >= 60.00 THEN 'B'
            WHEN CASE 
                WHEN pm.id IS NOT NULL THEN
                    (((COALESCE(im1.marks, 0) + COALESCE(im2.marks, 0) + COALESCE(im3.marks, 0)) - LEAST(COALESCE(im1.marks, 0), COALESCE(im2.marks, 0), COALESCE(im3.marks, 0))) * 0.4) +
                    (COALESCE(pm.marks, 0) / 10.0) +
                    (COALESCE(sm.marks, 0) * 0.3)
                ELSE
                    (((COALESCE(im1.marks, 0) + COALESCE(im2.marks, 0) + COALESCE(im3.marks, 0)) - LEAST(COALESCE(im1.marks, 0), COALESCE(im2.marks, 0), COALESCE(im3.marks, 0))) * 0.4) +
                    (COALESCE(sm.marks, 0) * 0.6)
            END >= 50.00 THEN 'C'
            WHEN CASE 
                WHEN pm.id IS NOT NULL THEN
                    (((COALESCE(im1.marks, 0) + COALESCE(im2.marks, 0) + COALESCE(im3.marks, 0)) - LEAST(COALESCE(im1.marks, 0), COALESCE(im2.marks, 0), COALESCE(im3.marks, 0))) * 0.4) +
                    (COALESCE(pm.marks, 0) / 10.0) +
                    (COALESCE(sm.marks, 0) * 0.3)
                ELSE
                    (((COALESCE(im1.marks, 0) + COALESCE(im2.marks, 0) + COALESCE(im3.marks, 0)) - LEAST(COALESCE(im1.marks, 0), COALESCE(im2.marks, 0), COALESCE(im3.marks, 0))) * 0.4) +
                    (COALESCE(sm.marks, 0) * 0.6)
            END >= 40.00 THEN 'D'
            ELSE 'F'
        END AS grade
    FROM students s
    JOIN subjects sub ON sub.semester_id = p_semester_id
    LEFT JOIN internal_marks im1 ON im1.student_id = s.id AND im1.subject_id = sub.id AND im1.test_number = 1
    LEFT JOIN internal_marks im2 ON im2.student_id = s.id AND im2.subject_id = sub.id AND im2.test_number = 2
    LEFT JOIN internal_marks im3 ON im3.student_id = s.id AND im3.subject_id = sub.id AND im3.test_number = 3
    LEFT JOIN practical_marks pm ON pm.student_id = s.id AND pm.subject_id = sub.id
    LEFT JOIN semester_marks sm ON sm.student_id = s.id AND sm.subject_id = sub.id
    WHERE (im1.id IS NOT NULL OR im2.id IS NOT NULL OR im3.id IS NOT NULL OR pm.id IS NOT NULL OR sm.id IS NOT NULL)
    ON DUPLICATE KEY UPDATE 
        final_percent = VALUES(final_percent),
        cgpa = VALUES(cgpa),
        grade = VALUES(grade);

    -- Compute GPA for each student who has results in this semester
    OPEN cur1;
    read_loop: LOOP
        FETCH cur1 INTO v_student_id;
        IF done THEN
            LEAVE read_loop;
        END IF;
        CALL sp_calculate_semester_gpa(v_student_id, p_semester_id, @dummy_gpa, @dummy_msg);
    END LOOP;
    CLOSE cur1;

    COMMIT;
    SET p_msg = 'Semester results calculated and published successfully';
END$$
DELIMITER ;

