import {
  WorkerGroupFlowAssignment,
  WorkerGroupProjectAssignment,
  WorkerGroupsOverview,
} from '@activepieces/shared';
import { ColumnDef } from '@tanstack/react-table';
import { t } from 'i18next';
import { FolderOpen, Workflow } from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

import { AdminDataTable, StatusDot } from '@/app/components/admin';
import {
  getPaginationQueryParams,
  readPaginationFromSearchParams,
  RowDataWithActions,
} from '@/components/custom/data-table';
import { TextWithTooltip } from '@/components/custom/text-with-tooltip';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';

import { MoveItem, groupUtils, useMover, workerGroupsQueries } from './hooks';
import {
  FlowBadge,
  Hint,
  OffBadge,
  ProjectBadge,
  SearchBox,
  SelectionBar,
  WorkerGroupSelect,
} from './parts';
import { RunLimitButton } from './run-limit';

export const WORKER_GROUP_PROJECTS_PAGINATION_KEY = 'projects';
export const WORKER_GROUP_FLOWS_PAGINATION_KEY = 'flows';
export const PROJECT_FLOWS_PAGINATION_KEY = 'projectFlows';

export function ProjectsTable({
  overview,
  label,
  search,
  onSearchChange,
  onOpenFlows,
  emptyText,
  showRunLimit,
  showRemove = false,
}: {
  overview: WorkerGroupsOverview | undefined;
  label: string | null;
  search: string;
  onSearchChange: (value: string) => void;
  onOpenFlows: (project: WorkerGroupProjectAssignment) => void;
  emptyText: string;
  showRunLimit: boolean;
  showRemove?: boolean;
}) {
  const [searchParams] = useSearchParams();
  const { cursor, limit } = readPaginationFromSearchParams(
    searchParams,
    WORKER_GROUP_PROJECTS_PAGINATION_KEY,
  );
  const selection = useSelection('project');
  const query = workerGroupsQueries.useProjects({
    params: {
      ...groupUtils.projectListParams(label),
      search: search || undefined,
      cursor,
      limit,
    },
  });
  const page = query.data;
  const topRef = useScrollTopOnPage(page?.offset);
  const rows = page?.data ?? [];
  const groupSummary = groupUtils.find({
    overview,
    label,
    scope: 'project',
  });
  const allColumns: ColumnDef<
    RowDataWithActions<WorkerGroupProjectAssignment>
  >[] = [
    {
      id: 'select',
      size: 48,
      header: () => (
        <PageCheckbox
          selection={selection}
          rows={rows.map(projectSelectable)}
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={selection.has(row.original.id)}
          onCheckedChange={() =>
            selection.toggle(projectSelectable(row.original))
          }
          aria-label={t('Select {name}', { name: row.original.displayName })}
        />
      ),
    },
    {
      id: 'project',
      header: () => t('Project'),
      cell: ({ row }) => (
        <span className="flex min-w-0 items-center gap-3">
          <ProjectBadge
            name={row.original.displayName}
            color={row.original.color}
            size="lg"
          />
          <span className="flex min-w-0 flex-col">
            <TextWithTooltip tooltipMessage={row.original.displayName}>
              <span className="font-medium text-gray-12">
                {row.original.displayName}
              </span>
            </TextWithTooltip>
            <PinnedFlowsLine overview={overview} project={row.original} />
          </span>
        </span>
      ),
    },
    {
      id: 'flows',
      size: 64,
      header: () => t('Flows'),
      cell: ({ row }) => (
        <span className="tabular-nums text-gray-11">
          {row.original.flowCount}
        </span>
      ),
    },
    {
      id: 'workerGroup',
      size: 224,
      header: () => t('Worker group'),
      cell: ({ row }) => (
        <ProjectGroupPicker
          project={row.original}
          overview={overview}
          onMoved={() => selection.drop(row.original.id)}
        />
      ),
    },
    {
      id: 'runLimit',
      size: 192,
      header: () => (
        <Hint
          text={t(
            'The most runs of one project at the same time. Flows with their own group are not limited by it. Extra runs wait their turn.',
          )}
        >
          <span>{t('Concurrency limit')}</span>
        </Hint>
      ),
      cell: ({ row }) => <RunLimitButton project={row.original} />,
    },

    {
      id: 'rowActions',
      size: showRemove ? 224 : 144,
      header: () => null,
      cell: ({ row }) => (
        <ProjectActions
          project={row.original}
          showRemove={showRemove}
          onOpenFlows={onOpenFlows}
          onMoved={() => selection.drop(row.original.id)}
        />
      ),
    },
  ];
  const columns = allColumns.filter(
    (column) => showRunLimit || column.id !== 'runLimit',
  );
  return (
    <div ref={topRef} className="flex scroll-mt-4 flex-col gap-3">
      <SearchBox
        value={search}
        onChange={onSearchChange}
        placeholder={t('Search projects')}
      />
      <AdminDataTable
        columns={columns}
        page={page}
        isLoading={query.isLoading}
        isError={query.isError}
        onRetry={() => query.refetch()}
        errorStateEntity={t('projects')}
        emptyStateTextTitle={
          search ? t('No projects match your search.') : emptyText
        }
        emptyStateTextDescription=""
        emptyStateIcon={<FolderOpen />}
        getRowClassName={() => ROW_CLASS_NAME}
        paginationKey={WORKER_GROUP_PROJECTS_PAGINATION_KEY}
      />
      <SelectionBar
        items={selection.items}
        kind="project"
        overview={overview}
        onDone={selection.clear}
        selectAll={
          groupSummary && !search && page && page.total > rows.length
            ? {
                total: page.total,
                group: groupSummary,
                active: selection.all,
                onToggle: selection.selectAll,
              }
            : undefined
        }
      />
    </div>
  );
}

