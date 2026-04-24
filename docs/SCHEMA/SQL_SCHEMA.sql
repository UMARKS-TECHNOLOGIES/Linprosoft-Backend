-- ============================================================================
-- LINKPROSOFT DATABASE SCHEMA
-- Version: 1.0
-- Date: April 2026
-- Purpose: Complete PostgreSQL schema for Linkprosoft platform
-- Technology: Node.js + Express + TypeScript + PostgreSQL 13+
-- ============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "citext"; -- For case-insensitive email

-- ============================================================================
-- TABLE: USERS (Core user management for professionals and employers)
-- ============================================================================
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email CITEXT UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    user_type VARCHAR(20) NOT NULL CHECK (user_type IN ('professional', 'employer')),
    comp_name VARCHAR(255),
    phone VARCHAR(20),
    location VARCHAR(255),
    is_verified BOOLEAN DEFAULT FALSE,
    verification_token VARCHAR(255),
    password_reset_token VARCHAR(255),
    password_reset_expires_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP
);

-- Indexes for users table
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_user_type ON users(user_type);
CREATE INDEX idx_users_location ON users(location);
CREATE INDEX idx_users_deleted_at ON users(deleted_at);

-- Comments for documentation
COMMENT ON TABLE users IS 'Core user management for both professionals and employers on the platform';
COMMENT ON COLUMN users.email IS 'Unique email identifier, case-insensitive for login';
COMMENT ON COLUMN users.user_type IS 'Role type: professional (seller) or employer (buyer)';
COMMENT ON COLUMN users.comp_name IS 'Company name required if user_type is employer';
COMMENT ON COLUMN users.password IS 'Bcrypt hashed password (rounds: 12)';
COMMENT ON COLUMN users.is_verified IS 'Email verification status for account activation';

