import { ResendAdapter } from './ResendAdapter.js'

export function createEmailService(options) {
  return new ResendAdapter(options)
}

export const emailService = createEmailService()

export default emailService
