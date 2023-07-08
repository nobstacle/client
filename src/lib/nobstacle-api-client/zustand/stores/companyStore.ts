import type { StateCreator } from "zustand"
import {
  GetCompanyRes,
  GetTagRes,
  GetTextTemplateRes
} from "../../react-query/types"

export interface CompanySlice {
  company: GetCompanyRes | null
  setCompany: (company: GetCompanyRes | null) => void
  textTemplates: GetTextTemplateRes[]
  activeTextTemplate: GetTextTemplateRes | null
  tags: GetTagRes[]
  setTextTemplates: (textTemplates: GetTextTemplateRes[]) => void
  setActiveTextTemplate: (textTemplate: GetTextTemplateRes | null) => void
  setTags: (tags: GetTagRes[]) => void
}

export const companySlice: StateCreator<CompanySlice> = (set) => ({
  company: null,
  setCompany: (company) => set(() => ({ company })),
  textTemplates: [],
  activeTextTemplate: null,
  setTextTemplates: (textTemplates) => set(() => ({ textTemplates })),
  setActiveTextTemplate: (activeTextTemplate: GetTextTemplateRes | null) =>
    set(() => ({ activeTextTemplate })),
  setTags: (tags) => set(() => ({ tags })),
  tags: []
})
