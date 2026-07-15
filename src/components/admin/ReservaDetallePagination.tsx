import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

type ReservaDetallePaginationProps = {
  page: number;
  pageSize: number;
  total: number;
  q: string;
};

const pageSizeOptions = [5, 10, 20];

const pageHref = ({ page, pageSize, q }: { page: number; pageSize: number; q: string }) => {
  const params = new URLSearchParams();

  if (page > 1) {
    params.set("page", String(page));
  }

  if (pageSize !== pageSizeOptions[0]) {
    params.set("pageSize", String(pageSize));
  }

  if (q) {
    params.set("q", q);
  }

  const query = params.toString();

  return query ? `/admin/reserva-detalle?${query}` : "/admin/reserva-detalle";
};

export const ReservaDetallePagination = ({ page, pageSize, total, q }: ReservaDetallePaginationProps) => {
  const pageCount = Math.ceil(total / pageSize);
  const currentPage = pageCount === 0 ? 0 : page;
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  return (
    <div className="flex flex-col gap-4 border-t border-[#ece4d4] pt-5 dark:border-[#314237] md:flex-row md:items-center md:justify-between">
      <div className="space-y-2">
        <p className="text-sm font-medium text-[#18221b] dark:text-zinc-100">
          Mostrando {from}-{to} de {total} reservas
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold uppercase text-[#66736a] dark:text-[#b7c0b4]">Por página</span>
          {pageSizeOptions.map((option) => (
            <Button key={option} asChild variant={option === pageSize ? "default" : "outline"} size="sm">
              <Link href={pageHref({ page: 1, pageSize: option, q })}>{option}</Link>
            </Button>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 md:justify-end">
        <p className="text-sm font-medium text-[#18221b] dark:text-zinc-100">
          Página {currentPage} de {pageCount}
        </p>
        <div className="flex items-center gap-2">
          {page <= 1 ? (
            <Button type="button" variant="outline" size="icon" className="h-9 w-9 rounded-md" disabled>
              <span className="sr-only">Página anterior</span>
              <ChevronLeft className="h-4 w-4" aria-hidden="true" />
            </Button>
          ) : (
            <Button asChild variant="outline" size="icon" className="h-9 w-9 rounded-md">
              <Link href={pageHref({ page: page - 1, pageSize, q })} aria-label="Página anterior">
                <ChevronLeft className="h-4 w-4" aria-hidden="true" />
              </Link>
            </Button>
          )}
          {pageCount === 0 || page >= pageCount ? (
            <Button type="button" variant="outline" size="icon" className="h-9 w-9 rounded-md" disabled>
              <span className="sr-only">Página siguiente</span>
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
            </Button>
          ) : (
            <Button asChild variant="outline" size="icon" className="h-9 w-9 rounded-md">
              <Link href={pageHref({ page: page + 1, pageSize, q })} aria-label="Página siguiente">
                <ChevronRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};
