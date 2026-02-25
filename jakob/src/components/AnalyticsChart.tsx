import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts'
import { Paper, Text, Loader, Center } from '@mantine/core'
import { useWeeklyOccupancy } from '@/hooks/useParkingData'
import type { WeeklyOccupancy } from '@/types'

const COLORS = ['#6c5ce7', '#7c6ff0', '#8c82f3', '#9c95f6', '#ac9ff9']

function CustomTooltip({
  active,
  payload,
}: {
  active?: boolean
  payload?: Array<{ payload: WeeklyOccupancy }>
}) {
  if (!active || !payload?.[0]) return null

  const { day, occupancy, total, percentage } = payload[0].payload

  return (
    <div className="rounded-xl border border-violet-100 bg-white p-3 shadow-lg">
      <p className="mb-1.5 text-sm font-bold text-gray-800">{day}</p>
      <p className="text-sm text-gray-600">
        {occupancy}/{total} spots
      </p>
      <div className="mt-1.5 flex items-center gap-2">
        <div className="h-2 flex-1 overflow-hidden rounded-full bg-violet-100">
          <div
            className="h-full rounded-full bg-violet-500"
            style={{ width: `${percentage}%` }}
          />
        </div>
        <span className="text-sm font-semibold text-violet-600">
          {percentage}%
        </span>
      </div>
    </div>
  )
}

export default function AnalyticsChart() {
  const { data, isLoading } = useWeeklyOccupancy()

  if (isLoading) {
    return (
      <Center h={288}>
        <Loader color="violet" />
      </Center>
    )
  }

  return (
    <Paper radius="lg" shadow="xs" p="lg" withBorder>
      <Text size="lg" fw={600} mb="md">
        Weekly Occupancy
      </Text>
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis
              dataKey="day"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 12, fill: '#9ca3af' }}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 12, fill: '#9ca3af' }}
              tickFormatter={(v: number) => `${v}%`}
              domain={[0, 100]}
            />
            <Tooltip
              content={<CustomTooltip />}
              cursor={{ fill: 'transparent' }}
            />
            <Bar
              dataKey="percentage"
              radius={[8, 8, 0, 0]}
              maxBarSize={48}
              style={{ cursor: 'default' }}
            >
              {data?.map((_, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={COLORS[index % COLORS.length]}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Paper>
  )
}
