-- ============================================================================
-- LINKPROSOFT - COMMON SQL QUERIES REFERENCE
-- ============================================================================
-- This file contains frequently used SQL queries organized by feature area
-- Ready to copy/paste for common operations
-- ============================================================================

-- ============================================================================
-- SECTION 1: USER MANAGEMENT QUERIES
-- ============================================================================

-- 1.1 Get user by email (login)
SELECT * FROM users 
WHERE email = $1 AND deleted_at IS NULL;

-- 1.2 Get user with professional profile
SELECT u.*, pp.id as profile_id, pp.hourly_rate, pp.avg_rating
FROM users u
LEFT JOIN professional_profiles pp ON u.id = pp.user_id
WHERE u.id = $1 AND u.deleted_at IS NULL;

-- 1.3 Get all professionals in a location
SELECT u.id, u.first_name, u.last_name, u.location, 
       pp.hourly_rate, pp.avg_rating, pp.total_reviews
FROM users u
JOIN professional_profiles pp ON u.id = pp.user_id
WHERE u.user_type = 'professional' 
  AND u.location = $1
  AND pp.availability_status = 'available'
  AND u.deleted_at IS NULL
ORDER BY pp.avg_rating DESC;

-- 1.4 Update user profile
UPDATE users SET 
  first_name = $2,
  last_name = $3,
  phone = $4,
  location = $5,
  updated_at = CURRENT_TIMESTAMP
WHERE id = $1 AND deleted_at IS NULL;

-- 1.5 Soft delete user
UPDATE users SET deleted_at = CURRENT_TIMESTAMP
WHERE id = $1;

-- 1.6 Get all employers
SELECT * FROM users 
WHERE user_type = 'employer' AND deleted_at IS NULL;

-- ============================================================================
-- SECTION 2: PROFESSIONAL PROFILE QUERIES
-- ============================================================================

-- 2.1 Create professional profile
INSERT INTO professional_profiles 
  (user_id, hourly_rate, bio, availability_status, response_time_hours)
VALUES ($1, $2, $3, $4, $5)
RETURNING *;

-- 2.2 Update professional profile
UPDATE professional_profiles SET 
  hourly_rate = $2,
  bio = $3,
  availability_status = $4,
  response_time_hours = $5,
  updated_at = CURRENT_TIMESTAMP
WHERE user_id = $1
RETURNING *;

-- 2.3 Get professional profile with all details
SELECT 
  u.id, u.email, u.first_name, u.last_name, u.location,
  pp.hourly_rate, pp.bio, pp.avg_rating, pp.total_reviews,
  pp.availability_status, pp.response_time_hours, pp.total_hours_worked,
  COUNT(DISTINCT ps.skill_id) as skill_count,
  COUNT(DISTINCT c.id) as certification_count,
  COUNT(DISTINCT pi.id) as portfolio_count
FROM users u
JOIN professional_profiles pp ON u.id = pp.user_id
LEFT JOIN professional_skills ps ON pp.id = ps.professional_id
LEFT JOIN certifications c ON pp.id = c.professional_id
LEFT JOIN portfolio_items pi ON pp.id = pi.professional_id
WHERE u.id = $1
GROUP BY u.id, pp.id;

-- 2.4 Get top-rated professionals
SELECT u.id, u.first_name, u.last_name, pp.avg_rating, pp.total_reviews
FROM users u
JOIN professional_profiles pp ON u.id = pp.user_id
WHERE u.user_type = 'professional' 
  AND u.deleted_at IS NULL
  AND pp.total_reviews >= 5
ORDER BY pp.avg_rating DESC
LIMIT $1;

-- 2.5 Update professional hours worked (called after job completion)
UPDATE professional_profiles SET
  total_hours_worked = total_hours_worked + $2,
  updated_at = CURRENT_TIMESTAMP
WHERE user_id = $1;

-- ============================================================================
-- SECTION 3: SKILL MANAGEMENT QUERIES
-- ============================================================================

-- 3.1 Get all skills with category
SELECT * FROM skills 
ORDER BY category, name;

