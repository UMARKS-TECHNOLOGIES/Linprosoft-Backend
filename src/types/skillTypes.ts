export type ProficiencyLevel = "beginner" | "intermediate" | "expert";

export interface SkillRow {
  id: number;
  name: string;
  category: string;
  description: string | null;
  created_at: Date;
}

export interface ProfessionalSkillRow {
  id: number;
  professional_id: number;
  skill_id: number;
  proficiency_level: ProficiencyLevel | null;
  years_of_experience: number | null;
  is_primary: boolean | null;
  created_at: Date;
  skill_name?: string;
  skill_category?: string;
  skill_description?: string | null;
}

export interface SkillDTO {
  id: number;
  name: string;
  category: string;
  description: string | null;
}

export interface ProfileSkillDTO {
  skillId: number;
  name: string;
  category: string;
  description: string | null;
  proficiencyLevel: ProficiencyLevel | null;
  yearsOfExperience: number | null;
  isPrimary: boolean;
}

export interface AddSkillInput {
  skillId: number;
  proficiencyLevel?: ProficiencyLevel;
  yearsOfExperience?: number;
  isPrimary?: boolean;
}

export interface UpdateProfileSkillInput {
  proficiencyLevel?: ProficiencyLevel;
  yearsOfExperience?: number;
  isPrimary?: boolean;
}
