import { create } from 'zustand'
import { loadConfig, saveConfig, clearConfig } from '../config/store'

type AuthState = {
  authId: string
  token: string
  hydrated: boolean
  hydrate: () => void
  login: (creds: { authId: string; token: string }) => void
  logout: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  authId: '',
  token: '',
  hydrated: false,
  hydrate() {
    const cfg = loadConfig()
    set({ authId: cfg?.authId ?? '', token: cfg?.token ?? '', hydrated: true })
  },
  login({ authId, token }) {
    saveConfig({ authId, token })
    set({ authId, token })
  },
  logout() {
    clearConfig()
    set({ authId: '', token: '' })
  },
}))