-- 3.2 Get skills by category
SELECT * FROM skills 
WHERE category = $1
ORDER BY name;

-- 3.3 Search skills by name (full-text search)
SELECT * FROM skills 
WHERE name ILIKE '%' || $1 || '%'
  OR description ILIKE '%' || $1 || '%'
ORDER BY name;

-- 3.4 Add skill to professional
INSERT INTO professional_skills 
  (professional_id, skill_id, proficiency_level, years_of_experience, is_primary)
VALUES ($1, $2, $3, $4, $5)
RETURNING *;

-- 3.5 Get all skills for professional
SELECT ps.id, s.id as skill_id, s.name, s.category,
       ps.proficiency_level, ps.years_of_experience, ps.is_primary
FROM professional_skills ps
JOIN skills s ON ps.skill_id = s.id
WHERE ps.professional_id = $1
ORDER BY ps.is_primary DESC, s.name;

-- 3.6 Remove skill from professional
DELETE FROM professional_skills 
WHERE professional_id = $1 AND skill_id = $2;

-- 3.7 Set primary skill for professional
UPDATE professional_skills SET is_primary = FALSE
WHERE professional_id = $1;

UPDATE professional_skills SET is_primary = TRUE
WHERE professional_id = $1 AND skill_id = $2;

-- 3.8 Get professionals with specific skill
SELECT u.id, u.first_name, u.last_name, pp.hourly_rate, pp.avg_rating,
       ps.proficiency_level, ps.years_of_experience
FROM professional_skills ps
JOIN skills s ON ps.skill_id = s.id
JOIN professional_profiles pp ON ps.professional_id = pp.id
JOIN users u ON pp.user_id = u.id
WHERE s.id = $1 AND ps.proficiency_level = $2
ORDER BY pp.avg_rating DESC;

-- ============================================================================
-- SECTION 4: CERTIFICATIONS & PORTFOLIO QUERIES
-- ============================================================================

-- 4.1 Add certification
INSERT INTO certifications 
  (professional_id, title, issuer, issue_date, expiry_date, credential_url)
VALUES ($1, $2, $3, $4, $5, $6)
RETURNING *;

-- 4.2 Get certifications for professional
SELECT * FROM certifications 
WHERE professional_id = $1
ORDER BY issue_date DESC;

-- 4.3 Delete certification
DELETE FROM certifications WHERE id = $1;

-- 4.4 Add portfolio item
INSERT INTO portfolio_items 
  (professional_id, title, description, image_url, link_url)
VALUES ($1, $2, $3, $4, $5)
RETURNING *;

-- 4.5 Get portfolio items for professional
SELECT * FROM portfolio_items 
WHERE professional_id = $1
ORDER BY created_at DESC;

-- 4.6 Delete portfolio item
DELETE FROM portfolio_items WHERE id = $1;

-- ============================================================================
-- SECTION 5: JOB POSTING QUERIES
-- ============================================================================

-- 5.1 Create job posting
INSERT INTO job_postings 
  (employer_id, skill_id, title, description, budget, status, location, expires_at)
VALUES ($1, $2, $3, $4, $5, 'draft', $6, $7)
RETURNING *;

-- 5.2 Publish job posting (draft → posted)
UPDATE job_postings SET status = 'posted'
WHERE id = $1 AND status = 'draft'
RETURNING *;

-- 5.3 Get all jobs for employer
SELECT * FROM job_postings 
WHERE employer_id = $1 AND status != 'cancelled'
ORDER BY created_at DESC;

-- 5.4 Get all active jobs (for professionals to browse)
SELECT jp.id, jp.title, jp.description, jp.budget, jp.location,
       u.first_name, u.last_name, u.comp_name,
       s.name as required_skill, s.category as skill_category,
       COUNT(ja.id) as application_count
FROM job_postings jp
LEFT JOIN users u ON jp.employer_id = u.id
LEFT JOIN skills s ON jp.skill_id = s.id
LEFT JOIN job_assignments ja ON jp.id = ja.job_id
WHERE jp.status = 'posted' 
  AND (jp.expires_at IS NULL OR jp.expires_at > CURRENT_TIMESTAMP)
