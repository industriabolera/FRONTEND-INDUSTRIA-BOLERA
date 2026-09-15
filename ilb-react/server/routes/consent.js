import express from 'express'
import { insertCookieConsent } from '../db/consentDb.js'
import { validateConsent } from '../validators/consentValidator.js'

const consentRouter = express.Router()

consentRouter.post('/', async (req, res) => {
  const body = req.body || {}

  const validation = validateConsent(body)
  if (!validation.valid) {
    return res.status(400).json({ ok: false, errors: validation.errors })
  }

  try {
    const consentId = await insertCookieConsent(validation.data)
    return res.status(200).json({ ok: true, stored: Boolean(consentId) })
  } catch (error) {
    console.error(`[Consent] No se pudo registrar el consentimiento: ${String(error?.message || error || 'Error desconocido').replace(/[\r\n]+/g, ' ').slice(0, 200)}`)
    return res.status(200).json({ ok: true, stored: false })
  }
})

export { consentRouter }
export default consentRouter
