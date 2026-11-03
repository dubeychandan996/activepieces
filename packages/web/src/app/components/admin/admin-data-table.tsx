import {
  DataTable,
  DataTableProps,
  DataWithId,
} from '@/components/custom/data-table';

import { adminSurface } from './admin-surface';

export function AdminDataTable<
  TData extends DataWithId,
  TValue,
  Keys extends string,
>(
  props: Omit<
    DataTableProps<TData, TValue, Keys>,
    'bordered' | 'frameClassName' | 'toolbarClassName'
  >,
) {
  return (
    <div data-slot="admin-data-table" className="shrink-0">
      <DataTable
        hideFooterWhenSinglePage
        {...props}
        emptyStateIcon={
          props.emptyStateIcon && (
            <span className="flex size-10 items-center justify-center rounded-lg bg-gray-3 text-gray-11 [&_svg]:size-5">
              {props.emptyStateIcon}
            </span>
          )
        }
        bordered
        frameClassName={adminSurface.listFrame}
        toolbarClassName="px-0 pt-0 pb-4"
      />
    </div>
  );
}