GROUP BY jp.id, u.id, s.id
ORDER BY jp.created_at DESC
LIMIT $1 OFFSET $2;

-- 5.5 Search jobs by location and skill
SELECT jp.id, jp.title, jp.budget, jp.location, s.name as skill
FROM job_postings jp
LEFT JOIN skills s ON jp.skill_id = s.id
WHERE jp.status = 'posted'
  AND jp.location = $1
  AND (s.id = $2 OR jp.skill_id IS NULL)
  AND (jp.expires_at IS NULL OR jp.expires_at > CURRENT_TIMESTAMP)
ORDER BY jp.created_at DESC;

-- 5.6 Update job posting
UPDATE job_postings SET 
  title = $2, description = $3, budget = $4, location = $5,
  updated_at = CURRENT_TIMESTAMP
WHERE id = $1 AND status = 'draft'
RETURNING *;

-- 5.7 Cancel job posting
UPDATE job_postings SET status = 'cancelled'
WHERE id = $1
RETURNING *;

-- 5.8 Get job details with employer info
SELECT jp.*, u.first_name, u.last_name, u.comp_name, u.email,
       s.name as skill_name
FROM job_postings jp
JOIN users u ON jp.employer_id = u.id
LEFT JOIN skills s ON jp.skill_id = s.id
WHERE jp.id = $1;

-- ============================================================================
-- SECTION 6: JOB ASSIGNMENT QUERIES
-- ============================================================================

-- 6.1 Create job assignment (invite professional)
INSERT INTO job_assignments 
  (job_id, professional_id, budget, status)
VALUES ($1, $2, $3, 'pending')
RETURNING *;

-- 6.2 Professional accepts assignment
UPDATE job_assignments SET status = 'accepted'
WHERE id = $1 AND professional_id = $2
RETURNING *;

-- 6.3 Professional rejects assignment
UPDATE job_assignments SET status = 'rejected'
WHERE id = $1 AND professional_id = $2
RETURNING *;

-- 6.4 Start work on assignment
UPDATE job_assignments SET status = 'in_progress'
WHERE id = $1
RETURNING *;

-- 6.5 Complete assignment
UPDATE job_assignments SET 
  status = 'completed',
  completed_at = CURRENT_TIMESTAMP
WHERE id = $1
RETURNING *;

-- 6.6 Get assignments for professional
SELECT ja.id, jp.title, jp.description, jp.budget as job_budget,
       ja.budget as negotiated_budget, ja.status, ja.created_at,
       u.first_name, u.last_name, u.comp_name
FROM job_assignments ja
JOIN job_postings jp ON ja.job_id = jp.id
JOIN users u ON jp.employer_id = u.id
WHERE ja.professional_id = $1
ORDER BY ja.created_at DESC;

-- 6.7 Get assignments for job
SELECT ja.id, pp.id as professional_id, u.first_name, u.last_name,
       pp.avg_rating, ja.budget, ja.status, ja.created_at
FROM job_assignments ja
JOIN professional_profiles pp ON ja.professional_id = pp.id
JOIN users u ON pp.user_id = u.id
WHERE ja.job_id = $1
ORDER BY ja.created_at DESC;

-- 6.8 Get assignments for employer (their jobs)
SELECT ja.id, ja.status, ja.completed_at,
       jp.title, jp.budget as job_budget,
       u.first_name, u.last_name, u.email,
       pp.avg_rating
FROM job_assignments ja
JOIN job_postings jp ON ja.job_id = jp.id
JOIN professional_profiles pp ON ja.professional_id = pp.id
JOIN users u ON pp.user_id = u.id
WHERE jp.employer_id = $1
ORDER BY ja.created_at DESC;

-- 6.9 Get completed assignments (ready for payment)
SELECT ja.* FROM job_assignments ja
WHERE status = 'completed' AND completed_at IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM payments WHERE job_assignment_id = ja.id
  );

