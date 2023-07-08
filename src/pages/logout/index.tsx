import { useNavigate } from "react-router"
import { useAuthControllerLogout } from "../../lib/nobstacle-api-client/react-query/auth/auth"
import { usePersistedAuthStore } from "../../lib/nobstacle-api-client/zustand"
import { useEffect } from "react"

function Logout() {
  const navigate = useNavigate()
  const { setMember } = usePersistedAuthStore()
  const logout = useAuthControllerLogout()
  const handleLogoutClick = async () => {
    await logout.mutateAsync().then(() => {
      setMember(null)
      navigate("/login")
    })
  }
  useEffect(() => {
    handleLogoutClick()
  }, [])

  return null
}

export default Logout
