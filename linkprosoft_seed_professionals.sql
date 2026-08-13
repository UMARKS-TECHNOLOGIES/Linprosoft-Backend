-- ============================================================================
-- LINKPROSOFT — EXPANDED PROFESSIONALS SEED SCRIPT
-- ============================================================================
-- Purpose: Create 5 professionals in each category (Plumber, Carpenter, Web Design,
--          Electrician, Painter) = 25 professionals total with realistic data
--
-- All professionals use password: TestPass123!
-- All are pre-verified so they can log in immediately
-- ============================================================================


-- ============================================================================
-- STEP 0 — VERIFY YOUR ACTUAL SCHEMA (read-only, safe to run anytime)
-- ============================================================================
SELECT table_name, column_name, data_type
FROM information_schema.columns
WHERE table_name IN ('users', 'professional_profiles', 'skills', 'professional_skills')
  AND column_name IN ('id', 'user_id', 'email', 'full_name', 'role', 'professional_type')
ORDER BY table_name, column_name;


-- ============================================================================
-- STEP 1 — SEED DATA (wrapped in one transaction: all-or-nothing)
-- ============================================================================
BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ============================================================================
-- 1a. PLUMBERS (5 professionals)
-- ============================================================================
INSERT INTO users (id, email, password_hash, full_name, auth_provider, role, professional_type, is_email_verified, is_active, phone, location)
VALUES
  ('b1100001-0000-4000-8000-000000000001', 'plumber1@test.linkprosoft.com', crypt('TestPass123!', gen_salt('bf', 12)), 'Emeka Nwankwo', 'email', 'professional', 'non_digital', TRUE, TRUE, '+2348011111101', 'Lekki, Lagos'),
  ('b1100002-0000-4000-8000-000000000002', 'plumber2@test.linkprosoft.com', crypt('TestPass123!', gen_salt('bf', 12)), 'Rasheed Oladele', 'email', 'professional', 'non_digital', TRUE, TRUE, '+2348011111102', 'Surulere, Lagos'),
  ('b1100003-0000-4000-8000-000000000003', 'plumber3@test.linkprosoft.com', crypt('TestPass123!', gen_salt('bf', 12)), 'Chukwuma Okoro', 'email', 'professional', 'non_digital', TRUE, TRUE, '+2348011111103', 'Ajah, Lagos'),
  ('b1100004-0000-4000-8000-000000000004', 'plumber4@test.linkprosoft.com', crypt('TestPass123!', gen_salt('bf', 12)), 'Ifeanyi Ejiofor', 'email', 'professional', 'non_digital', TRUE, TRUE, '+2348011111104', 'Ikoyi, Lagos'),
  ('b1100005-0000-4000-8000-000000000005', 'plumber5@test.linkprosoft.com', crypt('TestPass123!', gen_salt('bf', 12)), 'Adebayo Awolowo', 'email', 'professional', 'non_digital', TRUE, TRUE, '+2348011111105', 'VI, Lagos')
ON CONFLICT (email) DO NOTHING;

-- ============================================================================
-- 1b. CARPENTERS (5 professionals)
-- ============================================================================
INSERT INTO users (id, email, password_hash, full_name, auth_provider, role, professional_type, is_email_verified, is_active, phone, location)
VALUES
  ('b1200001-0000-4000-8000-000000000001', 'carpenter1@test.linkprosoft.com', crypt('TestPass123!', gen_salt('bf', 12)), 'Sunday Okezie', 'email', 'professional', 'non_digital', TRUE, TRUE, '+2348022222201', 'Lekki, Lagos'),
  ('b1200002-0000-4000-8000-000000000002', 'carpenter2@test.linkprosoft.com', crypt('TestPass123!', gen_salt('bf', 12)), 'Chidera Okafor', 'email', 'professional', 'non_digital', TRUE, TRUE, '+2348022222202', 'Ikeja, Lagos'),
  ('b1200003-0000-4000-8000-000000000003', 'carpenter3@test.linkprosoft.com', crypt('TestPass123!', gen_salt('bf', 12)), 'Jude Nwachukwu', 'email', 'professional', 'non_digital', TRUE, TRUE, '+2348022222203', 'Yaba, Lagos'),
  ('b1200004-0000-4000-8000-000000000004', 'carpenter4@test.linkprosoft.com', crypt('TestPass123!', gen_salt('bf', 12)), 'Miriam Adeleke', 'email', 'professional', 'non_digital', TRUE, TRUE, '+2348022222204', 'Ajah, Lagos'),
  ('b1200005-0000-4000-8000-000000000005', 'carpenter5@test.linkprosoft.com', crypt('TestPass123!', gen_salt('bf', 12)), 'Aminu Yahaya', 'email', 'professional', 'non_digital', TRUE, TRUE, '+2348022222205', 'Lekki Phase 1, Lagos')
