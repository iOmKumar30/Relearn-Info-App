INSERT INTO "KPI" (id, key, label, unit, category, "sortOrder", description, active, "createdAt", "updatedAt")
VALUES 
  (gen_random_uuid(), 'students.total', 'Total Active Students', 'COUNT', 'Academics', 10, 'Total number of students currently enrolled.', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'classrooms.total', 'Total Active Classrooms', 'COUNT', 'Academics', 20, 'Total number of active classrooms.', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'classrooms.senior.share', 'Senior Classrooms Share', 'PERCENT', 'Academics', 30, 'Percentage of classrooms that are Senior (SR).', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'students.passed.x', 'Students Passed Class X', 'COUNT', 'Academics', 40, 'Number of students who passed their Class X Board Exams this year.', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'tutors.total', 'Total Active Tutors', 'COUNT', 'Team', 50, 'Total number of active users with the TUTOR role.', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'members.total', 'Total Core Members', 'COUNT', 'Team', 60, 'Total number of Annual, Honorary, Life, and Founder members.', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'persons.trained', 'Interns / Persons Trained', 'COUNT', 'Team', 70, 'Total number of members classified as INTERN.', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'projects.ongoing', 'Ongoing Projects', 'COUNT', 'Projects', 80, 'Number of projects currently marked as ONGOING.', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'projects.past', 'Past/Completed Projects', 'COUNT', 'Projects', 90, 'Number of projects currently marked as COMPLETED.', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'entrepreneurs.created', 'Entrepreneurs Created', 'COUNT', 'Projects', 100, 'Manual metric tracking the number of entrepreneurs created.', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'finance.revenue.current.lakhs', 'Current FY Revenue', 'LAKHS', 'Finance', 110, 'Total credit transactions for the current active Financial Year.', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'finance.expenditure.current.lakhs', 'Current FY Expenditure', 'LAKHS', 'Finance', 120, 'Total debit transactions for the current active Financial Year.', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'finance.revenue.past.lakhs', 'Past FY Revenue', 'LAKHS', 'Finance', 130, 'Total credit transactions for the previous Financial Year.', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'finance.expenditure.past.lakhs', 'Past FY Expenditure', 'LAKHS', 'Finance', 140, 'Total debit transactions for the previous Financial Year.', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT (key) DO UPDATE SET 
  label = EXCLUDED.label, 
  unit = EXCLUDED.unit, 
  category = EXCLUDED.category, 
  "sortOrder" = EXCLUDED."sortOrder", 
  description = EXCLUDED.description, 
  active = EXCLUDED.active, 
  "updatedAt" = CURRENT_TIMESTAMP;