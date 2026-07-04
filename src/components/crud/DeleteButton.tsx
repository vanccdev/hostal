"use client";

import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export const DeleteButton = () => (
  <Button type="button" variant="destructive" size="sm" disabled aria-label="Eliminar registro">
    <Trash2 className="h-4 w-4" aria-hidden="true" />
    Eliminar
  </Button>
);

