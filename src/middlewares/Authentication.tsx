import * as React from "react"
import { useNavigate } from "react-router-dom"
import { usePersistedAuthStore } from "../lib/nobstacle-api-client/zustand"

const Authentication: React.FC<React.PropsWithChildren> = ({ children }) => {
  const { member } = usePersistedAuthStore()

  const navigate = useNavigate()

  React.useEffect(() => {
    if (!member) {
      navigate(`/login`)
    }
  }, [member, navigate])

  return member ? <>{children}</> : null
}

export default Authentication
