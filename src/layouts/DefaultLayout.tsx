import { Outlet } from "react-router"
import Header from "../components/Header"
import Sidebar from "../components/Sidebar"
import { usePersistedAuthStore } from "../lib/nobstacle-api-client/zustand"

const DefaultLayout: React.FC<React.PropsWithChildren> = () => {
  const { member } = usePersistedAuthStore()

  if (member?.Role === "User")
    return (
      <div className="w-screen h-screen flex justify-center items-center">
        <Outlet />
      </div>
    )

  return (
    <div
      className="grid grid-cols-[110px,auto] grid-rows-[70px,auto] h-screen dark:(bg-gray-400)"
      style={{ gridTemplateAreas: `"h h" "s m"`, overflowY: "auto" }}
    >
      {member && (
        <>
          <Header />
          <Sidebar />
        </>
      )}
      <main className="bg-zinc-100">
        <Outlet />
      </main>
    </div>
  )
}

export default DefaultLayout
