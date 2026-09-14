import { ResendAdapter } from './ResendAdapter.js'

export function createEmailService() {
  return new ResendAdapter()
}

export const emailService = createEmailService()

export default emailService
