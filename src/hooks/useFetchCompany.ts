import { useEffect } from "react";
import {
  getCompanyControllerGetCompanyQueryKey,
  getUserControllerGetUsersQueryKey,
  useCompanyControllerGetCompany,
  useUserControllerGetUsers,
} from "../lib/client/api";
import useCompanyStore from "../lib/zustand/store/companyStore";
import { useSession } from "next-auth/react";

export const useFetchCompany = () => {
  const user = useSession();

  const company = useCompanyControllerGetCompany({
    query: {
      staleTime: Infinity,
      retry: 0,
      queryKey: getCompanyControllerGetCompanyQueryKey(),
      gcTime: Infinity,
    },
  });

  const companyUsers = useUserControllerGetUsers(
    {},
    {
      query: {
        staleTime: Infinity,
        enabled: user.data?.user.Roles?.includes("Admin"),
        retry: 0,
        queryKey: getUserControllerGetUsersQueryKey(),
        gcTime: Infinity,
      },
    },
  );

  const { setCompany, setCompanyUsers } = useCompanyStore();

  useEffect(() => {
    if (company.isSuccess) {
      if (company.data) {
        setCompany(company.data);
      }
    }
  }, [company.isSuccess, company.isRefetching]);

  useEffect(() => {
    if (companyUsers.isSuccess) {
      if (companyUsers.data) {
        setCompanyUsers(companyUsers.data);
      }
    }
  }, [companyUsers.isSuccess, companyUsers.isRefetching]);
};
