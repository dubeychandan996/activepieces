import { StuckJob } from '@activepieces/shared';
import { ColumnDef } from '@tanstack/react-table';
import { t } from 'i18next';
import { CircleCheck, TriangleAlert } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import { SettingsPanel } from '@/app/components/admin';
import { DataTable, RowDataWithActions } from '@/components/custom/data-table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { formatUtils } from '@/lib/format-utils';

type StuckJobRow = StuckJob & { id: string };

type StuckJobsTableProps = {
  stuckJobs: StuckJob[] | undefined;
  isLoading: boolean;
};

const columns: ColumnDef<RowDataWithActions<StuckJobRow>>[] = [
  {
    accessorKey: 'flowName',
    header: () => t('Flow'),
    cell: ({ row }) => (
      <span className="font-medium">{row.original.flowName}</span>
    ),
  },
  {
    accessorKey: 'projectName',
    header: () => t('Project'),
    cell: ({ row }) => (
      <span className="text-gray-11">{row.original.projectName}</span>
    ),
  },
  {
    accessorKey: 'status',
    header: () => t('Status'),
    cell: ({ row }) => (
      <Badge variant="outline">
        {formatUtils.convertEnumToHumanReadable(row.original.status)}
      </Badge>
    ),
  },
];

export function StuckJobsTable({ stuckJobs, isLoading }: StuckJobsTableProps) {
  const navigate = useNavigate();
  const jobs: StuckJobRow[] = (stuckJobs ?? []).map((job) => ({
    ...job,
    id: job.flowRunId,
  }));

  return (
    <SettingsPanel
      title={t('Stuck jobs')}
      action={
        jobs.length > 0 ? (
          <Badge variant="destructive" className="gap-1">
            <TriangleAlert className="size-3" />
            {t('{count} stuck', { count: jobs.length })}
          </Badge>
        ) : undefined
      }
    >
      {isLoading ? (
        <Skeleton className="h-24 w-full" />
      ) : jobs.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 py-8 text-gray-11">
          <CircleCheck className="size-8 text-success-11" />
          <p className="text-sm">{t('No stuck jobs')}</p>
        </div>
      ) : (
        <DataTable
          hideFooterWhenSinglePage
          columns={columns}
          page={{ data: jobs, next: null, previous: null }}
          isLoading={false}
          isError={false}
          errorStateEntity={t('stuck jobs')}
          emptyStateTextTitle={t('No stuck jobs')}
          emptyStateTextDescription=""
          emptyStateIcon={<CircleCheck />}
          getRowId={(job) => job.id}
          onRowClick={(job) =>
            navigate(`/projects/${job.projectId}/runs/${job.flowRunId}`)
          }
          clientPagination={true}
          paginationKey="stuckJobs"
        />
      )}
    </SettingsPanel>
  );
}
