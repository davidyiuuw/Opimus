import app from './app'
import { config } from './config'

app.listen(config.port, () => {
  console.warn(`[API] Running on http://localhost:${config.port} (${config.nodeEnv})`)
})