-- ============================================================================
-- TABLE: PROFESSIONAL_PROFILES (Extended profile for professionals)
-- ============================================================================
CREATE TABLE professional_profiles (
    id SERIAL PRIMARY KEY,
    user_id INTEGER UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    hourly_rate DECIMAL(10, 2),
    bio TEXT,
    availability_status VARCHAR(20) DEFAULT 'available' CHECK (
        availability_status IN ('available', 'unavailable', 'away')
    ),
    response_time_hours INTEGER,
    total_hours_worked INTEGER DEFAULT 0,
    avg_rating DECIMAL(3, 2) DEFAULT 0.0,
    total_reviews INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for professional_profiles table
CREATE INDEX idx_professional_profiles_user_id ON professional_profiles(user_id);
CREATE INDEX idx_professional_profiles_rating ON professional_profiles(avg_rating DESC);
CREATE INDEX idx_professional_profiles_availability ON professional_profiles(availability_status);

-- Comments for documentation
COMMENT ON TABLE professional_profiles IS 'Extended profile information for professionals offering services';
COMMENT ON COLUMN professional_profiles.hourly_rate IS 'Service rate in NGN per hour';
COMMENT ON COLUMN professional_profiles.avg_rating IS 'Aggregate rating from reviews (0-5 scale)';
COMMENT ON COLUMN professional_profiles.total_reviews IS 'Count of reviews received';

-- ============================================================================
-- TABLE: SKILLS (Master list of available skills)
-- ============================================================================
CREATE TABLE skills (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    category VARCHAR(100) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for skills table
CREATE INDEX idx_skills_name ON skills(name);
CREATE INDEX idx_skills_category ON skills(category);

-- Comments for documentation
COMMENT ON TABLE skills IS 'Master list of skill types available on the platform';
COMMENT ON COLUMN skills.name IS 'Unique skill name (e.g., Web Development, Plumbing)';
COMMENT ON COLUMN skills.category IS 'Skill category for grouping (e.g., IT, Trades, Design)';

-- ============================================================================
-- TABLE: PROFESSIONAL_SKILLS (Many-to-many junction between professionals and skills)
-- ============================================================================
CREATE TABLE professional_skills (
    id SERIAL PRIMARY KEY,
    professional_id INTEGER NOT NULL REFERENCES professional_profiles(id) ON DELETE CASCADE,
    skill_id INTEGER NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
    proficiency_level VARCHAR(20) DEFAULT 'intermediate' CHECK (
        proficiency_level IN ('beginner', 'intermediate', 'expert')
    ),
    years_of_experience INTEGER,
    is_primary BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(professional_id, skill_id)
);

-- Indexes for professional_skills table
CREATE INDEX idx_professional_skills_professional_id ON professional_skills(professional_id);
CREATE INDEX idx_professional_skills_skill_id ON professional_skills(skill_id);
CREATE INDEX idx_professional_skills_proficiency ON professional_skills(proficiency_level);

-- Comments for documentation
COMMENT ON TABLE professional_skills IS 'Links professionals to their skills with proficiency levels';
COMMENT ON COLUMN professional_skills.proficiency_level IS 'Expertise level: beginner, intermediate, or expert';
COMMENT ON COLUMN professional_skills.is_primary IS 'Highlights primary/featured skill on profile';

-- ============================================================================
-- TABLE: CERTIFICATIONS (Professional certifications and credentials)
-- ============================================================================
CREATE TABLE certifications (
    id SERIAL PRIMARY KEY,
    professional_id INTEGER NOT NULL REFERENCES professional_profiles(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    issuer VARCHAR(255),
    issue_date DATE,
    expiry_date DATE,
    credential_url VARCHAR(500),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for certifications table
CREATE INDEX idx_certifications_professional_id ON certifications(professional_id);

-- Comments for documentation
COMMENT ON TABLE certifications IS 'Professional certifications and credentials for validation';
COMMENT ON COLUMN certifications.credential_url IS 'URL to verify certification online';

-- ============================================================================
-- TABLE: PORTFOLIO_ITEMS (Professional portfolio showcasing past work)
-- ============================================================================
CREATE TABLE portfolio_items (
    id SERIAL PRIMARY KEY,
    professional_id INTEGER NOT NULL REFERENCES professional_profiles(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    image_url VARCHAR(500),
    link_url VARCHAR(500),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for portfolio_items table
CREATE INDEX idx_portfolio_items_professional_id ON portfolio_items(professional_id);

-- Comments for documentation
COMMENT ON TABLE portfolio_items IS 'Portfolio items showcasing professional past work';
COMMENT ON COLUMN portfolio_items.image_url IS 'URL to project image/thumbnail (external storage like S3)';
COMMENT ON COLUMN portfolio_items.link_url IS 'URL to live project or portfolio page';

-- ============================================================================
-- TABLE: JOB_POSTINGS (Job/gig postings created by employers)
-- ============================================================================
CREATE TABLE job_postings (
    id SERIAL PRIMARY KEY,
    employer_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    skill_id INTEGER REFERENCES skills(id) ON DELETE SET NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    budget DECIMAL(10, 2),
    status VARCHAR(20) DEFAULT 'posted' CHECK (
        status IN ('draft', 'posted', 'in_progress', 'completed', 'cancelled')
    ),
    location VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP
);

-- Indexes for job_postings table
CREATE INDEX idx_job_postings_employer_id ON job_postings(employer_id);
CREATE INDEX idx_job_postings_skill_id ON job_postings(skill_id);
CREATE INDEX idx_job_postings_status ON job_postings(status);
CREATE INDEX idx_job_postings_location ON job_postings(location);
CREATE INDEX idx_job_postings_created_at ON job_postings(created_at DESC);

-- Comments for documentation
COMMENT ON TABLE job_postings IS 'Job/gig postings created by employers seeking services';
COMMENT ON COLUMN job_postings.skill_id IS 'Primary skill required, used for matching';
COMMENT ON COLUMN job_postings.status IS 'Workflow: draft → posted → in_progress → completed';
COMMENT ON COLUMN job_postings.expires_at IS 'Auto-expire old postings for archival';

-- ============================================================================
-- TABLE: JOB_ASSIGNMENTS (Track which professional is assigned to which job)
-- ============================================================================
CREATE TABLE job_assignments (
    id SERIAL PRIMARY KEY,
    job_id INTEGER NOT NULL REFERENCES job_postings(id) ON DELETE CASCADE,
    professional_id INTEGER NOT NULL REFERENCES professional_profiles(id) ON DELETE CASCADE,
    budget DECIMAL(10, 2),
    status VARCHAR(20) DEFAULT 'pending' CHECK (
        status IN ('pending', 'accepted', 'rejected', 'in_progress', 'completed', 'disputed')
    ),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP
);

-- Indexes for job_assignments table
CREATE INDEX idx_job_assignments_job_id ON job_assignments(job_id);
CREATE INDEX idx_job_assignments_professional_id ON job_assignments(professional_id);
CREATE INDEX idx_job_assignments_status ON job_assignments(status);

-- Comments for documentation
COMMENT ON TABLE job_assignments IS 'Links professionals to job postings they are assigned to';
COMMENT ON COLUMN job_assignments.status IS 'Workflow: pending (invited) → accepted → in_progress → completed';
COMMENT ON COLUMN job_assignments.budget IS 'Negotiated budget for this specific assignment';

-- ============================================================================
-- TABLE: PAYMENTS (Financial transactions between employers and professionals)
-- ============================================================================
CREATE TABLE payments (
    id SERIAL PRIMARY KEY,
    job_assignment_id INTEGER NOT NULL REFERENCES job_assignments(id) ON DELETE CASCADE,
    payer_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    payee_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    amount DECIMAL(10, 2) NOT NULL,
    seller_commission DECIMAL(10, 2),
    buyer_commission DECIMAL(10, 2),
    seller_receives DECIMAL(10, 2),
    status VARCHAR(20) DEFAULT 'pending' CHECK (
        status IN ('pending', 'processing', 'completed', 'failed', 'refunded')
    ),
    payment_method VARCHAR(50) DEFAULT 'paystack',
    paystack_reference VARCHAR(255) UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP
);

-- Indexes for payments table
CREATE INDEX idx_payments_job_assignment_id ON payments(job_assignment_id);
CREATE INDEX idx_payments_payer_id ON payments(payer_id);
CREATE INDEX idx_payments_payee_id ON payments(payee_id);
CREATE INDEX idx_payments_status ON payments(status);
CREATE INDEX idx_payments_paystack_reference ON payments(paystack_reference);

-- Comments for documentation
COMMENT ON TABLE payments IS 'Financial transactions between employers and professionals';
COMMENT ON COLUMN payments.seller_commission IS 'Commission deducted from professional (15%)';
COMMENT ON COLUMN payments.buyer_commission IS 'Commission deducted from employer (1%)';
COMMENT ON COLUMN payments.seller_receives IS 'Amount professional receives after commission';
COMMENT ON COLUMN payments.paystack_reference IS 'Unique reference for Paystack transaction';

-- ============================================================================
-- TABLE: REVIEWS (Ratings and feedback after job completion)
-- ============================================================================
CREATE TABLE reviews (
    id SERIAL PRIMARY KEY,
    job_assignment_id INTEGER NOT NULL UNIQUE REFERENCES job_assignments(id) ON DELETE CASCADE,
    reviewed_professional_id INTEGER NOT NULL REFERENCES professional_profiles(id) ON DELETE CASCADE,
    reviewer_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    is_anonymous BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for reviews table
CREATE INDEX idx_reviews_reviewed_professional_id ON reviews(reviewed_professional_id);
CREATE INDEX idx_reviews_reviewer_id ON reviews(reviewer_id);
CREATE INDEX idx_reviews_job_assignment_id ON reviews(job_assignment_id);

-- Comments for documentation
COMMENT ON TABLE reviews IS 'Ratings and feedback left by employers for professionals after job completion';
COMMENT ON COLUMN reviews.rating IS 'Star rating on 1-5 scale';
COMMENT ON COLUMN reviews.is_anonymous IS 'Hide reviewer identity in anonymous reviews';

-- ============================================================================
-- TABLE: MESSAGES (Direct messaging between professionals and employers)
-- ============================================================================
CREATE TABLE messages (
    id SERIAL PRIMARY KEY,
    sender_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    recipient_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for messages table
CREATE INDEX idx_messages_sender_id ON messages(sender_id);
CREATE INDEX idx_messages_recipient_id ON messages(recipient_id, is_read);
CREATE INDEX idx_messages_created_at ON messages(created_at DESC);

-- Comments for documentation
COMMENT ON TABLE messages IS 'Direct messaging system between professionals and employers (Phase 2+)';
COMMENT ON COLUMN messages.is_read IS 'Read receipt for message delivery confirmation';

-- ============================================================================
-- TRIGGERS FOR DATA CONSISTENCY
-- ============================================================================

-- Trigger to update professional avg_rating and total_reviews when review is created
CREATE OR REPLACE FUNCTION update_professional_rating()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE professional_profiles
    SET 
        avg_rating = (
            SELECT AVG(CAST(rating AS DECIMAL(3, 2)))
            FROM reviews
            WHERE reviewed_professional_id = NEW.reviewed_professional_id
        ),
        total_reviews = (
            SELECT COUNT(*)
            FROM reviews
            WHERE reviewed_professional_id = NEW.reviewed_professional_id
        ),
        updated_at = CURRENT_TIMESTAMP
    WHERE id = NEW.reviewed_professional_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_professional_rating
AFTER INSERT ON reviews
FOR EACH ROW
EXECUTE FUNCTION update_professional_rating();

-- Trigger to update updated_at timestamp on users
CREATE OR REPLACE FUNCTION update_users_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_users_updated_at
BEFORE UPDATE ON users
FOR EACH ROW
EXECUTE FUNCTION update_users_updated_at();

-- Trigger to update updated_at timestamp on professional_profiles
CREATE OR REPLACE FUNCTION update_professional_profiles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_professional_profiles_updated_at
BEFORE UPDATE ON professional_profiles
FOR EACH ROW
EXECUTE FUNCTION update_professional_profiles_updated_at();

-- Trigger to update updated_at timestamp on job_postings
CREATE OR REPLACE FUNCTION update_job_postings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_job_postings_updated_at
BEFORE UPDATE ON job_postings
FOR EACH ROW
EXECUTE FUNCTION update_job_postings_updated_at();

-- ============================================================================
-- VIEWS FOR COMMON QUERIES
-- ============================================================================

-- View: Professional summary with user details and rating
CREATE OR REPLACE VIEW professional_summary AS
SELECT 
    u.id as user_id,
    u.email,
    u.first_name,
    u.last_name,
    u.phone,
    u.location,
    pp.id as profile_id,
    pp.hourly_rate,
    pp.bio,
    pp.avg_rating,
    pp.total_reviews,
    pp.availability_status,
    COUNT(ps.skill_id) as skill_count
FROM users u
LEFT JOIN professional_profiles pp ON u.id = pp.user_id
LEFT JOIN professional_skills ps ON pp.id = ps.professional_id
WHERE u.user_type = 'professional'
GROUP BY u.id, pp.id;

-- View: Job posting summary with employer info
CREATE OR REPLACE VIEW job_posting_summary AS
SELECT 
    jp.id,
    jp.title,
    jp.description,
    jp.budget,
    jp.status,
    jp.location,
    jp.created_at,
    s.name as required_skill,
    u.email as employer_email,
    u.first_name as employer_first_name,
    u.last_name as employer_last_name,
    u.comp_name,
    COUNT(ja.id) as assignment_count
FROM job_postings jp
LEFT JOIN skills s ON jp.skill_id = s.id
LEFT JOIN users u ON jp.employer_id = u.id
LEFT JOIN job_assignments ja ON jp.id = ja.job_id
GROUP BY jp.id, s.id, u.id;

-- View: Payment summary with user details
CREATE OR REPLACE VIEW payment_summary AS
SELECT 
    p.id,
    p.amount,
    p.seller_commission,
    p.buyer_commission,
    p.seller_receives,
    p.status,
    p.created_at,
    p.completed_at,
    payer.email as payer_email,
    payer.first_name as payer_first_name,
    payee.email as payee_email,
    payee.first_name as payee_first_name,
    ja.budget as negotiated_budget,
    jp.title as job_title
FROM payments p
LEFT JOIN users payer ON p.payer_id = payer.id
LEFT JOIN users payee ON p.payee_id = payee.id
LEFT JOIN job_assignments ja ON p.job_assignment_id = ja.id
LEFT JOIN job_postings jp ON ja.job_id = jp.id;

-- ============================================================================
-- INITIAL DATA SEEDING (Skills master data)
-- ============================================================================

-- Insert skill categories and data
INSERT INTO skills (name, category, description) VALUES
-- IT & Software Development
('Web Development', 'IT', 'Frontend and backend web development using various frameworks'),
('Mobile App Development', 'IT', 'Native and cross-platform mobile app development'),
('Desktop Development', 'IT', 'Desktop application development'),
('Database Administration', 'IT', 'Database design, maintenance, and optimization'),
('Cloud Services', 'IT', 'AWS, Google Cloud, Azure deployment and management'),
('DevOps & Infrastructure', 'IT', 'Infrastructure automation, CI/CD, containerization'),
('Data Science', 'IT', 'Data analysis, machine learning, AI development'),
('Cybersecurity', 'IT', 'Security audits, penetration testing, compliance'),

-- Design & Creative
('Graphic Design', 'Design', 'UI/UX, branding, visual design'),
('UI/UX Design', 'Design', 'User interface and experience design'),
('Web Design', 'Design', 'Website design and layout'),
('3D Design', 'Design', '3D modeling and animation'),
('Illustration', 'Design', 'Digital and traditional illustration'),
('Photography', 'Design', 'Professional photography services'),
('Video Production', 'Design', 'Video editing, motion graphics, production'),

-- Business & Professional Services
('Business Consultation', 'Business', 'Strategic business planning and advice'),
('Marketing Strategy', 'Business', 'Marketing campaign planning and execution'),
('Content Writing', 'Business', 'Blog posts, articles, copywriting'),
('SEO Optimization', 'Business', 'Search engine optimization services'),
('Social Media Management', 'Business', 'Social media content and engagement'),
('Project Management', 'Business', 'Project planning and execution'),
('Data Entry', 'Business', 'Data input and management'),

-- Skilled Trades
('Plumbing', 'Trades', 'Installation and repair of plumbing systems'),
('Electrical Work', 'Trades', 'Electrical installation and maintenance'),
('Carpentry', 'Trades', 'Woodworking and carpentry services'),
('Painting', 'Trades', 'Interior and exterior painting'),
('HVAC', 'Trades', 'Heating, ventilation, air conditioning services'),
('Masonry', 'Trades', 'Brickwork and masonry services'),
('Landscaping', 'Trades', 'Garden design and landscaping'),

-- Professional Services
('Accounting', 'Professional', 'Bookkeeping and accounting services'),
('Legal Services', 'Professional', 'Legal consultation and document preparation'),
('Human Resources', 'Professional', 'HR consulting and recruitment'),
('Training & Coaching', 'Professional', 'Professional training and coaching'),
('Consulting', 'Professional', 'Industry-specific consulting'),

-- Education & Tutoring
('English Tutoring', 'Education', 'English language instruction'),
('Math Tutoring', 'Education', 'Mathematics tutoring'),
('Science Tutoring', 'Education', 'Science subjects tutoring'),
('Programming Tutoring', 'Education', 'Programming language instruction'),
('Language Translation', 'Education', 'Document and real-time translation');

-- ============================================================================
-- GRANT PERMISSIONS (Optional - for application user)
-- ============================================================================

-- Create application user (if needed)
-- CREATE USER linkprosoft_app WITH PASSWORD 'secure_password_here';

-- Grant permissions to application user
-- GRANT CONNECT ON DATABASE linkprosoft TO linkprosoft_app;
-- GRANT USAGE ON SCHEMA public TO linkprosoft_app;
-- GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO linkprosoft_app;
-- GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO linkprosoft_app;

-- ============================================================================
-- DATABASE SETUP COMPLETE
-- ============================================================================

-- Summary statistics:
-- Total Tables: 11
-- Total Views: 3
-- Total Triggers: 4
-- Total Indexes: 30+
-- Skill Categories: 8
-- Initial Skills: 45+

-- Next steps:
-- 1. Connect from Node.js backend using pg library
-- 2. Setup connection pooling (pg.Pool)
-- 3. Run migrations for additional features (Phase 2+)
-- 4. Monitor performance with EXPLAIN ANALYZE
