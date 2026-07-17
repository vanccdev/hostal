"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { deleteHabitacionImageAction } from "@/app/actions/crud";
import { Button } from "@/components/ui/button";

type HabitacionImageDeleteButtonProps = {
  imageId: string;
  onDeleted?: (imageId: string) => void;
};

export const HabitacionImageDeleteButton = ({ imageId, onDeleted }: HabitacionImageDeleteButtonProps) => {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const handleDelete = () => {
    const confirmed = window.confirm("¿Eliminar esta imagen de la habitación?");

    if (!confirmed) {
      return;
    }

    startTransition(async () => {
      const result = await deleteHabitacionImageAction(imageId);

      if (!result.ok) {
        toast.error("No se pudo eliminar la imagen", {
          description: result.message ?? "Intenta nuevamente.",
        });
        return;
      }

      onDeleted?.(imageId);
      toast.success("Imagen eliminada", {
        description: result.message,
      });
      router.refresh();
    });
  };

  return (
    <Button
      type="button"
      variant="destructive"
      size="icon"
      className="absolute right-2 top-2 h-8 w-8 rounded-full shadow-sm"
      disabled={pending}
      onClick={handleDelete}
      aria-label="Eliminar imagen de la habitación"
    >
      <Trash2 className="h-4 w-4" aria-hidden="true" />
    </Button>
  );
};
