import { ProjectRole } from '@activepieces/core-utils';
import { ProjectMemberWithUser } from '@activepieces/shared';
import { ColumnDef } from '@tanstack/react-table';
import { t } from 'i18next';
import { ArrowUpRight, Folder, Mail, User, Users } from 'lucide-react';
import { Link } from 'react-router-dom';

import { DataTable, RowDataWithActions } from '@/components/custom/data-table';
import { DataTableColumnHeader } from '@/components/custom/data-table/data-table-column-header';
import { TextWithTooltip } from '@/components/custom/text-with-tooltip';
import { UserAvatar } from '@/components/custom/user-avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  PROJECT_ROLE_MEMBERS_PAGINATION_KEY,
  projectRoleQueries,
} from '@/features/platform-admin';

export function RolePeopleTab({ projectRole }: RolePeopleTabProps) {
  const { data, isLoading, isError, refetch } =
    projectRoleQueries.useProjectRoleMembers(projectRole.id, true);

  return (
    <ScrollArea className="h-full">
      <div className="px-6 pt-4 pb-4">
        <DataTable
          hideFooterWhenSinglePage
          columns={peopleColumns}
          page={data}
          isLoading={isLoading}
          isError={isError}
          onRetry={refetch}
          errorStateEntity={t('people')}
          emptyStateTextTitle={t('Nobody has this role yet')}
          emptyStateTextDescription={t(
            'People get it when they are added to a project with this role.',
          )}
          emptyStateIcon={<Users className="size-10" />}
          paginationKey={PROJECT_ROLE_MEMBERS_PAGINATION_KEY}
        />
      </div>
    </ScrollArea>
  );
}

const peopleColumns: ColumnDef<RowDataWithActions<ProjectMemberWithUser>>[] = [
  {
    accessorKey: 'user',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title={t('Name')} icon={User} />
    ),
    cell: ({ row }) => {
      const { user } = row.original;
      const fullName = `${user.firstName} ${user.lastName}`.trim();
      return (
        <span className="flex min-w-0 items-center gap-2">
          <UserAvatar
            name={fullName}
            email={user.email}
            imageUrl={user.imageUrl}
            size={24}
            disableTooltip
          />
          <TextWithTooltip tooltipMessage={fullName}>
            <span className="min-w-0 truncate text-sm">{fullName}</span>
          </TextWithTooltip>
        </span>
      );
    },
  },
  {
    accessorKey: 'email',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title={t('Email')} icon={Mail} />
    ),
    cell: ({ row }) => (
      <TextWithTooltip tooltipMessage={row.original.user.email}>
        <span className="block min-w-0 truncate text-sm text-gray-11">
          {row.original.user.email}
        </span>
      </TextWithTooltip>
    ),
  },
  {
    accessorKey: 'project',
    header: ({ column }) => (
      <DataTableColumnHeader
        column={column}
        title={t('Project')}
        icon={Folder}
      />
    ),
    cell: ({ row }) => (
      <Link
        to={`/projects/${row.original.project.id}/settings/team`}
        onClick={(e) => e.stopPropagation()}
        className="flex min-w-0 items-center gap-1 text-sm text-accent-11 underline-offset-4 hover:underline"
      >
        <TextWithTooltip tooltipMessage={row.original.project.displayName}>
          <span className="min-w-0 truncate">
            {row.original.project.displayName}
          </span>
        </TextWithTooltip>
        <ArrowUpRight className="size-3.5 shrink-0" />
      </Link>
    ),
  },
];

type RolePeopleTabProps = {
  projectRole: ProjectRole;
};
