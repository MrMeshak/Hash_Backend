import { User } from '@prisma/client';
import prisma from '../utils/prismaClient';

export function removeSensitiveUserData(user: User) {
  const { password, permissions, ...userFiltered } = user;
  return { ...userFiltered, email: '' };
}

export function authCheckUser(isAuth: boolean, error: string) {
  if (!isAuth) {
    throw Error(error);
  }
}

export function authCheckPermissions(isAuth: boolean, permissions: string, requiredPermissions: String, error: string) {
  if (!isAuth) {
    throw Error(error);
  }
  if (permissions !== requiredPermissions) {
    throw Error('Unauthorized - User does not have required permissions');
  }
}

export function authCheckCurrentUser(isAuth: boolean, userId: string, currentUserId: string, error: string) {
  if (!isAuth) {
    throw Error(error);
  }
  if (userId !== currentUserId) {
    throw Error('Unauthorized - User does not have required permissions');
  }
}

export function authCheckCurrentUserOrHasPermissions(isAuth: boolean, userId: string, currentUserId: string, permissions: string, requiredPermissions: string, error: string) {
  if (!isAuth) {
    throw Error(error);
  }
  if (!(userId === currentUserId || permissions === requiredPermissions)) {
    throw Error('Unauthorised - User does not have required permissions');
  }
}

export function authCheckUserIsAuthor(authorId: string, userId: string) {
  if (authorId !== userId) {
    throw Error('Unauthorised - User does not have required permissions');
  }
}
