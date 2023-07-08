import { useNavigate, useParams } from "react-router"
import {
  usePersistedAuthStore,
  usePersistedCompanyStore,
  usePersistedConfigStore
} from "../../lib/nobstacle-api-client/zustand"
import "./code.css"
import { useCallback, useEffect, useState } from "react"
import {
  useTextTemplateControllerCreateTextTemplate,
  useTextTemplateControllerGetTextTemplateByTagIdAndLangCode,
  useTextTemplateControllerGetTextTemplateOne,
  useTextTemplateControllerIsTextTemplateExist
} from "../../lib/nobstacle-api-client/react-query/template/template"
import { SocketContextProvider } from "../../context/SocketContext"
import {
  TemplateContextProvider,
  TemplateType,
  useTemplateContext
} from "../../context/TemplateContext"
import { ConversationContextProvider } from "../../context/ConversationContext"
import { MessagesContextProvider } from "../../context/MessagesContext"
import Dropdown from "../../components/Dropdown"
import {
  useTagControllerCreateTag,
  useTagControllerGetTagOne
} from "../../lib/nobstacle-api-client/react-query/tag/tag"
import { useCompanyControllerGetCompanyTemplates } from "../../lib/nobstacle-api-client/react-query/company/company"
import useDisclosure from "../../hooks/useDisclosure"
import Modal from "../../components/Modal"
import AllLanguagesDropdown from "../../components/Header/AllLanguagesDropdown"
import React from "react"

function TextPage() {
  const { member } = usePersistedAuthStore()
  const navigate = useNavigate()
  const { stationId } = useParams()

  useEffect(() => {
    if (!stationId) {
      navigate(`/text/1`)
    }
  }, [navigate, stationId])

  return (
    <SocketContextProvider>
      <ConversationContextProvider>
        <TemplateContextProvider>
          <hr />
          {/* {member?.Role == "Admin" && <CreateTextTemplate />} */}
          {member?.Role !== "User" && <SendTextTemplateInput />}
          {(member?.Role === "Staff" || member?.Role === "Admin") && (
            <TextTemplateWrapperStaff />
          )}
          {member?.Role === "User" && (
            <div className="w-[500px] height-[500px]">
              <TextTemplateWrapper />
            </div>
          )}
        </TemplateContextProvider>
      </ConversationContextProvider>
    </SocketContextProvider>
  )
}

const TextTemplateWrapper = () => {
  const { member } = usePersistedAuthStore()
  const { textTemplates, activeTextTemplate } = usePersistedCompanyStore()
  console.log("text templates", textTemplates)

  return (
    <section id="text-template-wrapper-section" className="p-4">
      {member?.Role === "Admin" && (
        <>
          <h2 className="mb-4 text-4xl font-extrabold text-black">
            Templates:
          </h2>
          <br />
        </>
      )}
      <div className="flex flex-wrap gap-4">
        {activeTextTemplate && member?.Role === "User" && (
          <TextTemplateItem description={activeTextTemplate?.description} />
        )}
        {member?.Role !== "User" &&
          textTemplates.map(({ id, title, description, tagId }) => (
            <TextTemplateItemStaff
              key={id}
              id={id}
              title={title}
              description={description}
              tagId={tagId}
            />
          ))}
      </div>
    </section>
  )
}
const TextTemplateWrapperStaff = () => {
  const { company, setTextTemplates } = usePersistedCompanyStore()
  const { member } = usePersistedAuthStore()

  useCompanyControllerGetCompanyTemplates(
    company!.id,
    {
      TextTemplates: true,
      langCode: company?.defaultLangCode
    },
    {
      query: {
        enabled: !!company?.id,
        onSuccess: (template) => {
          setTextTemplates(template.TextTemplates)
        }
      }
    }
  )

  return <TextTemplateWrapper />
}

interface TextTemplateItemStaffProps {
  title: string
  description: string
  id: number
  tagId: number
}

