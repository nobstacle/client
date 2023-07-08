// TODO consider authorization

import { useNavigate } from "react-router"
import { useAuthControllerLogout } from "../lib/nobstacle-api-client/react-query/auth/auth"
import { usePersistedAuthStore } from "../lib/nobstacle-api-client/zustand"

const Sidebar: React.FC = () => {
  const navigate = useNavigate()
  const { member, setMember } = usePersistedAuthStore()
  const logout = useAuthControllerLogout()
  const handleLogoutClick = async () => {
    await logout.mutateAsync().then(() => {
      setMember(null)
      navigate("/login")
    })
  }
  const style =
    member?.Role !== "User"
      ? "bg-primary text-gray-100 flex flex-col justify-between"
      : "bg-zinc-100 text-gray-100 flex flex-col justify-between"

  return (
    <nav className={style} style={{ gridArea: "s", overflowY: "hidden" }}>
      {member?.Role !== "User" && (
        <>
          <ul className="pl-0">
            <li className="list-none px-0 py-1">
              <a className="px-3 py-3 block text-lg" href="/">
                Dashboard
              </a>
            </li>

            <li className="list-none px-0 py-1">
              <a className="px-3 py-3 block text-lg" href="/text">
                Text
              </a>
            </li>

            <li className="list-none px-0 py-1">
              <a className="px-3 py-3 block text-lg" href="/map">
                Map
              </a>
            </li>

            <li className="list-none px-0 py-1">
              <a className="px-3 py-3 block text-lg" href="/image">
                Image
              </a>
            </li>

            <li className="list-none px-0 py-1">
              <a className="px-3 py-3 block text-lg" href="/chat">
                Chat
              </a>
            </li>

            <li className="list-none px-0 py-1">
              <a className="px-3 py-3 block text-lg" href="/company">
                Company
              </a>
            </li>

            {/* TODO other links */}
          </ul>

          <footer className="mb-4">
            <a
              href="#"
              className="px-3 py-3 block text-lg"
              onClick={handleLogoutClick}
            >
              Logout
            </a>
          </footer>
        </>
      )}
    </nav>
  )
}

export default Sidebar
