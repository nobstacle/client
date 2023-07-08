import type { StateCreator } from "zustand"

export interface ConfigSlice {
  activeStation: string
  activeLangCode?: string
  setActiveStation: (activeStation: string) => void
  setActiveLangCode: (activeLangCode: string) => void
}

export const configSlice: StateCreator<ConfigSlice> = (set) => ({
  activeStation: "1",
  setActiveStation: (activeStation) => set(() => ({ activeStation })),
  activeLangCode: undefined,
  setActiveLangCode: (activeLangCode) => set(() => ({ activeLangCode }))
})
