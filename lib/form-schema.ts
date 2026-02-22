import { scholarshipFormSchema, type ScholarshipFormSchema } from "./schemas";

export const SCHOLARSHIP_FORM_SCHEMA: ScholarshipFormSchema = scholarshipFormSchema.parse({
  id: "scholarship-application-v1",
  title: "Scholarship Application",
  description: "Hosted, stable scholarship form used for the Klerki demo flow.",
  fields: [
    { id: "personal_first_name", label: "First name", type: "text", required: true, sensitive: false, section: "personal", step: 1 },
    { id: "personal_last_name", label: "Last name", type: "text", required: true, sensitive: false, section: "personal", step: 1 },
    { id: "personal_dob", label: "Date of birth", type: "date", required: true, sensitive: true, section: "personal", step: 1 },
    { id: "personal_citizenship", label: "Citizenship status", type: "select", required: true, section: "personal", step: 1, options: ["US Citizen", "Permanent Resident", "International"] },
    { id: "contact_email", label: "Email", type: "email", required: true, section: "contact", step: 1 },
    { id: "contact_phone", label: "Phone", type: "tel", required: true, section: "contact", step: 1 },

    { id: "address_line1", label: "Address line 1", type: "text", required: true, section: "address", step: 2 },
    { id: "address_line2", label: "Address line 2", type: "text", required: false, section: "address", step: 2 },
    { id: "address_city", label: "City", type: "text", required: true, section: "address", step: 2 },
    { id: "address_state", label: "State", type: "text", required: true, section: "address", step: 2 },
    { id: "address_zip", label: "ZIP code", type: "text", required: true, section: "address", step: 2 },
    { id: "address_residency_years", label: "Years at current address", type: "number", required: false, section: "address", step: 2 },

    { id: "education_school", label: "Current school", type: "text", required: true, section: "education", step: 3 },
    { id: "education_grade_level", label: "Grade level", type: "select", required: true, section: "education", step: 3, options: ["High School Senior", "College Freshman", "College Sophomore", "College Junior", "College Senior", "Graduate"] },
    { id: "education_gpa", label: "GPA", type: "number", required: true, section: "education", step: 3 },
    { id: "education_major", label: "Major/Intended major", type: "text", required: true, section: "education", step: 3 },
    { id: "education_graduation_date", label: "Expected graduation", type: "date", required: false, section: "education", step: 3 },
    { id: "education_honors", label: "Honors", type: "textarea", required: false, section: "education", step: 3 },

    { id: "employment_status", label: "Employment status", type: "select", required: true, section: "employment", step: 4, options: ["Unemployed", "Part-time", "Full-time"] },
    { id: "employment_employer", label: "Employer", type: "text", required: false, section: "employment", step: 4 },
    { id: "employment_role", label: "Role", type: "text", required: false, section: "employment", step: 4 },
    { id: "employment_hours_week", label: "Hours per week", type: "number", required: false, section: "employment", step: 4 },
    { id: "employment_income", label: "Monthly income", type: "number", required: false, sensitive: true, section: "employment", step: 4 },

    { id: "essay_goals", label: "Academic and career goals", type: "textarea", required: true, section: "essay", step: 5 },
    { id: "essay_need", label: "Why this scholarship matters", type: "textarea", required: true, section: "essay", step: 5 },
    { id: "checkbox_terms", label: "I certify this information is accurate", type: "checkbox", required: true, section: "submission", step: 5 },
    { id: "upload_resume_placeholder", label: "Resume uploaded", type: "checkbox", required: false, section: "submission", step: 5 }
  ]
});
