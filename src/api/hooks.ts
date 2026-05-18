import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from './client'
import type {
  BookingCreate,
  BookingOut,
  MeResponse,
  TableCreate,
  TableOut,
  TableUpdate,
} from './types'

// ── Query keys ───────────────────────────────────────────────────────────────

export const qk = {
  me: ['me'] as const,
  tables: ['tables'] as const,
  adminTables: ['admin', 'tables'] as const,
  bookings: (date: string) => ['bookings', date] as const,
  myBookings: ['bookings', 'my'] as const,
  adminBookings: (date: string) => ['admin', 'bookings', date] as const,
}

// ── Auth ─────────────────────────────────────────────────────────────────────

export function useMe() {
  return useQuery({
    queryKey: qk.me,
    queryFn: () => api.get<MeResponse>('/api/v1/auth/me'),
    staleTime: 1000 * 60 * 5,
  })
}

// ── Tables ────────────────────────────────────────────────────────────────────

export function useTables() {
  return useQuery({
    queryKey: qk.tables,
    queryFn: () => api.get<TableOut[]>('/api/v1/tables'),
    staleTime: 1000 * 60 * 5,
  })
}

export function useAdminTables() {
  return useQuery({
    queryKey: qk.adminTables,
    queryFn: () => api.get<TableOut[]>('/api/v1/admin/tables'),
    staleTime: 1000 * 60 * 2,
  })
}

export function useCreateTable() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: TableCreate) => api.post<TableOut>('/api/v1/admin/tables', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.adminTables })
      qc.invalidateQueries({ queryKey: qk.tables })
    },
  })
}

export function useUpdateTable(tableId: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: TableUpdate) => api.patch<TableOut>(`/api/v1/admin/tables/${tableId}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.adminTables })
      qc.invalidateQueries({ queryKey: qk.tables })
    },
  })
}

// ── Bookings ──────────────────────────────────────────────────────────────────

export function useBookingsByDate(date: string) {
  return useQuery({
    queryKey: qk.bookings(date),
    queryFn: () => api.get<BookingOut[]>(`/api/v1/bookings?date=${date}`),
    staleTime: 1000 * 30,
    enabled: Boolean(date),
  })
}

export function useMyBookings() {
  return useQuery({
    queryKey: qk.myBookings,
    queryFn: () => api.get<BookingOut[]>('/api/v1/bookings/my'),
    staleTime: 1000 * 60,
  })
}

export function useAdminBookings(date: string) {
  return useQuery({
    queryKey: qk.adminBookings(date),
    queryFn: () => api.get<BookingOut[]>(`/api/v1/admin/bookings?date=${date}`),
    staleTime: 1000 * 30,
    enabled: Boolean(date),
  })
}

export function useCreateBooking() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: BookingCreate) => api.post<BookingOut>('/api/v1/bookings', data),
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: qk.bookings(variables.date) })
      qc.invalidateQueries({ queryKey: qk.myBookings })
      qc.invalidateQueries({ queryKey: ['admin', 'bookings'] })
    },
  })
}

export function useCancelBooking() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (bookingId: number) => api.delete<void>(`/api/v1/bookings/${bookingId}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.myBookings })
      qc.invalidateQueries({ queryKey: ['bookings'] })
    },
  })
}

export function useAdminCancelBooking() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (bookingId: number) => api.delete<void>(`/api/v1/admin/bookings/${bookingId}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['bookings'] })
      qc.invalidateQueries({ queryKey: ['admin', 'bookings'] })
      qc.invalidateQueries({ queryKey: qk.myBookings })
    },
  })
}
