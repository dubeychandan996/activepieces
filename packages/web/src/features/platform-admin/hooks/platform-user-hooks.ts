import { isNil, Permission, SeekPage } from '@activepieces/core-utils';
import {
  InvitationType,
  UpdateUserRequestBody,
  User,
  UserInvitation,
  UserStatus,
  UserWithMetaInformation,
} from '@activepieces/shared';
import { useMutation, useQuery } from '@tanstack/react-query';
import { t } from 'i18next';
import { useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';

import { platformUserApi } from '@/api/platform-user-api';
import { readPaginationFromSearchParams } from '@/components/custom/data-table';
import { userInvitationApi } from '@/features/members/api/user-invitation';
import { useAuthorization } from '@/hooks/authorization-hooks';
import { userHooks } from '@/hooks/user-hooks';

export const INVITATIONS_PAGINATION_KEY = 'invitations';

export const platformUserKeys = {
  users: ['users'] as const,
  invitations: ['platform-invitations'] as const,
  usersPage: (cursor: string | undefined, limit: number) =>
    [...platformUserKeys.users, 'page', cursor, limit] as const,
  invitationsPage: (cursor: string | undefined, limit: number) =>
    [...platformUserKeys.invitations, 'page', cursor, limit] as const,
};

export const platformUserHooks = {
  useUsers: () => {
    const { data: currentUser } = userHooks.useCurrentUser();
    const { checkAccess, isFetchingProjectRole } = useAuthorization();
    const hasInvitePermission = checkAccess(Permission.WRITE_INVITATION);
    const canListUsers =
      !isNil(currentUser) && hasInvitePermission && !isFetchingProjectRole;
    return useQuery<SeekPage<UserWithMetaInformation>, Error>({
      queryKey: platformUserKeys.users,
      queryFn: async () => {
        const results = await platformUserApi.list({
          limit: 2000,
        });
        return results;
      },
      enabled: canListUsers,
    });
  },
  useUsersPage: () => {
    const [searchParams] = useSearchParams();
    const { cursor, limit } = readPaginationFromSearchParams(searchParams);
    return useQuery<SeekPage<UserWithMetaInformation>, Error>({
      queryKey: platformUserKeys.usersPage(cursor, limit),
      queryFn: () => platformUserApi.list({ cursor, limit }),
    });
  },
  useInvitationsPage: () => {
    const [searchParams] = useSearchParams();
    const { cursor, limit } = readPaginationFromSearchParams(
      searchParams,
      INVITATIONS_PAGINATION_KEY,
    );
    return useQuery<SeekPage<UserInvitation>, Error>({
      queryKey: platformUserKeys.invitationsPage(cursor, limit),
      queryFn: () =>
        userInvitationApi.list({
          type: InvitationType.PLATFORM,
          projectId: null,
          cursor,
          limit,
        }),
      staleTime: 0,
    });
  },
  usePlatformInvitations: ({ enabled = true }: { enabled?: boolean } = {}) => {
    return useQuery({
      queryFn: () => {
        return userInvitationApi.listAll({
          type: InvitationType.PLATFORM,
          limit: 100,
          projectId: null,
        });
      },
      queryKey: platformUserKeys.invitations,
      staleTime: 0,
      enabled,
    });
  },
};

export const platformUserMutations = {
  useDeleteUser: ({ onSuccess }: { onSuccess: () => void }) => {
    return useMutation({
      mutationKey: ['delete-user'],
      mutationFn: async (userId: string) => {
        await platformUserApi.delete(userId);
      },
      onSuccess: () => {
        onSuccess();
        toast.success(t('User deleted successfully'), { duration: 3000 });
      },
    });
  },
  useDeleteInvitation: ({ onSuccess }: { onSuccess: () => void }) => {
    return useMutation({
      mutationKey: ['delete-invitation'],
      mutationFn: async (invitationId: string) => {
        await userInvitationApi.delete(invitationId);
      },
      onSuccess: () => {
        onSuccess();
        toast.success(t('Invitation deleted successfully'), { duration: 3000 });
      },
    });
  },
  useUpdateUserStatus: ({
    onSuccess,
    onError,
  }: {
    onSuccess: () => void;
    onError?: (error: Error) => void;
  }) => {
    return useMutation({
      mutationFn: async (data: { userId: string; status: UserStatus }) => {
        await platformUserApi.update(data.userId, { status: data.status });
        return data;
      },
      onSuccess: (data) => {
        onSuccess();
        toast.success(
          data.status === UserStatus.ACTIVE
            ? t('User activated successfully')
            : t('User deactivated successfully'),
          { duration: 3000 },
        );
      },
      onError,
    });
  },
  useUpdateUser: ({
    userId,
    onSuccess,
  }: {
    userId: string;
    onSuccess: (user: User) => void;
  }) => {
    return useMutation<User, Error, UpdateUserRequestBody>({
      mutationKey: ['update-user'],
      mutationFn: (request) => platformUserApi.update(userId, request),
      onSuccess,
    });
  },
};
