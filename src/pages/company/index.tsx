import CreateCompanyForm from "../../components/Forms/CreateCompanyForm"
import { usePersistedCompanyStore } from "../../lib/nobstacle-api-client/zustand"

function CompanyPage() {
  const { company } = usePersistedCompanyStore()

  return (
    <div className="p-5">
      {company?.id && <p> Company name: {company.name} </p>}
      {!company?.id && <CreateCompanyForm />}
    </div>
  )
}

export default CompanyPage
