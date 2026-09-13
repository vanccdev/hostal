"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { deleteUserAccountAction } from "@/app/actions/usuarios";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

export const DeleteUserButton = ({ userId, userName, disabled = false }: { userId: string; userName: string; disabled?: boolean }) => {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  const handleDelete = () => {
    startTransition(async () => {
      const result = await deleteUserAccountAction(userId);
      if (!result.ok) {
        toast.error("No se pudo eliminar el usuario", { description: result.message });
        return;
      }
      toast.success("Usuario eliminado", { description: result.message });
      setOpen(false);
      router.refresh();
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant="destructive" size="sm" disabled={disabled || pending}>
          <Trash2 className="h-4 w-4" aria-hidden="true" />
          Eliminar
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>¿Eliminar a {userName}?</DialogTitle>
          <DialogDescription>
            Se eliminarán su cuenta de Auth, el perfil interno y su ficha de huésped. Esta acción no se puede deshacer.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose asChild><Button type="button" variant="outline" disabled={pending}>Cancelar</Button></DialogClose>
          <Button type="button" variant="destructive" disabled={pending} onClick={handleDelete}>
            <Trash2 className="h-4 w-4" aria-hidden="true" />
            Eliminar definitivamente
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
