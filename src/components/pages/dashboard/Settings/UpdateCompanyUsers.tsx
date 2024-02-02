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

  const companyUsers = useUserControllerGetUsers(
    {},
    {
      query: {
        staleTime: Infinity,
        enabled: false,
        retry: 0,
        queryKey: getUserControllerGetUsersQueryKey(),
        gcTime: Infinity,
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

  React.useEffect(() => {
    setUsers(
      initialCompanyUsers.map(({ email, id, Roles }) => ({
        id,
        email: email,
        password: undefined,
        action: "initial",
        role: Roles && Roles?.length > 0 ? Roles[0] : "User",
      })),
    );
  }, [initialCompanyUsers]);

  const handleInputChange = (
    index: number,
    field: "email" | "password" | "role",
    value: any,
  ) => {
    if (errorMessage.length !== 0) {
      setErrorMessage([]);
    }
    // Update the corresponding field for the user
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
    } catch (error) {
      if (error instanceof AxiosError) {
        setErrorMessage([
          error.response?.data.message ?? "Something went wrong",
        ]);
      }
    }

    const companyUsersRefetch = await companyUsers.refetch({});

    if (companyUsersRefetch.data) {
      setCompanyUsers(companyUsersRefetch.data);
    }

    setDeletedUsers([]);
  };

  if (userSession.status === "loading") return null;

  return (
    <div className="mt-4 flex w-full flex-col gap-4">
      <label className="font-extrabold text-gray-400">Company Users</label>
      {users?.map((user, index) => (
        <CompanyUserItem
          onChange={handleInputChange}
          key={`user-${index}`}
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
      <button
        onClick={() => {
          setUsers([
            ...users,
            {
              email: "",
              password: "",
              action: "add",
              id: `user-${users.length + 1}`,
              role: "User",
            },
          ]);
        }}
      >
        <PlusIcon width="15px" />
      </button>
      {errorMessage.map((msg, index) => (
        <p className="text-xs text-danger" key={index}>
          {msg}
        </p>
      ))}
      <div className="w-full">
        <Button
          onClick={() => {
            handleSubmit().finally(() => setIsLoading(false));
          }}
          type="submit"
          className="w-full rounded-xl  bg-primary p-2 text-white"
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
          className="border-2"
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
          className="border-2"
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
            onChange={(e) => {
              onChange(index, "role", e.currentTarget.value);
            }}
            defaultValue={user.role}
          >
            {Object.keys(GetUserResRolesItem).map((role) =>
              role === "Admin" ? (
                <option value={role} label={"Admin"} />
              ) : (
                <option
                  value={role}
                  label={role === "User" ? "Guest" : "User"}
                />
              ),
            )}
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