export function FlowsTable({
  overview,
  group,
  projectId,
  emptyText,
  paginationKey,
  scrollBody = false,
  footerAction,
  showRemove = false,
}: {
  overview: WorkerGroupsOverview | undefined;
  group?: string;
  projectId?: string;
  emptyText: string;
  paginationKey: string;
  scrollBody?: boolean;
  footerAction?: React.ReactNode;
  showRemove?: boolean;
}) {
  const [search, setSearch] = useState('');
  const [searchParams, setSearchParams] = useSearchParams();
  const { cursor, limit } = readPaginationFromSearchParams(
    searchParams,
    paginationKey,
  );
  const selection = useSelection('flow');
  const query = workerGroupsQueries.useFlows({
    params: { group, projectId, search: search || undefined, cursor, limit },
  });
  const page = query.data;
  const showProject = projectId === undefined;
  const rows = page?.data ?? [];
  const groupSummary = groupUtils.find({
    overview,
    label: group ?? null,
    scope: 'flow',
  });
  const allColumns: ColumnDef<RowDataWithActions<WorkerGroupFlowAssignment>>[] =
    [
      {
        id: 'select',
        size: 48,
        header: () => (
          <PageCheckbox selection={selection} rows={rows.map(flowSelectable)} />
        ),
        cell: ({ row }) => (
          <Checkbox
            checked={selection.has(row.original.id)}
            onCheckedChange={() =>
              selection.toggle(flowSelectable(row.original))
            }
            aria-label={t('Select {name}', { name: row.original.displayName })}
          />
        ),
      },
      {
        id: 'flow',
        header: () => t('Flow'),
        cell: ({ row }) => (
          <span className="flex min-w-0 items-center gap-3">
            <span className="shrink-0">
              <FlowBadge size="lg" />
            </span>
            <span className="flex min-w-0 items-center gap-2">
              <TextWithTooltip tooltipMessage={row.original.displayName}>
                <span
                  className={cn(
                    'font-medium',
                    row.original.enabled ? 'text-gray-12' : 'text-gray-10',
                  )}
                >
                  {row.original.displayName}
                </span>
              </TextWithTooltip>
              {!row.original.enabled && <OffBadge />}
            </span>
          </span>
        ),
      },
      {
        id: 'project',
        size: 224,
        header: () => t('Project'),
        cell: ({ row }) => (
          <span className="flex min-w-0 items-center gap-3 text-gray-11">
            <ProjectBadge
              name={row.original.projectName}
              color={row.original.projectColor}
              size="lg"
            />
            <span className="flex min-w-0 flex-col">
              <TextWithTooltip tooltipMessage={row.original.projectName}>
                <span>{row.original.projectName}</span>
              </TextWithTooltip>
            </span>
          </span>
        ),
      },

      {
        id: 'workerGroup',
        size: scrollBody ? 288 : 224,
        header: () => t('Worker group'),
        cell: ({ row }) => (
          <FlowGroupPicker
            flow={row.original}
            overview={overview}
            onMoved={() => selection.drop(row.original.id)}
          />
        ),
      },
      {
        id: 'rowActions',
        size: 112,
        header: () => null,
        cell: ({ row }) => (
          <FlowRemoveButton
            flow={row.original}
            onMoved={() => selection.drop(row.original.id)}
          />
        ),
      },
    ];
  const columns = allColumns.filter(
    (column) =>
      (showProject || column.id !== 'project') &&
      (showRemove || column.id !== 'rowActions'),
  );
  return (
    <div className={cn('flex flex-col gap-3', scrollBody && 'min-h-0 flex-1')}>
      <SearchBox
        value={search}
        onChange={(value) => {
          setSearch(value);
          const names = getPaginationQueryParams(paginationKey);
          setSearchParams(
            (prev) => {
              const next = new URLSearchParams(prev);
              next.delete(names.cursor);
              return next;
            },
            { replace: true },
          );
        }}
        placeholder={t('Search flows')}
      />
      <div className={cn(scrollBody && 'min-h-0 flex-1 overflow-y-auto')}>
        <AdminDataTable
          columns={columns}
          page={page}
          isLoading={query.isLoading}
          isError={query.isError}
          onRetry={() => query.refetch()}
          errorStateEntity={t('flows')}
          emptyStateTextTitle={
            search ? t('No flows match your search.') : emptyText
          }
          emptyStateTextDescription=""
          emptyStateIcon={<Workflow />}
          getRowClassName={() => ROW_CLASS_NAME}
          paginationKey={paginationKey}
        />
      </div>
      {footerAction && (
        <div className="flex items-center justify-end gap-4">
          {footerAction}
        </div>
      )}
      <SelectionBar
        items={selection.items}
        kind="flow"
        overview={overview}
        inline={scrollBody}
        onDone={selection.clear}
        selectAll={
          groupSummary && !search && page && page.total > rows.length
            ? {
                total: page.total,
                group: groupSummary,
                active: selection.all,
                onToggle: selection.selectAll,
              }
            : undefined
        }
      />
    </div>
  );
}