ON CONFLICT (email) DO NOTHING;

-- ============================================================================
-- 1c. WEB DESIGNERS/DEVELOPERS (5 professionals - digital)
-- ============================================================================
INSERT INTO users (id, email, password_hash, full_name, auth_provider, role, professional_type, is_email_verified, is_active, phone, location)
VALUES
  ('b1300001-0000-4000-8000-000000000001', 'webdev1@test.linkprosoft.com', crypt('TestPass123!', gen_salt('bf', 12)), 'Tochukwu Ogada', 'email', 'professional', 'digital', TRUE, TRUE, '+2348033333301', 'Lagos (Remote)'),
  ('b1300002-0000-4000-8000-000000000002', 'webdev2@test.linkprosoft.com', crypt('TestPass123!', gen_salt('bf', 12)), 'Zainab Mohammed', 'email', 'professional', 'digital', TRUE, TRUE, '+2348033333302', 'Lagos (Remote)'),
  ('b1300003-0000-4000-8000-000000000003', 'webdev3@test.linkprosoft.com', crypt('TestPass123!', gen_salt('bf', 12)), 'Okechukwu Ibe', 'email', 'professional', 'digital', TRUE, TRUE, '+2348033333303', 'Lagos (Remote)'),
  ('b1300004-0000-4000-8000-000000000004', 'webdev4@test.linkprosoft.com', crypt('TestPass123!', gen_salt('bf', 12)), 'Nneka Anyanwu', 'email', 'professional', 'digital', TRUE, TRUE, '+2348033333304', 'Lagos (Remote)'),
  ('b1300005-0000-4000-8000-000000000005', 'webdev5@test.linkprosoft.com', crypt('TestPass123!', gen_salt('bf', 12)), 'Seyi Balogun', 'email', 'professional', 'digital', TRUE, TRUE, '+2348033333305', 'Lagos (Remote)')
ON CONFLICT (email) DO NOTHING;

-- ============================================================================
-- 1d. ELECTRICIANS (5 professionals)
-- ============================================================================
INSERT INTO users (id, email, password_hash, full_name, auth_provider, role, professional_type, is_email_verified, is_active, phone, location)
VALUES
  ('b1400001-0000-4000-8000-000000000001', 'electrician1@test.linkprosoft.com', crypt('TestPass123!', gen_salt('bf', 12)), 'Kunle Fatunsin', 'email', 'professional', 'non_digital', TRUE, TRUE, '+2348044444401', 'Lekki, Lagos'),
  ('b1400002-0000-4000-8000-000000000002', 'electrician2@test.linkprosoft.com', crypt('TestPass123!', gen_salt('bf', 12)), 'Gbemisola Adekunle', 'email', 'professional', 'non_digital', TRUE, TRUE, '+2348044444402', 'Ikoyi, Lagos'),
  ('b1400003-0000-4000-8000-000000000003', 'electrician3@test.linkprosoft.com', crypt('TestPass123!', gen_salt('bf', 12)), 'Babatunde Ogunlade', 'email', 'professional', 'non_digital', TRUE, TRUE, '+2348044444403', 'Surulere, Lagos'),
  ('b1400004-0000-4000-8000-000000000004', 'electrician4@test.linkprosoft.com', crypt('TestPass123!', gen_salt('bf', 12)), 'Chinedu Umeh', 'email', 'professional', 'non_digital', TRUE, TRUE, '+2348044444404', 'Ikeja, Lagos'),
  ('b1400005-0000-4000-8000-000000000005', 'electrician5@test.linkprosoft.com', crypt('TestPass123!', gen_salt('bf', 12)), 'Folake Adeyemi', 'email', 'professional', 'non_digital', TRUE, TRUE, '+2348044444405', 'VGC, Lagos')
ON CONFLICT (email) DO NOTHING;

