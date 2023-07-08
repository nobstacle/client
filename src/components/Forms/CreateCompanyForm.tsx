import { useState } from "react"
import { FormError } from "../../constants/Forms"
import { useCompanyControllerCreateCompany } from "../../lib/nobstacle-api-client/react-query/company/company"

const CreateCompanyForm: React.FC = () => {
  const createCompany = useCompanyControllerCreateCompany()
  const [formError, setFormError] = useState("")
  const [formInputs, setFormInputs] = useState<{
    name: string
  }>({
    name: ""
  })
  const handleSubmit = () => {
    createCompany.mutate(
      {
        data: {
          name: formInputs.name
        }
      },
      {
        onSuccess: (company) => {
          window.location.href = "/"
        }
      }
    )
  }

  return (
    <form
      className="px-16 py-12"
      onSubmit={(e) => {
        e.preventDefault()
        handleSubmit()
        // props.onSubmit(formInputs)
      }}
    >
      <div className="mb-4">
        <label className="block mb-2" htmlFor="email">
          Company Name:
        </label>

        <input
          className="shadow appearance-none border rounded w-full py-2 px-3 text-grey-darker"
          type="text"
          id="companyName"
          value={formInputs.name}
          onChange={(e) =>
            setFormInputs({ ...formInputs, name: e.currentTarget.value })
          }
          onInput={(e) => {
            if (e.currentTarget.value.length === 0) {
              setFormError(FormError.EMPTY_COMPANY_NAME)
            } else {
              setFormError(FormError.NO_ERROR)
            }
          }}
        />
      </div>

      {formError && (
        <p className="mt-6 mb-2 p-4 rounded bg-red-500 text-white">
          {formError}
        </p>
      )}

      <div className="mt-6 flex flex-row-reverse">
        <button
          className="bg-primary hover:bg-primary-dark disabled:(bg-gray-300 hover:bg-gray-300 cursor-not-allowed) text-white font-bold py-2 px-4 rounded"
          type="submit"
          disabled={!!formError || createCompany.isLoading}
        >
          Create
        </button>
      </div>
    </form>
  )
}

export default CreateCompanyForm
