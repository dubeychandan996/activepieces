import { InternalErrorImpactItem } from '@activepieces/shared';
import { ColumnDef } from '@tanstack/react-table';
import { t } from 'i18next';
import { CircleCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import { SettingsPanel } from '@/app/components/admin';
import { DataTable, RowDataWithActions } from '@/components/custom/data-table';
import { Skeleton } from '@/components/ui/skeleton';
import { formatUtils } from '@/lib/format-utils';

type InternalErrorRow = InternalErrorImpactItem & { id: string };

type InternalErrorsTableProps = {
  internalErrors: InternalErrorImpactItem[] | undefined;
  isLoading: boolean;
};

export function InternalErrorsTable({
  internalErrors,
  isLoading,
}: InternalErrorsTableProps) {
  const navigate = useNavigate();
  const errors: InternalErrorRow[] = (internalErrors ?? []).map((error) => ({
    ...error,
    id: `${error.projectId}-${error.flowId}`,
  }));
  const total = errors.reduce((sum, error) => sum + error.count, 0);

  const columns: ColumnDef<RowDataWithActions<InternalErrorRow>>[] = [
    {
      accessorKey: 'projectName',
      header: () => t('Project'),
      cell: ({ row }) => (
        <span className="text-gray-11">{row.original.projectName}</span>
      ),
    },
    {
      accessorKey: 'flowName',
      header: () => t('Flow'),
      cell: ({ row }) => (
        <span className="font-medium">{row.original.flowName}</span>
      ),
    },
    {
      accessorKey: 'count',
      header: () => <div className="text-right">{t('Errors')}</div>,
      cell: ({ row }) => (
        <div className="text-right tabular-nums">
          {formatUtils.formatNumber(row.original.count)}
        </div>
      ),
    },
    {
      id: 'share',
      header: () => <div className="text-right">{t('Share')}</div>,
      cell: ({ row }) => (
        <div className="text-right tabular-nums text-gray-11">
          {total === 0
            ? '—'
            : `${Math.round((row.original.count / total) * 100)}%`}
        </div>
      ),
    },
  ];

  return (
    <SettingsPanel
      title={t('Internal errors — impact')}
      description={t(
        'Internal errors are failures inside Activepieces itself (engine or worker), not in your flow logic. Grouped by the project and flow they affected.',
      )}
      action={
        total > 0 ? (
          <span className="text-sm text-gray-11">
            {t('{count} errors', { count: total })}
          </span>
        ) : undefined
      }
    >
      {isLoading ? (
        <Skeleton className="h-24 w-full" />
      ) : errors.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 py-8 text-gray-11">
          <CircleCheck className="size-8 text-success-11" />
          <p className="text-sm">{t('No internal errors in this period')}</p>
        </div>
      ) : (
        <DataTable
          columns={columns}
          page={{ data: errors, next: null, previous: null }}
          isLoading={false}
          isError={false}
          errorStateEntity={t('internal errors')}
          emptyStateTextTitle={t('No internal errors in this period')}
          emptyStateTextDescription=""
          emptyStateIcon={<CircleCheck />}
          getRowId={(error) => error.id}
          onRowClick={(error) =>
            navigate(`/projects/${error.projectId}/runs?flowId=${error.flowId}`)
          }
          clientPagination={true}
          paginationKey="internalErrors"
        />
      )}
    </SettingsPanel>
  );
}