-- ============================================================================
-- 1e. PAINTERS (5 professionals)
-- ============================================================================
INSERT INTO users (id, email, password_hash, full_name, auth_provider, role, professional_type, is_email_verified, is_active, phone, location)
VALUES
  ('b1500001-0000-4000-8000-000000000001', 'painter1@test.linkprosoft.com', crypt('TestPass123!', gen_salt('bf', 12)), 'Olufemi Ayeni', 'email', 'professional', 'non_digital', TRUE, TRUE, '+2348055555501', 'Lekki, Lagos'),
  ('b1500002-0000-4000-8000-000000000002', 'painter2@test.linkprosoft.com', crypt('TestPass123!', gen_salt('bf', 12)), 'Precious Okonkwo', 'email', 'professional', 'non_digital', TRUE, TRUE, '+2348055555502', 'Ajah, Lagos'),
  ('b1500003-0000-4000-8000-000000000003', 'painter3@test.linkprosoft.com', crypt('TestPass123!', gen_salt('bf', 12)), 'Michael Okafor', 'email', 'professional', 'non_digital', TRUE, TRUE, '+2348055555503', 'Surulere, Lagos'),
  ('b1500004-0000-4000-8000-000000000004', 'painter4@test.linkprosoft.com', crypt('TestPass123!', gen_salt('bf', 12)), 'Lucia Adeniran', 'email', 'professional', 'non_digital', TRUE, TRUE, '+2348055555504', 'Yaba, Lagos'),
  ('b1500005-0000-4000-8000-000000000005', 'painter5@test.linkprosoft.com', crypt('TestPass123!', gen_salt('bf', 12)), 'Emile Okafor', 'email', 'professional', 'non_digital', TRUE, TRUE, '+2348055555505', 'Ikoyi, Lagos')
ON CONFLICT (email) DO NOTHING;

-- ============================================================================
-- 2. ENSURE SKILLS EXIST
-- ============================================================================
INSERT INTO skills (name, category, description)
VALUES
  ('Plumbing', 'Trades', 'Pipe repair, installation and fixture fitting'),
  ('Carpentry', 'Trades', 'Furniture building, wardrobe and cabinet installation'),
  ('Web Development', 'Digital', 'Frontend and backend web application development'),
  ('Electrical Installation', 'Trades', 'Wiring, diagnostics and appliance installation'),
  ('House Painting', 'Trades', 'Interior and exterior painting services')
ON CONFLICT (name) DO NOTHING;

-- ============================================================================
-- 3. CREATE PROFESSIONAL PROFILES
-- ============================================================================

-- Plumbers (5)
INSERT INTO professional_profiles (user_id, hourly_rate, bio, profession, availability_status, response_time_hours)
SELECT id, 5000, 'Expert plumber with 10+ years of experience in residential and commercial plumbing services.', 'plumber', 'available', 2
FROM users WHERE email = 'plumber1@test.linkprosoft.com'
ON CONFLICT (user_id) DO NOTHING;

INSERT INTO professional_profiles (user_id, hourly_rate, bio, profession, availability_status, response_time_hours)
SELECT id, 4500, 'Experienced plumber specializing in pipe installation, repairs and maintenance.', 'plumber', 'available', 3
FROM users WHERE email = 'plumber2@test.linkprosoft.com'
ON CONFLICT (user_id) DO NOTHING;

INSERT INTO professional_profiles (user_id, hourly_rate, bio, profession, availability_status, response_time_hours)
SELECT id, 5500, 'Licensed plumber offering same-day service for urgent plumbing emergencies.', 'plumber', 'available', 1
FROM users WHERE email = 'plumber3@test.linkprosoft.com'
ON CONFLICT (user_id) DO NOTHING;

INSERT INTO professional_profiles (user_id, hourly_rate, bio, profession, availability_status, response_time_hours)
SELECT id, 4800, 'Professional plumber with expertise in modern plumbing systems and fixtures.', 'plumber', 'available', 2
FROM users WHERE email = 'plumber4@test.linkprosoft.com'
ON CONFLICT (user_id) DO NOTHING;

INSERT INTO professional_profiles (user_id, hourly_rate, bio, profession, availability_status, response_time_hours)
SELECT id, 5200, 'Certified plumber providing comprehensive plumbing solutions for homes and offices.', 'plumber', 'available', 2
FROM users WHERE email = 'plumber5@test.linkprosoft.com'
ON CONFLICT (user_id) DO NOTHING;

-- Carpenters (5)
INSERT INTO professional_profiles (user_id, hourly_rate, bio, profession, availability_status, response_time_hours)
SELECT id, 6000, 'Master carpenter specializing in custom furniture and wood finishing.', 'carpenter', 'available', 3
FROM users WHERE email = 'carpenter1@test.linkprosoft.com'
ON CONFLICT (user_id) DO NOTHING;

