import { useState, useMemo, useRef, type ReactNode } from 'react'
import { useNavigate } from '@tanstack/react-router'
import {
  TextInput,
  Popover,
  Stack,
  Group,
  Text,
  Badge,
  Box,
  UnstyledButton,
} from '@mantine/core'
import { useDebouncedValue } from '@mantine/hooks'
import { Search, Car, User } from 'lucide-react'
import permanentSpotsData from '@/data/permanent_spots.json'
import attendanceData from '@/data/attendance.json'
import { useParkingStore } from '@/store/parkingStore'
import type {
  PermanentSpot,
  AttendanceRecord,
  FloorId,
  AttendanceStatus,
} from '@/types'

const permanentSpots = permanentSpotsData as PermanentSpot[]
const attendance = attendanceData as AttendanceRecord[]

const attendanceMap = new Map(attendance.map((a) => [a.employeeId, a] as const))

const statusColor: Record<AttendanceStatus, string> = {
  'In-Office': 'green',
  Remote: 'blue',
  Sick: 'orange',
  Vacation: 'violet',
}

interface SpotResult {
  kind: 'spot'
  spotId: string
  floor: FloorId
  ownerName: string
  type: string
  ownerStatus: AttendanceStatus | undefined
}

interface EmployeeResult {
  kind: 'employee'
  employeeId: string
  employeeName: string
  status: AttendanceStatus
  spotId: string | undefined
  floor: FloorId | undefined
}

type SearchResult = SpotResult | EmployeeResult

function highlightMatch(text: string, query: string): ReactNode {
  if (!query) return text
  const idx = text.toLowerCase().indexOf(query.toLowerCase())
  if (idx === -1) return text
  return (
    <>
      {text.slice(0, idx)}
      <span className="rounded-sm bg-yellow-200/70 text-inherit">
        {text.slice(idx, idx + query.length)}
      </span>
      {text.slice(idx + query.length)}
    </>
  )
}

export default function SearchBar() {
  const [query, setQuery] = useState('')
  const [debouncedQuery] = useDebouncedValue(query, 200)
  const [opened, setOpened] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const navigate = useNavigate()
  const setFloor = useParkingStore((s) => s.setFloor)

  const results = useMemo<SearchResult[]>(() => {
    const q = debouncedQuery.trim().toLowerCase()
    if (q.length < 2) return []

    const items: SearchResult[] = []

    // Search spots by ID or owner name
    for (const spot of permanentSpots) {
      if (items.length >= 8) break
      if (
        spot.spotId.toLowerCase().includes(q) ||
        spot.ownerName.toLowerCase().includes(q)
      ) {
        const record = attendanceMap.get(spot.ownerId)
        items.push({
          kind: 'spot',
          spotId: spot.spotId,
          floor: spot.floor,
          ownerName: spot.ownerName,
          type: spot.type,
          ownerStatus: record?.status,
        })
      }
    }

    // Search employees by name (avoid duplicates with spot results)
    const spotOwnerIds = new Set(
      items
        .filter((r): r is SpotResult => r.kind === 'spot')
        .map((r) => {
          const spot = permanentSpots.find((s) => s.spotId === r.spotId)
          return spot?.ownerId
        }),
    )

    for (const emp of attendance) {
      if (items.length >= 10) break
      if (
        emp.employeeName.toLowerCase().includes(q) &&
        !spotOwnerIds.has(emp.employeeId)
      ) {
        const spot = permanentSpots.find((s) => s.ownerId === emp.employeeId)
        items.push({
          kind: 'employee',
          employeeId: emp.employeeId,
          employeeName: emp.employeeName,
          status: emp.status,
          spotId: spot?.spotId,
          floor: spot?.floor,
        })
      }
    }

    return items
  }, [debouncedQuery])

  const handleSelect = (result: SearchResult) => {
    const floor =
      result.kind === 'spot' ? result.floor : (result.floor ?? undefined)
    if (floor) {
      setFloor(floor)
    }
    void navigate({ to: '/parking' })
    setQuery('')
    setOpened(false)
    inputRef.current?.blur()
  }

  return (
    <Popover
      opened={opened && results.length > 0}
      onClose={() => setOpened(false)}
      position="bottom-start"
      width={360}
      shadow="xl"
      radius="lg"
      offset={4}
    >
      <Popover.Target>
        <TextInput
          ref={inputRef}
          placeholder="Search spots, employees..."
          leftSection={<Search className="h-4 w-4 text-gray-400" />}
          radius="xl"
          className="hidden w-80 sm:block"
          styles={{
            input: {
              backgroundColor: '#f8f9fa',
              border: '1px solid #e9ecef',
            },
          }}
          value={query}
          onChange={(e) => {
            setQuery(e.currentTarget.value)
            setOpened(true)
          }}
          onFocus={() => {
            if (results.length > 0) setOpened(true)
          }}
          onBlur={() => {
            // Delay so click on result registers
            setTimeout(() => setOpened(false), 150)
          }}
        />
      </Popover.Target>

      <Popover.Dropdown p={0}>
        <Box className="px-4 py-2.5">
          <Text size="xs" c="dimmed" fw={500}>
            {results.length} result{results.length === 1 ? '' : 's'}
          </Text>
        </Box>
        <Stack gap={0} className="max-h-80 overflow-y-auto px-2 pb-2">
          {results.map((result) => (
            <UnstyledButton
              key={result.kind === 'spot' ? result.spotId : result.employeeId}
              className="rounded-lg px-3 py-3 transition-colors hover:bg-gray-50"
              onClick={() => handleSelect(result)}
            >
              {result.kind === 'spot' ? (
                <Group gap="md" wrap="nowrap">
                  <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-violet-50">
                    <Car className="h-4 w-4 text-violet-500" />
                  </div>
                  <Box className="min-w-0 flex-1">
                    <Group gap="xs" wrap="nowrap">
                      <Text size="sm" fw={600} truncate>
                        {highlightMatch(result.spotId, debouncedQuery.trim())}
                      </Text>
                      <Badge size="xs" variant="light" color="gray">
                        {result.floor}
                      </Badge>
                    </Group>
                    <Text size="xs" c="dimmed" truncate mt={2}>
                      {highlightMatch(result.ownerName, debouncedQuery.trim())}
                      {result.ownerStatus
                        ? ` \u00B7 ${result.ownerStatus}`
                        : ''}
                    </Text>
                  </Box>
                </Group>
              ) : (
                <Group gap="md" wrap="nowrap">
                  <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-blue-50">
                    <User className="h-4 w-4 text-blue-500" />
                  </div>
                  <Box className="min-w-0 flex-1">
                    <Group gap="xs" wrap="nowrap">
                      <Text size="sm" fw={600} truncate>
                        {highlightMatch(
                          result.employeeName,
                          debouncedQuery.trim(),
                        )}
                      </Text>
                      <Badge
                        size="xs"
                        variant="dot"
                        color={statusColor[result.status]}
                      >
                        {result.status}
                      </Badge>
                    </Group>
                    <Text size="xs" c="dimmed" mt={2}>
                      {result.spotId ? (
                        <>
                          Spot{' '}
                          {highlightMatch(result.spotId, debouncedQuery.trim())}{' '}
                          ({result.floor})
                        </>
                      ) : (
                        'No assigned spot'
                      )}
                    </Text>
                  </Box>
                </Group>
              )}
            </UnstyledButton>
          ))}
        </Stack>
      </Popover.Dropdown>
    </Popover>
  )
}
