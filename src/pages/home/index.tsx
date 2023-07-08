import { useNavigate } from "react-router"
import { useEffect } from "react"

const HomePage = () => {
  const navigate = useNavigate()

  useEffect(() => {
    navigate("/text")
  }, [navigate])

  return null
}

export default HomePage