INSERT INTO professional_profiles (user_id, hourly_rate, bio, profession, availability_status, response_time_hours)
SELECT id, 5500, 'Experienced carpenter with expertise in wardrobe installations and kitchen cabinetry.', 'carpenter', 'available', 2
FROM users WHERE email = 'carpenter2@test.linkprosoft.com'
ON CONFLICT (user_id) DO NOTHING;

INSERT INTO professional_profiles (user_id, hourly_rate, bio, profession, availability_status, response_time_hours)
SELECT id, 5800, 'Professional carpenter offering quality craftsmanship and attention to detail.', 'carpenter', 'available', 2
FROM users WHERE email = 'carpenter3@test.linkprosoft.com'
ON CONFLICT (user_id) DO NOTHING;

INSERT INTO professional_profiles (user_id, hourly_rate, bio, profession, availability_status, response_time_hours)
SELECT id, 6200, 'Skilled carpenter specializing in contemporary furniture design and installation.', 'carpenter', 'available', 3
FROM users WHERE email = 'carpenter4@test.linkprosoft.com'
ON CONFLICT (user_id) DO NOTHING;

INSERT INTO professional_profiles (user_id, hourly_rate, bio, profession, availability_status, response_time_hours)
SELECT id, 5600, 'Experienced carpenter with track record of delivering high-quality bespoke pieces.', 'carpenter', 'available', 2
FROM users WHERE email = 'carpenter5@test.linkprosoft.com'
ON CONFLICT (user_id) DO NOTHING;

-- Web Developers/Designers (5) - Digital
INSERT INTO professional_profiles (user_id, hourly_rate, bio, profession, availability_status, response_time_hours)
SELECT id, 20000, 'Full-stack developer with 8+ years building responsive web applications.', 'web developer', 'available', 4
FROM users WHERE email = 'webdev1@test.linkprosoft.com'
ON CONFLICT (user_id) DO NOTHING;

INSERT INTO professional_profiles (user_id, hourly_rate, bio, profession, availability_status, response_time_hours)
SELECT id, 18000, 'Web designer and developer creating modern, user-friendly digital experiences.', 'web developer', 'available', 4
FROM users WHERE email = 'webdev2@test.linkprosoft.com'
ON CONFLICT (user_id) DO NOTHING;

INSERT INTO professional_profiles (user_id, hourly_rate, bio, profession, availability_status, response_time_hours)
SELECT id, 22000, 'Senior developer specializing in e-commerce and business websites.', 'web developer', 'available', 5
FROM users WHERE email = 'webdev3@test.linkprosoft.com'
ON CONFLICT (user_id) DO NOTHING;

INSERT INTO professional_profiles (user_id, hourly_rate, bio, profession, availability_status, response_time_hours)
SELECT id, 17000, 'Frontend developer creating beautiful and performant web interfaces.', 'web developer', 'available', 4
FROM users WHERE email = 'webdev4@test.linkprosoft.com'
ON CONFLICT (user_id) DO NOTHING;

INSERT INTO professional_profiles (user_id, hourly_rate, bio, profession, availability_status, response_time_hours)
SELECT id, 19000, 'Web development specialist with focus on mobile-responsive design and SEO.', 'web developer', 'available', 4
FROM users WHERE email = 'webdev5@test.linkprosoft.com'
ON CONFLICT (user_id) DO NOTHING;

-- Electricians (5)
INSERT INTO professional_profiles (user_id, hourly_rate, bio, profession, availability_status, response_time_hours)
SELECT id, 6500, 'Licensed electrician with expertise in domestic and commercial electrical work.', 'electrician', 'available', 2
FROM users WHERE email = 'electrician1@test.linkprosoft.com'
ON CONFLICT (user_id) DO NOTHING;

INSERT INTO professional_profiles (user_id, hourly_rate, bio, profession, availability_status, response_time_hours)
SELECT id, 6000, 'Professional electrician specializing in wiring, diagnostics and fault finding.', 'electrician', 'available', 2
FROM users WHERE email = 'electrician2@test.linkprosoft.com'
ON CONFLICT (user_id) DO NOTHING;

INSERT INTO professional_profiles (user_id, hourly_rate, bio, profession, availability_status, response_time_hours)
SELECT id, 6800, 'Certified electrician offering emergency electrical services and installations.', 'electrician', 'available', 1
FROM users WHERE email = 'electrician3@test.linkprosoft.com'
ON CONFLICT (user_id) DO NOTHING;

