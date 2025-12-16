"use client";

import * as React from "react";
import { type SystemMenu } from "@/db/schema";
import { type DataTableRowAction } from "@/types/table";
import { type ColumnDef } from "@tanstack/react-table";
import { ChevronRight, Ellipsis } from "lucide-react";

import { formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header";
import { RenderIcon } from "@/components/icons";
import { Badge } from "@/components/ui/badge";
import { getMenuTypeContent } from "../_lib/utils";
import { toast } from "sonner";
import { updateSystemMenu } from "../_lib/actions";
import { getErrorMessage } from "@/lib/handle-error";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface GetColumnsProps {
  setRowAction: React.Dispatch<
    React.SetStateAction<DataTableRowAction<SystemMenu> | null>
  >;
  multiple: boolean;
}

export function getColumns({
  setRowAction,
  multiple,
}: GetColumnsProps): ColumnDef<SystemMenu>[] {
  return [
    {
      id: "title",
      accessorKey: "title",
      header: ({ column, table }) => (
        <div className="flex items-center gap-2">
          {multiple && (
            <Checkbox
              checked={
                table.getIsAllPageRowsSelected() ||
                (table.getIsSomePageRowsSelected() && "indeterminate")
              }
              onCheckedChange={(value) =>
                table.toggleAllPageRowsSelected(!!value)
              }
              aria-label="Select all"
              className="mx-1"
            />
          )}
          <button
            {...{
              onClick: table.getToggleAllRowsExpandedHandler(),
            }}
            className="p-1 rounded transition-transform duration-200 
						  focus:outline-none focus:ring-2 focus:ring-blue-500 "
            aria-label="Toggle expand"
          >
            <ChevronRight
              className={`w-4 h-4 transition-transform duration-200 ${
                table.getIsAllRowsExpanded() ? "rotate-90" : ""
              }`}
            />
          </button>
          <DataTableColumnHeader column={column} title="title" />
        </div>
      ),
      cell: ({ row }) => (
        <div
          style={{
            paddingLeft: `${row.depth * 2}rem`,
          }}
        >
          <div className="flex items-center gap-2">
            {multiple && (
              <Checkbox
                checked={
                  row.getIsSelected() ||
                  (row.getIsSomeSelected() && "indeterminate")
                }
                onCheckedChange={(value) => row.toggleSelected(!!value)}
                aria-label="Select row"
                className="mx-1"
              />
            )}
            {row.getCanExpand() ? (
              <button
                onClick={row.getToggleExpandedHandler()}
                className="p-1 rounded transition-transform duration-200 
								  focus:outline-none focus:ring-2 focus:ring-blue-500 "
                aria-label="Toggle expand"
              >
                <ChevronRight
                  className={`w-4 h-4 transition-transform duration-200 ${
                    row.getIsExpanded() ? "rotate-90" : ""
                  }`}
                />
              </button>
            ) : (
              <span className=""></span> // 空白占位符
            )}
            <Button
              onClick={() => setRowAction({ row, type: "select" })}
              variant="link"
              className="pl-0"
            >
              {RenderIcon(row.original.icon as string | undefined)}
              <span>{row.original.title}</span>
            </Button>
          </div>
        </div>
      ),
      footer: (props) => props.column.id,
    },
    {
      accessorKey: "url",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="URL" />
      ),
      cell: ({ row }) => {
        const urlValue = row.getValue("url") as string;
        return (
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="w-40 truncate cursor-pointer">{urlValue}</div>
            </TooltipTrigger>
            <TooltipContent className="border bg-accent font-semibold text-foreground dark:bg-zinc-900 max-w-xs">
              <p>{urlValue}</p>
            </TooltipContent>
          </Tooltip>
        );
      },
    },
    {
      accessorKey: "menuType",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Type" />
      ),
      cell: ({ row }) => (
        <Badge variant="outline">
          {getMenuTypeContent(row.getValue("menuType")).text}
        </Badge>
      ),
    },
    {
      accessorKey: "isActive",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="默认打开" />
      ),
      cell: ({ row }) => (
        <Badge variant="outline">
          {row.getValue("isActive") ? "Yes" : "No"}
        </Badge>
      ),
    },
    {
      accessorKey: "shortcut",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="快捷键" />
      ),
      cell: ({ row }) => (
        <>
          <div className="flex flex-wrap gap-2">
            {row.original.shortcut?.map((value: string, index: number) => (
              <Badge
                key={index}
                variant="outline"
                className="flex items-center gap-1 px-3 py-2"
              >
                {value}
              </Badge>
            ))}
          </div>
        </>
      ),
    },
    {
      accessorKey: "menuSort",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Sort" />
      ),
      cell: ({ row }) => <div className="w-20">{row.getValue("menuSort")}</div>,
    },
    {
      accessorKey: "createdAt",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Created At" />
      ),
      cell: ({ cell }) => formatDate(cell.getValue() as Date),
    },
    {
      id: "actions",
      cell: function Cell({ row }) {
        const [isUpdatePending, startUpdateTransition] = React.useTransition();
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                aria-label="Open menu"
                variant="ghost"
                className="flex size-8 p-0 data-[state=open]:bg-muted"
              >
                <Ellipsis className="size-4" aria-hidden="true" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40">
              <DropdownMenuItem
                onSelect={() => setRowAction({ row, type: "update" })}
              >
                Edit
              </DropdownMenuItem>
              <DropdownMenuSub>
                <DropdownMenuSubTrigger>是否默认打开</DropdownMenuSubTrigger>
                <DropdownMenuSubContent>
                  <DropdownMenuRadioGroup
                    value={row.original.isActive.toString()}
                    onValueChange={(value) => {
                      startUpdateTransition(() => {
                        toast.promise(
                          updateSystemMenu({
                            id: row.original.id,
                            isActive: value === "true", // 使用确保为布尔类型的值
                          }),
                          {
                            loading: "Updating...",
                            success: "Label updated",
                            error: (err) => getErrorMessage(err),
                          }
                        );
                      });
                    }}
                  >
                    <DropdownMenuRadioItem
                      key="true"
                      value="true"
                      className="capitalize"
                      disabled={isUpdatePending}
                    >
                      Yes
                    </DropdownMenuRadioItem>
                    <DropdownMenuRadioItem
                      key="false"
                      value="false"
                      className="capitalize"
                      disabled={isUpdatePending}
                    >
                      No
                    </DropdownMenuRadioItem>
                  </DropdownMenuRadioGroup>
                </DropdownMenuSubContent>
              </DropdownMenuSub>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onSelect={() => setRowAction({ row, type: "delete" })}
              >
                Delete
                <DropdownMenuShortcut>⌘⌫</DropdownMenuShortcut>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
      size: 40,
    },
  ];
}
