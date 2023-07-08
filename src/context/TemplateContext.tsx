import React from "react"
import { useSocketContext } from "./SocketContext"
import { usePersistedCompanyStore } from "../lib/nobstacle-api-client/zustand"
import { useTextTemplateControllerGetTextTemplateOne } from "../lib/nobstacle-api-client/react-query/template/template"
import { useParams } from "react-router"

interface TemplateContextPropsI {
  sendTemplate(contentRefId: number, templateType: TemplateType): Promise<void>
  sendTextTemplateMessage(data: { text: string }): Promise<void>
}

const TemplateContext = React.createContext<TemplateContextPropsI | null>(null)

export function useTemplateContext() {
  const context = React.useContext(TemplateContext)
  if (!context) {
    throw new Error(
      "use TemplateContextProvider must be used within the TemplateContext.Provider"
    )
  }

  return context
}

export enum TemplateType {
  Text = "Text"
}

export const TemplateContextProvider: React.FC<{
  children: React.ReactNode
}> = ({ children }) => {
  const { company } = usePersistedCompanyStore()
  const [activeTextTemplateId, setActiveTextTemplateId] =
    React.useState<number>()
  const { stationId } = useParams()

  const { socket } = useSocketContext()
  const { setActiveTextTemplate } = usePersistedCompanyStore()

  useTextTemplateControllerGetTextTemplateOne(activeTextTemplateId!, {
    query: {
      enabled: activeTextTemplateId !== undefined,
      staleTime: 0,
      onSuccess: (textTemplate) => {
        setActiveTextTemplate(textTemplate)
      }
    }
  })

  /**
   * Connect to the socket server
   * Disconnect from the socket server
   */
  React.useEffect(() => {
    console.log("socket", socket)
    if (socket) {
      socket.on(`new-template-${stationId}`, async (data: string) => {
        const parsedMessage = JSON.parse(data) as {
          id: number
          templateType: TemplateType
          contentRefId: number
        }
        console.log("new template received", parsedMessage)

        setActiveTextTemplateId(parsedMessage.contentRefId)

        return true
      })
    }
    return () => {
      socket?.off(`new-template-${stationId}`)
    }
  }, [socket, stationId])

  React.useEffect(() => {
    if (socket) {
      socket.on(
        `new-text-template-message-${company?.id}-${stationId}`,
        async (data: string) => {
          console.log("new text template received")
          const parsedMessage = JSON.parse(data)

          setActiveTextTemplate({
            description: parsedMessage.text,
            tagId: 1,
            id: 1,
            langCode: "",
            title: ""
          })

          return true
        }
      )
    }
    return () => {
      socket?.off(`new-text-template-message-${company?.id}-${stationId}`)
    }
  }, [company?.id, setActiveTextTemplate, socket, stationId])

  async function sendTemplate(
    contentRefId: number,
    templateType: TemplateType
  ) {
    socket?.emit("new-template", {
      companyId: company?.id,
      contentRefId,
      templateType,
      stationId
    })
  }

  async function sendTextTemplateMessage(data: { text: string }) {
    socket?.emit("new-text-template-message", {
      text: data.text,
      userId: 1,
      companyId: company?.id,
      stationId
    })
  }

  return (
    <TemplateContext.Provider
      value={{
        sendTemplate,
        sendTextTemplateMessage
      }}
    >
      {children}
    </TemplateContext.Provider>
  )
}
