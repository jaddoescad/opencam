export type Company = {
  id: string
  name: string
  created_by: string | null
  created_at: string
}

export type Profile = {
  id: string
  email: string | null
  full_name: string | null
  avatar_url: string | null
  role: 'Admin' | 'Standard' | 'Restricted' | null
  company_id: string | null
  created_at: string
}

export type Project = {
  id: string
  name: string
  address: string | null
  address_line1: string | null
  address_line2: string | null
  city: string | null
  state: string | null
  postal_code: string | null
  country: string | null
  created_by: string | null
  company_id: string | null
  created_at: string
  updated_at: string
  is_archived: boolean
}

export type ProjectMember = {
  id: string
  project_id: string
  user_id: string
  role: string
  added_at: string
}

export type Photo = {
  id: string
  project_id: string
  uploaded_by: string | null
  storage_path: string
  caption: string | null
  created_at: string
}

export type Checklist = {
  id: string
  project_id: string
  title: string
  created_by: string | null
  created_at: string
}

export type ChecklistItem = {
  id: string
  checklist_id: string
  content: string
  is_completed: boolean
  completed_by: string | null
  completed_at: string | null
  position: number
  category: string
  response: string | null
  assigned_to: string | null
  field_type: 'checkbox' | 'yes_no' | 'rating' | 'text' | 'multiple_choice'
  notes: string | null
  photos_required: boolean
  options: string[] | null
  rating_value: number | null
  created_at: string
}

export type ProjectWithDetails = Project & {
  photo_count?: number
  photos?: Photo[]
  members?: (ProjectMember & { profile?: Profile })[]
}

export type ChecklistTemplate = {
  id: string
  name: string
  description: string | null
  created_by: string | null
  company_id: string | null
  created_at: string
  updated_at: string
}

export type ChecklistTemplateItem = {
  id: string
  checklist_template_id: string
  content: string
  position: number
  category: string
  field_type: 'checkbox' | 'yes_no' | 'rating' | 'text' | 'multiple_choice'
  notes: string | null
  photos_required: boolean
  options: string[] | null
  created_at: string
}

export type PageTemplate = {
  id: string
  name: string
  description: string | null
  content: string | null
  created_by: string | null
  company_id: string | null
  created_at: string
  updated_at: string
}

export type ProjectTemplate = {
  id: string
  name: string
  description: string | null
  created_by: string | null
  company_id: string | null
  created_at: string
  updated_at: string
}

export type ProjectPage = {
  id: string
  project_id: string
  name: string
  content: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

export type ChecklistItemPhoto = {
  id: string
  checklist_item_id: string
  uploaded_by: string | null
  storage_path: string
  created_at: string
}

export type ChecklistItemQuestion = {
  id: string
  checklist_item_id: string
  question: string
  response: string | null
  question_type: 'text'
  position: number
  created_at: string
}

export type ProjectShare = {
  id: string
  project_id: string
  token: string
  created_by: string
  created_at: string
  is_active: boolean
}

export type PhotoAnnotation = {
  id: string
  photo_id: string
  annotation_data: Record<string, unknown>  // Fabric.js JSON
  flattened_path: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

export type Invitation = {
  id: string
  email: string
  role: string
  invited_by: string | null
  company_id: string | null
  token: string
  status: 'pending' | 'accepted' | 'expired'
  created_at: string
  expires_at: string
  accepted_at: string | null
}

// Composite Types
export type ProjectWithPhotos = Project & {
  photo_count?: number
  photos?: Photo[]
}

export type PhotoWithUploader = Photo & {
  uploader?: Profile
  annotation?: PhotoAnnotation | null
}

export type FilterType = 'all' | 'my' | 'archived'

export type ProfileWithCompany = Profile & {
  company?: Company
}
