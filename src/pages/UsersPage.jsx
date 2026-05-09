import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { UserCog, Mail, Pencil, Trash2, UserPlus, LayoutGrid, Truck } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import ModuleSelector, { ALL_MODULES } from "@/components/users/ModuleSelector";

const roleLabels = {
  admin: "Administrateur",
  responsable_exploitation: "Resp. Exploitation",
  responsable_operations: "Resp. Opérations",
  collecteur_bons: "Collecteur de bons",
  executeur_depenses: "Exécuteur Dépenses",
  chauffeur: "Chauffeur",
};

const roleColors = {
  admin: "bg-red-500/10 text-red-600",
  responsable_exploitation: "bg-blue-500/10 text-blue-600",
  responsable_operations: "bg-purple-500/10 text-purple-600",
  collecteur_bons: "bg-green-500/10 text-green-600",
  executeur_depenses: "bg-amber-500/10 text-amber-600",
  chauffeur: "bg-secondary/10 text-secondary",
};

const DEFAULT_MODULES = ALL_MODULES.map(m => m.key);

export default function UsersPage() {
  const [currentUser, setCurrentUser] = useState(null);
  const [inviteOpen, setInviteOpen] = useState(false);

  useEffect(() => {
    base44.auth.me().then(setCurrentUser).catch(() => {});
  }, []);
  const [editOpen, setEditOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);

  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("collecteur_bons");
  const [inviteModules, setInviteModules] = useState(DEFAULT_MODULES);
  const [inviteDriverId, setInviteDriverId] = useState("");
  const [inviting, setInviting] = useState(false);

  const [editRole, setEditRole] = useState("collecteur_bons");
  const [editModules, setEditModules] = useState(DEFAULT_MODULES);
  const [editDriverId, setEditDriverId] = useState("");

  const queryClient = useQueryClient();

  const { data: users = [], isLoading } = useQuery({
    queryKey: ["users"],
    queryFn: () => base44.entities.User.list(),
  });

  const { data: drivers = [] } = useQuery({
    queryKey: ["drivers"],
    queryFn: () => base44.entities.Driver.list(),
  });

  const { data: allVehiclesForDisplay = [] } = useQuery({
    queryKey: ["vehicles"],
    queryFn: () => base44.entities.Vehicle.list(),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.User.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      setEditOpen(false);
      toast.success("Utilisateur mis à jour");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.User.delete(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["users"] }); toast.success("Utilisateur supprimé"); },
  });

  const openEdit = (u) => {
    setEditingUser(u);
    setEditRole(u.role || "collecteur_bons");
    setEditModules(u.modules?.length ? u.modules : DEFAULT_MODULES);
    setEditDriverId(u.driver_id || "");
    setEditOpen(true);
  };

  const handleInvite = async () => {
    if (!inviteEmail) return;
    setInviting(true);
    // Envoyer l'invitation
    await base44.users.inviteUser(inviteEmail, inviteRole === "admin" ? "admin" : "user");
    // Sauvegarder la config en attente (appliquée au premier login de l'utilisateur)
    const pendingData = { email: inviteEmail.toLowerCase(), role: inviteRole, modules: inviteModules, applied: false };
    if (inviteRole === "chauffeur" && inviteDriverId) pendingData.driver_id = inviteDriverId;
    await base44.entities.PendingUserConfig.create(pendingData);
    toast.success(`Invitation envoyée à ${inviteEmail}`);
    setInviteEmail("");
    setInviteRole("collecteur_bons");
    setInviteModules(DEFAULT_MODULES);
    setInviteDriverId("");
    setInviteOpen(false);
    setInviting(false);
    queryClient.invalidateQueries({ queryKey: ["users"] });
  };

  const handleDelete = (u) => {
    if (confirm(`Supprimer l'utilisateur ${u.full_name || u.email} ?`)) deleteMutation.mutate(u.id);
  };

  const handleSaveEdit = () => {
    const data = { role: editRole, modules: editModules };
    if (editRole === "chauffeur" && editDriverId) data.driver_id = editDriverId;
    updateMutation.mutate({ id: editingUser.id, data });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Utilisateurs</h1>
          <p className="text-sm text-muted-foreground">{users.length} utilisateurs enregistrés</p>
        </div>
        <Button className="bg-secondary hover:bg-secondary/90 text-secondary-foreground" onClick={() => setInviteOpen(true)}>
          <UserPlus className="w-4 h-4 mr-2" /> Inviter un utilisateur
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {isLoading ? (
          <div className="col-span-2 flex justify-center py-12"><div className="w-8 h-8 border-4 border-muted border-t-secondary rounded-full animate-spin" /></div>
        ) : users.length === 0 ? (
          <div className="col-span-2 text-center py-16 text-muted-foreground">
            <UserCog className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>Aucun utilisateur trouvé</p>
          </div>
        ) : users.map(u => {
          const isMe = currentUser && u.id === currentUser.id;
          const moduleCount = u.role === "admin" ? ALL_MODULES.length : (u.modules?.length ?? ALL_MODULES.length);
          return (
            <Card key={u.id} className={cn("hover:shadow-lg transition-shadow", isMe && "ring-2 ring-secondary")}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-full bg-primary/10 flex items-center justify-center">
                      <UserCog className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-base">{u.full_name || "—"}</CardTitle>
                      <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5"><Mail className="w-3 h-3" />{u.email}</p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    {isMe && <Badge className="text-[10px] bg-secondary/20 text-secondary border border-secondary/30">Vous</Badge>}
                    <Badge className={cn("text-[10px]", roleColors[u.role] || "bg-muted text-muted-foreground")}>
                      {roleLabels[u.role] || u.role || "—"}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="text-xs">
                <div className="flex justify-between text-muted-foreground mb-2">
                  <span>Créé le</span>
                  <span>{u.created_date ? new Date(u.created_date).toLocaleDateString("fr-FR") : "—"}</span>
                </div>
                <div className="flex items-center gap-1.5 text-muted-foreground mb-2">
                  <LayoutGrid className="w-3 h-3" />
                  <span>{u.role === "admin" ? "Accès complet" : u.role === "chauffeur" ? "Rechargement Auto uniquement" : `${moduleCount} module${moduleCount > 1 ? "s" : ""} autorisé${moduleCount > 1 ? "s" : ""}`}</span>
                </div>
                {u.role === "chauffeur" && u.driver_id && (() => {
                  const d = drivers.find(x => x.id === u.driver_id);
                  const v = d ? allVehiclesForDisplay?.find(v => v.driver_id === d.id) : null;
                  return d ? (
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-2">
                      <Truck className="w-3 h-3" />
                      <span>{d.prenom} {d.nom}{v ? ` — ${v.immatriculation}` : ""}</span>
                    </div>
                  ) : null;
                })()}
                <div className="flex gap-2 pt-2 border-t border-border">
                  <Button size="sm" variant="outline" className="flex-1 h-7 text-xs" onClick={() => openEdit(u)}>
                    <Pencil className="w-3 h-3 mr-1" /> Modifier
                  </Button>
                  <Button size="sm" variant="outline" className="h-7 text-xs text-destructive hover:bg-destructive/10" onClick={() => handleDelete(u)} disabled={deleteMutation.isPending}>
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Invite Dialog */}
      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Inviter un utilisateur</DialogTitle></DialogHeader>
          <div className="space-y-4 mt-2">
            <div>
              <Label className="text-xs">Adresse email *</Label>
              <Input type="email" className="mt-1" placeholder="utilisateur@exemple.com" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">Rôle</Label>
              <Select value={inviteRole} onValueChange={setInviteRole}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>{Object.entries(roleLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            {inviteRole === "chauffeur" ? (
              <div>
                <Label className="text-xs">Chauffeur associé</Label>
                <Select value={inviteDriverId} onValueChange={setInviteDriverId}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Sélectionner un chauffeur..." /></SelectTrigger>
                  <SelectContent>
                    {drivers.filter(d => d.statut !== "inactif").map(d => (
                      <SelectItem key={d.id} value={d.id}>{d.prenom} {d.nom}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-1">Le chauffeur et son véhicule seront affichés automatiquement.</p>
              </div>
            ) : inviteRole !== "admin" && (
              <div>
                <Label className="text-xs mb-2 block">Modules autorisés</Label>
                <div className="border border-border rounded-lg p-3 bg-muted/30">
                  <ModuleSelector selected={inviteModules} onChange={setInviteModules} />
                </div>
              </div>
            )}
          </div>
          <div className="flex gap-2 mt-4">
            <Button variant="outline" className="flex-1" onClick={() => setInviteOpen(false)}>Annuler</Button>
            <Button className="flex-1 bg-secondary hover:bg-secondary/90" onClick={handleInvite} disabled={inviting || !inviteEmail}>
              {inviting ? "Envoi..." : "Envoyer l'invitation"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Modifier l'accès</DialogTitle></DialogHeader>
          {editingUser && (
            <div className="space-y-4 mt-2">
              <p className="text-sm text-muted-foreground">{editingUser.full_name} — {editingUser.email}</p>
              <div>
                <Label className="text-xs">Rôle</Label>
                <Select value={editRole} onValueChange={setEditRole}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>{Object.entries(roleLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              {editRole === "chauffeur" ? (
                <div>
                  <Label className="text-xs">Chauffeur associé</Label>
                  <Select value={editDriverId} onValueChange={setEditDriverId}>
                    <SelectTrigger className="mt-1"><SelectValue placeholder="Sélectionner un chauffeur..." /></SelectTrigger>
                    <SelectContent>
                      {drivers.filter(d => d.statut !== "inactif").map(d => (
                        <SelectItem key={d.id} value={d.id}>{d.prenom} {d.nom}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground mt-1">Le chauffeur et son véhicule seront affichés automatiquement.</p>
                </div>
              ) : editRole !== "admin" && (
                <div>
                  <Label className="text-xs mb-2 block">Modules autorisés</Label>
                  <div className="border border-border rounded-lg p-3 bg-muted/30">
                    <ModuleSelector selected={editModules} onChange={setEditModules} />
                  </div>
                </div>
              )}
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => setEditOpen(false)}>Annuler</Button>
                <Button className="flex-1 bg-secondary hover:bg-secondary/90" onClick={handleSaveEdit} disabled={updateMutation.isPending}>
                  {updateMutation.isPending ? "Enregistrement..." : "Enregistrer"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}