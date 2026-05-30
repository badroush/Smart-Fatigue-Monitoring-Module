import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import { apiGet, apiPost } from "../services/api";
import { subscribeSupervisorAlertsStream } from "../services/alertsStream";
import { Alerte } from "../types/api";
interface AlertesResponse {
  total: number;
  alertes: Alerte[];
}

export default function AlertsPage() {
  const [refreshInterval, setRefreshInterval] = useState(10000);
  const navigate = useNavigate();
  const [alertes, setAlertes] = useState<Alerte[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");
  const [selectedAlerte, setSelectedAlerte] = useState<Alerte | null>(null);

  // Charger l'intervalle depuis les paramètres
  useEffect(() => {
    const saved = localStorage.getItem("sfam-settings");
    if (saved) {
      const { rafraichissement } = JSON.parse(saved);
      setRefreshInterval(rafraichissement * 1000); // Convertir en ms
    }
  }, []);

  const fetchAlertes = useCallback(async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const response = await apiGet<AlertesResponse>("/alerts");

      if (response.success && response.data?.alertes) {
        setAlertes(response.data.alertes);
      } else {
        setAlertes([]);
      }
    } catch (err: unknown) {
      console.error("❌ Erreur chargement alertes:", err);
      setAlertes([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchAlertes(false);
    const unsub = subscribeSupervisorAlertsStream(() => void fetchAlertes(true));
    const pollMs = Math.max(refreshInterval, 10000);
    const interval = setInterval(() => void fetchAlertes(true), pollMs);
    return () => {
      unsub();
      clearInterval(interval);
    };
  }, [fetchAlertes, refreshInterval]);

  // 🔑 Fonction d'acquittement avec SweetAlert2
  const handleAcquitter = async (alerteId: string) => {
    const result = await Swal.fire({
      title: "Acquitter l'alerte ?",
      text: "Cela signifie que vous reconnaissez le danger mais qu'il persiste.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Oui, acquitter !",
      cancelButtonText: "Annuler",
      reverseButtons: true,
      customClass: {
        confirmButton: "bg-blue-600 text-white",
        cancelButton: "bg-gray-200 text-gray-800",
      },
      buttonsStyling: false,
    });

    if (!result.isConfirmed) return;

    try {
      const response = await apiPost(`/alerts/${alerteId}/acquitter`);

      if (response.success) {
        await Swal.fire({
          title: "✅ Acquittée !",
          text: "L'alerte a été acquittée avec succès.",
          icon: "success",
          timer: 2000,
          showConfirmButton: false,
        });
        fetchAlertes();
      } else {
        await Swal.fire(
          "❌ Erreur !",
          response.message || "Impossible d'acquitter.",
          "error",
        );
      }
    } catch (err: any) {
      await Swal.fire(
        "❌ Erreur !",
        err.response?.data?.message || "Une erreur est survenue.",
        "error",
      );
    }
  };

  // 🔑 Fonction de résolution avec SweetAlert2
  const handleResoudre = async (alerteId: string) => {
    const result = await Swal.fire({
      title: "Résoudre l'alerte ?",
      text: "Cela signifie que le danger est écarté et que le conducteur est revenu à un état normal.",
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "Oui, résoudre !",
      cancelButtonText: "Annuler",
      reverseButtons: true,
      customClass: {
        confirmButton: "bg-green-600 text-white",
        cancelButton: "bg-gray-200 text-gray-800",
      },
      buttonsStyling: false,
    });

    if (!result.isConfirmed) return;

    try {
      const response = await apiPost(`/alerts/${alerteId}/resoudre`);

      if (response.success) {
        await Swal.fire({
          title: "✅ Résolue !",
          text: "L'alerte a été marquée comme résolue.",
          icon: "success",
          timer: 2000,
          showConfirmButton: false,
        });
        fetchAlertes();
      } else {
        await Swal.fire(
          "❌ Erreur !",
          response.message || "Impossible de résoudre.",
          "error",
        );
      }
    } catch (err: any) {
      await Swal.fire(
        "❌ Erreur !",
        err.response?.data?.message || "Une erreur est survenue.",
        "error",
      );
    }
  };

  // Filtrer les alertes
  const filteredAlertes = alertes.filter((alerte) => {
    if (filter === "all") return true;
    if (filter === "active") return alerte.statut === "active";
    if (filter === "resolved") return alerte.statut !== "active";
    return alerte.niveau.value === filter;
  });

  // Couleurs
  const getBadgeColor = (niveau: string) => {
    switch (niveau) {
      case "SOMNOLENCE_CRITIQUE":
        return "border-red-800 bg-red-950/30 text-red-200";
      case "FATIGUE_SEVERE":
        return "border-orange-700 bg-orange-950/25 text-orange-200";
      case "FATIGUE_MODEREE":
        return "border-amber-600 bg-amber-950/20 text-amber-100";
      case "FATIGUE_LEGERE":
        return "border-sky-600 bg-sky-950/20 text-sky-100";
      default:
        return "border-slate-500 bg-slate-800 text-slate-200";
    }
  };

  const getPriorityColor = (niveau: string) => {
    switch (niveau) {
      case "SOMNOLENCE_CRITIQUE":
        return "text-red-600 font-bold";
      case "FATIGUE_SEVERE":
        return "text-orange-600 font-semibold";
      default:
        return "text-gray-600";
    }
  };

  const filterBtn = (active: boolean) =>
    `border px-3 py-1.5 text-[11px] font-bold uppercase tracking-wide transition ${
      active
        ? "border-slate-700 bg-slate-800 text-amber-100"
        : "border-slate-400 bg-slate-100/90 text-slate-700 hover:border-slate-500"
    }`;

  return (
    <div className="min-h-full space-y-4">
      <div className="dashboard-panel overflow-hidden">
        <div className="dashboard-panel-header flex flex-col gap-3 border-l-4 border-red-800 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">
              Vigilance conducteur
            </p>
            <h1 className="text-xl font-bold tracking-tight text-slate-100">Alertes fatigue</h1>
            <p className="mt-0.5 text-xs text-slate-400">Journal des événements et traitements</p>
          </div>
          <button
            type="button"
            onClick={() => navigate("/")}
            className="shrink-0 border border-slate-500 bg-slate-900 px-4 py-2 text-xs font-bold uppercase tracking-wider text-slate-200 hover:border-amber-600/80 hover:text-amber-100"
          >
            Tableau de bord
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div className="dashboard-panel border-t-4 border-t-red-600 p-3">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Actives</div>
          <div className="mt-1 font-mono text-2xl font-bold tabular-nums text-red-800">
            {alertes.filter((a) => a.statut === "active").length}
          </div>
        </div>
        <div className="dashboard-panel border-t-4 border-t-red-800 p-3">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Critiques</div>
          <div className="mt-1 font-mono text-2xl font-bold tabular-nums text-red-900">
            {alertes.filter((a) => a.niveau.value === "SOMNOLENCE_CRITIQUE").length}
          </div>
        </div>
        <div className="dashboard-panel border-t-4 border-t-amber-500 p-3">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Sévères</div>
          <div className="mt-1 font-mono text-2xl font-bold tabular-nums text-amber-900">
            {alertes.filter((a) => a.niveau.value === "FATIGUE_SEVERE").length}
          </div>
        </div>
        <div className="dashboard-panel border-t-4 border-t-emerald-600 p-3">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Historique</div>
          <div className="mt-1 font-mono text-2xl font-bold tabular-nums text-emerald-900">{alertes.length}</div>
        </div>
      </div>

      <div className="dashboard-panel p-4">
        <div className="mb-3 text-[10px] font-bold uppercase tracking-[0.15em] text-slate-600">Filtres</div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => setFilter("all")} className={filterBtn(filter === "all")}>
            Toutes ({alertes.length})
          </button>
          <button type="button" onClick={() => setFilter("active")} className={filterBtn(filter === "active")}>
            Actives ({alertes.filter((a) => a.statut === "active").length})
          </button>
          <button type="button" onClick={() => setFilter("SOMNOLENCE_CRITIQUE")} className={filterBtn(filter === "SOMNOLENCE_CRITIQUE")}>
            Critiques
          </button>
          <button type="button" onClick={() => setFilter("FATIGUE_SEVERE")} className={filterBtn(filter === "FATIGUE_SEVERE")}>
            Sévères
          </button>
          <button type="button" onClick={() => setFilter("resolved")} className={filterBtn(filter === "resolved")}>
            Résolues
          </button>
        </div>
      </div>

      <div className="dashboard-panel overflow-hidden">
        <div className="dashboard-panel-header flex items-center justify-between border-l-4 border-red-700 px-3 py-2">
          <h2 className="text-[11px] font-bold uppercase tracking-[0.15em]">Registre des alertes</h2>
          <span className="font-mono text-[10px] text-slate-400">{filteredAlertes.length} ligne(s)</span>
        </div>
        {loading ? (
          <div className="flex flex-col items-center gap-2 border-t border-slate-400/60 bg-white py-12 text-xs uppercase tracking-wide text-slate-500">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-300 border-t-slate-700" />
            Chargement…
          </div>
        ) : filteredAlertes.length === 0 ? (
          <div className="border-t border-dashed border-slate-400 py-12 text-center text-xs font-semibold uppercase tracking-wide text-slate-500">
            Aucune alerte pour ces filtres
          </div>
        ) : (
          <div className="overflow-x-auto border-t border-slate-400/60 bg-white">
            <table className="table-industrial min-w-full divide-y divide-slate-200">
              <thead className="dashboard-panel-header">
                <tr>
                  <th className="px-4 py-3 text-left">Niveau</th>
                  <th className="px-4 py-3 text-left">Message</th>
                  <th className="px-4 py-3 text-left">Véhicule</th>
                  <th className="px-4 py-3 text-left">Conducteur</th>
                  <th className="px-4 py-3 text-left">Horodatage</th>
                  <th className="px-4 py-3 text-left">Traitement</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {filteredAlertes.map((alerte) => (
                  <tr
                    key={alerte.id}
                    className={`cursor-pointer hover:bg-slate-50/90 ${
                      alerte.statut === "active" && alerte.niveau.value === "SOMNOLENCE_CRITIQUE"
                        ? "bg-red-50/50"
                        : ""
                    }`}
                    onClick={() => setSelectedAlerte(alerte)}
                  >
                    <td className="whitespace-nowrap px-4 py-3">
                      <span className={`inline-flex border px-2 py-0.5 text-[11px] font-semibold ${getBadgeColor(alerte.niveau.value)}`}>
                        {alerte.niveau.label}
                      </span>
                    </td>
                    <td className="max-w-xs px-4 py-3">
                      <div className={`text-sm font-medium ${getPriorityColor(alerte.niveau.value)}`}>{alerte.message}</div>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <div className="font-mono text-sm text-slate-900">{alerte.vehicule.immatriculation}</div>
                      <div className="text-xs text-slate-500">{alerte.vehicule.type}</div>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-800">
                      {alerte.conducteur?.nom || "—"}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-slate-600">
                      {new Date(alerte.horodatage).toLocaleString("fr-FR")}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3" onClick={(e) => e.stopPropagation()}>
                      {alerte.statut === "active" && !alerte.acquitteeAt ? (
                        <button
                          type="button"
                          onClick={() => handleAcquitter(alerte.id)}
                          className="flex items-center gap-1 border border-sky-700 bg-sky-950/30 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-sky-200 hover:bg-sky-950/50"
                          title="Acquitter"
                        >
                          Acquitter
                        </button>
                      ) : alerte.statut === "active" && alerte.acquitteeAt ? (
                        <button
                          type="button"
                          onClick={() => handleResoudre(alerte.id)}
                          className="flex items-center gap-1 border border-emerald-700 bg-emerald-950/30 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-emerald-200 hover:bg-emerald-950/50"
                          title="Résoudre"
                        >
                          Résoudre
                        </button>
                      ) : (
                        <span className="border border-emerald-800 bg-emerald-950/20 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-emerald-800">
                          Clôturée
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {selectedAlerte && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-[2px]">
          <div className="dashboard-panel max-h-[90vh] w-full max-w-2xl overflow-y-auto border-amber-600/40">
            <div className="dashboard-panel-header flex items-start justify-between gap-4 border-l-4 border-amber-500 px-4 py-3">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400">Détail alerte</p>
                <h2 className="text-lg font-bold text-slate-100">{selectedAlerte.niveau.label}</h2>
                <p className="mt-1 font-mono text-[11px] text-slate-400">{selectedAlerte.idAlerte}</p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedAlerte(null)}
                className="border border-slate-500 px-2 py-1 text-xs font-bold uppercase tracking-wide text-slate-300 hover:bg-slate-800"
              >
                Fermer
              </button>
            </div>
            <div className="space-y-3 border-t border-slate-400/60 bg-slate-50 p-4 text-sm text-slate-800">
              <p className="leading-relaxed">{selectedAlerte.message}</p>
              <div className="grid gap-2 border border-slate-300 bg-white p-3 font-mono text-xs">
                <div className="flex justify-between gap-4">
                  <span className="text-slate-500">Véhicule</span>
                  <span>{selectedAlerte.vehicule.immatriculation}</span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-slate-500">Type</span>
                  <span>{selectedAlerte.vehicule.type}</span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-slate-500">Horodatage</span>
                  <span>{new Date(selectedAlerte.horodatage).toLocaleString("fr-FR")}</span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-slate-500">Statut</span>
                  <span className="uppercase">{selectedAlerte.statut}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
