# FlōForm Demo Data Pack

Use this file as your single source during a live product demo.

## 1) Copy/Paste Fallback Text (for `/app/new`)

Paste this into **Fallback text paste** and click **Extract my profile**.

```text
SCHOLARSHIP APPLICANT PROFILE

First Name: Aanya
Last Name: Patel
Date of Birth: 2006-04-17
Nationality: USA
Email: aanya.patel.demo@gmail.com
Phone: +1 (408) 555-0137
Address: 2141 Cedar Grove Lane, Apt 3B, San Jose, CA 95127
College: Santa Clara University
GPA: 3.92

Intended Major: Computer Science
Expected Graduation: 2030-06-15
Employment Status: Part-time
Employer: San Jose Public Library
Role: Student Tech Assistant
Hours per week: 14
Monthly income: 980

Academic and Career Goals:
I plan to study computer science and build accessible software tools for healthcare and education.

Why this scholarship matters:
This scholarship will reduce my work hours and allow me to focus on coursework, research, and community volunteering.
```

## 2) Canonical Demo Values (for mapping review + hosted form)

Use these values to quickly correct or confirm any low-confidence fields.

```json
{
  "personal_first_name": "Aanya",
  "personal_last_name": "Patel",
  "personal_dob": "2006-04-17",
  "personal_citizenship": "US Citizen",
  "contact_email": "aanya.patel.demo@gmail.com",
  "contact_phone": "+1 (408) 555-0137",
  "address_line1": "2141 Cedar Grove Lane",
  "address_line2": "Apt 3B",
  "address_city": "San Jose",
  "address_state": "CA",
  "address_zip": "95127",
  "address_residency_years": 6,
  "education_school": "Santa Clara University",
  "education_grade_level": "College Freshman",
  "education_gpa": 3.92,
  "education_major": "Computer Science",
  "education_graduation_date": "2030-06-15",
  "education_honors": "Dean's List (Fall 2025); AP Scholar with Distinction",
  "employment_status": "Part-time",
  "employment_employer": "San Jose Public Library",
  "employment_role": "Student Tech Assistant",
  "employment_hours_week": 14,
  "employment_income": 980,
  "essay_goals": "I plan to major in computer science and build accessible digital products that support healthcare access and educational equity.",
  "essay_need": "Receiving this scholarship would reduce my financial pressure, cut down work hours, and let me focus on academics, leadership, and service.",
  "checkbox_terms": true,
  "upload_resume_placeholder": true
}
```

## 3) Fast Demo Talk Track

1. Start a new application and paste the fallback text.
2. Show streaming run events and mention extraction + mapping + approval safety.
3. Open profile review and point out confidence + evidence snippets.
4. Open mapping review, approve flagged fields, and apply fill.
5. Open hosted form and show auto-filled highlights.
6. Update any missing fields using the canonical values above.
7. Request final approval, approve, submit, and download JSON.

## 4) What This Demonstrates Clearly

- End-to-end autonomous flow from raw text to final submission.
- Human-in-the-loop approvals for sensitive/low-confidence values.
- Auditability (events, confidence scores, evidence, final JSON export).

