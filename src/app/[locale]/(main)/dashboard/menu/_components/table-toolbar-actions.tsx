"use client"

import { type SystemMenu } from "@/db/schema"
import { type Table } from "@tanstack/react-table"
import { Download, Plus } from "lucide-react"

import { exportTableToCSV } from "@/lib/export"
import { Button } from "@/components/ui/button"

import { DeleteSystemMenusDialog } from "./delete-systemMenu-dialog";
import { DataTableRowAction } from "@/types/table"

interface SystemMenuTableToolbarActionsProps {
	table: Table<SystemMenu>;
	setRowAction: React.Dispatch<
		React.SetStateAction<DataTableRowAction<SystemMenu> | null>
			>;
}

export function SystemMenuTableToolbarActions({
	table,
	setRowAction,
}: SystemMenuTableToolbarActionsProps) {
	return (
    <div className="flex items-center gap-2">
      <Button size="sm" onClick={() => setRowAction({ type: "create" })}>
        <Plus className="mr-2 h-4 w-4" /> Add New
      </Button>
      {table.getFilteredSelectedRowModel().flatRows.length > 0 ? (
        <DeleteSystemMenusDialog
          rows={table
            .getFilteredSelectedRowModel()
            .flatRows.map((row) => row.original)}
          onSuccess={() => table.toggleAllRowsSelected(false)}
        />
      ) : null}
      <Button
        variant="outline"
        size="sm"
        onClick={() =>
          exportTableToCSV(table, {
            filename: "systemMenus",
            excludeColumns: ["select", "actions"],
          })
        }
        className="gap-2"
      >
        <Download className="size-4" aria-hidden="true" />
        Export
      </Button>
    </div>
  );
}
