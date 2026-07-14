"use client";

import { useState } from "react";
import { Pencil } from "lucide-react";
import { HabitacionForm } from "@/components/forms/HabitacionForm";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import type { Habitacion, Tarifa } from "@/types/database";

type HabitacionEditDialogProps = {
  habitacion: Habitacion;
  tarifas: Tarifa[];
};

export const HabitacionEditDialog = ({ habitacion, tarifas }: HabitacionEditDialogProps) => {
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
          <DialogTitle>Editar habitación</DialogTitle>
          <DialogDescription>Actualiza la habitación sin salir del listado.</DialogDescription>
        </DialogHeader>
        <HabitacionForm habitacion={habitacion} tarifas={tarifas} onSuccess={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  );
};
