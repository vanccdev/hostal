"use client";

import * as React from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  type ColumnDef,
  type ColumnFiltersState,
  type SortingState,
  type VisibilityState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { ArrowDown, ArrowUp, ChevronsLeft, ChevronsRight, ChevronLeft, ChevronRight, ChevronsUpDown, Search, Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { allColumnsValue, type TableServerState } from "@/lib/table-server";

export type RenderedColumn = {
  key: string;
  header: string;
};

export type RenderedCell = {
  key: string;
  content: React.ReactNode;
  value: string;
};

export type RenderedRow = {
  id: string;
  cells: RenderedCell[];
};

type ClientDataTableProps = {
  columns: RenderedColumn[];
  rows: RenderedRow[];
  empty: string;
  serverState?: TableServerState;
  searchableColumns?: string[];
  sortableColumns?: string[];
};

const utilityColumns = new Set(["acciones", "detalle", "fotos_preview"]);

const cellForColumn = (row: RenderedRow, key: string) =>
  row.cells.find((cell) => cell.key === key) ?? { key, content: null, value: "" };

const columnLabel = (columns: RenderedColumn[], key: string) =>
  columns.find((column) => column.key === key)?.header ?? key;

const includesText = (source: string, search: string) => source.toLowerCase().includes(search.toLowerCase());

const globalFilter = (row: { original: RenderedRow }, _columnId: string, filterValue: unknown) => {
  const search = String(filterValue ?? "").trim();

  if (!search) {
    return true;
  }

  return row.original.cells.some((cell) => includesText(cell.value, search));
};

export const ClientDataTable = ({
  columns,
  rows,
  empty,
  serverState,
  searchableColumns: serverSearchableColumns,
  sortableColumns: serverSortableColumns,
}: ClientDataTableProps) => {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const isServerMode = Boolean(serverState);
  const [sorting, setSorting] = React.useState<SortingState>(
    serverState?.sort ? [{ id: serverState.sort, desc: serverState.dir === "desc" }] : [],
  );
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({});
  const [globalSearch, setGlobalSearch] = React.useState(serverState?.q ?? "");
  const [searchColumn, setSearchColumn] = React.useState(serverState?.qColumn ?? allColumnsValue);
  const [columnSearch, setColumnSearch] = React.useState(serverState?.q ?? "");

  React.useEffect(() => {
    if (!serverState) {
      return;
    }

    setSorting(serverState.sort ? [{ id: serverState.sort, desc: serverState.dir === "desc" }] : []);
    setGlobalSearch(serverState.q);
    setColumnSearch(serverState.q);
    setSearchColumn(serverState.qColumn);
  }, [serverState]);

  const navigateTable = React.useCallback(
    (updates: Record<string, string | number | null>) => {
      const params = new URLSearchParams(searchParams.toString());

      for (const [key, value] of Object.entries(updates)) {
        if (value === null || value === "" || value === allColumnsValue) {
          params.delete(key);
        } else {
          params.set(key, String(value));
        }
      }

      router.push(`${pathname}?${params.toString()}`);
    },
    [pathname, router, searchParams],
  );

  const tableColumns = React.useMemo<ColumnDef<RenderedRow>[]>(
    () =>
      columns.map((column) => ({
        id: column.key,
        accessorFn: (row) => cellForColumn(row, column.key).value,
        header: ({ column: tableColumn }) => {
          const sorted = tableColumn.getIsSorted();
          const canSort = isServerMode ? (serverSortableColumns ?? []).includes(column.key) : tableColumn.getCanSort();
          const toggleSort = () => {
            if (!canSort) {
              return;
            }

            if (isServerMode) {
              const nextDir = serverState?.sort === column.key && serverState.dir === "asc" ? "desc" : "asc";
              navigateTable({ sort: column.key, dir: nextDir, page: 1 });
              return;
            }

            tableColumn.toggleSorting(sorted === "asc");
          };

          return (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="-ml-3 h-8 rounded-md px-3 text-xs uppercase"
              onClick={toggleSort}
              disabled={!canSort}
            >
              {column.header}
              {(isServerMode ? serverState?.sort === column.key && serverState.dir === "desc" : sorted === "desc") ? (
                <ArrowDown className="h-3.5 w-3.5" aria-hidden="true" />
              ) : (isServerMode ? serverState?.sort === column.key && serverState.dir === "asc" : sorted === "asc") ? (
                <ArrowUp className="h-3.5 w-3.5" aria-hidden="true" />
              ) : (
                <ChevronsUpDown className="h-3.5 w-3.5" aria-hidden="true" />
              )}
            </Button>
          );
        },
        cell: ({ row }) => cellForColumn(row.original, column.key).content,
        enableSorting: isServerMode ? (serverSortableColumns ?? []).includes(column.key) : !utilityColumns.has(column.key),
        enableHiding: columns.length > 1 && !utilityColumns.has(column.key),
        filterFn: (row, columnId, filterValue) => includesText(String(row.getValue(columnId) ?? ""), String(filterValue ?? "").trim()),
      })),
    [columns, isServerMode, navigateTable, serverSortableColumns, serverState?.dir, serverState?.sort],
  );

  // TanStack Table intentionally returns function-bearing objects; keep this exception scoped to this hook.
  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    data: rows,
    columns: tableColumns,
    getRowId: (row) => row.id,
    globalFilterFn: globalFilter,
    manualPagination: isServerMode,
    manualSorting: isServerMode,
    manualFiltering: isServerMode,
    pageCount: isServerMode && serverState ? Math.ceil(serverState.total / serverState.pageSize) : undefined,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      globalFilter: globalSearch,
    },
    initialState: {
      pagination: {
        pageIndex: serverState ? serverState.page - 1 : 0,
        pageSize: serverState?.pageSize ?? 10,
      },
    },
  });

  const searchableColumns = columns.filter((column) =>
    isServerMode ? (serverSearchableColumns ?? []).includes(column.key) : !utilityColumns.has(column.key),
  );
  const visibleRows = table.getRowModel().rows;
  const filteredCount = isServerMode ? serverState?.total ?? rows.length : table.getFilteredRowModel().rows.length;
  const totalCount = isServerMode ? serverState?.total ?? rows.length : rows.length;
  const pageCount = isServerMode && serverState ? Math.ceil(serverState.total / serverState.pageSize) : table.getPageCount();

  const updateSearchColumn = (value: string) => {
    setSearchColumn(value);
    setColumnSearch("");
    setGlobalSearch("");

    if (isServerMode) {
      navigateTable({ qColumn: value, q: null, page: 1 });
      return;
    }

    table.resetColumnFilters();
    setGlobalSearch(value === allColumnsValue ? columnSearch : "");
  };

  const updateSearch = (value: string) => {
    setColumnSearch(value);

    if (isServerMode) {
      return;
    }

    if (searchColumn === allColumnsValue) {
      setGlobalSearch(value);
      table.resetColumnFilters();
      return;
    }

    setGlobalSearch("");
    table.getColumn(searchColumn)?.setFilterValue(value);
  };

  const applyServerSearch = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!isServerMode) {
      return;
    }

    navigateTable({ q: columnSearch, qColumn: searchColumn, page: 1 });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <form className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_220px_auto] lg:w-[660px]" onSubmit={applyServerSearch}>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#717171] dark:text-[#b0b0b0]" aria-hidden="true" />
            <Input
              value={columnSearch}
              onChange={(event) => updateSearch(event.target.value)}
              placeholder="Buscar filas..."
              className="h-10 pl-10"
            />
          </div>
          <Select value={searchColumn} onValueChange={updateSearchColumn}>
            <SelectTrigger className="h-10">
              <SelectValue placeholder="Columna" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={allColumnsValue}>Todas las columnas</SelectItem>
              {searchableColumns.map((column) => (
                <SelectItem key={column.key} value={column.key}>
                  {column.header}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button type="submit" variant="secondary" className="h-10 rounded-md">
            Buscar
          </Button>
        </form>

        <div className="flex items-center justify-between gap-3 lg:justify-end">
          <p className="text-sm text-[#717171] dark:text-[#b0b0b0]">
            {filteredCount} de {totalCount} filas
          </p>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button type="button" variant="outline" size="sm" className="h-10 rounded-md">
                <Settings2 className="h-4 w-4" aria-hidden="true" />
                Columnas
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>Mostrar columnas</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {table
                .getAllColumns()
                .filter((column) => column.getCanHide())
                .map((column) => (
                  <div key={column.id} className="flex items-center justify-between gap-3 rounded-md px-2 py-2 text-sm outline-none">
                    <div className="min-w-0 space-y-0.5">
                      <Label htmlFor={`column-${column.id}`} className="block truncate font-medium">
                        {columnLabel(columns, column.id)}
                      </Label>
                      <p className="text-xs font-medium text-[#717171] dark:text-[#b0b0b0]">
                        {column.getIsVisible() ? "Visible" : "Oculta"}
                      </p>
                    </div>
                    <Switch
                      id={`column-${column.id}`}
                      checked={column.getIsVisible()}
                      onCheckedChange={(value) => column.toggleVisibility(value)}
                      aria-label={`Mostrar columna ${columnLabel(columns, column.id)}`}
                    />
                  </div>
                ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <Table>
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <TableHead key={header.id}>
                  {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {visibleRows.length === 0 ? (
            <TableRow>
              <TableCell colSpan={Math.max(table.getVisibleFlatColumns().length, 1)} className="py-10 text-center font-medium text-[#717171] dark:text-[#b0b0b0]">
                {empty}
              </TableCell>
            </TableRow>
          ) : (
            visibleRows.map((row) => (
              <TableRow key={row.id}>
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>
                ))}
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-[#222222] dark:text-zinc-100">Filas por página</span>
          <Select
            value={`${serverState?.pageSize ?? table.getState().pagination.pageSize}`}
            onValueChange={(value) => {
              if (isServerMode) {
                navigateTable({ pageSize: value, page: 1 });
                return;
              }

              table.setPageSize(Number(value));
            }}
          >
            <SelectTrigger className="h-9 w-[84px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent side="top">
              {[10, 20, 25, 50, 100].map((pageSize) => (
                <SelectItem key={pageSize} value={`${pageSize}`}>
                  {pageSize}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center justify-between gap-3 md:justify-end">
          <p className="min-w-28 text-sm font-medium text-[#222222] dark:text-zinc-100">
            Página {pageCount === 0 ? 0 : serverState?.page ?? table.getState().pagination.pageIndex + 1} de {pageCount}
          </p>
          <div className="flex items-center gap-2">
            <Button type="button" variant="outline" size="icon" className="hidden h-9 w-9 rounded-md lg:inline-flex" onClick={() => (isServerMode ? navigateTable({ page: 1 }) : table.setPageIndex(0))} disabled={isServerMode ? (serverState?.page ?? 1) <= 1 : !table.getCanPreviousPage()}>
              <span className="sr-only">Primera página</span>
              <ChevronsLeft className="h-4 w-4" aria-hidden="true" />
            </Button>
            <Button type="button" variant="outline" size="icon" className="h-9 w-9 rounded-md" onClick={() => (isServerMode ? navigateTable({ page: Math.max((serverState?.page ?? 1) - 1, 1) }) : table.previousPage())} disabled={isServerMode ? (serverState?.page ?? 1) <= 1 : !table.getCanPreviousPage()}>
              <span className="sr-only">Página anterior</span>
              <ChevronLeft className="h-4 w-4" aria-hidden="true" />
            </Button>
            <Button type="button" variant="outline" size="icon" className="h-9 w-9 rounded-md" onClick={() => (isServerMode ? navigateTable({ page: Math.min((serverState?.page ?? 1) + 1, pageCount) }) : table.nextPage())} disabled={isServerMode ? (serverState?.page ?? 1) >= pageCount : !table.getCanNextPage()}>
              <span className="sr-only">Página siguiente</span>
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
            </Button>
            <Button type="button" variant="outline" size="icon" className="hidden h-9 w-9 rounded-md lg:inline-flex" onClick={() => (isServerMode ? navigateTable({ page: pageCount }) : table.setPageIndex(pageCount - 1))} disabled={isServerMode ? (serverState?.page ?? 1) >= pageCount : !table.getCanNextPage()}>
              <span className="sr-only">Última página</span>
              <ChevronsRight className="h-4 w-4" aria-hidden="true" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
