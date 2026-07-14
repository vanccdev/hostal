"use client";

import { useState } from "react";
import { Pencil } from "lucide-react";
import { HuespedForm } from "@/components/forms/HuespedForm";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import type { Huesped } from "@/types/database";

type HuespedEditDialogProps = {
  huesped: Huesped;
};

export const HuespedEditDialog = ({ huesped }: HuespedEditDialogProps) => {
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
          <DialogTitle>Editar huésped</DialogTitle>
          <DialogDescription>Actualiza los datos del huésped sin salir del listado.</DialogDescription>
        </DialogHeader>
        <HuespedForm huesped={huesped} onSuccess={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  );
};
