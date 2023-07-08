enum FormError {
  NO_ERROR = "",

  CREDS = "Wrong email address and/or password.",
  EMPTY_EMAIL = "Email address cannot be empty.",
  EMPTY_COMPANY_NAME = "Company name cannot be empty.",
  EMPTY_FIRSTNAME = "First name cannot be empty.",
  EMPTY_SECONDNAME = "Surname cannot be empty.",
  EMPTY_PASSWORD = "Password cannot be empty."
}

export { FormError }
