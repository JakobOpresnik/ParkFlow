import type {
  AppUser,
  Booking,
  EmployeePresence,
  Owner,
  ParkingLot,
  Spot,
  SpotChange,
  SpotCoordinates,
  SpotStatus,
} from '@/types'

const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3001'
const TOKEN_KEY = 'pf_access_token'

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const token = localStorage.getItem(TOKEN_KEY)
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }
  if (token) headers['Authorization'] = `Bearer ${token}`

  const res = await fetch(`${BASE_URL}${path}`, {
    headers,
    ...options,
  })
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string }
    throw new Error(body.error ?? `Request failed: ${res.status}`)
  }
  return res.json() as Promise<T>
}

export const api = {
  // Spots
  getSpots: () => request<Spot[]>('/api/spots'),
  getSpotByNumber: (number: number) => request<Spot>(`/api/spots/${number}`),
  assignOwner: (id: string, owner_id: string | null) =>
    request<Spot>(`/api/spots/${id}/owner`, {
      method: 'PATCH',
      body: JSON.stringify({ owner_id }),
    }),
  updateStatus: (id: string, status: SpotStatus) =>
    request<Spot>(`/api/spots/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }),

  // Owners
  getOwners: () => request<Owner[]>('/api/owners'),
  createOwner: (data: Omit<Owner, 'id' | 'created_at'>) =>
    request<Owner>('/api/owners', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updateOwner: (id: string, data: Partial<Omit<Owner, 'id' | 'created_at'>>) =>
    request<Owner>(`/api/owners/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  deleteOwner: (id: string) =>
    request<void>(`/api/owners/${id}`, { method: 'DELETE' }),

  // Parking lots
  getLots: () => request<ParkingLot[]>('/api/lots'),
  createLot: (data: Omit<ParkingLot, 'id' | 'created_at'>) =>
    request<ParkingLot>('/api/lots', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updateLot: (
    id: string,
    data: Partial<Omit<ParkingLot, 'id' | 'created_at'>>,
  ) =>
    request<ParkingLot>(`/api/lots/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  deleteLot: (id: string) =>
    request<{ ok: boolean }>(`/api/lots/${id}`, { method: 'DELETE' }),

  // Admin spot management
  createSpot: (data: {
    number: number
    label?: string | null
    lot_id: string
    status?: SpotStatus
  }) =>
    request<Spot>('/api/spots', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updateSpot: (
    id: string,
    data: {
      number?: number
      label?: string | null
      lot_id?: string
      status?: SpotStatus
    },
  ) =>
    request<Spot>(`/api/spots/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  deleteSpot: (id: string) =>
    request<{ ok: boolean }>(`/api/spots/${id}`, { method: 'DELETE' }),
  patchCoordinates: (id: string, coordinates: SpotCoordinates | null) =>
    request<Spot>(`/api/spots/${id}/coordinates`, {
      method: 'PATCH',
      body: JSON.stringify({ coordinates }),
    }),

  // Changes (audit log)
  getChanges: (lot_id?: string) =>
    request<SpotChange[]>(
      lot_id
        ? `/api/changes?lot_id=${encodeURIComponent(lot_id)}`
        : '/api/changes',
    ),

  // Auth
  getMe: () => request<AppUser>('/api/auth/me'),

  // Bookings
  getMyBookings: () => request<Booking[]>('/api/bookings/my'),
  createBooking: (spot_id: string) =>
    request<Booking>('/api/bookings', {
      method: 'POST',
      body: JSON.stringify({ spot_id }),
    }),
  cancelBooking: (id: string) =>
    request<{ ok: boolean }>(`/api/bookings/${id}/cancel`, {
      method: 'PATCH',
    }),

  // Presence (proxied from Abelium timesheet)
  getPresence: (date: string) =>
    request<EmployeePresence[]>(
      `/api/presence?date=${encodeURIComponent(date)}`,
    ),
}
