import * as React from "react";
import { ClientDataTable, type RenderedColumn, type RenderedRow } from "@/components/crud/ClientDataTable";
import type { TableServerState } from "@/lib/table-server";

export type Column<T> = {
  key: string;
  header: string;
  render: (row: T) => React.ReactNode;
};

type DataTableProps<T> = {
  columns: Column<T>[];
  data: T[];
  empty: string;
  serverState?: TableServerState;
  searchableColumns?: string[];
  sortableColumns?: string[];
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const valueByKey = <T,>(row: T, key: string) => {
  if (!isRecord(row) || !(key in row)) {
    return undefined;
  }

  return row[key];
};

const nodeToText = (node: React.ReactNode): string => {
  if (node === null || node === undefined || typeof node === "boolean") {
    return "";
  }

  if (typeof node === "string" || typeof node === "number") {
    return String(node);
  }

  if (Array.isArray(node)) {
    return node.map(nodeToText).filter(Boolean).join(" ");
  }

  if (React.isValidElement<{ children?: React.ReactNode }>(node)) {
    return nodeToText(node.props.children);
  }

  return "";
};

const valueToText = (value: unknown, rendered: React.ReactNode): string => {
  if (value === null || value === undefined) {
    return nodeToText(rendered);
  }

  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (Array.isArray(value)) {
    return value.map((item) => valueToText(item, "")).filter(Boolean).join(" ");
  }

  if (isRecord(value)) {
    return Object.values(value)
      .map((item) => valueToText(item, ""))
      .filter(Boolean)
      .join(" ");
  }

  return nodeToText(rendered);
};

const rowId = <T,>(row: T, index: number) => {
  if (isRecord(row) && typeof row.id === "string") {
    return row.id;
  }

  return String(index);
};

export const DataTable = <T,>({
  columns,
  data,
  empty,
  serverState,
  searchableColumns,
  sortableColumns,
}: DataTableProps<T>) => {
  const renderedColumns: RenderedColumn[] = columns.map((column) => ({
    key: column.key,
    header: column.header,
  }));

  const renderedRows: RenderedRow[] = data.map((row, index) => ({
    id: rowId(row, index),
    cells: columns.map((column) => {
      const rendered = column.render(row);
      const rawValue = valueByKey(row, column.key);

      return {
        key: column.key,
        content: rendered,
        value: valueToText(rawValue, rendered),
      };
    }),
  }));

  return (
    <ClientDataTable
      columns={renderedColumns}
      rows={renderedRows}
      empty={empty}
      serverState={serverState}
      searchableColumns={searchableColumns}
      sortableColumns={sortableColumns}
    />
  );
};
