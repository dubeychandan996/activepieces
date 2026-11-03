import {
  PROJECT_COLOR_PALETTE,
  Project,
  ProjectType,
} from '@activepieces/shared';
import { ColumnDef } from '@tanstack/react-table';
import { t } from 'i18next';
import { FolderOpen, Search } from 'lucide-react';
import { useState } from 'react';

import { DataTable, RowDataWithActions } from '@/components/custom/data-table';
import { InputWithIcon } from '@/components/custom/input-with-icon';
import { Checkbox } from '@/components/ui/checkbox';

import { SelectedOnlyButton } from '../components/selected-only-button';

export function ProjectSelectionPanel({
  projects,
  selectedIds,
  onChange,
}: {
  projects: Project[];
  selectedIds: string[];
  onChange: (projectIds: string[]) => void;
}) {
  const [search, setSearch] = useState('');
  const [showSelectedOnly, setShowSelectedOnly] = useState(false);

  const filtered = projects
    .filter((project) =>
      project.displayName.toLowerCase().includes(search.trim().toLowerCase()),
    )
    .filter((project) => !showSelectedOnly || selectedIds.includes(project.id));

  const toggleProject = (projectId: string) => {
    onChange(
      selectedIds.includes(projectId)
        ? selectedIds.filter((id) => id !== projectId)
        : [...selectedIds, projectId],
    );
  };
  const togglePageRows = (pageRows: Project[]) => {
    const rowIds = pageRows.map((project) => project.id);
    onChange(
      allSelected(pageRows)
        ? selectedIds.filter((id) => !rowIds.includes(id))
        : [...new Set([...selectedIds, ...rowIds])],
    );
  };
  const allSelected = (pageRows: Project[]) =>
    pageRows.length > 0 &&
    pageRows.every((project) => selectedIds.includes(project.id));

  const columns: ColumnDef<RowDataWithActions<Project>>[] = [
    {
      accessorKey: 'name',
      header: ({ table }) => {
        const pageRows = table.getRowModel().rows.map((row) => row.original);
        return (
          <div className="flex items-center gap-2.5">
            <Checkbox
              checked={allSelected(pageRows)}
              onCheckedChange={() => togglePageRows(pageRows)}
            />
            <span>{t('Project')}</span>
          </div>
        );
      },
      cell: ({ row }) => (
        <div className="flex items-center gap-2.5">
          <Checkbox
            checked={selectedIds.includes(row.original.id)}
            className="pointer-events-none"
          />
          <ProjectSwatch project={row.original} />
          <span className="text-sm font-medium">
            {row.original.displayName}
          </span>
          {row.original.type === ProjectType.PERSONAL && (
            <span className="rounded-full bg-gray-3 px-1.5 py-px text-xs text-gray-11">
              {t('Personal')}
            </span>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="flex flex-col overflow-hidden rounded-xl border border-gray-6/60">
      <div className="flex flex-wrap items-center gap-2 p-3">
        <InputWithIcon
          icon={<Search className="size-4 shrink-0 text-gray-11" />}
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder={t('Search {count} projects', { count: projects.length })}
          className="max-w-xs grow-0"
        />
        <SelectedOnlyButton
          pressed={showSelectedOnly}
          onToggle={() => setShowSelectedOnly(!showSelectedOnly)}
        />
      </div>
      <div className="border-t border-gray-6/60 [&_tbody_tr:last-child]:border-b-0 [&_thead]:border-t-0">
        <DataTable
          hideFooterWhenSinglePage
          columns={columns}
          page={{ data: filtered, next: null, previous: null }}
          isLoading={false}
          isError={false}
          errorStateEntity={t('projects')}
          clientPagination={true}
          paginationKey="projectSelection"
          getRowId={(project) => project.id}
          onRowClick={(row) => toggleProject(row.id)}
          emptyStateTextTitle={t('No projects found')}
          emptyStateTextDescription={
            showSelectedOnly
              ? t('No project is selected yet.')
              : t('No project matches your search.')
          }
          emptyStateIcon={<FolderOpen className="size-10 text-gray-11" />}
        />
      </div>
    </div>
  );
}

export function ProjectSwatch({ project }: { project: Project }) {
  const palette = project.icon?.color
    ? PROJECT_COLOR_PALETTE[project.icon.color]
    : undefined;
  return (
    <span
      className="flex size-5 shrink-0 items-center justify-center rounded-md bg-gray-3 text-xs font-medium"
      style={
        palette
          ? { backgroundColor: palette.color, color: palette.textColor }
          : undefined
      }
    >
      {project.displayName.charAt(0).toUpperCase()}
    </span>
  );
}