-- ============================================================================
-- SECTION 7: PAYMENT QUERIES
-- ============================================================================

-- 7.1 Create payment record
INSERT INTO payments 
  (job_assignment_id, payer_id, payee_id, amount, 
   seller_commission, buyer_commission, seller_receives)
VALUES ($1, $2, $3, $4, 
        ($4 * 0.15), ($4 * 0.01), ($4 * 0.85))
RETURNING *;

-- 7.2 Record completed payment (via Paystack webhook)
UPDATE payments SET 
  status = 'completed',
  completed_at = CURRENT_TIMESTAMP,
  paystack_reference = $2
WHERE id = $1
RETURNING *;

-- 7.3 Get payment by reference
SELECT * FROM payments 
WHERE paystack_reference = $1;

-- 7.4 Get all payments for professional (earnings)
SELECT p.id, p.amount, p.seller_commission, p.seller_receives,
       p.status, p.created_at, p.completed_at,
       jp.title, jp.budget, u.first_name, u.last_name, u.comp_name
FROM payments p
JOIN job_assignments ja ON p.job_assignment_id = ja.id
JOIN job_postings jp ON ja.job_id = jp.id
JOIN users u ON jp.employer_id = u.id
WHERE p.payee_id = $1
ORDER BY p.created_at DESC;

-- 7.5 Get all payments for employer (expenses)
SELECT p.id, p.amount, p.buyer_commission, p.status,
       p.created_at, p.completed_at,
       jp.title, u.first_name, u.last_name
FROM payments p
JOIN job_assignments ja ON p.job_assignment_id = ja.id
JOIN job_postings jp ON ja.job_id = jp.id
JOIN professional_profiles pp ON ja.professional_id = pp.id
JOIN users u ON pp.user_id = u.id
WHERE p.payer_id = $1
ORDER BY p.created_at DESC;

-- 7.6 Calculate professional earnings by status
SELECT 
  status,
  COUNT(*) as transaction_count,
  SUM(amount) as total_amount,
  SUM(seller_commission) as total_commission,
  SUM(seller_receives) as total_received
FROM payments
WHERE payee_id = $1
GROUP BY status;

-- 7.7 Calculate total earnings (completed payments only)
SELECT 
  SUM(seller_receives) as total_earnings,
  COUNT(*) as total_jobs,
  AVG(seller_receives) as average_payment
FROM payments
WHERE payee_id = $1 AND status = 'completed';

-- 7.8 Get platform revenue (total commissions)
SELECT 
  SUM(seller_commission + buyer_commission) as platform_revenue,
  SUM(seller_commission) as seller_side_revenue,
  SUM(buyer_commission) as buyer_side_revenue,
  COUNT(*) as total_transactions
FROM payments
WHERE status = 'completed';

-- ============================================================================
-- SECTION 8: REVIEW & RATING QUERIES
-- ============================================================================

-- 8.1 Create review
INSERT INTO reviews 
  (job_assignment_id, reviewed_professional_id, reviewer_id, rating, comment, is_anonymous)
VALUES ($1, $2, $3, $4, $5, $6)
RETURNING *;

-- 8.2 Get all reviews for professional
SELECT r.id, r.rating, r.comment, r.is_anonymous, r.created_at,
       CASE WHEN r.is_anonymous THEN 'Anonymous' 
            ELSE u.first_name || ' ' || u.last_name END as reviewer_name
FROM reviews r
LEFT JOIN users u ON r.reviewer_id = u.id
WHERE r.reviewed_professional_id = $1
ORDER BY r.created_at DESC;

-- 8.3 Get average rating for professional (should match professional_profiles.avg_rating)
SELECT 
  AVG(rating::DECIMAL) as avg_rating,
  COUNT(*) as total_reviews,
  SUM(CASE WHEN rating = 5 THEN 1 ELSE 0 END) as five_star,
  SUM(CASE WHEN rating = 4 THEN 1 ELSE 0 END) as four_star,
  SUM(CASE WHEN rating = 3 THEN 1 ELSE 0 END) as three_star,
  SUM(CASE WHEN rating = 2 THEN 1 ELSE 0 END) as two_star,
  SUM(CASE WHEN rating = 1 THEN 1 ELSE 0 END) as one_star
