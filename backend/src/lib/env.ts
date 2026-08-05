// deploy_env writes every key listed in .env.example, so an unset CI/CD variable
// reaches us as '' rather than undefined. `??` keeps empty strings, which silently
// blanked the timesheet base URL in production — so treat empty as unset.
export function envOr(name: string, fallback: string): string {
  const value = process.env[name]?.trim()
  return value === undefined || value.length === 0 ? fallback : value
}
