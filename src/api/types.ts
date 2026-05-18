export interface TelegramAuthData {
  id: number
  first_name: string
  last_name?: string | null
  username?: string | null
  photo_url?: string | null
  auth_date: number
  hash: string
}

export interface TokenResponse {
  access_token: string
  token_type: string
  user_id: number
  user_name: string
  is_admin: boolean
}

export interface MeResponse {
  user_id: number
  user_name: string
  is_admin: boolean
}

export interface TableOut {
  id: number
  name: string
  emoji: string
  is_active: boolean
}

export interface TableCreate {
  name: string
  emoji?: string
}

export interface TableUpdate {
  name?: string | null
  emoji?: string | null
  is_active?: boolean | null
}

export interface BookingOut {
  id: number
  table_id: number
  user_id: number
  user_name: string
  date: string
  start_time: string
  end_time: string
  created_at: string
}

export interface BookingCreate {
  table_id: number
  date: string
  start_time: string
  end_time: string
}

export interface ApiError {
  status: number
  message: string
  detail?: unknown
}
