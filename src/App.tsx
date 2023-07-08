import "./App.css"
import { Routes, Route, BrowserRouter } from "react-router-dom"
import HomePage from "./pages/home"
import ChatDetailPage from "./pages/chat/details"
import ImagePage from "./pages/image"
import MapPage from "./pages/map"
import LoginPage from "./pages/login"
import TextPage from "./pages/text"
import DefaultLayout from "./layouts/DefaultLayout"
import Authentication from "./middlewares/Authentication"
import CompanyPage from "./pages/company"
import ChatPage from "./pages/chat"
import { usePersistedCompanyStore } from "./lib/nobstacle-api-client/zustand"
import { useCompanyControllerGetUserCompany } from "./lib/nobstacle-api-client/react-query/company/company"
import { SocketContextProvider } from "./context/SocketContext"
import { ConversationContextProvider } from "./context/ConversationContext"
import { MessagesContextProvider } from "./context/MessagesContext"
import SignUpForm from "./components/Forms/SignupForm"
import Logout from "./pages/logout"

function App() {
  const { setCompany } = usePersistedCompanyStore()

  useCompanyControllerGetUserCompany({
    query: {
      onSuccess: (companyRes) => {
        setCompany(companyRes)
      }
    }
  })

  return (
    <Routes>
      <Route
        element={
          <Authentication>
            <DefaultLayout />
          </Authentication>
        }
      >
        <Route path="/" element={<HomePage />} />
        <Route path="/text" element={<TextPage />}>
          <Route path=":stationId" element={<TextPage />} />
        </Route>
        <Route path="/image/:stationId" element={<ImagePage />} />

        <Route path="/map" element={<MapPage />}>
          <Route path=":stationId" element={<MapPage />} />
        </Route>

        <Route path="/chat" element={<ChatPage />}>
          <Route path=":stationId" element={<ChatPage />} />
        </Route>

        <Route path="/company" element={<CompanyPage />} />
      </Route>

      <Route path="/logout" element={<Logout />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<SignUpForm />} />
    </Routes>
  )
}

export default App
