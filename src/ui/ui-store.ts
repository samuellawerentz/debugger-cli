import { create } from 'zustand'

export type PaletteView = 'menu' | 'keybindings'

type UIState = {
  paletteOpen: boolean
  view: PaletteView
  selectedIndex: number
  open: () => void
  close: () => void
  toggle: () => void
  setView: (v: PaletteView) => void
  setSelected: (i: number) => void
  move: (delta: number, max: number) => void
}

export const useUIStore = create<UIState>((set, get) => ({
  paletteOpen: false,
  view: 'menu',
  selectedIndex: 0,
  open: () => set({ paletteOpen: true, view: 'menu', selectedIndex: 0 }),
  close: () => set({ paletteOpen: false, view: 'menu', selectedIndex: 0 }),
  toggle: () => (get().paletteOpen ? get().close() : get().open()),
  setView: (v) => set({ view: v, selectedIndex: 0 }),
  setSelected: (i) => set({ selectedIndex: i }),
  move: (delta, max) => {
    if (max <= 0) return
    const next = (get().selectedIndex + delta + max) % max
    set({ selectedIndex: next })
  },
}))
