import * as React from "react";
import useCompanyStore from "../../../../lib/zustand/store/companyStore";
import { PlusIcon } from "../../../icons/PlusIcon";
import { Button } from "../../../Button";
import {
  getUserControllerGetUsersQueryKey,
  useUserControllerCreateCompanyUser,
  useUserControllerDeleteUserAccount,
  useUserControllerGetUsers,
  useUserControllerPatchOne,
} from "../../../../lib/client/api";
import { GetUserResRolesItem } from "../../../../lib/client/model";
import { useSession } from "next-auth/react";
import { AxiosError } from "axios";

export const UpdateCompanyUsers: React.FC = () => {
  const userPatchOne = useUserControllerPatchOne();
  const userDeleteOne = useUserControllerDeleteUserAccount();
  const userCreate = useUserControllerCreateCompanyUser();
  const userSession = useSession();

  const { companyUsers: initialCompanyUsers, setCompanyUsers } =
    useCompanyStore();

  // Pagination state
  const [currentPage, setCurrentPage] = React.useState(1);
  const [pageSize] = React.useState(10);
  const [totalPages, setTotalPages] = React.useState(0);
  const [totalUsers, setTotalUsers] = React.useState(0);


  const companyUsers = useUserControllerGetUsers(
    {
      take: pageSize,
      skip: (currentPage - 1) * pageSize,
    },
    {
      query: {
        staleTime: 5 * 60 * 1000,
        enabled: true,
        retry: 1,
        queryKey: getUserControllerGetUsersQueryKey({
          take: pageSize,
          skip: (currentPage - 1) * pageSize,
        }),
        gcTime: 10 * 60 * 1000,
      },
    },
  );


  const [isLoading, setIsLoading] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string[]>([]);
  const [users, setUsers] = React.useState<
    {
      id: number | string;
      email: string | null;
      password?: string;
      role: GetUserResRolesItem;
      action: "initial" | "initial-updated" | "add";
    }[]
  >([]);

  const [deletedUsers, setDeletedUsers] = React.useState<number[]>([]);

  // Update pagination info when data changes
  React.useEffect(() => {
    if (companyUsers.data) {
      const { users: fetchedUsers, totalCount } = companyUsers.data;
      setTotalUsers(totalCount);
      setTotalPages(Math.ceil(totalCount / pageSize));

      // Update users state with fetched data
      setUsers(
        fetchedUsers.map(({ email, id, Roles }) => ({
          id,
          email: email,
          password: undefined,
          action: "initial" as const,
          role: Roles && Roles?.length > 0 ? Roles[0] : "User",
        })),
      );
    }
  }, [companyUsers.data, pageSize]);

  React.useEffect(() => {
    if (initialCompanyUsers.length > 0) {
      setUsers(
        initialCompanyUsers.map(({ email, id, Roles }) => ({
          id,
          email: email,
          password: undefined,
          action: "initial",
          role: Roles && Roles?.length > 0 ? Roles[0] : "User",
        })),
      );
    }
  }, [initialCompanyUsers]);

  const handleInputChange = (
    index: number,
    field: "email" | "password" | "role",
    value: any,
  ) => {
    if (errorMessage.length !== 0) {
      setErrorMessage([]);
    }
    const updatedUsers = [...users];
    updatedUsers[index][field] = value;

    if (updatedUsers[index].action === "initial") {
      updatedUsers[index]["action"] = "initial-updated";
    }

    setUsers(updatedUsers);
  };

  const handleOnDelete = (index: number) => {
    const shallowUsers = [...users];
    const deleteUser = shallowUsers[index];

    if (
      deleteUser.action === "initial-updated" ||
      deleteUser.action === "initial"
    ) {
      setDeletedUsers([...deletedUsers, deleteUser.id as number]);
    }

    shallowUsers.splice(index, 1);
    setUsers(shallowUsers);
  };

  const handleSubmit = async () => {
    const shallowUsers = [...users];
    const updateUsers = shallowUsers.filter(
      ({ action }) => action === "initial-updated",
    );
    const addUsers = shallowUsers.filter(
      ({ action, email, password }) =>
        action === "add" && Boolean(email) && Boolean(password),
    );
    const deleteUsers = [...deletedUsers];

    setIsLoading(true);
    try {
      await Promise.all([
        ...updateUsers.map(({ id, email, password, role }) =>
          userPatchOne.mutateAsync({
            id: id as number,
            data: {
              email: email,
              password: password && password?.length > 0 ? password : undefined,
              Roles: role,
            },
          }),
        ),
        ...addUsers.map(({ email, password, role }) =>
          userCreate.mutateAsync({
            data: {
              password: password!,
              email: email ?? "",
              Roles: role,
            },
          }),
        ),
        ...deleteUsers.map((id) => userDeleteOne.mutateAsync({ id })),
      ]);

      // Refetch current page data
      const companyUsersRefetch = await companyUsers.refetch();

      if (companyUsersRefetch.data) {
        const { users: fetchedUsers } = companyUsersRefetch.data;
        setUsers(
          fetchedUsers.map(({ email, id, Roles }) => ({
            id,
            email: email,
            password: undefined,
            action: "initial" as const,
            role: Roles && Roles?.length > 0 ? Roles[0] : "User",
          })),
        );
      }

      setDeletedUsers([]);
      setErrorMessage([]);
    } catch (error) {
      if (error instanceof AxiosError) {
        setErrorMessage([
          error.response?.data.message ?? "Something went wrong",
        ]);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleAddUser = () => {
    setUsers([
      ...users,
      {
        email: "",
        password: "",
        action: "add",
        id: `user-${Date.now()}`,
        role: "User",
      },
    ]);
  };

  if (userSession.status === "loading") return null;

  return (
    <div className="mt-4 flex w-full flex-col gap-4">
      <div className="flex justify-between items-center">
        <label className="font-extrabold text-gray-400">Company Users</label>
        <div className="text-sm text-gray-500">
          Total: {totalUsers} users
        </div>
      </div>

      {companyUsers.isLoading && (
        <div className="text-center py-4">Loading users...</div>
      )}

      {companyUsers.error && (
        <div className="text-red-500 text-sm">
          Error loading users: {companyUsers.error.message}
        </div>
      )}

      {users?.map((user, index) => (
        <CompanyUserItem
          onChange={handleInputChange}
          key={`user-${user.id}`}
          user={{
            id: user.id,
            email: user.email,
            password: user.password,
            role: user.role,
            isMe: userSession.data?.user.id === user.id,
          }}
          index={index}
          onDelete={handleOnDelete}
        />
      ))}

      <button onClick={handleAddUser}>
        <PlusIcon width="15px" />
      </button>

      {errorMessage.map((msg, index) => (
        <p className="text-xs text-red-500" key={index}>
          {msg}
        </p>
      ))}

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-2 py-4">
          <Button
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className="px-3 py-1 text-sm"
          >
            Previous
          </Button>

          <div className="flex gap-1">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
              <Button
                key={page}
                onClick={() => handlePageChange(page)}
                className={`px-3 py-1 text-sm ${currentPage === page
                    ? 'bg-primary text-white'
                    : 'bg-gray-200 text-gray-700'
                  }`}
              >
                {page}
              </Button>
            ))}
          </div>

          <Button
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="px-3 py-1 text-sm"
          >
            Next
          </Button>
        </div>
      )}

      <div className="w-full">
        <Button
          onClick={handleSubmit}
          type="submit"
          className="w-full rounded-xl bg-primary p-2 text-white"
          isLoading={isLoading}
          disabled={isLoading}
        >
          Save
        </Button>
      </div>
    </div>
  );
};

