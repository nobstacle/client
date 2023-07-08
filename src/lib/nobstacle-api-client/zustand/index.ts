import { persist } from "zustand/middleware"
import create from "zustand"
import type { AuthSlice } from "./stores/authStore"
import { authSlice } from "./stores/authStore"
import { CompanySlice, companySlice } from "./stores/companyStore"
import { ConfigSlice, configSlice } from "./stores/configSlice"

// export const useStore = create<>()((...a) => ({}));

export const usePersistedAuthStore = create<AuthSlice>()(
  persist(
    (set, get, ...a) => ({
      ...authSlice(set, get, ...a)
    }),
    {
      name: "auth-storage",
      serialize: (state) => btoa(JSON.stringify(state)),
      deserialize: (str) => JSON.parse(atob(str)),
      getStorage: () => localStorage
    }
  )
)

export const usePersistedCompanyStore = create<CompanySlice>()(
  persist(
    (set, get, ...a) => ({
      ...companySlice(set, get, ...a)
    }),
    {
      name: "company-storage",
      serialize: (state) => btoa(JSON.stringify(state)),
      deserialize: (str) => JSON.parse(atob(str)),
      getStorage: () => localStorage,
      partialize: (state) => ({ ...state, textTemplates: [] })
    }
  )
)

export const usePersistedConfigStore = create<ConfigSlice>()(
  persist(
    (set, get, ...a) => ({
      ...configSlice(set, get, ...a)
    }),
    {
      name: "config-storage",
      serialize: (state) => btoa(JSON.stringify(state)),
      deserialize: (str) => JSON.parse(atob(str)),
      getStorage: () => localStorage,
      partialize: (state) => ({ ...state, activeLangCode: "" })
    }
  )
)
