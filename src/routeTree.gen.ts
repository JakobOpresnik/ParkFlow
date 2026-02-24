import { Route as rootRoute } from './routes/__root'
import { Route as IndexRoute } from './routes/index'
import { Route as ParkingRoute } from './routes/parking'
import { Route as BookingRoute } from './routes/booking'
import { Route as AnalyticsRoute } from './routes/analytics'
import { Route as ProfileRoute } from './routes/profile'

export const routeTree = rootRoute.addChildren([
  IndexRoute,
  ParkingRoute,
  BookingRoute,
  AnalyticsRoute,
  ProfileRoute,
])
