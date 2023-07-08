import { useState } from "react"
import { FormError } from "../../constants/Forms"

const SignUpPage: React.FC = () => {
  const [formError, setFormError] = useState("")
  const [formInputs, setFormInputs] = useState<{
    email: string
    firstName: string
    lastName: string
    password: string
  }>({
    email: "",
    firstName: "",
    lastName: "",
    password: ""
  })

  return (
    <form
      className="px-16 py-12"
      onSubmit={(e) => {
        e.preventDefault()

        // props.onSubmit(formInputs)
      }}
    >
      <div className="mb-4">
        <label className="block mb-2" htmlFor="email">
          Email Address:
        </label>

        <input
          className="shadow appearance-none border rounded w-full py-2 px-3 text-grey-darker"
          type="email"
          id="email"
          value={formInputs.email}
          onChange={(e) =>
            setFormInputs({ ...formInputs, email: e.currentTarget.value })
          }
          onInput={(e) => {
            if (e.currentTarget.value.length === 0) {
              setFormError(FormError.EMPTY_EMAIL)
            } else {
              setFormError(FormError.NO_ERROR)
            }
          }}
        />
      </div>

      <div className="mb-4">
        <label className="block mb-2" htmlFor="email">
          First Name:
        </label>

        <input
          className="shadow appearance-none border rounded w-full py-2 px-3 text-grey-darker"
          type="text"
          id="firstName"
          value={formInputs.firstName}
          onChange={(e) =>
            setFormInputs({ ...formInputs, firstName: e.currentTarget.value })
          }
          onInput={(e) => {
            if (e.currentTarget.value.length === 0) {
              setFormError(FormError.EMPTY_EMAIL)
            } else {
              setFormError(FormError.NO_ERROR)
            }
          }}
        />
      </div>

      <div className="mb-4">
        <label className="block mb-2" htmlFor="email">
          Last Name:
        </label>

        <input
          className="shadow appearance-none border rounded w-full py-2 px-3 text-grey-darker"
          type="text"
          id="lastName"
          value={formInputs.lastName}
          onChange={(e) =>
            setFormInputs({ ...formInputs, lastName: e.currentTarget.value })
          }
          onInput={(e) => {
            if (e.currentTarget.value.length === 0) {
              setFormError(FormError.EMPTY_EMAIL)
            } else {
              setFormError(FormError.NO_ERROR)
            }
          }}
        />
      </div>

      <div className="mb-4">
        <label className="block mb-2" htmlFor="password">
          Password:
        </label>

        <input
          className="shadow appearance-none border rounded w-full py-2 px-3 text-grey-darker"
          type="password"
          id="password"
          value={formInputs.password}
          onChange={(e) =>
            setFormInputs({ ...formInputs, password: e.currentTarget.value })
          }
          onInput={(e) => {
            if (e.currentTarget.value.length === 0) {
              setFormError(FormError.EMPTY_PASSWORD)
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
          disabled={!!formError}
        >
          Login
        </button>
      </div>
    </form>
  )
}

export default SignUpPage
