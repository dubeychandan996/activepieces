import { isNil } from '@activepieces/core-utils';
import {
  AI_USAGE_DIMENSIONS,
  AiUsageDimension,
  AiUsageHistory,
  AiUsageItem,
} from '@activepieces/shared';
import { ColumnDef } from '@tanstack/react-table';
import { t } from 'i18next';
import { ArrowDown, ArrowUp, ChevronRight } from 'lucide-react';
import { useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';

import {
  AdminPageHeader,
  adminPageResources,
  adminSurface,
} from '@/app/components/admin';
import { DataFetchErrorState } from '@/components/custom/data-fetch-error-state';
import { DataTable, RowDataWithActions } from '@/components/custom/data-table';
import { SearchInput } from '@/components/custom/search-input';
import { TextWithTooltip } from '@/components/custom/text-with-tooltip';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { aiUsageHooks } from '@/features/ai-usage';
import { useNewWindow } from '@/lib/navigation-utils';
import { cn } from '@/lib/utils';

import { AiCenterTrail } from '../components/ai-center-trail';

import { usageAdapters } from './usage-adapters';
import { DeltaChip, ItemIcon } from './usage-bits';
import { UsageEmpty } from './usage-empty';
import { usageFormat } from './usage-format';
import {
  UsageHeaderControls,
  UsageView,
  useUsageView,
} from './usage-header-controls';
import { UsageListSkeleton } from './usage-skeletons';
import { SharedBadge } from './usage-top-list';

export function UsageListPage() {
  const { dimension: param } = useParams();
  const dimension = AI_USAGE_DIMENSIONS.find((item) => item === param);
  const view = useUsageView();
  const { data, isLoading, isError, refetch } = aiUsageHooks.useUsageItems({
    dimension,
    period: view.period,
    scope: view.scope,
  });
  if (isNil(dimension)) {
    return <Navigate to={`/platform/ai/usage${view.search}`} replace />;
  }
  const itemsUsd = data?.itemsSpendUsd ?? 0;

  return (
    <>
      <AdminPageHeader
        title={
          <AiCenterTrail
            crumbs={[
              { label: t('AI usage'), to: `/platform/ai/usage${view.search}` },
            ]}
            current={usageFormat.dimensionLabel({ dimension })}
          />
        }
        description={
          data && data.count > 0
            ? t('{amount} across {items}', {
                amount: usageFormat.usd(itemsUsd),
                items: usageFormat
                  .itemCountLabel({ dimension, count: data.count })
                  .toLowerCase(),
              })
            : undefined
        }
        resources={adminPageResources.aiUsage}
      >
        <UsageHeaderControls view={view} />
      </AdminPageHeader>
      <UsageListBody
        key={`${dimension}-${view.scope}-${view.period}`}
        view={view}
        dimension={dimension}
        items={data?.items ?? []}
        history={data?.history}
        totalUsd={data?.totalSpendUsd ?? 0}
        truncated={data?.truncated ?? false}
        isLoading={isLoading}
        isError={isError}
        onRetry={refetch}
      />
    </>
  );
}

function UsageListBody({
  view,
  dimension,
  items,
  history,
  totalUsd,
  truncated,
  isLoading,
  isError,
  onRetry,
}: {
  view: UsageView;
  dimension: AiUsageDimension;
  items: AiUsageItem[];
  history: AiUsageHistory | undefined;
  totalUsd: number;
  truncated: boolean;
  isLoading: boolean;
  isError: boolean;
  onRetry: () => unknown;
}) {
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<UsageSort>(DEFAULT_SORT);
  const navigate = useNavigate();
  const openNewWindow = useNewWindow();
  const plural = usageFormat.dimensionLabel({ dimension }).toLowerCase();

  if (isError) {
    return <DataFetchErrorState entity={plural} onRetry={onRetry} />;
  }
  if (isLoading || isNil(history)) {
    return <UsageListSkeleton />;
  }
  if (items.length === 0) {
    return (
      <UsageEmpty
        view={view}
        history={history}
        title={t('No {item} spend in this period', {
          item: usageFormat.dimensionBadge({ dimension }).toLowerCase(),
        })}
      />
    );
  }

  const needle = query.trim().toLowerCase();
  const matches = sortItems({
    items: items.filter((item) => {
      const name = usageAdapters.itemDisplayName({ item }).toLowerCase();
      return (
        needle.length === 0 ||
        name.includes(needle) ||
        (item.parent ?? '').toLowerCase().includes(needle) ||
        usageAdapters.itemSubtitle({ item }).toLowerCase().includes(needle)
      );
    }),
    sort,
  });
  const sortHeader = (label: string, column: UsageSortColumn) => (
    <SortHeader label={label} column={column} sort={sort} onSort={setSort} />
  );
  const columns: ColumnDef<RowDataWithActions<AiUsageItem>>[] = [
    {
      id: 'name',
      header: () =>
        sortHeader(usageFormat.dimensionBadge({ dimension }), 'name'),
      cell: ({ row }) => (
        <UsageItemCell item={row.original} totalUsd={totalUsd} />
      ),
    },
    {
      id: 'change',
      size: 100,
      header: () => sortHeader(t('Change'), 'change'),
      cell: ({ row }) => (
        <div className="flex justify-end">
          {row.original.comparable ? (
            <DeltaChip
              value={usageFormat.change({
                current: row.original.spendUsd,
                previous: row.original.previousSpendUsd,
              })}
              size="xs"
            />
          ) : (
            <span className="text-xs text-gray-9">—</span>
          )}
        </div>
      ),
    },
    {
      id: 'calls',
      size: 100,
      header: () => sortHeader(t('Calls'), 'calls'),
      cell: ({ row }) => (
        <div className="text-right text-sm tabular-nums text-gray-11">
          {usageFormat.whole(row.original.calls)}
        </div>
      ),
    },
    {
      id: 'tokens',
      size: 100,
      header: () => sortHeader(t('Tokens'), 'tokens'),
      cell: ({ row }) => (
        <div className="text-right text-sm tabular-nums text-gray-11">
          {usageFormat.compact(row.original.tokens)}
        </div>
      ),
    },
    {
      id: 'spend',
      size: 110,
      header: () => sortHeader(t('Spend'), 'spend'),
      cell: ({ row }) => (
        <div className="text-right text-sm font-medium tabular-nums text-gray-12">
          {usageFormat.usd(row.original.spendUsd)}
        </div>
      ),
    },
    {
      id: 'open',
      size: 40,
      cell: () => <ChevronRight className="size-4 text-gray-9" />,
    },
  ];

  return (
    <section className={cn(adminSurface.card, 'flex flex-col')}>
      <div className="flex flex-wrap items-center justify-between gap-3 p-3">
        <div className="w-full sm:max-w-xs">
          <SearchInput
            value={query}
            onChange={setQuery}
            placeholder={t('Search {items}', { items: plural })}
          />
        </div>
        <span className="px-1 text-xs tabular-nums text-gray-11">
          {needle.length === 0
            ? usageFormat.itemCountLabel({ dimension, count: items.length })
            : t('{shown} of {total}', {
                shown: usageFormat.whole(matches.length),
                total: usageFormat.itemCountLabel({
                  dimension,
                  count: items.length,
                }),
              })}
        </span>
      </div>
      {truncated && (
        <p className="px-4 pb-3 text-xs text-gray-11">
          {t(
            'Only the top {count} by spend are listed, so search and pages cover these only.',
            { count: items.length },
          )}
        </p>
      )}
      <DataTable
        columns={columns}
        page={{ data: matches, next: null, previous: null }}
        isLoading={false}
        isError={false}
        errorStateEntity={plural}
        emptyStateTextTitle={t('No {items} match "{query}"', {
          items: plural,
          query,
        })}
        emptyStateTextDescription=""
        emptyStateIcon={null}
        emptyStateAction={
          <Button variant="outline" size="sm" onClick={() => setQuery('')}>
            {t('Clear search')}
          </Button>
        }
        getRowId={(item) => item.id}
        onRowClick={(item, newWindow) => {
          const to = `/platform/ai/usage/${item.dimension}/${item.id}${view.search}`;
          if (newWindow) {
            openNewWindow(to);
          } else {
            navigate(to);
          }
        }}
        clientPagination={true}
        paginationKey="usageItems"
      />
    </section>
  );
}

function UsageItemCell({
  item,
  totalUsd,
}: {
  item: AiUsageItem;
  totalUsd: number;
}) {
  const share = totalUsd === 0 ? 0 : item.spendUsd / totalUsd;
  const name = usageAdapters.itemDisplayName({ item });
  return (
    <div className="flex min-w-0 items-center gap-3">
      <span className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-gray-6 bg-gray-1">
        <ItemIcon item={item} />
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex min-w-0 items-center gap-2">
          <TextWithTooltip tooltipMessage={name}>
            <p className="truncate text-sm font-medium text-gray-12">{name}</p>
          </TextWithTooltip>
          {usageAdapters.hasSharedSpend({ item }) && (
            <SharedBadge item={item} />
          )}
        </div>
        <div className="flex min-w-0 items-center gap-2">
          <p className="truncate text-xs text-gray-11">
            {usageAdapters.itemSubtitle({ item })}
          </p>
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="h-1 w-24 shrink-0 overflow-hidden rounded-full bg-gray-3">
                <span
                  className="block h-full rounded-full bg-accent-9"
                  style={{ width: `${Math.max(share * 100, 2)}%` }}
                />
              </span>
            </TooltipTrigger>
            <TooltipContent side="top" sideOffset={6}>
              {t('{share} of all AI spend in this period', {
                share: usageFormat.percent(share),
              })}
            </TooltipContent>
          </Tooltip>
        </div>
      </div>
    </div>
  );
}

function SortHeader({
  label,
  column,
  sort,
  onSort,
  className,
}: {
  label: string;
  column: UsageSortColumn;
  sort: UsageSort;
  onSort: (sort: UsageSort) => void;
  className?: string;
}) {
  const active = sort.column === column;
  const Arrow = sort.desc ? ArrowDown : ArrowUp;
  return (
    <span
      className={cn(
        'flex',
        column === 'name' ? 'justify-start' : 'justify-end',
        className,
      )}
    >
      <button
        type="button"
        onClick={() =>
          onSort({
            column,
            desc: active ? !sort.desc : column !== 'name',
          })
        }
        className={cn(
          'flex cursor-pointer items-center gap-1 rounded-sm transition-colors hover:text-gray-12 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-gray-8/50',
          active && 'font-medium text-gray-12',
        )}
      >
        {label}
        {active && <Arrow className="size-3" />}
      </button>
    </span>
  );
}

function sortItems({
  items,
  sort,
}: {
  items: AiUsageItem[];
  sort: UsageSort;
}): AiUsageItem[] {
  const direction = sort.desc ? -1 : 1;
  return [...items].sort((a, b) =>
    sort.column === 'name'
      ? direction *
        usageAdapters
          .itemDisplayName({ item: a })
          .localeCompare(usageAdapters.itemDisplayName({ item: b }))
      : direction *
        (sortValue({ item: a, column: sort.column }) -
          sortValue({ item: b, column: sort.column })),
  );
}

function sortValue({
  item,
  column,
}: {
  item: AiUsageItem;
  column: UsageSortColumn;
}): number {
  switch (column) {
    case 'name':
    case 'spend':
      return item.spendUsd;
    case 'change':
      return item.comparable
        ? usageFormat.change({
            current: item.spendUsd,
            previous: item.previousSpendUsd,
          }) ?? Number.POSITIVE_INFINITY
        : Number.NEGATIVE_INFINITY;
    case 'calls':
      return item.calls;
    case 'tokens':
      return item.tokens;
  }
}

const DEFAULT_SORT: UsageSort = { column: 'spend', desc: true };

type UsageSortColumn = 'name' | 'spend' | 'change' | 'calls' | 'tokens';
type UsageSort = { column: UsageSortColumn; desc: boolean };
