import { create } from 'zustand'
import { loadConfig, saveConfig, clearConfig } from '../config/store'

type AuthState = {
  baseUrl: string
  token: string
  hydrated: boolean
  hydrate: () => void
  login: (creds: { baseUrl: string; token: string }) => void
  logout: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  baseUrl: '',
  token: '',
  hydrated: false,
  hydrate() {
    const cfg = loadConfig()
    set({ baseUrl: cfg?.baseUrl ?? '', token: cfg?.token ?? '', hydrated: true })
  },
  login({ baseUrl, token }) {
    saveConfig({ baseUrl, token })
    set({ baseUrl, token })
  },
  logout() {
    clearConfig()
    set({ baseUrl: '', token: '' })
  },
}))
