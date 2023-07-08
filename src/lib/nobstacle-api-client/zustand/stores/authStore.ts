import type { StateCreator } from "zustand"
import { GetUserRes } from "../../react-query/types/getUserRes"

export interface AuthSlice {
  member: GetUserRes | null
  setMember: (member: GetUserRes | null) => void
}

export const authSlice: StateCreator<AuthSlice> = (set) => ({
  member: null,
  setMember: (member) => set(() => ({ member }))
})
