import { isNil, SeekPage } from '@activepieces/core-utils';
import {
  UserInvitation,
  UserStatus,
  UserWithMetaInformation,
} from '@activepieces/shared';
import { useQueryClient } from '@tanstack/react-query';
import { t } from 'i18next';
import { Gem, Mail, User } from 'lucide-react';
import { useState } from 'react';

import {
  AdminDataTable,
  AdminPage,
  AdminPageHeader,
  AdminSection,
  adminPageResources,
} from '@/app/components/admin';
import { UserRoundPlusIcon } from '@/components/icons/user-round-plus';
import { Button } from '@/components/ui/button';
import { internalErrorToast } from '@/components/ui/sonner';
import { useSeatLimitGuard } from '@/features/billing';
import { InviteUserDialog } from '@/features/members';
import {
  INVITATIONS_PAGINATION_KEY,
  platformUserHooks,
  platformUserKeys,
  platformUserMutations,
} from '@/features/platform-admin/hooks/platform-user-hooks';
import { AdminControl, adminControl } from '@/lib/admin-control';

import { UserActions } from './actions/user-actions';
import {
  createInvitationsTableColumns,
  createUsersTableColumns,
} from './columns';

export type UserRowData =
  | {
      id: string;
      type: 'user';
      data: UserWithMetaInformation;
    }
  | {
      id: string;
      type: 'invitation';
      data: UserInvitation;
    };

export default function UsersPage() {
  const [inviteOpen, setInviteOpen] = useState(false);
  const { isOutOfSeats, handleSeatLimitError, seatLimitDialog } =
    useSeatLimitGuard();

  const queryClient = useQueryClient();
  const usersQuery = platformUserHooks.useUsersPage();
  const invitationsQuery = platformUserHooks.useInvitationsPage();

  const refetch = () => {
    queryClient.invalidateQueries({ queryKey: platformUserKeys.users });
    queryClient.invalidateQueries({ queryKey: platformUserKeys.invitations });
  };

  const usersPage: SeekPage<UserRowData> | undefined = usersQuery.data && {
    ...usersQuery.data,
    data: usersQuery.data.data.map((user) => ({
      id: user.id,
      type: 'user' as const,
      data: user,
    })),
  };
  const invitationsPage: SeekPage<UserRowData> | undefined =
    invitationsQuery.data && {
      ...invitationsQuery.data,
      data: invitationsQuery.data.data.map((invitation) => ({
        id: invitation.id,
        type: 'invitation' as const,
        data: invitation,
      })),
    };

  const hasInvitations =
    invitationsQuery.isError ||
    (invitationsQuery.data?.data.length ?? 0) > 0 ||
    !isNil(invitationsQuery.data?.previous);

  const { mutate: deleteUser } = platformUserMutations.useDeleteUser({
    onSuccess: refetch,
  });

  const { mutate: deleteInvitation } =
    platformUserMutations.useDeleteInvitation({ onSuccess: refetch });

  const { mutate: updateUserStatus, isPending: isUpdatingStatus } =
    platformUserMutations.useUpdateUserStatus({
      onSuccess: refetch,
      onError: (error) => {
        if (!handleSeatLimitError(error)) {
          internalErrorToast();
        }
      },
    });

  const handleDelete = (id: string, isInvitation: boolean) => {
    if (isInvitation) {
      deleteInvitation(id);
    } else {
      deleteUser(id);
    }
  };

  const handleToggleStatus = (userId: string, currentStatus: UserStatus) => {
    updateUserStatus({
      userId,
      status:
        currentStatus === UserStatus.ACTIVE
          ? UserStatus.INACTIVE
          : UserStatus.ACTIVE,
    });
  };

  const userActions = [
    (row: UserRowData) => (
      <UserActions
        row={row}
        isUpdatingStatus={isUpdatingStatus}
        onDelete={handleDelete}
        onToggleStatus={handleToggleStatus}
        onUpdate={refetch}
      />
    ),
  ];

  return (
    <AdminPage>
      <AdminPageHeader
        title={t('Users')}
        description={t(
          'Manage, delete, activate and deactivate users on platform',
        )}
        resources={adminPageResources.users}
      >
        <Button
          {...adminControl(AdminControl.USERS_INVITE_OPEN)}
          onClick={() => setInviteOpen(true)}
        >
          {isOutOfSeats ? (
            <Gem className="text-on-accent/90" />
          ) : (
            <UserRoundPlusIcon size={16} />
          )}
          {t('Invite')}
        </Button>
      </AdminPageHeader>
      {hasInvitations && (
        <AdminSection title={t('Pending invitations')}>
          <AdminDataTable
            paginationKey={INVITATIONS_PAGINATION_KEY}
            emptyStateTextTitle={t('No pending invitations')}
            emptyStateTextDescription={t(
              'Start inviting users to your project',
            )}
            emptyStateIcon={<Mail />}
            columns={createInvitationsTableColumns()}
            page={invitationsPage}
            isLoading={invitationsQuery.isLoading}
            isError={invitationsQuery.isError}
            errorStateEntity={t('invitations')}
            onRetry={refetch}
            actions={userActions}
          />
        </AdminSection>
      )}
      <AdminSection title={hasInvitations ? t('Users') : undefined}>
        <AdminDataTable
          emptyStateTextTitle={t('No users found')}
          emptyStateTextDescription={t('Start inviting users to your project')}
          emptyStateIcon={<User />}
          columns={createUsersTableColumns()}
          page={usersPage}
          isLoading={usersQuery.isLoading}
          isError={usersQuery.isError}
          errorStateEntity={t('users')}
          onRetry={refetch}
          actions={userActions}
        />
      </AdminSection>
      <InviteUserDialog
        open={inviteOpen}
        setOpen={setInviteOpen}
        onInviteSuccess={refetch}
      />
      {seatLimitDialog}
    </AdminPage>
  );
}
