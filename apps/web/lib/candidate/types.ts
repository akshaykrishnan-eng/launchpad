export type CandidateStatus =
  | "STUDENT"
  | "RECENTLY_GRADUATED"
  | "LOOKING_FOR_FIRST_JOB"
  | "CURRENTLY_EMPLOYED";

export type CandidateProfile = {
  id: string;
  user_id: string;
  first_name: string | null;
  last_name: string | null;
  mobile_number: string | null;
  current_city: string | null;
  current_status: CandidateStatus | null;
  degree: string | null;
  specialisation: string | null;
  graduation_year: number | null;
  career_goal: string | null;
  completion_percentage: number;
};

export type CandidateProfileUpdate = Partial<
  Omit<CandidateProfile, "id" | "user_id" | "completion_percentage">
>;

export type EducationStatus = "IN_PROGRESS" | "COMPLETED";

export type Education = {
  id: string;
  institution: string;
  degree: string;
  specialization: string | null;
  start_year: number | null;
  graduation_year: number | null;
  education_status: EducationStatus | null;
};

export type EducationInput = Omit<Education, "id">;

export type CandidateSkill = {
  id: string;
  name: string;
};

export type WorkExperience = {
  id: string;
  company: string;
  job_title: string;
  location: string | null;
  start_date: string;
  end_date: string | null;
  is_current: boolean;
  description: string | null;
};

export type WorkExperienceInput = Omit<WorkExperience, "id">;

export type CareerPreference = {
  preferred_roles: string[];
  preferred_locations: string[];
};

export type ProfileCompletion = {
  completion_percentage: number;
};

export type CandidateApiError = { detail?: string | { msg: string; loc: unknown[] }[] };

export type NextActionType =
  | "PERSONAL_INFORMATION"
  | "EDUCATION"
  | "SKILLS"
  | "WORK_EXPERIENCE"
  | "CAREER_PREFERENCES"
  | "CAREER_GOAL"
  | "PROFILE_COMPLETE";

export type ProfileCompletionComponents = {
  personal_information: boolean;
  education: boolean;
  skills: boolean;
  experience: boolean;
  career_preferences: boolean;
  career_goal: boolean;
};

export type NextAction = {
  type: NextActionType;
  title: string;
  description: string;
  route: string;
};

export type Dashboard = {
  candidate: { first_name: string | null; last_name: string | null };
  profile_completion: {
    percentage: number;
    components: ProfileCompletionComponents;
  };
  next_action: NextAction;
};
