import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type Column<T> = {
  key: string;
  header: string;
  render: (row: T) => React.ReactNode;
};

type DataTableProps<T> = {
  columns: Column<T>[];
  data: T[];
  empty: string;
};

export const DataTable = <T,>({ columns, data, empty }: DataTableProps<T>) => (
  <Table>
    <TableHeader>
      <TableRow>
        {columns.map((column) => (
          <TableHead key={column.key}>{column.header}</TableHead>
        ))}
      </TableRow>
    </TableHeader>
    <TableBody>
      {data.length === 0 ? (
        <TableRow>
          <TableCell colSpan={columns.length} className="text-center text-zinc-500">
            {empty}
          </TableCell>
        </TableRow>
      ) : (
        data.map((row, index) => (
          <TableRow key={index}>
            {columns.map((column) => (
              <TableCell key={column.key}>{column.render(row)}</TableCell>
            ))}
          </TableRow>
        ))
      )}
    </TableBody>
  </Table>
);