FROM reviews
WHERE reviewed_professional_id = $1;

-- 8.4 Get review for specific job assignment
SELECT * FROM reviews 
WHERE job_assignment_id = $1;

-- 8.5 Check if review exists for assignment
SELECT EXISTS(
  SELECT 1 FROM reviews WHERE job_assignment_id = $1
);

-- 8.6 Get reviews given by specific employer
SELECT r.id, r.rating, r.comment, r.created_at,
       u.first_name, u.last_name,
       jp.title
FROM reviews r
JOIN job_assignments ja ON r.job_assignment_id = ja.id
JOIN job_postings jp ON ja.job_id = jp.id
JOIN professional_profiles pp ON r.reviewed_professional_id = pp.id
JOIN users u ON pp.user_id = u.id
WHERE r.reviewer_id = $1
ORDER BY r.created_at DESC;

-- ============================================================================
-- SECTION 9: MESSAGE QUERIES (Phase 2+)
-- ============================================================================

-- 9.1 Send message
INSERT INTO messages 
  (sender_id, recipient_id, content)
VALUES ($1, $2, $3)
RETURNING *;

-- 9.2 Get conversation between two users
SELECT * FROM messages
WHERE (sender_id = $1 AND recipient_id = $2)
   OR (sender_id = $2 AND recipient_id = $1)
ORDER BY created_at DESC;

-- 9.3 Get inbox for user (unread messages)
SELECT m.id, m.sender_id, m.content, m.created_at,
       u.first_name, u.last_name, u.email,
       COUNT(*) OVER (PARTITION BY m.sender_id) as unread_count
FROM messages m
JOIN users u ON m.sender_id = u.id
WHERE m.recipient_id = $1 AND m.is_read = FALSE
ORDER BY m.created_at DESC;

-- 9.4 Mark message as read
UPDATE messages SET is_read = TRUE
WHERE id = $1;

-- 9.5 Mark all messages from sender as read
UPDATE messages SET is_read = TRUE
WHERE recipient_id = $1 AND sender_id = $2 AND is_read = FALSE;

-- ============================================================================
-- SECTION 10: ANALYTICS & REPORTING QUERIES
-- ============================================================================

-- 10.1 Platform statistics
SELECT 
  (SELECT COUNT(*) FROM users WHERE user_type = 'professional') as total_professionals,
  (SELECT COUNT(*) FROM users WHERE user_type = 'employer') as total_employers,
  (SELECT COUNT(*) FROM job_postings WHERE status = 'posted') as active_jobs,
  (SELECT COUNT(*) FROM job_assignments WHERE status = 'completed') as completed_jobs,
  (SELECT SUM(seller_receives) FROM payments WHERE status = 'completed') as total_paid_out,
  (SELECT SUM(seller_commission + buyer_commission) FROM payments WHERE status = 'completed') as platform_revenue;

-- 10.2 Professional dashboard
SELECT 
  COUNT(DISTINCT ja.job_id) as total_jobs_completed,
  COUNT(DISTINCT r.id) as total_reviews,
  AVG(r.rating) as average_rating,
  SUM(CASE WHEN ja.status = 'completed' THEN 1 ELSE 0 END) as completed_count,
  SUM(CASE WHEN ja.status = 'in_progress' THEN 1 ELSE 0 END) as in_progress_count,
  SUM(CASE WHEN p.status = 'completed' THEN p.seller_receives ELSE 0 END) as total_earnings
FROM users u
LEFT JOIN professional_profiles pp ON u.id = pp.user_id
LEFT JOIN job_assignments ja ON pp.id = ja.professional_id
LEFT JOIN reviews r ON ja.id = r.job_assignment_id
LEFT JOIN payments p ON ja.id = p.job_assignment_id
WHERE u.id = $1;

