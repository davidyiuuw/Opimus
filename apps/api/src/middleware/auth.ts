import { Request, Response, NextFunction } from 'express'
import { createClient } from '@supabase/supabase-js'
import { config } from '../config'

const supabase = createClient(config.supabase.url, config.supabase.serviceRoleKey)

// Augment Express Request to carry verified user info
declare global {
  namespace Express {
    interface Request {
      user?: { id: string; email?: string }
    }
  }
}

export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing or invalid authorization header' })
    return
  }

  const token = authHeader.slice(7)
  const { data, error } = await supabase.auth.getUser(token)

  if (error || !data.user) {
    res.status(401).json({ error: 'Invalid or expired token' })
    return
  }

  req.user = { id: data.user.id, email: data.user.email }
  next()
}
