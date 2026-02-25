import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import { errorHandler } from './middleware/errorHandler.js'
import spotsRouter from './routes/spots.js'
import ownersRouter from './routes/owners.js'
import authRouter from './routes/auth.js'
import bookingsRouter from './routes/bookings.js'
import lotsRouter from './routes/lots.js'
import changesRouter from './routes/changes.js'

export function createApp() {
  const app = express()

  app.use(
    cors({
      origin: [
        'http://localhost:3000',
        'http://localhost:5173',
        'http://localhost:4173',
      ],
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    }),
  )

  app.use(express.json())

  app.get('/health', (_req, res) => {
    res.json({ ok: true })
  })

  app.use('/api/spots', spotsRouter)
  app.use('/api/owners', ownersRouter)
  app.use('/api/auth', authRouter)
  app.use('/api/bookings', bookingsRouter)
  app.use('/api/lots', lotsRouter)
  app.use('/api/changes', changesRouter)

  app.use(errorHandler)

  return app
}
