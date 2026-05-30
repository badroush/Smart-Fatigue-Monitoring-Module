import { useEffect, useState } from "react";
import {
  apiGet,
  apiCreateVehicle,
  apiUpdateVehicle,
  apiDeleteVehicle,
} from "../services/api";
import VehicleModal from "../components/vehicles/VehicleModal";
import EntityDeepStatsModal from "../components/stats/EntityDeepStatsModal";
import Swal from "sweetalert2";

interface Vehicule {
  id: string;
  immatriculation: string;
  type: string;
  statut: string;
  isMonitored: boolean;
  isActive: boolean;
  derniereCommunication: string;
  conducteur?: string;
  sfamApiKey?: string;
}

interface VehiculesResponse {
  total: number;
  vehicules: Vehicule[];
}

export default function VehiclesPage() {
  const [filter, setFilter] = useState("tous");
  const [search, setSearch] = useState("");
  const [vehicules, setVehicules] = useState<Vehicule[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<Vehicule | null>(null);
  const [statsVehicle, setStatsVehicle] = useState<Vehicule | null>(null);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  // Charger les véhicules
  const fetchVehicules = async () => {
    try {
      setLoading(true);
      const response = await apiGet<VehiculesResponse>("/vehicles");

      if (response.success && response.data?.vehicules) {
        setVehicules(response.data.vehicules);
      } else {
        setVehicules([]);
      }
    } catch (err) {
      console.error("Erreur chargement véhicules:", err);
      setVehicules([]);
      setMessage({
        type: "error",
        text: "Erreur lors du chargement des véhicules",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVehicules();
    const interval = setInterval(fetchVehicules, 30000);
    return () => clearInterval(interval);
  }, []);

  // Filtrer les véhicules
  const filteredVehicules = vehicules.filter((vehicule) => {
    if (filter !== "tous") {
      if (filter === "actifs" && !vehicule.isMonitored) return false;
      if (filter === "inactifs" && vehicule.isMonitored) return false;
      if (filter === "maintenance" && vehicule.statut !== "maintenance")
        return false;
    }

    const searchLower = search.toLowerCase();
    return (
      vehicule.immatriculation.toLowerCase().includes(searchLower) ||
      vehicule.type.toLowerCase().includes(searchLower)
    );
  });

  // Gestion du formulaire
  const handleFormSubmit = async (data: any) => {
    try {
      let response;

      if (editingVehicle) {
        // Mise à jour
        response = await apiUpdateVehicle(editingVehicle.id, data);
        setMessage({
          type: "success",
          text: "Véhicule mis à jour avec succès",
        });
      } else {
        // Création
        response = await apiCreateVehicle(data);
        setMessage({ type: "success", text: "Véhicule créé avec succès" });
      }

      if (response.success) {
        setShowModal(false);
        setEditingVehicle(null);
        fetchVehicules();
      } else {
        setMessage({
          type: "error",
          text: response.message || "Erreur lors de l'opération",
        });
      }
    } catch (err: any) {
      setMessage({
        type: "error",
        text: err.response?.data?.message || "Erreur serveur",
      });
    }
  };
  // Supprimer un véhicule
const handleDelete = async (id: string, immatriculation: string) => {
  const result = await Swal.fire({
    title: 'Êtes-vous sûr ?',
    text: `La suppression du véhicule ${immatriculation} est irréversible !`,
    icon: 'warning',
    showCancelButton: true,
    confirmButtonText: 'Oui, supprimer !',
    cancelButtonText: 'Annuler',
    reverseButtons: true,
    customClass: {
      popup: 'rounded-lg shadow-xl border border-gray-200',
      title: 'text-xl font-bold text-gray-800 mb-2',
      htmlContainer: 'text-gray-600 mb-4',
      confirmButton: 'bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded-lg transition-colors',
      cancelButton: 'bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium py-2 px-4 rounded-lg transition-colors ml-2',
    },
    buttonsStyling: false, // ⚠️ DÉSACTIVE le style par défaut de SweetAlert2
  });

  if (!result.isConfirmed) return;

  try {
    const response = await apiDeleteVehicle(id);
    if (response.success) {
      await Swal.fire({
        title: 'Supprimé !',
        text: 'Le véhicule a été supprimé avec succès.',
        icon: 'success',
        timer: 2000,
        showConfirmButton: false,
        customClass: {
          popup: 'rounded-lg shadow-lg',
        },
      });
      fetchVehicules();
    } else {
      await Swal.fire('Erreur !', response.message || 'Impossible de supprimer.', 'error');
    }
  } catch (err: any) {
    await Swal.fire('Erreur serveur', err.response?.data?.message || 'Une erreur est survenue.', 'error');
  }
};

  // Déterminer le statut visuel
  const getStatutBadge = (statut: string, isMonitored: boolean) => {
    if (!isMonitored) {
      return (
        <span className="border border-slate-500 bg-slate-200 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-slate-700">
          Non surveillé
        </span>
      );
    }

    switch (statut) {
      case "en_service":
        return (
          <span className="flex items-center gap-1.5 border border-emerald-700 bg-emerald-950/20 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-emerald-800">
            <span className="h-2 w-2 shrink-0 rounded-full bg-emerald-500" />
            En service
          </span>
        );
      case "maintenance":
        return (
          <span className="border border-amber-600 bg-amber-950/20 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-amber-900">
            Maintenance
          </span>
        );
      case "hors_service":
        return (
          <span className="border border-red-700 bg-red-950/20 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-red-800">
            Hors service
          </span>
        );
      default:
        return (
          <span className="border border-slate-500 bg-slate-100 px-2 py-0.5 text-[11px] font-semibold uppercase text-slate-800">
            {statut}
          </span>
        );
    }
  };

  // Déterminer si la communication est récente
  const isCommunicationRecente = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    return diff < 300000; // 5 minutes
  };

  return (
    <div className="min-h-full space-y-4">
      {message && (
        <div
          className={`border px-3 py-2 text-xs font-semibold uppercase tracking-wide ${
            message.type === "success"
              ? "border-emerald-700 bg-emerald-950/30 text-emerald-200"
              : "border-red-800 bg-red-950/40 text-red-200"
          }`}
        >
          {message.text}
        </div>
      )}

      <div className="dashboard-panel overflow-hidden">
        <div className="dashboard-panel-header flex flex-col gap-3 border-l-4 border-amber-500 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">
              Gestion de flotte
            </p>
            <h1 className="text-xl font-bold tracking-tight text-slate-100">
              Véhicules
            </h1>
            <p className="mt-0.5 text-xs text-slate-400">
              Immatriculations, statut et dernière communication
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setEditingVehicle(null);
              setShowModal(true);
            }}
            className="flex shrink-0 items-center gap-2 border border-amber-600/80 bg-slate-900 px-4 py-2 text-xs font-bold uppercase tracking-wider text-amber-100 transition hover:border-amber-500 hover:bg-slate-800"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Ajouter
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div className="dashboard-panel border-t-4 border-t-slate-600 p-3">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Total</div>
          <div className="mt-1 font-mono text-2xl font-bold tabular-nums text-slate-800">{vehicules.length}</div>
        </div>
        <div className="dashboard-panel border-t-4 border-t-emerald-600 p-3">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Surveillés</div>
          <div className="mt-1 font-mono text-2xl font-bold tabular-nums text-emerald-800">
            {vehicules.filter((v) => v.isMonitored).length}
          </div>
        </div>
        <div className="dashboard-panel border-t-4 border-t-amber-500 p-3">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">En service</div>
          <div className="mt-1 font-mono text-2xl font-bold tabular-nums text-amber-900">
            {vehicules.filter((v) => v.statut === "en_service" && v.isMonitored).length}
          </div>
        </div>
        <div className="dashboard-panel border-t-4 border-t-red-600 p-3">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Maintenance</div>
          <div className="mt-1 font-mono text-2xl font-bold tabular-nums text-red-800">
            {vehicules.filter((v) => v.statut === "maintenance").length}
          </div>
        </div>
      </div>

      <div className="dashboard-panel p-4">
        <div className="mb-3 text-[10px] font-bold uppercase tracking-[0.15em] text-slate-600">Filtres & recherche</div>
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="min-w-0 flex-1">
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                <svg className="h-4 w-4 text-slate-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                </svg>
              </div>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Immatriculation, type…"
                className="w-full border border-slate-500 bg-white py-2 pl-9 pr-3 text-sm text-slate-900 placeholder-slate-400 focus:border-slate-700 focus:outline-none focus:ring-1 focus:ring-slate-500"
              />
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {[
              { key: "tous" as const, label: `Tous (${vehicules.length})` },
              { key: "actifs" as const, label: `Actifs (${vehicules.filter((v) => v.isMonitored).length})` },
              { key: "inactifs" as const, label: `Inactifs (${vehicules.filter((v) => !v.isMonitored).length})` },
              { key: "maintenance" as const, label: `Maint. (${vehicules.filter((v) => v.statut === "maintenance").length})` },
            ].map(({ key, label }) => (
              <button
                key={key}
                type="button"
                onClick={() => setFilter(key)}
                className={`border px-3 py-1.5 text-[11px] font-bold uppercase tracking-wide transition ${
                  filter === key
                    ? "border-slate-700 bg-slate-800 text-amber-100"
                    : "border-slate-400 bg-slate-100/90 text-slate-700 hover:border-slate-500"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="dashboard-panel overflow-hidden">
        <div className="dashboard-panel-header flex items-center justify-between border-l-4 border-sky-700 px-3 py-2">
          <h2 className="text-[11px] font-bold uppercase tracking-[0.15em]">Registre véhicules</h2>
          <span className="font-mono text-[10px] text-slate-400">{filteredVehicules.length} ligne(s)</span>
        </div>
        <div className="overflow-x-auto border-t border-slate-400/60 bg-white">
          <table className="table-industrial min-w-full divide-y divide-slate-200">
            <thead className="dashboard-panel-header">
              <tr>
                <th className="px-4 py-3 text-left">Immatriculation</th>
                <th className="px-4 py-3 text-left">Type</th>
                <th className="px-4 py-3 text-left">Statut</th>
                <th className="px-4 py-3 text-left">Dernière com.</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {filteredVehicules.map((vehicule) => (
                <tr key={vehicule.id} className="hover:bg-slate-50/90">
                  <td className="whitespace-nowrap px-4 py-3">
                    <div className="font-mono font-semibold text-slate-900">{vehicule.immatriculation}</div>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3">
                    <span className="inline-flex border border-slate-400 bg-slate-100 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-slate-800">
                      {vehicule.type}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3">
                    {getStatutBadge(vehicule.statut, vehicule.isMonitored)}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm">
                    <div
                      className={`flex items-center font-mono text-xs ${
                        isCommunicationRecente(vehicule.derniereCommunication)
                          ? "text-emerald-700"
                          : "text-red-700"
                      }`}
                    >
                      <span
                        className={`mr-2 h-2 w-2 shrink-0 rounded-full ${
                          isCommunicationRecente(vehicule.derniereCommunication)
                            ? "bg-emerald-500"
                            : "bg-red-500"
                        }`}
                      />
                      {new Date(vehicule.derniereCommunication).toLocaleTimeString("fr-FR")}
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-right">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingVehicle(vehicule);
                        setShowModal(true);
                      }}
                      className="mr-2 border border-slate-400 bg-slate-100 p-1.5 text-slate-800 hover:border-slate-600"
                      title="Modifier"
                    >
                      <svg
                        className="w-5 h-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                        />
                      </svg>
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        handleDelete(vehicule.id, vehicule.immatriculation)
                      }
                      className="mr-2 border border-red-800/60 bg-red-950/20 p-1.5 text-red-700 hover:bg-red-950/40"
                      title="Supprimer"
                    >
                      <svg
                        className="w-5 h-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                        />
                      </svg>
                    </button>
                    <button
                      type="button"
                      onClick={() => setStatsVehicle(vehicule)}
                      className="border border-amber-700/80 bg-amber-950/30 p-1.5 text-amber-800 hover:bg-amber-950/50"
                      title="Statistiques détaillées"
                    >
                      <svg
                        className="h-5 w-5"
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
        </div>

        {filteredVehicules.length === 0 && !loading && (
          <div className="border-t border-dashed border-slate-400 py-10 text-center text-xs font-semibold uppercase tracking-wide text-slate-500">
            Aucun véhicule trouvé
          </div>
        )}

        {loading && (
          <div className="flex flex-col items-center justify-center gap-2 border-t border-slate-400/60 py-10 text-xs uppercase tracking-wide text-slate-500">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-300 border-t-slate-700" />
            Chargement…
          </div>
        )}
      </div>

      {/* Modal CRUD */}
      <EntityDeepStatsModal
        open={statsVehicle != null}
        onClose={() => setStatsVehicle(null)}
        mode="vehicle"
        entityId={statsVehicle?.id ?? null}
        subtitle={statsVehicle?.immatriculation}
      />

      <VehicleModal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false);
          setEditingVehicle(null);
          setMessage(null);
        }}
        onSubmit={handleFormSubmit}
        vehicle={editingVehicle}
        title={editingVehicle ? "Modifier le véhicule" : "Ajouter un véhicule"}
      />
    </div>
  );
}