function ProjectGroupPicker({
  project,
  overview,
  onMoved,
}: {
  project: WorkerGroupProjectAssignment;
  overview: WorkerGroupsOverview | undefined;
  onMoved: () => void;
}) {
  const moveTo = useMoveTo({
    item: { kind: 'project', id: project.id, from: project.workerGroupId },
    onMoved,
  });
  return (
    <WorkerGroupSelect
      kind="project"
      value={project.workerGroupId}
      overview={overview}
      subject={project.displayName}
      detail={projectDetail(project)}
      onChange={moveTo}
    />
  );
}

function ProjectActions({
  project,
  showRemove,
  onOpenFlows,
  onMoved,
}: {
  project: WorkerGroupProjectAssignment;
  showRemove: boolean;
  onOpenFlows: (project: WorkerGroupProjectAssignment) => void;
  onMoved: () => void;
}) {
  const moveTo = useMoveTo({
    item: { kind: 'project', id: project.id, from: project.workerGroupId },
    onMoved,
  });
  return (
    <span className="flex items-center justify-end gap-2">
      <Button
        variant="outline"
        size="sm"
        disabled={project.flowCount === 0}
        onClick={() => onOpenFlows(project)}
      >
        {t('View flows')}
      </Button>
      {showRemove && project.workerGroupId !== null && (
        <Button variant="ghost" size="sm" onClick={() => moveTo(null)}>
          {t('Remove')}
        </Button>
      )}
    </span>
  );
}

function FlowGroupPicker({
  flow,
  overview,
  onMoved,
}: {
  flow: WorkerGroupFlowAssignment;
  overview: WorkerGroupsOverview | undefined;
  onMoved: () => void;
}) {
  const moveTo = useMoveTo({
    item: { kind: 'flow', id: flow.id, from: flow.workerGroupId },
    onMoved,
  });
  return (
    <WorkerGroupSelect
      kind="flow"
      value={flow.workerGroupId}
      inherited={flow.inherited}
      overview={overview}
      subject={flow.displayName}
      align="end"
      onChange={moveTo}
    />
  );
}

function FlowRemoveButton({
  flow,
  onMoved,
}: {
  flow: WorkerGroupFlowAssignment;
  onMoved: () => void;
}) {
  const moveTo = useMoveTo({
    item: { kind: 'flow', id: flow.id, from: flow.workerGroupId },
    onMoved,
  });
  if (flow.workerGroupId === null) return null;
  return (
    <span className="flex justify-end">
      <Button variant="ghost" size="sm" onClick={() => moveTo(null)}>
        {t('Remove')}
      </Button>
    </span>
  );
}

function useMoveTo({ item, onMoved }: { item: MoveItem; onMoved: () => void }) {
  const { move } = useMover();
  return (to: string | null) => {
    move({ items: [item], to })
      .then((moved) => moved && onMoved())
      .catch(() => undefined);
  };
}

function projectSelectable(row: WorkerGroupProjectAssignment): SelectableRow {
  return {
    id: row.id,
    from: row.workerGroupId,
    flows: row.flowCount - row.flowsElsewhere,
  };
}

function flowSelectable(row: WorkerGroupFlowAssignment): SelectableRow {
  return { id: row.id, from: row.workerGroupId };
}

function PageCheckbox({
  selection,
  rows,
}: {
  selection: Selection;
  rows: SelectableRow[];
}) {
  const selectedOnPage = rows.filter((r) => selection.has(r.id)).length;
  const state =
    rows.length > 0 && selectedOnPage === rows.length
      ? true
      : selectedOnPage > 0
      ? 'indeterminate'
      : false;
  return (
    <Checkbox
      checked={state}
      disabled={rows.length === 0}
      onCheckedChange={() =>
        state === true ? selection.removePage(rows) : selection.addPage(rows)
      }
      aria-label={t('Select all on this page')}
    />
  );
}

