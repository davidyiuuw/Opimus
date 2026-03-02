import { Router } from 'express'
import { db } from '../db/client'

const router = Router()

router.get('/', async (_req, res) => {
  try {
    await db.query('SELECT 1')
    res.json({ status: 'ok', timestamp: new Date().toISOString(), db: 'connected' })
  } catch {
    res.status(503).json({ status: 'error', timestamp: new Date().toISOString(), db: 'disconnected' })
  }
})

export default router
