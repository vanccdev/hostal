"use client";

import { useState } from "react";
import { Download, Globe2, Laptop } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

type Props = { kind: "database" | "imagenes" | "comprobantes"; productionDefaults: { apiUrl: string; studioUrl: string; nextjsUrl: string }; localApiUrl: string };

export function BackupTargetSelector({ kind, productionDefaults, localApiUrl }: Props) {
  const [production, setProduction] = useState(false);
  const [local, setLocal] = useState(true);
  const [open, setOpen] = useState(false);
  const [domains, setDomains] = useState(productionDefaults);

  const targetCount = Number(local) + Number(production);
  const download = (target: "local" | "production") => {
    const params = new URLSearchParams({ target, apiUrl: target === "production" ? domains.apiUrl : localApiUrl });
    if (target === "production") {
      params.set("studioUrl", domains.studioUrl);
      params.set("nextjsUrl", domains.nextjsUrl);
    }
    window.location.href = `/admin/backups/${kind}?${params.toString()}`;
  };

  return (
    <>
      <div className="space-y-3 rounded-lg border p-3">
        <p className="text-sm font-medium">Destino del backup</p>
        <div className="flex flex-wrap gap-4">
          <div className="flex items-center gap-2">
            <Switch id={`${kind}-local`} checked={local} onCheckedChange={setLocal} />
            <Label htmlFor={`${kind}-local`}><Laptop className="mr-1 inline h-4 w-4" />Local</Label>
          </div>
          <div className="flex items-center gap-2">
            <Switch id={`${kind}-production`} checked={production} onCheckedChange={setProduction} />
            <Label htmlFor={`${kind}-production`}><Globe2 className="mr-1 inline h-4 w-4" />Producción</Label>
          </div>
        </div>
        <p className="text-xs text-muted-foreground">Puedes activar uno o los dos destinos. Para producción se usarán los dominios configurados.</p>
        <div className="flex flex-wrap gap-2">
          {local && <Button variant="outline" onClick={() => download("local")}><Download className="h-4 w-4" />Descargar local</Button>}
          {production && <Button onClick={() => setOpen(true)}><Download className="h-4 w-4" />Descargar producción</Button>}
          {targetCount === 0 && <p className="text-sm text-destructive">Activa al menos un destino.</p>}
        </div>
      </div>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Dominios del backup de producción</DialogTitle>
            <DialogDescription>Verifica o cambia estos dominios antes de descargar. Los valores iniciales vienen de .env.prod.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            {(["apiUrl", "studioUrl", "nextjsUrl"] as const).map((key) => (
              <div key={key} className="space-y-1">
                <Label htmlFor={`${kind}-${key}`}>{key === "apiUrl" ? "URL Supabase API" : key === "studioUrl" ? "URL Supabase Studio" : "URL Next.js"}</Label>
                <Input id={`${kind}-${key}`} value={domains[key]} onChange={(event) => setDomains((current) => ({ ...current, [key]: event.target.value }))} />
              </div>
            ))}
          </div>
          <DialogFooter><Button onClick={() => { setOpen(false); download("production"); }}>Confirmar y descargar</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
