import { useCallback, useEffect, useState } from "react";
import Swal from "sweetalert2";
import {
  apiGetConducteurs,
  apiGetConducteurStats,
  apiCreateConducteur,
  apiUpdateConducteur,
  apiDeleteConducteur,
  apiGet,
} from "../services/api";
import type { Conducteur, ConducteurStats } from "../types/api";
import ConducteurModal from "../components/conducteurs/ConducteurModal";
import EntityDeepStatsModal from "../components/stats/EntityDeepStatsModal";

interface VehiculeLite {
  id: string;
  immatriculation: string;
}

export default function ConducteursPage() {
  const [conducteurs, setConducteurs] = useState<Conducteur[]>([]);
  const [stats, setStats] = useState<ConducteurStats | null>(null);
  const [vehicles, setVehicles] = useState<VehiculeLite[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"tous" | "actifs" | "inactifs">("tous");
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Conducteur | null>(null);
  const [statsConducteur, setStatsConducteur] = useState<Conducteur | null>(
    null,
  );
  const [msg, setMsg] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const loadAll = useCallback(async () => {
    try {
      setLoading(true);
      const [resList, resStats, resVeh] = await Promise.all([
        apiGetConducteurs(),
        apiGetConducteurStats(),
        apiGet<{ total: number; vehicules: VehiculeLite[] }>("/vehicles"),
      ]);
      if (resList.success && resList.data?.conducteurs) {
        setConducteurs(resList.data.conducteurs);
      } else {
        setConducteurs([]);
      }
      if (resStats.success && resStats.data) {
        setStats(resStats.data);
      }
      if (resVeh.success && resVeh.data?.vehicules) {
        setVehicles(
          resVeh.data.vehicules.map((v) => ({
            id: v.id,
            immatriculation: v.immatriculation,
          })),
        );
      }
    } catch (e) {
      console.error(e);
      setMsg({
        type: "error",
        text: "Impossible de charger les conducteurs",
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const filtered = conducteurs.filter((c) => {
    if (filter === "actifs" && !c.isActive) return false;
    if (filter === "inactifs" && c.isActive) return false;
    const q = search.toLowerCase();
    if (!q) return true;
    return (
      c.nom.toLowerCase().includes(q) ||
      c.numeroPermis.toLowerCase().includes(q) ||
      (c.telephone && c.telephone.toLowerCase().includes(q))
    );
  });

  const handleSubmit = async (data: Record<string, unknown>) => {
    try {
      setMsg(null);
      const res = editing
        ? await apiUpdateConducteur(editing.id, data)
        : await apiCreateConducteur(data);
      if (res.success) {
        setMsg({
          type: "success",
          text: editing ? "Conducteur mis à jour" : "Conducteur créé",
        });
        setShowModal(false);
        setEditing(null);
        await loadAll();
      } else {
        setMsg({
          type: "error",
          text: res.message || "Erreur",
        });
      }
    } catch (err: unknown) {
      const m =
        err &&
        typeof err === "object" &&
        "response" in err &&
        err.response &&
        typeof err.response === "object" &&
        "data" in err.response &&
        err.response.data &&
        typeof err.response.data === "object" &&
        "message" in err.response.data
          ? String((err.response.data as { message?: string }).message)
          : "Erreur serveur";
      setMsg({ type: "error", text: m });
    }
  };

  const handleDelete = async (c: Conducteur) => {
    const ok = await Swal.fire({
      title: "Supprimer ce conducteur ?",
      html: `Les alertes liées seront aussi supprimées (règle base de données).<br/><strong>${c.nom}</strong> — ${c.numeroPermis}`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Supprimer",
      cancelButtonText: "Annuler",
      reverseButtons: true,
    });
    if (!ok.isConfirmed) return;
    try {
      const res = await apiDeleteConducteur(c.id);
      if (res.success) {
        setMsg({ type: "success", text: "Conducteur supprimé" });
        await loadAll();
      } else {
        setMsg({ type: "error", text: res.message || "Échec" });
      }
    } catch {
      setMsg({ type: "error", text: "Suppression impossible" });
    }
  };

  return (
    <div className="min-h-full space-y-4">
      {msg && (
        <div
          className={`border px-3 py-2 text-xs font-semibold uppercase tracking-wide ${
            msg.type === "success"
              ? "border-emerald-700 bg-emerald-950/30 text-emerald-200"
              : "border-red-800 bg-red-950/40 text-red-200"
          }`}
        >
          {msg.text}
        </div>
      )}

      <div className="dashboard-panel overflow-hidden">
        <div className="dashboard-panel-header flex flex-col gap-3 border-l-4 border-teal-600 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">
              Ressource humaine
            </p>
            <h1 className="text-xl font-bold tracking-tight text-slate-100">
              Conducteurs
            </h1>
            <p className="mt-0.5 text-xs text-slate-400">
              Permis, contact, affectation véhicule et activité
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setEditing(null);
              setShowModal(true);
            }}
            className="shrink-0 border border-amber-600/80 bg-slate-900 px-4 py-2 text-xs font-bold uppercase tracking-wider text-amber-100 hover:border-amber-500"
          >
            Ajouter
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <div className="dashboard-panel border-t-4 border-t-slate-600 p-3">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
            Total
          </div>
          <div className="mt-1 font-mono text-2xl font-bold tabular-nums text-slate-800">
            {loading ? "—" : stats?.totalConducteurs ?? 0}
          </div>
        </div>
        <div className="dashboard-panel border-t-4 border-t-emerald-600 p-3">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
            Actifs
          </div>
          <div className="mt-1 font-mono text-2xl font-bold tabular-nums text-emerald-800">
            {loading ? "—" : stats?.conducteursActifs ?? 0}
          </div>
        </div>
        <div className="dashboard-panel border-t-4 border-t-sky-600 p-3">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
            Avec véhicule
          </div>
          <div className="mt-1 font-mono text-2xl font-bold tabular-nums text-sky-900">
            {loading ? "—" : stats?.avecVehiculeAssigne ?? 0}
          </div>
        </div>
        <div className="dashboard-panel border-t-4 border-t-red-600 p-3">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
            Alertes liées
          </div>
          <div className="mt-1 font-mono text-2xl font-bold tabular-nums text-red-800">
            {loading ? "—" : stats?.totalAlertesLiees ?? 0}
          </div>
        </div>
        <div className="dashboard-panel border-t-4 border-t-amber-500 p-3">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
            Paquets données
          </div>
          <div className="mt-1 font-mono text-2xl font-bold tabular-nums text-amber-900">
            {loading ? "—" : stats?.totalPaquetsLiees ?? 0}
          </div>
        </div>
      </div>

      {stats && stats.topParAlertes.length > 0 && (
        <div className="dashboard-panel p-4">
          <div className="mb-2 text-[10px] font-bold uppercase tracking-[0.15em] text-slate-600">
            Top conducteurs (alertes enregistrées)
          </div>
          <div className="flex flex-wrap gap-2">
            {stats.topParAlertes.map((t) => (
              <span
                key={t.id}
                className="inline-flex border border-slate-400 bg-slate-100 px-2 py-1 font-mono text-[11px] text-slate-800"
              >
                {t.nom}{" "}
                <span className="ml-1 font-bold text-red-700">
                  ({t.nombreAlertes})
                </span>
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="dashboard-panel p-4">
        <div className="mb-3 text-[10px] font-bold uppercase tracking-[0.15em] text-slate-600">
          Filtres
        </div>
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <input
            type="search"
            placeholder="Nom, permis, téléphone…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full border border-slate-500 bg-white px-3 py-2 text-sm md:max-w-md"
          />
          <div className="flex flex-wrap gap-2">
            {(
              [
                ["tous", "Tous"],
                ["actifs", "Actifs"],
                ["inactifs", "Inactifs"],
              ] as const
            ).map(([k, label]) => (
              <button
                key={k}
                type="button"
                onClick={() => setFilter(k)}
                className={`border px-3 py-1.5 text-[11px] font-bold uppercase tracking-wide ${
                  filter === k
                    ? "border-slate-700 bg-slate-800 text-amber-100"
                    : "border-slate-400 bg-slate-100/90 text-slate-700"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="dashboard-panel overflow-hidden">
        <div className="dashboard-panel-header flex items-center justify-between border-l-4 border-teal-700 px-3 py-2">
          <h2 className="text-[11px] font-bold uppercase tracking-[0.15em]">
            Registre
          </h2>
          <span className="font-mono text-[10px] text-slate-400">
            {filtered.length} ligne(s)
          </span>
        </div>
        <div className="overflow-x-auto border-t border-slate-400/60 bg-white">
          {loading ? (
            <div className="flex flex-col items-center gap-2 py-12 text-xs uppercase tracking-wide text-slate-500">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-300 border-t-slate-700" />
              Chargement…
            </div>
          ) : (
            <table className="table-industrial min-w-full divide-y divide-slate-200">
              <thead className="dashboard-panel-header">
                <tr>
                  <th className="px-4 py-3 text-left">Nom</th>
                  <th className="px-4 py-3 text-left">Permis</th>
                  <th className="px-4 py-3 text-left">Véhicule</th>
                  <th className="px-4 py-3 text-left">Statut</th>
                  <th className="px-4 py-3 text-right">Alertes</th>
                  <th className="px-4 py-3 text-right">Paquets</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filtered.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50/90">
                    <td className="px-4 py-3 font-semibold text-slate-900">
                      {c.nom}
                    </td>
                    <td className="px-4 py-3 font-mono text-sm text-slate-800">
                      {c.numeroPermis}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-700">
                      {c.vehiculeImmatriculation ?? (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {c.isActive ? (
                        <span className="border border-emerald-700 bg-emerald-950/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-800">
                          Actif
                        </span>
                      ) : (
                        <span className="border border-slate-500 bg-slate-200 px-2 py-0.5 text-[10px] font-bold uppercase text-slate-700">
                          Inactif
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-sm tabular-nums">
                      {c.nbAlertesReelles ?? 0}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-sm tabular-nums">
                      {c.nbPaquets ?? 0}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => {
                          setEditing(c);
                          setShowModal(true);
                        }}
                        className="mr-2 border border-slate-400 bg-slate-100 px-2 py-1 text-[10px] font-bold uppercase text-slate-800"
                      >
                        Modifier
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(c)}
                        className="mr-2 border border-red-800/60 bg-red-950/20 px-2 py-1 text-[10px] font-bold uppercase text-red-700"
                      >
                        Suppr.
                      </button>
                      <button
                        type="button"
                        onClick={() => setStatsConducteur(c)}
                        className="inline-flex items-center justify-center border border-amber-700/80 bg-amber-950/30 px-2 py-1 text-amber-900 hover:bg-amber-950/50"
                        title="Statistiques détaillées"
                      >
                        <svg
                          className="h-4 w-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                          />
                        </svg>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        {!loading && filtered.length === 0 && (
          <div className="border-t border-dashed border-slate-400 py-10 text-center text-xs font-semibold uppercase tracking-wide text-slate-500">
            Aucun conducteur
          </div>
        )}
      </div>

      <EntityDeepStatsModal
        open={statsConducteur != null}
        onClose={() => setStatsConducteur(null)}
        mode="driver"
        entityId={statsConducteur?.id ?? null}
        subtitle={statsConducteur?.nom}
      />

      <ConducteurModal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false);
          setEditing(null);
        }}
        onSubmit={handleSubmit}
        conducteur={editing}
        vehicles={vehicles}
        title={editing ? "Modifier le conducteur" : "Nouveau conducteur"}
      />
    </div>
  );
}