INSERT INTO professional_profiles (user_id, hourly_rate, bio, profession, availability_status, response_time_hours)
SELECT id, 6200, 'Experienced electrician with knowledge of modern electrical systems and safety standards.', 'electrician', 'available', 2
FROM users WHERE email = 'electrician4@test.linkprosoft.com'
ON CONFLICT (user_id) DO NOTHING;

INSERT INTO professional_profiles (user_id, hourly_rate, bio, profession, availability_status, response_time_hours)
SELECT id, 6400, 'Professional electrician providing reliable and efficient electrical solutions.', 'electrician', 'available', 2
FROM users WHERE email = 'electrician5@test.linkprosoft.com'
ON CONFLICT (user_id) DO NOTHING;

-- Painters (5)
INSERT INTO professional_profiles (user_id, hourly_rate, bio, profession, availability_status, response_time_hours)
SELECT id, 4500, 'Professional painter with 12+ years experience in interior and exterior painting.', 'painter', 'available', 2
FROM users WHERE email = 'painter1@test.linkprosoft.com'
ON CONFLICT (user_id) DO NOTHING;

INSERT INTO professional_profiles (user_id, hourly_rate, bio, profession, availability_status, response_time_hours)
SELECT id, 4200, 'Experienced painter specializing in residential painting and decorative finishes.', 'painter', 'available', 3
FROM users WHERE email = 'painter2@test.linkprosoft.com'
ON CONFLICT (user_id) DO NOTHING;

INSERT INTO professional_profiles (user_id, hourly_rate, bio, profession, availability_status, response_time_hours)
SELECT id, 4700, 'Quality painter offering premium paint application and surface preparation.', 'painter', 'available', 2
FROM users WHERE email = 'painter3@test.linkprosoft.com'
ON CONFLICT (user_id) DO NOTHING;

INSERT INTO professional_profiles (user_id, hourly_rate, bio, profession, availability_status, response_time_hours)
SELECT id, 4300, 'Professional painter with expertise in color consultation and modern painting techniques.', 'painter', 'available', 2
FROM users WHERE email = 'painter4@test.linkprosoft.com'
ON CONFLICT (user_id) DO NOTHING;

INSERT INTO professional_profiles (user_id, hourly_rate, bio, profession, availability_status, response_time_hours)
SELECT id, 4600, 'Skilled painter delivering exceptional results for all residential painting projects.', 'painter', 'available', 2
FROM users WHERE email = 'painter5@test.linkprosoft.com'
ON CONFLICT (user_id) DO NOTHING;

-- ============================================================================
-- 4. LINK PROFESSIONALS TO THEIR SKILLS
-- ============================================================================

-- Plumbers → Plumbing Skill
INSERT INTO professional_skills (professional_id, skill_id, proficiency_level, years_of_experience, is_primary)
SELECT pp.id, s.id, 'expert', 10, TRUE
FROM professional_profiles pp
JOIN users u ON u.id = pp.user_id
JOIN skills s ON s.name = 'Plumbing'
WHERE u.email = 'plumber1@test.linkprosoft.com'
ON CONFLICT (professional_id, skill_id) DO NOTHING;

INSERT INTO professional_skills (professional_id, skill_id, proficiency_level, years_of_experience, is_primary)
SELECT pp.id, s.id, 'expert', 8, TRUE
FROM professional_profiles pp
JOIN users u ON u.id = pp.user_id
JOIN skills s ON s.name = 'Plumbing'
WHERE u.email = 'plumber2@test.linkprosoft.com'
ON CONFLICT (professional_id, skill_id) DO NOTHING;

INSERT INTO professional_skills (professional_id, skill_id, proficiency_level, years_of_experience, is_primary)
SELECT pp.id, s.id, 'expert', 12, TRUE
FROM professional_profiles pp
JOIN users u ON u.id = pp.user_id
JOIN skills s ON s.name = 'Plumbing'
WHERE u.email = 'plumber3@test.linkprosoft.com'
ON CONFLICT (professional_id, skill_id) DO NOTHING;

INSERT INTO professional_skills (professional_id, skill_id, proficiency_level, years_of_experience, is_primary)
SELECT pp.id, s.id, 'expert', 9, TRUE
FROM professional_profiles pp
JOIN users u ON u.id = pp.user_id
JOIN skills s ON s.name = 'Plumbing'
WHERE u.email = 'plumber4@test.linkprosoft.com'
ON CONFLICT (professional_id, skill_id) DO NOTHING;

