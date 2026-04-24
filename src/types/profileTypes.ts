export type AvailabilityStatus = "available" | "unavailable" | "away";

export interface ProfessionalProfileRow {
  id: number;
  user_id: number;
  hourly_rate: string | null;
  bio: string | null;
  availability_status: AvailabilityStatus | null;
  response_time_hours: number | null;
  total_hours_worked: number | null;
  avg_rating: string | null;
  total_reviews: number | null;
  created_at: Date;
  updated_at: Date;
}

export interface ProfessionalProfileDTO {
  id: number;
  userId: number;
  hourlyRate: number | null;
  bio: string | null;
  availabilityStatus: AvailabilityStatus | null;
  responseTimeHours: number | null;
  totalHoursWorked: number | null;
  avgRating: number;
  totalReviews: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateProfileInput {
  hourlyRate?: number;
  bio?: string;
  availabilityStatus?: AvailabilityStatus;
  responseTimeHours?: number;
}

export interface UpdateProfileInput {
  hourlyRate?: number;
  bio?: string;
  availabilityStatus?: AvailabilityStatus;
  responseTimeHours?: number;
}

export interface PublicUserSummary {
  id: number;
  firstName: string;
  lastName: string;
  location: string | null;
}

export interface ProfessionalProfileDetailDTO extends ProfessionalProfileDTO {
  user: PublicUserSummary;
}

export interface ProfessionalProfileFullDTO extends ProfessionalProfileDTO {
  user: PublicUserSummary;
  skills: Array<{
    skillId: number;
    name: string;
    category: string;
    description: string | null;
    proficiencyLevel: "beginner" | "intermediate" | "expert" | null;
    yearsOfExperience: number | null;
    isPrimary: boolean;
  }>;
  certifications: Array<{
    id: number;
    title: string;
    issuer: string | null;
    issueDate: Date | null;
    expiryDate: Date | null;
    credentialUrl: string | null;
    createdAt: Date;
  }>;
  portfolioItems: Array<{
    id: number;
    title: string;
    description: string | null;
    imageUrl: string | null;
    linkUrl: string | null;
    createdAt: Date;
  }>;
}
