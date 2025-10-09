"use client";

import * as React from "react";
import { type SystemMenu } from "@/db/schema";
import type { DataTableRowAction } from "@/types/table";
import { useDataTable } from "@/hooks/use-data-table";
import { DataTable } from "@/components/data-table/data-table";
import type { SystemMenuWithChildren } from "../_lib/queries";
import { getColumns } from "./table-columns";
import { DataTableAdvancedToolbar } from "@/components/data-table/data-table-advanced-toolbar";
import { getExpandedRowModel } from "@tanstack/react-table";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { MenuTableFilterFields } from "./menu-table";

interface SelectTableProps extends React.ComponentPropsWithRef<typeof Sheet> {
  data: SystemMenu[];
  pageCount: number;
  onRowSelect?: (row: SystemMenu) => void;
}

export function SelectTableSheet({
  data,
  pageCount,
  onRowSelect,
  ...props
}: SelectTableProps) {
  const [rowAction, setRowAction] =
    React.useState<DataTableRowAction<SystemMenu> | null>(null);
  const { onOpenChange } = props;

  const columns = React.useMemo(
    () => getColumns({ setRowAction, multiple: false }),
    [setRowAction]
  );

  const { table } = useDataTable({
    data,
    columns: columns.filter((col) => col.id == "title"),
    pageCount,
    enableAdvancedFilter: true,
    initialState: {
      sorting: [{ id: "createdAt", desc: true }],
      columnPinning: { right: ["actions"], left: ["title"] },
    },
    getRowId: (originalRow) => originalRow.id,
    shallow: false,
    clearOnDefault: true,
    getSubRows: (originalRow) =>
      (originalRow as SystemMenuWithChildren).children,
    getExpandedRowModel: getExpandedRowModel(),
    getRowCanExpand: (row) =>
      !!(row.original as SystemMenuWithChildren).children?.length,
  });

  React.useEffect(() => {
    if (onRowSelect && rowAction?.row) {
      console.log("Row action changed:", rowAction);
      // 在这里触发你的方法
      onRowSelect(rowAction.row.original);
      onOpenChange?.(false);
    }
  }, [rowAction, onRowSelect, onOpenChange]);

  return (
    <Sheet {...props}>
      <SheetContent className="flex flex-col w-full gap-2 sm:max-w-xl overflow-auto">
        <SheetHeader className="text-left">
          <SheetTitle>Select a record to referenc it</SheetTitle>
        </SheetHeader>
        <DataTable
          className="h-[calc(100vh-48px)]"
          table={table}
          enablePaging={false}
        >
          <DataTableAdvancedToolbar
            table={table}
            filterFields={MenuTableFilterFields}
            shallow={false}
          >
            <Button
              aria-label="Go to previous page"
              variant="outline"
              size="icon"
              className="size-8"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
            >
              <ChevronLeft className="size-4" aria-hidden="true" />
            </Button>
            <Button
              aria-label="Go to next page"
              variant="outline"
              size="icon"
              className="size-8"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
            >
              <ChevronRight className="size-4" aria-hidden="true" />
            </Button>
          </DataTableAdvancedToolbar>
        </DataTable>
      </SheetContent>
    </Sheet>
  );
}