INSERT INTO professional_skills (professional_id, skill_id, proficiency_level, years_of_experience, is_primary)
SELECT pp.id, s.id, 'expert', 11, TRUE
FROM professional_profiles pp
JOIN users u ON u.id = pp.user_id
JOIN skills s ON s.name = 'Plumbing'
WHERE u.email = 'plumber5@test.linkprosoft.com'
ON CONFLICT (professional_id, skill_id) DO NOTHING;

-- Carpenters → Carpentry Skill
INSERT INTO professional_skills (professional_id, skill_id, proficiency_level, years_of_experience, is_primary)
SELECT pp.id, s.id, 'expert', 15, TRUE
FROM professional_profiles pp
JOIN users u ON u.id = pp.user_id
JOIN skills s ON s.name = 'Carpentry'
WHERE u.email = 'carpenter1@test.linkprosoft.com'
ON CONFLICT (professional_id, skill_id) DO NOTHING;

INSERT INTO professional_skills (professional_id, skill_id, proficiency_level, years_of_experience, is_primary)
SELECT pp.id, s.id, 'expert', 10, TRUE
FROM professional_profiles pp
JOIN users u ON u.id = pp.user_id
JOIN skills s ON s.name = 'Carpentry'
WHERE u.email = 'carpenter2@test.linkprosoft.com'
ON CONFLICT (professional_id, skill_id) DO NOTHING;

INSERT INTO professional_skills (professional_id, skill_id, proficiency_level, years_of_experience, is_primary)
SELECT pp.id, s.id, 'expert', 12, TRUE
FROM professional_profiles pp
JOIN users u ON u.id = pp.user_id
JOIN skills s ON s.name = 'Carpentry'
WHERE u.email = 'carpenter3@test.linkprosoft.com'
ON CONFLICT (professional_id, skill_id) DO NOTHING;

INSERT INTO professional_skills (professional_id, skill_id, proficiency_level, years_of_experience, is_primary)
SELECT pp.id, s.id, 'expert', 13, TRUE
FROM professional_profiles pp
JOIN users u ON u.id = pp.user_id
JOIN skills s ON s.name = 'Carpentry'
WHERE u.email = 'carpenter4@test.linkprosoft.com'
ON CONFLICT (professional_id, skill_id) DO NOTHING;

INSERT INTO professional_skills (professional_id, skill_id, proficiency_level, years_of_experience, is_primary)
SELECT pp.id, s.id, 'expert', 11, TRUE
FROM professional_profiles pp
JOIN users u ON u.id = pp.user_id
JOIN skills s ON s.name = 'Carpentry'
WHERE u.email = 'carpenter5@test.linkprosoft.com'
ON CONFLICT (professional_id, skill_id) DO NOTHING;

-- Web Developers → Web Development Skill
INSERT INTO professional_skills (professional_id, skill_id, proficiency_level, years_of_experience, is_primary)
SELECT pp.id, s.id, 'expert', 8, TRUE
FROM professional_profiles pp
JOIN users u ON u.id = pp.user_id
JOIN skills s ON s.name = 'Web Development'
WHERE u.email = 'webdev1@test.linkprosoft.com'
ON CONFLICT (professional_id, skill_id) DO NOTHING;

INSERT INTO professional_skills (professional_id, skill_id, proficiency_level, years_of_experience, is_primary)
SELECT pp.id, s.id, 'expert', 6, TRUE
FROM professional_profiles pp
JOIN users u ON u.id = pp.user_id
JOIN skills s ON s.name = 'Web Development'
WHERE u.email = 'webdev2@test.linkprosoft.com'
ON CONFLICT (professional_id, skill_id) DO NOTHING;

INSERT INTO professional_skills (professional_id, skill_id, proficiency_level, years_of_experience, is_primary)
SELECT pp.id, s.id, 'expert', 10, TRUE
FROM professional_profiles pp
JOIN users u ON u.id = pp.user_id
JOIN skills s ON s.name = 'Web Development'
WHERE u.email = 'webdev3@test.linkprosoft.com'
ON CONFLICT (professional_id, skill_id) DO NOTHING;

INSERT INTO professional_skills (professional_id, skill_id, proficiency_level, years_of_experience, is_primary)
SELECT pp.id, s.id, 'intermediate', 5, TRUE
FROM professional_profiles pp
JOIN users u ON u.id = pp.user_id
JOIN skills s ON s.name = 'Web Development'
WHERE u.email = 'webdev4@test.linkprosoft.com'
ON CONFLICT (professional_id, skill_id) DO NOTHING;

