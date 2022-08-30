import { User } from "@prisma/client";

export const removeSensitiveUserData = (user: User) => {
  const { password, permissions, ...userFiltered } = user;
  return userFiltered;
};

export const authCheckUser = (isAuth: boolean, error: string) => {
  if (!isAuth) {
    throw Error(error);
  }
};

export const authCheckerPermissions = (
  isAuth: boolean,
  id: string,
  error: string,
  requiredPermission: string
) => {};
