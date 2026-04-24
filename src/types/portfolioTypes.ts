export interface PortfolioItemRow {
  id: number;
  professional_id: number;
  title: string;
  description: string | null;
  image_url: string | null;
  link_url: string | null;
  created_at: Date;
}

export interface PortfolioItemDTO {
  id: number;
  professionalId: number;
  title: string;
  description: string | null;
  imageUrl: string | null;
  linkUrl: string | null;
  createdAt: Date;
}

export interface CreatePortfolioItemInput {
  title: string;
  description?: string;
  imageUrl?: string;
  linkUrl?: string;
}

export interface UpdatePortfolioItemInput {
  title?: string;
  description?: string;
  imageUrl?: string;
  linkUrl?: string;
}