INSERT INTO professional_skills (professional_id, skill_id, proficiency_level, years_of_experience, is_primary)
SELECT pp.id, s.id, 'expert', 7, TRUE
FROM professional_profiles pp
JOIN users u ON u.id = pp.user_id
JOIN skills s ON s.name = 'Web Development'
WHERE u.email = 'webdev5@test.linkprosoft.com'
ON CONFLICT (professional_id, skill_id) DO NOTHING;

-- Electricians → Electrical Installation Skill
INSERT INTO professional_skills (professional_id, skill_id, proficiency_level, years_of_experience, is_primary)
SELECT pp.id, s.id, 'expert', 14, TRUE
FROM professional_profiles pp
JOIN users u ON u.id = pp.user_id
JOIN skills s ON s.name = 'Electrical Installation'
WHERE u.email = 'electrician1@test.linkprosoft.com'
ON CONFLICT (professional_id, skill_id) DO NOTHING;

INSERT INTO professional_skills (professional_id, skill_id, proficiency_level, years_of_experience, is_primary)
SELECT pp.id, s.id, 'expert', 9, TRUE
FROM professional_profiles pp
JOIN users u ON u.id = pp.user_id
JOIN skills s ON s.name = 'Electrical Installation'
WHERE u.email = 'electrician2@test.linkprosoft.com'
ON CONFLICT (professional_id, skill_id) DO NOTHING;

INSERT INTO professional_skills (professional_id, skill_id, proficiency_level, years_of_experience, is_primary)
SELECT pp.id, s.id, 'expert', 11, TRUE
FROM professional_profiles pp
JOIN users u ON u.id = pp.user_id
JOIN skills s ON s.name = 'Electrical Installation'
WHERE u.email = 'electrician3@test.linkprosoft.com'
ON CONFLICT (professional_id, skill_id) DO NOTHING;

INSERT INTO professional_skills (professional_id, skill_id, proficiency_level, years_of_experience, is_primary)
SELECT pp.id, s.id, 'expert', 8, TRUE
FROM professional_profiles pp
JOIN users u ON u.id = pp.user_id
JOIN skills s ON s.name = 'Electrical Installation'
WHERE u.email = 'electrician4@test.linkprosoft.com'
ON CONFLICT (professional_id, skill_id) DO NOTHING;

INSERT INTO professional_skills (professional_id, skill_id, proficiency_level, years_of_experience, is_primary)
SELECT pp.id, s.id, 'expert', 10, TRUE
FROM professional_profiles pp
JOIN users u ON u.id = pp.user_id
JOIN skills s ON s.name = 'Electrical Installation'
WHERE u.email = 'electrician5@test.linkprosoft.com'
ON CONFLICT (professional_id, skill_id) DO NOTHING;

-- Painters → House Painting Skill
INSERT INTO professional_skills (professional_id, skill_id, proficiency_level, years_of_experience, is_primary)
SELECT pp.id, s.id, 'expert', 12, TRUE
FROM professional_profiles pp
JOIN users u ON u.id = pp.user_id
JOIN skills s ON s.name = 'House Painting'
WHERE u.email = 'painter1@test.linkprosoft.com'
ON CONFLICT (professional_id, skill_id) DO NOTHING;

INSERT INTO professional_skills (professional_id, skill_id, proficiency_level, years_of_experience, is_primary)
SELECT pp.id, s.id, 'expert', 7, TRUE
FROM professional_profiles pp
JOIN users u ON u.id = pp.user_id
JOIN skills s ON s.name = 'House Painting'
WHERE u.email = 'painter2@test.linkprosoft.com'
ON CONFLICT (professional_id, skill_id) DO NOTHING;

INSERT INTO professional_skills (professional_id, skill_id, proficiency_level, years_of_experience, is_primary)
SELECT pp.id, s.id, 'expert', 9, TRUE
FROM professional_profiles pp
JOIN users u ON u.id = pp.user_id
JOIN skills s ON s.name = 'House Painting'
WHERE u.email = 'painter3@test.linkprosoft.com'
ON CONFLICT (professional_id, skill_id) DO NOTHING;

