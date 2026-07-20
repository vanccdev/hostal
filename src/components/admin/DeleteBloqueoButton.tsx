"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Unlock } from "lucide-react";
import { toast } from "sonner";
import { deleteBloqueoFechasAction } from "@/app/actions/crud";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

type DeleteBloqueoButtonProps = {
  bloqueoId: string;
  isGlobal: boolean;
};

export const DeleteBloqueoButton = ({ bloqueoId, isGlobal }: DeleteBloqueoButtonProps) => {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  const handleDelete = () => {
    startTransition(async () => {
      const result = await deleteBloqueoFechasAction(bloqueoId);

      if (!result.ok) {
        toast.error("No se pudo desbloquear", {
          description: result.message ?? "Intenta nuevamente.",
        });
        return;
      }

      toast.success("Fechas desbloqueadas", {
        description: result.message,
      });
      setOpen(false);
      router.refresh();
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" size="sm" disabled={pending}>
          <Unlock className="h-4 w-4" aria-hidden="true" />
          Desbloquear
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isGlobal ? "¿Desbloquear este rango para todo el hostal?" : "¿Desbloquear este rango para la habitación?"}
          </DialogTitle>
          <DialogDescription>
            Esta acción eliminará el bloqueo y las fechas volverán a estar disponibles para nuevas reservas.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline" disabled={pending}>
              Cancelar
            </Button>
          </DialogClose>
          <Button type="button" variant="destructive" disabled={pending} onClick={handleDelete}>
            <Unlock className="h-4 w-4" aria-hidden="true" />
            Confirmar desbloqueo
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