const CompanyUserItem: React.FC<{
  user: {
    id: number | string;
    email: string | null;
    password?: string;
    role: GetUserResRolesItem;
    isMe: boolean;
  };
  index: number;
  onChange: (
    index: number,
    field: "email" | "password" | "role",
    value: string,
  ) => void;
  onDelete: (index: number) => void;
}> = ({ user, index, onChange, onDelete }) => {
  return (
    <div className="flex w-full items-start gap-1">
      <div>
        <input
          className="border-2 px-2 py-1 rounded"
          type="email"
          onChange={(e) => {
            onChange(index, "email", e.currentTarget.value);
          }}
          value={user.email ?? ""}
          required
        />
      </div>
      <div>
        <input
          className="border-2 px-2 py-1 rounded"
          placeholder="password..."
          onChange={(e) => {
            onChange(index, "password", e.currentTarget.value);
          }}
          type="password"
        />
      </div>
      {!user.isMe && (
        <div>
          <select
            className="border-2 px-2 py-1 rounded"
            onChange={(e) => {
              onChange(index, "role", e.currentTarget.value);
            }}
            defaultValue={user.role}
          >
            {Object.keys(GetUserResRolesItem).map((role) => (
              <option
                key={role}
                value={role}
                label={role === "Admin" ? "Admin" : role === "User" ? "Guest" : "User"}
              />
            ))}
          </select>
        </div>
      )}
      {!user.isMe && (
        <button onClick={() => onDelete(index)} type="button">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
            className="h-6 w-6"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0"
            />
          </svg>
        </button>
      )}
    </div>
  );
};