const TextTemplateItemStaff: React.FC<TextTemplateItemStaffProps> = ({
  description,
  title,
  id,
  tagId
}) => {
  const [isHover, setIsHover] = React.useState(false)
  const tag = useTagControllerGetTagOne(tagId)
  const { activeLangCode } = usePersistedConfigStore()
  const { company } = usePersistedCompanyStore()

  const isActive = useTextTemplateControllerIsTextTemplateExist(
    tagId,
    activeLangCode || company?.defaultLangCode || ""
  )
  const textTempalteByTagIdAndLangCode =
    useTextTemplateControllerGetTextTemplateByTagIdAndLangCode(
      tagId,
      activeLangCode || company?.defaultLangCode || ""
    )
  const { member } = usePersistedAuthStore()
  const { sendTemplate } = useTemplateContext()

  return (
    <div
      onMouseOver={() => setIsHover(true)}
      onMouseLeave={() => setIsHover(false)}
      onClick={(e) => {
        if (member?.Role !== "User") {
          e.preventDefault()
          if (textTempalteByTagIdAndLangCode.data) {
            sendTemplate(
              textTempalteByTagIdAndLangCode.data.id,
              TemplateType.Text
            )
          } else {
            sendTemplate(id, TemplateType.Text)
          }
        }
      }}
      className="cursor-pointer w-full max-w-[200px] bg-[#D9D9D9] rounded-lg shadow flex flex-col"
    >
      <p className="mb-3 font-normal text-[#2F2F2F]">{description}</p>
      <div className="p-2 w-full justify-end flex">
        {isActive.data ? (
          <span className="w-[25px] h-[25px] bg-green-500 text-green-500 text-xs font-medium mr-2 px-2.5 py-0.5 rounded" />
        ) : (
          <span className="w-[25px] h-[25px] bg-red-500 text-red-500 text-xs font-medium mr-2 px-2.5 py-0.5 rounded" />
        )}
      </div>

      {member?.Role !== "User" && (
        <div
          className="flex bg-primary  p-2 text-center text-white  w-full justify-center"
          style={{ background: isHover ? "#22d3ee" : "rgb(59, 89, 152)" }}
        >
          <p>{tag.data?.label}</p>
        </div>
      )}
    </div>
  )
}

interface TextTemplateItemProps {
  description: string
}

const TextTemplateItem: React.FC<TextTemplateItemProps> = ({ description }) => {
  return (
    <div className="w-full  text-center">
      <p className="mb-3 font-normal text-[#2F2F2F]">{description}</p>
    </div>
  )
}

const SendTextTemplateInput = () => {
  const { member } = usePersistedAuthStore()
  const { isOpen, onClose, onOpen } = useDisclosure()
  const [description, setDescription] = useState("")
  const { sendTextTemplateMessage } = useTemplateContext()

  const handleSendTemplate = async () => {
    await sendTextTemplateMessage({ text: description })
  }

  return (
    <section className="p-4">
      <form
        onSubmit={async (e) => {
          e.preventDefault()
          await handleSendTemplate()
        }}
        className="flex gap-4 justify-start flex-col"
      >
        <textarea
          style={{
            border: "solid 2px rgb(59, 89, 152)",
            flexGrow: 1,
            maxWidth: "900px",
            height: "100px"
          }}
          className="p-2 rounded resize-none"
          placeholder="Type here or select template below"
          aria-rowspan={5}
          value={description}
          onInput={(e) => setDescription(e.currentTarget.value)}
        />

        <div className="w-full gap-4 flex justify-between items-end">
          <button
            type="submit"
            className="text-white bg-primary py-2 px-8 rounded disabled:cursor-not-allowed"
            // disabled={freeText().length === 0}
          >
            Send
          </button>

          {member?.Role === "Admin" && (
            <>
              <button
                className="text-white bg-primary py-2 px-8 rounded disabled:cursor-not-allowed"
                // disabled={freeText().length === 0}
                // onClick={handleSendText}
                onClick={onOpen}
              >
                Add template
              </button>
              <Modal title="Add template" isOpen={isOpen} onClose={onClose}>
                <div className="mt-5">
                  <CreateTextTemplateModal onClose={onClose} />
                </div>
              </Modal>
            </>
          )}
        </div>
      </form>
    </section>
  )
}

