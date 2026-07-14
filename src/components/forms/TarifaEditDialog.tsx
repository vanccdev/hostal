"use client";

import { useState } from "react";
import { Pencil } from "lucide-react";
import { TarifaForm } from "@/components/forms/TarifaForm";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import type { Tarifa } from "@/types/database";

type TarifaEditDialogProps = {
  tarifa: Tarifa;
};

export const TarifaEditDialog = ({ tarifa }: TarifaEditDialogProps) => {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" size="sm">
          <Pencil className="h-4 w-4" aria-hidden="true" />
          Editar
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar tarifa</DialogTitle>
          <DialogDescription>Actualiza la tarifa sin salir del listado.</DialogDescription>
        </DialogHeader>
        <TarifaForm tarifa={tarifa} onSuccess={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  );
};
