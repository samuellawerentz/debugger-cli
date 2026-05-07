import { readFileSync, writeFileSync, mkdirSync, chmodSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'
import type { Config } from './schema'

const configPath = join(homedir(), '.config', 'plivo-debugger', 'config.json')
const configDir = join(homedir(), '.config', 'plivo-debugger')

export function loadConfig(): Config | null {
  try {
    const raw = readFileSync(configPath, 'utf-8')
    const parsed = JSON.parse(raw)
    if (typeof parsed.baseUrl === 'string' && typeof parsed.token === 'string') {
      return parsed as Config
    }
    return null
  } catch {
    return null
  }
}

export function saveConfig(cfg: Config): void {
  mkdirSync(configDir, { recursive: true })
  writeFileSync(configPath, JSON.stringify(cfg, null, 2), { encoding: 'utf-8', mode: 0o600 })
  chmodSync(configPath, 0o600)
}

export function clearConfig(): void {
  try {
    const { unlinkSync } = require('node:fs')
    unlinkSync(configPath)
  } catch {
    // ignore if missing
  }
}
