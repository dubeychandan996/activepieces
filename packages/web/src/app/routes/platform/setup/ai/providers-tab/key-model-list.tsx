import {
  AIProviderModel,
  AIProviderModelType,
  AIProviderWithoutSensitiveData,
} from '@activepieces/shared';
import { ColumnDef } from '@tanstack/react-table';
import { t } from 'i18next';
import {
  Brain,
  Eye,
  ImageIcon,
  ListChecks,
  LucideIcon,
  Search,
  Wrench,
} from 'lucide-react';
import { useState } from 'react';

import { DataTable, RowDataWithActions } from '@/components/custom/data-table';
import { InputWithIcon } from '@/components/custom/input-with-icon';
import { TextWithTooltip } from '@/components/custom/text-with-tooltip';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ModelCapabilityIcons } from '@/features/agents/ai-model/model-capability-icons';
import { modelMeta } from '@/features/agents/ai-model/model-meta';
import { cn } from '@/lib/utils';

import {
  keyModelFilters,
  ModelCapabilityFilter,
  ModelSort,
} from './key-model-filters';

export function KeyModelList({
  config,
  models,
  staleIds,
  tiersByModel,
  allModels,
  selectedIds,
  isLoading,
  onChange,
}: KeyModelListProps) {
  const [search, setSearch] = useState('');
  const [capabilities, setCapabilities] = useState<ModelCapabilityFilter[]>([]);
  const [sort, setSort] = useState<ModelSort>('newest');
  const [selectedOnly, setSelectedOnly] = useState(false);

  const isOn = (modelId: string) =>
    allModels || selectedIds.includes(modelId) || tiersByModel.has(modelId);
  const filtered = keyModelFilters.apply({
    models,
    search,
    capabilities,
    sort,
    selectedOnly: selectedOnly && !allModels,
    selectedIds,
  });
  const filteredIds = filtered.map((model) => model.id);
  const onCount = allModels
    ? models.length
    : models.filter((model) => isOn(model.id)).length;
  const providerName = modelMeta.providerInfoOf({
    provider: config.provider,
  }).name;

  const isLocked = (modelId: string) => allModels || tiersByModel.has(modelId);
  const toggleModel = (modelId: string) => {
    if (isLocked(modelId)) {
      return;
    }
    onChange(
      selectedIds.includes(modelId)
        ? selectedIds.filter((id) => id !== modelId)
        : [...selectedIds, modelId],
    );
  };
  const toggleCapability = (capability: ModelCapabilityFilter) => {
    setCapabilities(
      capabilities.includes(capability)
        ? capabilities.filter((current) => current !== capability)
        : [...capabilities, capability],
    );
  };

  const columns: ColumnDef<RowDataWithActions<AIProviderModel>>[] = [
    {
      id: 'toggle',
      size: 44,
      header: () => null,
      // The row click toggles the model, so the checkbox has no handler of its own.
      cell: ({ row }) => (
        <Checkbox
          checked={isOn(row.original.id)}
          disabled={isLocked(row.original.id)}
          aria-label={row.original.name}
        />
      ),
    },
    {
      accessorKey: 'name',
      header: () => t('Model'),
      cell: ({ row }) => (
        <div className="flex min-w-0 items-center gap-1.5">
          <TextWithTooltip tooltipMessage={row.original.name}>
            <span className="truncate text-sm font-medium">
              {row.original.name}
            </span>
          </TextWithTooltip>
          <ModelBadges
            model={row.original}
            stale={staleIds.includes(row.original.id)}
            tierNames={tiersByModel.get(row.original.id)}
          />
        </div>
      ),
    },
    {
      id: 'context',
      size: 90,
      header: () => t('Context'),
      cell: ({ row }) => {
        const tokens = row.original.metadata?.contextTokens;
        return (
          <span className="text-sm tabular-nums">
            {tokens === undefined ? EMPTY : modelMeta.formatContext({ tokens })}
          </span>
        );
      },
    },
    {
      id: 'price',
      size: 140,
      header: () => t('Price per 1M'),
      cell: ({ row }) => {
        const metadata = row.original.metadata;
        if (
          metadata?.inputCostPerMillionTokens === undefined ||
          metadata.outputCostPerMillionTokens === undefined
        ) {
          return <span className="text-sm">{EMPTY}</span>;
        }
        return (
          <span className="text-sm tabular-nums">
            {modelMeta.formatPrice({
              perMillion: metadata.inputCostPerMillionTokens,
            })}
            <span className="text-gray-10"> / </span>
            {modelMeta.formatPrice({
              perMillion: metadata.outputCostPerMillionTokens,
            })}
          </span>
        );
      },
    },
    {
      id: 'capabilities',
      size: 130,
      header: () => t('Capabilities'),
      cell: ({ row }) => (
        <ModelCapabilityIcons
          provider={config.provider}
          metadata={row.original.metadata}
        />
      ),
    },
  ];

  return (
    <div className="flex flex-col overflow-hidden rounded-xl border border-gray-6/60">
      <div className="flex flex-col gap-3 p-3">
        <div className="flex flex-wrap items-center gap-2">
          <InputWithIcon
            icon={<Search className="size-4 shrink-0 text-gray-11" />}
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={t('Search models')}
            className="max-w-xs grow-0"
          />
          <Select
            value={sort}
            onValueChange={(value) => setSort(sortOf(value))}
          >
            <SelectTrigger className="w-40 shrink-0" aria-label={t('Sort')}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SORTS.map((option) => (
                <SelectItem key={option} value={option}>
                  {sortLabel(option)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {CAPABILITY_CHIPS.map(({ capability, icon }) => (
            <FilterCheck
              key={capability}
              icon={icon}
              label={capabilityLabel(capability)}
              checked={capabilities.includes(capability)}
              onCheckedChange={() => toggleCapability(capability)}
            />
          ))}
          {!allModels && (
            <FilterCheck
              icon={ListChecks}
              label={t('Selected only')}
              checked={selectedOnly}
              onCheckedChange={setSelectedOnly}
            />
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-gray-6/60 bg-gray-2 px-4 py-2 text-xs text-gray-11">
        <span className="tabular-nums">
          {isLoading
            ? t('Loading models…')
            : t('{on} of {total} on', { on: onCount, total: models.length })}
        </span>
        {allModels ? (
          <span>
            {t('New models from {provider} are added automatically.', {
              provider: providerName,
            })}
          </span>
        ) : (
          filtered.length > 0 && (
            <span className="flex items-center gap-1">
              <Button
                type="button"
                variant="ghost"
                size="xs"
                onClick={() =>
                  onChange([...new Set([...selectedIds, ...filteredIds])])
                }
              >
                {t('Select all')}
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="xs"
                onClick={() =>
                  onChange(
                    selectedIds.filter((id) => !filteredIds.includes(id)),
                  )
                }
              >
                {t('Clear')}
              </Button>
            </span>
          )
        )}
      </div>

      <div className="border-t border-gray-6/60 [&_tbody_tr:last-child]:border-b-0 [&_thead]:border-t-0">
        <DataTable
          columns={columns}
          page={{ data: filtered, next: null, previous: null }}
          isLoading={isLoading}
          isError={false}
          errorStateEntity={t('models')}
          clientPagination={true}
          paginationKey="keyModels"
          getRowId={(model) => model.id}
          onRowClick={(model) => toggleModel(model.id)}
          getRowClassName={(model) =>
            isLocked(model.id) ? 'cursor-default hover:bg-transparent' : ''
          }
          emptyStateTextTitle={
            models.length === 0
              ? t('No models found')
              : selectedOnly
              ? t('No model is selected yet.')
              : t('No model matches your search.')
          }
          emptyStateTextDescription=""
          emptyStateIcon={null}
        />
      </div>
    </div>
  );
}

function FilterCheck({
  icon: Icon,
  label,
  checked,
  onCheckedChange,
}: {
  icon: LucideIcon;
  label: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}) {
  return (
    <label
      className={cn(
        'inline-flex h-8 cursor-pointer select-none items-center gap-2 rounded-lg border border-gray-6 bg-gray-1 px-2.5 text-xs font-medium text-gray-12 transition-colors hover:bg-gray-2',
        checked && 'border-gray-8 bg-gray-3 hover:bg-gray-3',
      )}
    >
      <Checkbox
        checked={checked}
        onCheckedChange={(value) => onCheckedChange(value === true)}
      />
      <Icon className="size-3.5 text-gray-11" />
      {label}
    </label>
  );
}

function ModelBadges({
  model,
  stale,
  tierNames,
}: {
  model: AIProviderModel;
  stale: boolean;
  tierNames: string[] | undefined;
}) {
  return (
    <>
      {model.id !== model.name && (
        <span className="hidden truncate font-mono text-xs text-gray-10 sm:inline">
          {model.id}
        </span>
      )}
      {model.type === AIProviderModelType.IMAGE && (
        <Badge variant="secondary" className="shrink-0">
          {t('Image')}
        </Badge>
      )}
      {stale && (
        <Badge variant="warning" className="shrink-0">
          {t('Not offered anymore')}
        </Badge>
      )}
      {tierNames !== undefined && (
        <Badge variant="info" className="shrink-0">
          {t('Used by {tiers}', { tiers: tierNames.join(', ') })}
        </Badge>
      )}
    </>
  );
}

function sortOf(value: string): ModelSort {
  return SORTS.find((option) => option === value) ?? 'newest';
}

function sortLabel(sort: ModelSort): string {
  switch (sort) {
    case 'newest':
      return t('Newest');
    case 'cheapest':
      return t('Cheapest');
    case 'context':
      return t('Biggest context');
    case 'name':
      return t('Name');
  }
}

function capabilityLabel(capability: ModelCapabilityFilter): string {
  switch (capability) {
    case 'toolCalling':
      return t('Tool calling');
    case 'reasoning':
      return t('Reasoning');
    case 'vision':
      return t('Vision');
    case 'image':
      return t('Image generation');
  }
}

const EMPTY = '—';

const SORTS: ModelSort[] = ['newest', 'cheapest', 'context', 'name'];

const CAPABILITY_CHIPS: {
  capability: ModelCapabilityFilter;
  icon: LucideIcon;
}[] = [
  { capability: 'toolCalling', icon: Wrench },
  { capability: 'reasoning', icon: Brain },
  { capability: 'vision', icon: Eye },
  { capability: 'image', icon: ImageIcon },
];

type KeyModelListProps = {
  config: AIProviderWithoutSensitiveData;
  models: AIProviderModel[];
  staleIds: string[];
  tiersByModel: Map<string, string[]>;
  allModels: boolean;
  selectedIds: string[];
  isLoading: boolean;
  onChange: (modelIds: string[]) => void;
};