INSERT INTO professional_skills (professional_id, skill_id, proficiency_level, years_of_experience, is_primary)
SELECT pp.id, s.id, 'expert', 6, TRUE
FROM professional_profiles pp
JOIN users u ON u.id = pp.user_id
JOIN skills s ON s.name = 'House Painting'
WHERE u.email = 'painter4@test.linkprosoft.com'
ON CONFLICT (professional_id, skill_id) DO NOTHING;

INSERT INTO professional_skills (professional_id, skill_id, proficiency_level, years_of_experience, is_primary)
SELECT pp.id, s.id, 'expert', 10, TRUE
FROM professional_profiles pp
JOIN users u ON u.id = pp.user_id
JOIN skills s ON s.name = 'House Painting'
WHERE u.email = 'painter5@test.linkprosoft.com'
ON CONFLICT (professional_id, skill_id) DO NOTHING;

COMMIT;

-- ============================================================================
-- SUMMARY OF SEEDED DATA
-- ============================================================================
-- Total: 25 Professionals across 5 categories
-- Password for all: TestPass123!
--
-- PLUMBERS (5):
--   plumber1@test.linkprosoft.com  - Emeka Nwankwo (5000/hr, 10 yrs)
--   plumber2@test.linkprosoft.com  - Rasheed Oladele (4500/hr, 8 yrs)
--   plumber3@test.linkprosoft.com  - Chukwuma Okoro (5500/hr, 12 yrs)
--   plumber4@test.linkprosoft.com  - Ifeanyi Ejiofor (4800/hr, 9 yrs)
--   plumber5@test.linkprosoft.com  - Adebayo Awolowo (5200/hr, 11 yrs)
--
-- CARPENTERS (5):
--   carpenter1@test.linkprosoft.com - Sunday Okezie (6000/hr, 15 yrs)
--   carpenter2@test.linkprosoft.com - Chidera Okafor (5500/hr, 10 yrs)
--   carpenter3@test.linkprosoft.com - Jude Nwachukwu (5800/hr, 12 yrs)
--   carpenter4@test.linkprosoft.com - Miriam Adeleke (6200/hr, 13 yrs)
--   carpenter5@test.linkprosoft.com - Aminu Yahaya (5600/hr, 11 yrs)
--
-- WEB DEVELOPERS (5):
--   webdev1@test.linkprosoft.com    - Tochukwu Ogada (20000/hr, 8 yrs)
--   webdev2@test.linkprosoft.com    - Zainab Mohammed (18000/hr, 6 yrs)
--   webdev3@test.linkprosoft.com    - Okechukwu Ibe (22000/hr, 10 yrs)
--   webdev4@test.linkprosoft.com    - Nneka Anyanwu (17000/hr, 5 yrs)
--   webdev5@test.linkprosoft.com    - Seyi Balogun (19000/hr, 7 yrs)
--
-- ELECTRICIANS (5):
--   electrician1@test.linkprosoft.com - Kunle Fatunsin (6500/hr, 14 yrs)
--   electrician2@test.linkprosoft.com - Gbemisola Adekunle (6000/hr, 9 yrs)
--   electrician3@test.linkprosoft.com - Babatunde Ogunlade (6800/hr, 11 yrs)
--   electrician4@test.linkprosoft.com - Chinedu Umeh (6200/hr, 8 yrs)
--   electrician5@test.linkprosoft.com - Folake Adeyemi (6400/hr, 10 yrs)
--
-- PAINTERS (5):
--   painter1@test.linkprosoft.com   - Olufemi Ayeni (4500/hr, 12 yrs)
--   painter2@test.linkprosoft.com   - Precious Okonkwo (4200/hr, 7 yrs)
--   painter3@test.linkprosoft.com   - Michael Okafor (4700/hr, 9 yrs)
--   painter4@test.linkprosoft.com   - Lucia Adeniran (4300/hr, 6 yrs)
--   painter5@test.linkprosoft.com   - Emile Okafor (4600/hr, 10 yrs)
-- ============================================================================


-- ============================================================================
-- CLEANUP SCRIPT (optional - run to reset all seeded professionals)
-- ============================================================================
-- Uncomment to remove all 25 professionals:
--
-- BEGIN;
-- DELETE FROM users WHERE email LIKE '%plumber%@test.linkprosoft.com'
--    OR email LIKE '%carpenter%@test.linkprosoft.com'
--    OR email LIKE '%webdev%@test.linkprosoft.com'
--    OR email LIKE '%electrician%@test.linkprosoft.com'
--    OR email LIKE '%painter%@test.linkprosoft.com';
-- COMMIT;
-- ============================================================================
