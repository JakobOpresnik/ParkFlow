import { useQuery } from '@tanstack/react-query'
import type { WeeklyOccupancy, SpotHeatmapData } from '@/types'
import heatmapRaw from '@/data/spot_heatmap.json'

const mockWeeklyOccupancy: WeeklyOccupancy[] = [
  { day: 'Mon', occupancy: 18, total: 24, percentage: 75 },
  { day: 'Tue', occupancy: 21, total: 24, percentage: 88 },
  { day: 'Wed', occupancy: 20, total: 24, percentage: 83 },
  { day: 'Thu', occupancy: 16, total: 24, percentage: 67 },
  { day: 'Fri', occupancy: 12, total: 24, percentage: 50 },
]

export function useWeeklyOccupancy() {
  return useQuery({
    queryKey: ['weeklyOccupancy'],
    queryFn: async () => {
      await new Promise((r) => setTimeout(r, 500))
      return mockWeeklyOccupancy
    },
  })
}

export function useSpotHeatmap() {
  return useQuery({
    queryKey: ['spotHeatmap'],
    queryFn: async () => {
      await new Promise((r) => setTimeout(r, 300))
      return heatmapRaw as SpotHeatmapData
    },
  })
}