function useSelection(kind: 'project' | 'flow'): Selection {
  const [items, setItems] = useState<MoveItem[]>([]);
  const [all, setAll] = useState(false);
  return {
    items,
    all,
    has: (id) => items.some((i) => i.id === id),
    toggle: ({ id, from, flows }) => {
      setAll(false);
      setItems((prev) =>
        prev.some((i) => i.id === id)
          ? prev.filter((i) => i.id !== id)
          : [...prev, { kind, id, from, flows }],
      );
    },
    addPage: (rows) => {
      setAll(false);
      const ids = new Set(rows.map((r) => r.id));
      setItems((prev) => [
        ...prev.filter((i) => !ids.has(i.id)),
        ...rows.map((r) => ({ kind, id: r.id, from: r.from, flows: r.flows })),
      ]);
    },
    removePage: (rows) => {
      setAll(false);
      const ids = new Set(rows.map((r) => r.id));
      setItems((prev) => prev.filter((i) => !ids.has(i.id)));
    },
    drop: (id) => {
      setAll(false);
      setItems((prev) => prev.filter((i) => i.id !== id));
    },
    selectAll: () => setAll(true),
    clear: () => {
      setAll(false);
      setItems([]);
    },
  };
}

function PinnedFlowsLine({
  overview,
  project,
}: {
  overview: WorkerGroupsOverview | undefined;
  project: WorkerGroupProjectAssignment;
}) {
  if (project.pinnedFlows.length === 0) return null;
  const stuck = project.pinnedFlows.some(
    (p) =>
      groupUtils.find({
        overview,
        label: p.workerGroupId,
        scope: 'flow',
      })?.online === 0,
  );
  const text =
    project.pinnedFlows.length === 1
      ? t(
          '{count, plural, =1 {1 flow runs on {group}} other {# flows run on {group}}}',
          {
            count: project.pinnedFlows[0].count,
            group: groupUtils.name(project.pinnedFlows[0].workerGroupId),
          },
        )
      : t(
          '{count, plural, =1 {1 flow runs on another group} other {# flows run on other groups}}',
          {
            count: project.flowsElsewhere,
          },
        );
  const line = (
    <span className="flex min-w-0 items-center gap-1.5 text-xs text-gray-11">
      {stuck && <StatusDot tone="danger" />}
      <span className="truncate">{text}</span>
    </span>
  );
  if (project.pinnedFlows.length === 1 && !stuck) return line;
  return (
    <Hint
      text={project.pinnedFlows
        .map((p) =>
          groupUtils.find({
            overview,
            label: p.workerGroupId,
            scope: 'flow',
          })?.online === 0
            ? t(
                '{count, plural, =1 {1 flow} other {# flows}} on {group}, which has no workers online',
                {
                  count: p.count,
                  group: groupUtils.name(p.workerGroupId),
                },
              )
            : t('{count, plural, =1 {1 flow} other {# flows}} on {group}', {
                count: p.count,
                group: groupUtils.name(p.workerGroupId),
              }),
        )
        .join(' · ')}
    >
      {line}
    </Hint>
  );
}

function projectDetail(row: WorkerGroupProjectAssignment) {
  const moving = row.flowCount - row.flowsElsewhere;
  return row.flowsElsewhere > 0
    ? t(
        '{count, plural, =1 {1 flow moves} other {# flows move}}; {kept, plural, =1 {1 keeps its own group.} other {# keep their own group.}}',
        {
          count: moving,
          kept: row.flowsElsewhere,
        },
      )
    : t(
        '{count, plural, =1 {Its 1 flow moves too.} other {Its # flows move too.}}',
        { count: moving },
      );
}

const ROW_CLASS_NAME = 'h-14 hover:bg-transparent';

type Selection = {
  items: MoveItem[];
  all: boolean;
  has: (id: string) => boolean;
  toggle: (row: SelectableRow) => void;
  addPage: (rows: SelectableRow[]) => void;
  removePage: (rows: SelectableRow[]) => void;
  drop: (id: string) => void;
  selectAll: () => void;
  clear: () => void;
};

type SelectableRow = { id: string; from: string | null; flows?: number };

function useScrollTopOnPage(offset: number | undefined) {
  const ref = useRef<HTMLDivElement>(null);
  const previous = useRef(offset);
  useEffect(() => {
    if (offset === undefined || previous.current === offset) return;
    const changed = previous.current !== undefined;
    previous.current = offset;
    const el = ref.current;
    if (changed && el && el.getBoundingClientRect().top < 0) {
      el.scrollIntoView({ block: 'start' });
    }
  }, [offset]);
  return ref;
}
