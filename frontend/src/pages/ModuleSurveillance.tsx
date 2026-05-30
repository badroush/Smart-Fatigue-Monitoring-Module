import { useEffect, useState, useCallback } from "react";
import { fetchModuleAlerts, ModuleAlerte } from "../services/api";
import { subscribeSupervisorAlertsStream } from "../services/alertsStream";

export default function ModuleSurveillance() {
  const [alertes, setAlertes] = useState<ModuleAlerte[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

    // 🔑 Fonction de regroupement par véhicule
  const groupAlertesByVehicule = (alertes: ModuleAlerte[]) => {
    const grouped: Record<string, ModuleAlerte[]> = {};
    
    alertes.forEach(alerte => {
      const key = alerte.vehicule.immatriculation;
      if (!grouped[key]) {
        grouped[key] = [];
      }
      grouped[key].push(alerte);
    });
    
    return grouped;
  };

  const loadAlertes = useCallback(async (silent = false) => {
    try {
      if (!silent) {
        setLoading(true);
        setError(null);
      }

      const response = await fetchModuleAlerts();

      if (response.success && response.data?.alertes) {
        setAlertes(response.data.alertes);
      } else {
        setAlertes([]);
        setError(response.error || "Aucune donnée reçue");
      }
    } catch (err: unknown) {
      console.error("Erreur chargement alertes module:", err);
      const msg =
        err &&
        typeof err === "object" &&
        "response" in err &&
        err.response &&
        typeof err.response === "object" &&
        "data" in err.response &&
        err.response.data &&
        typeof err.response.data === "object" &&
        "error" in err.response.data
          ? String((err.response.data as { error?: string }).error)
          : "Erreur réseau";
      setError(msg);
      setAlertes([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadAlertes(false);
    const unsub = subscribeSupervisorAlertsStream(() => void loadAlertes(true));
    const interval = setInterval(() => void loadAlertes(true), 10000);
    return () => {
      unsub();
      clearInterval(interval);
    };
  }, [loadAlertes]);

  // Icônes par type d'alerte
  const getIconByType = (type: string) => {
    switch (type) {
      case "batterie_faible":
        return "🔋";
      case "surchauffe":
        return "🌡️";
      case "port_deconnecte":
        return "🔌";
      case "communication_perdue":
        return "📶";
      default:
        return "⚠️";
    }
  };

  // Couleurs par type d'alerte
  const getColorByType = (type: string) => {
    switch (type) {
      case "batterie_faible":
        return "border-amber-600 bg-amber-950/25 text-amber-100";
      case "surchauffe":
        return "border-red-700 bg-red-950/30 text-red-100";
      case "port_deconnecte":
        return "border-orange-600 bg-orange-950/25 text-orange-100";
      case "communication_perdue":
        return "border-violet-600 bg-violet-950/25 text-violet-100";
      default:
        return "border-slate-500 bg-slate-800 text-slate-200";
    }
  };

  // Labels lisibles
  const getLabelByType = (type: string) => {
    const labels: Record<string, string> = {
      batterie_faible: "Batterie faible",
      surchauffe: "Surchauffe",
      port_deconnecte: "Port déconnecté",
      communication_perdue: "Communication perdue",
    };
    return labels[type] || type.replace("_", " ");
  };

  return (
    <div className="min-h-full space-y-4">
      <div className="dashboard-panel overflow-hidden">
        <div className="dashboard-panel-header border-l-4 border-amber-500 px-4 py-3">
          <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">Télémétrie embarquée</p>
          <h1 className="text-xl font-bold tracking-tight text-slate-100">Surveillance module SFAM</h1>
          <p className="mt-0.5 text-xs text-slate-400">État matériel, batterie, connexion — regroupement par véhicule</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div className="dashboard-panel border-t-4 border-t-slate-600 p-3">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Modules</div>
          <div className="mt-1 font-mono text-2xl font-bold tabular-nums text-slate-800">9</div>
        </div>
        <div className="dashboard-panel border-t-4 border-t-red-600 p-3">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Alertes actives</div>
          <div className="mt-1 font-mono text-2xl font-bold tabular-nums text-red-800">{loading ? "—" : alertes.length}</div>
        </div>
        <div className="dashboard-panel border-t-4 border-t-amber-500 p-3">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Batterie</div>
          <div className="mt-1 font-mono text-2xl font-bold tabular-nums text-amber-900">
            {loading ? "—" : alertes.filter((a) => a.type === "batterie_faible").length}
          </div>
        </div>
        <div className="dashboard-panel border-t-4 border-t-red-800 p-3">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Surchauffe</div>
          <div className="mt-1 font-mono text-2xl font-bold tabular-nums text-red-900">
            {loading ? "—" : alertes.filter((a) => a.type === "surchauffe").length}
          </div>
        </div>
      </div>

      <div className="dashboard-panel overflow-hidden">
        <div className="dashboard-panel-header flex items-center justify-between border-l-4 border-violet-700 px-3 py-2">
          <h2 className="text-[11px] font-bold uppercase tracking-[0.15em]">Alertes module par véhicule</h2>
          <span className="font-mono text-[10px] text-slate-400">MAJ ~10 s</span>
        </div>

        {error && (
          <div className="border-b border-red-900/50 bg-red-950/40 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-red-200">
            {error}
          </div>
        )}

        <div className="border-t border-slate-400/60 bg-slate-100/80 p-4">
          {loading ? (
            <div className="flex flex-col items-center gap-2 py-10 text-xs uppercase tracking-wide text-slate-500">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-300 border-t-slate-700" />
              Chargement…
            </div>
          ) : alertes.length === 0 ? (
            <div className="border border-dashed border-emerald-700/60 bg-emerald-950/10 py-10 text-center text-xs font-semibold uppercase tracking-wide text-emerald-800">
              Aucune alerte module — nominal
            </div>
          ) : (
            <div className="space-y-3">
              {Object.entries(groupAlertesByVehicule(alertes)).map(([immatriculation, alertesVehicule]) => (
                <div
                  key={immatriculation}
                  className="border border-slate-400 border-l-4 border-l-slate-600 bg-white p-4 shadow-sm transition hover:border-slate-500"
                >
                  <div className="font-mono text-base font-bold text-slate-900">{immatriculation}</div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {alertesVehicule.map((alerte) => (
                      <span
                        key={alerte.id}
                        className={`inline-flex items-center gap-1 border px-2 py-1 text-[10px] font-bold uppercase tracking-wide ${getColorByType(alerte.type)}`}
                        title={alerte.message}
                      >
                        <span aria-hidden>{getIconByType(alerte.type)}</span>
                        {getLabelByType(alerte.type)}
                      </span>
                    ))}
                  </div>
                  <div className="mt-2 font-mono text-[10px] text-slate-500">
                    Dernière alerte :{" "}
                    {new Date(Math.max(...alertesVehicule.map((a) => new Date(a.horodatage).getTime()))).toLocaleString("fr-FR")}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
