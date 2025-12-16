"use client";

import * as React from "react";
import { systemMenu, type SystemMenu } from "@/db/schema";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader } from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { createSystemMenu } from "../_lib/actions";
import { createSchema, type CreateDataSchema } from "../_lib/validations";
import { Input } from "@/components/ui/input";
import { Icons, RenderIcon } from "@/components/icons";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@radix-ui/react-scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getMenuTypeContent } from "../_lib/utils";
import { Switch } from "@/components/ui/switch";
import { SelectTableSheet } from "./menu-select-table";
import { DataTableRowAction } from "@/types/table";
import { ShortcutField } from "@/components/shortcuts-field";

interface CreateSheetProps extends React.ComponentPropsWithRef<typeof Sheet> {
  datas: {
    data: SystemMenu[];
    pageCount: number;
  } | null;
}

export function CreateSheet({ datas, ...props }: CreateSheetProps) {
  const [isPending, startTransition] = React.useTransition();
  const [searchTerm, setSearchTerm] = React.useState<string>("");
  const [rowAction, setRowAction] =
    React.useState<DataTableRowAction<SystemMenu> | null>(null);

  const form = useForm<CreateDataSchema>({
    resolver: zodResolver(createSchema),
    defaultValues: {
      icon: "",
      url: "",
      menuSort: 0,
      menuType: systemMenu.menuType.enumValues[0],
      isActive: false,
      shortcut: [],
      parentId: "",
    },
  });

  function onSubmit(input: CreateDataSchema) {
    startTransition(async () => {
      const { error } = await createSystemMenu({
        ...input,
      });

      console.log("error", error);

      if (error) {
        toast.error(error);
        return;
      }

      form.reset();
      props.onOpenChange?.(false);
      toast.success("Menu created");
    });
  }

  const filteredIcons = Object.keys(Icons).filter((iconKey) =>
    iconKey.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <Sheet {...props}>
      <SheetContent className="flex flex-col w-full gap-6 sm:max-w-md overflow-auto">
        <SheetHeader className="text-left">
          <SheetTitle>Create SystemMenu</SheetTitle>
          <SheetDescription>
            Create the systemMenu details and save the changes
          </SheetDescription>
        </SheetHeader>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="flex flex-col gap-4"
          >
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="输入标题"
                      className="resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="url"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Url</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="输入地址"
                      className="resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="menuType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>菜单类型</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a menu type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {systemMenu.menuType.enumValues.map(
                        (enumValue, index) => (
                          <SelectItem key={index} value={enumValue}>
                            {getMenuTypeContent(enumValue).text}
                          </SelectItem>
                        )
                      )}
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    You can manage the menu type
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="menuSort"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>序号</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      placeholder="序号"
                      value={field.value} // 受控输入
                      onChange={(e) => field.onChange(Number(e.target.value))} // 转换为数字
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              name="shortcut"
              render={({ field }) => (
                <ShortcutField value={field.value} onChange={field.onChange} />
              )}
            />
            <FormField
              name="parentId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>父级</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="父级id"
                      value={field.value} // 受控输入
                      readOnly
                      onClick={() => {
                        setRowAction({ type: "select" });
                      }}
                      className="cursor-pointer"
                    />
                  </FormControl>
                  <SelectTableSheet
                    open={rowAction?.type === "select"}
                    onOpenChange={() => setRowAction(null)}
                    data={datas?.data || []}
                    pageCount={datas?.pageCount || 0}
                    onRowSelect={(selectedRow) => {
                      field.onChange(selectedRow?.id);
                    }}
                  />
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="icon"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>图标</FormLabel>
                  <FormControl>
                    <Popover modal>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className="flex items-center gap-2"
                        >
                          {field.value ? (
                            RenderIcon(field.value)
                          ) : (
                            <span>Select Icon</span>
                          )}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="flex flex-col p-2 gap-2 relative overflow-hidden">
                        {/* Search input */}
                        <Input
                          placeholder="Search icons..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="mb-2"
                        />

                        {/* Scrollable area */}
                        <ScrollArea className="h-48 max-h-[200px] w-full overflow-y-auto">
                          <div className="grid grid-cols-4 gap-2">
                            {filteredIcons.length === 0 ? (
                              <span>No icons found</span>
                            ) : (
                              filteredIcons.map((iconKey) => (
                                <div
                                  key={iconKey}
                                  onClick={() => {
                                    field.onChange(iconKey);
                                  }}
                                  className={`flex items-center justify-center p-2 cursor-pointer rounded-md ${
                                    field.value === iconKey
                                      ? "dark:bg-white dark:bg-opacity-10 dark:text-primary bg-primary text-white"
                                      : "hover:bg-gray-200 dark:hover:bg-gray-800"
                                  }`}
                                >
                                  {RenderIcon(iconKey)}
                                </div>
                              ))
                            )}
                          </div>
                        </ScrollArea>
                        <div className="mt-2">
                          <Button
                            variant="outline"
                            onClick={() => field.onChange("")} // Clear the selected icon
                            className="w-full"
                          >
                            Clear Current Icon
                          </Button>
                        </div>
                      </PopoverContent>
                    </Popover>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="isActive"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-sm font-normal">
                      菜单默认展开
                    </FormLabel>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <SheetFooter className="gap-2 pt-2 sm:space-x-0">
              <SheetClose asChild>
                <Button type="button" variant="outline">
                  Cancel
                </Button>
              </SheetClose>
              <Button disabled={isPending} type="submit">
                {isPending && (
                  <Loader
                    className="mr-2 size-4 animate-spin"
                    aria-hidden="true"
                  />
                )}
                Save
              </Button>
            </SheetFooter>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}