-- 10.3 Employer dashboard
SELECT 
  COUNT(DISTINCT jp.id) as total_jobs_posted,
  COUNT(DISTINCT ja.id) as total_assignments,
  SUM(CASE WHEN jp.status = 'posted' THEN 1 ELSE 0 END) as active_jobs,
  SUM(CASE WHEN ja.status = 'completed' THEN 1 ELSE 0 END) as completed_jobs,
  SUM(CASE WHEN p.status = 'completed' THEN p.amount ELSE 0 END) as total_spent,
  COUNT(DISTINCT p.id) as total_payments_made
FROM users u
LEFT JOIN job_postings jp ON u.id = jp.employer_id
LEFT JOIN job_assignments ja ON jp.id = ja.job_id
LEFT JOIN payments p ON ja.id = p.job_assignment_id
WHERE u.id = $1;

-- 10.4 Top professionals by rating
SELECT 
  u.id, u.first_name, u.last_name, u.location,
  pp.avg_rating, pp.total_reviews, pp.total_hours_worked,
  COUNT(DISTINCT s.id) as skill_count
FROM users u
JOIN professional_profiles pp ON u.id = pp.user_id
LEFT JOIN professional_skills ps ON pp.id = ps.professional_id
LEFT JOIN skills s ON ps.skill_id = s.id
WHERE pp.total_reviews >= 5
GROUP BY u.id, pp.id
ORDER BY pp.avg_rating DESC, pp.total_reviews DESC
LIMIT 10;

-- 10.5 Most in-demand skills
SELECT s.id, s.name, COUNT(DISTINCT jp.id) as job_count
FROM skills s
LEFT JOIN job_postings jp ON s.id = jp.skill_id
WHERE jp.status IN ('posted', 'in_progress', 'completed')
GROUP BY s.id
ORDER BY job_count DESC
LIMIT 10;

-- 10.6 Recent activity summary
SELECT 
  'New User' as activity_type,
  COUNT(*) as count,
  MAX(created_at) as last_activity
FROM users
WHERE created_at > CURRENT_TIMESTAMP - INTERVAL '7 days'
UNION ALL
SELECT 'Job Posted', COUNT(*), MAX(created_at)
FROM job_postings
WHERE created_at > CURRENT_TIMESTAMP - INTERVAL '7 days'
UNION ALL
SELECT 'Assignment Completed', COUNT(*), MAX(completed_at)
FROM job_assignments
WHERE status = 'completed'
  AND completed_at > CURRENT_TIMESTAMP - INTERVAL '7 days'
UNION ALL
SELECT 'Payment Completed', COUNT(*), MAX(completed_at)
FROM payments
WHERE status = 'completed'
  AND completed_at > CURRENT_TIMESTAMP - INTERVAL '7 days';

-- ============================================================================
-- SECTION 11: MAINTENANCE QUERIES
-- ============================================================================

-- 11.1 Get database size
SELECT pg_size_pretty(pg_database_size('linkprosoft_dev'));

-- 11.2 Get table sizes
SELECT schemaname, tablename, 
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- 11.3 Check index usage
SELECT schemaname, tablename, indexname, idx_scan
FROM pg_stat_user_indexes
ORDER BY idx_scan DESC;

-- 11.4 Verify referential integrity
SELECT 
  constraint_name, table_name, column_name
FROM information_schema.key_column_usage
WHERE table_schema = 'public'
  AND referenced_table_name IS NOT NULL
ORDER BY table_name;

-- 11.5 Archive old messages (Phase 2+)
-- Move messages older than 1 year to archive table (before running, create archive table)
DELETE FROM messages
WHERE created_at < CURRENT_TIMESTAMP - INTERVAL '1 year';

-- 11.6 Update expired jobs
UPDATE job_postings SET status = 'cancelled'
WHERE status = 'posted'
  AND expires_at < CURRENT_TIMESTAMP;

-- ============================================================================
-- END OF COMMON SQL QUERIES REFERENCE
-- ============================================================================