interface CreateTextTemplateModalPropsI {
  onClose: () => void
}

const CreateTextTemplateModal: React.FC<CreateTextTemplateModalPropsI> = ({
  onClose
}) => {
  const [label, setLabel] = useState<string>("")
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const { stationId } = useParams()
  const createTextTemplate = useTextTemplateControllerCreateTextTemplate()
  const { company, setTextTemplates, textTemplates, tags, setTags } =
    usePersistedCompanyStore()

  const [activeLangCode, setActiveLangCode] = React.useState("")

  const createTagMutation = useTagControllerCreateTag()

  const handleCreateTextTemplate = () => {
    if (!company?.id) return
    if (!stationId) return
    if (!label) return

    createTagMutation.mutate(
      { data: { companyId: company?.id, label } },
      {
        onSuccess: (tag) => {
          setTags([...tags, tag])
          alert(`Tag created successfully: ${label}`)

          createTextTemplate.mutate(
            {
              data: {
                companyId: company?.id,
                description,
                title,
                langCode: activeLangCode,
                tagId: tag.id
              }
            },
            {
              onSuccess: ({ description, title, id, langCode }) => {
                // case 1: template language is not default lang
                if (langCode !== company.defaultLangCode) {
                  // case 1.1:  active language is not default lang
                  if (activeLangCode !== company.defaultLangCode) {
                    // pass
                  }

                  // case 1.2:  active language is default lang
                  if (activeLangCode === company.defaultLangCode) {
                    // pass
                  }
                }

                // case 2: template language is default lang
                if (langCode === company.defaultLangCode) {
                  // case 2.1: active language is default lang
                  if (activeLangCode === company.defaultLangCode) {
                    // pass
                  }

                  // case 2.2: active language is not default lang
                  if (activeLangCode !== company.defaultLangCode) {
                    // pass
                  }
                }

                // if (langCode === company.defaultLangCode) {
                //   setTextTemplates([
                //     ...textTemplates,
                //     { description, id, title, tagId: tag.id, langCode }
                //   ])
                // }

                setDescription("")
                setTitle("")
                setActiveLangCode("")
                onClose()
              }
            }
          )
        }
      }
    )
  }

  return (
    <>
      <AllLanguagesDropdown
        selectElName=""
        selectedValue={activeLangCode}
        onChange={(data) => setActiveLangCode(data)}
      />

      <section className="p-4">
        <form
          onSubmit={(e) => {
            e.preventDefault()
            handleCreateTextTemplate()
          }}
          className="flex gap-4 justify-start flex-col"
        >
          <textarea
            style={{
              border: "solid 2px rgb(59, 89, 152)",
              flexGrow: 1,
              maxWidth: "900px",
              height: "100px"
            }}
            className="p-2 rounded resize-none"
            placeholder="Type here template to create..."
            aria-rowspan={5}
            value={description}
            onInput={(e) => setDescription(e.currentTarget.value)}
          />
          <div className="flex flex-col w-min">
            <label>Tag:</label>
            <input
              className="shadow appearance-none border rounded w-[200px] py-2 px-3 text-grey-darker"
              type="text"
              id="firstName"
              value={label}
              onChange={(e) => setLabel(e.currentTarget.value)}
            />
          </div>

          <div className="w-full flex items-end">
            <button
              type="submit"
              className="text-white bg-primary py-2 px-8 rounded disabled:cursor-not-allowed"
              disabled={
                createTagMutation.isLoading || createTextTemplate.isLoading
              }
              // onClick={handleSendText}
            >
              Add template
            </button>
          </div>
        </form>
      </section>
    </>
  )
}

export default TextPage
