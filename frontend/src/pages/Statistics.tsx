import { useState, useEffect } from "react";
import { Line, Bar, Pie } from "react-chartjs-2";
import { apiGet } from "../services/api";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler,
);

interface GlobalStats {
  totalVehicules: number;
  vehiculesActifs: number;
  alertesActives: number;
  alertesModuleActives: number;
  totalPaquets: number;
  moyenneScoreGlobal: number;
  repartitionNiveaux: Record<string, number>;
  repartitionVehicules: Record<string, number>;
  repartitionConducteurs: Record<string, number>;
  evolutionJournaliere: Array<{ date: string; evenements: number }>;
}

export default function StatisticsPage() {
  const [stats, setStats] = useState<GlobalStats>({
    totalVehicules: 0,
    vehiculesActifs: 0,
    alertesActives: 0,
    alertesModuleActives: 0,
    totalPaquets: 0,
    moyenneScoreGlobal: 0,
    repartitionNiveaux: {},
    repartitionVehicules: {},
    repartitionConducteurs: {},
    evolutionJournaliere: [],
  });
  const [loading, setLoading] = useState(true);
  const [periode, setPeriode] = useState("7j");

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);
        const response = await apiGet<GlobalStats>("/statistics/global");

        if (response.success && response.data) {
          setStats({
            totalVehicules: response.data.totalVehicules || 0,
            vehiculesActifs: response.data.vehiculesActifs || 0,
            alertesActives: response.data.alertesActives || 0,
            alertesModuleActives: response.data.alertesModuleActives || 0,
            totalPaquets: response.data.totalPaquets || 0,
            moyenneScoreGlobal: response.data.moyenneScoreGlobal || 0,
            repartitionNiveaux: response.data.repartitionNiveaux || {},
            repartitionVehicules: response.data.repartitionVehicules || {},
            repartitionConducteurs: response.data.repartitionConducteurs || {},
            evolutionJournaliere: response.data.evolutionJournaliere || [],
          });
        }
      } catch (err) {
        console.error("Erreur chargement statistiques:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
    const interval = setInterval(fetchStats, 60000);
    return () => clearInterval(interval);
  }, []);

  // Données pour le graphique linéaire (évolution temporelle)
  const lineData = {
    labels: (stats?.evolutionJournaliere || []).map((e) => e.date) || [],
    datasets: [
      {
        label: "Événements journaliers",
        data:
          (stats?.evolutionJournaliere || []).map((e) => e.evenements) || [],
        borderColor: "#1e3a8a",
        backgroundColor: "rgba(30, 58, 138, 0.1)",
        tension: 0.3,
        fill: true,
      },
    ],
  };

  // Données pour la répartition des niveaux
  const niveauLabels = [
    "NORMAL",
    "FATIGUE_LEGERE",
    "FATIGUE_MODEREE",
    "FATIGUE_SEVERE",
    "SOMNOLENCE_CRITIQUE",
  ];
  const niveauColors = ["#10b981", "#fbbf24", "#f59e0b", "#ef4444", "#dc2626"];

  const barData = {
    labels: niveauLabels.map((l) =>
      l.replace("FATIGUE_", "").replace("_", " ").toLowerCase(),
    ),
    datasets: [
      {
        label: "Nombre d'événements",
        data: niveauLabels.map((n) => stats?.repartitionNiveaux?.[n] || 0),
        backgroundColor: niveauColors,
      },
    ],
  };

  // Données pour la répartition par véhicule
  const pieData = {
    labels: Object.keys(stats?.repartitionVehicules || {}),
    datasets: [
      {
        data: Object.values(stats?.repartitionVehicules || {}),
        backgroundColor: [
          "#1e3a8a",
          "#0ea5e9",
          "#10b981",
          "#f59e0b",
          "#ef4444",
          "#8b5cf6",
          "#ec4899",
          "#64748b",
          "#f97316",
          "#22c55e",
        ],
        borderWidth: 1,
      },
    ],
  };

  const options = {
    responsive: true,
    plugins: {
      legend: { position: "top" as const },
      title: { display: true, text: "Évolution des événements" },
    },
  };

  const barOptions = {
    responsive: true,
    plugins: {
      legend: { position: "top" as const },
      title: { display: true, text: "Répartition des niveaux de vigilance" },
    },
  };

  const pieOptions = {
    responsive: true,
    plugins: {
      legend: { position: "right" as const },
      title: { display: true, text: "Répartition par véhicule" },
    },
  };

  return (
    <div className="min-h-full space-y-4">
      <div className="dashboard-panel overflow-hidden">
        <div className="dashboard-panel-header flex flex-col gap-3 border-l-4 border-emerald-700 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">Indicateurs agrégés</p>
            <h1 className="text-xl font-bold tracking-tight text-slate-100">Statistiques</h1>
            <p className="mt-0.5 text-xs text-slate-400">Vue globale flotte et événements</p>
          </div>
          <div className="flex items-center gap-2">
            <label htmlFor="stat-periode" className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Période
            </label>
            <select
              id="stat-periode"
              value={periode}
              onChange={(e) => setPeriode(e.target.value)}
              className="border border-slate-500 bg-slate-900 px-3 py-2 text-xs font-mono text-slate-100 focus:border-amber-600 focus:outline-none"
            >
              <option value="24h">24 h</option>
              <option value="7j">7 jours</option>
              <option value="30j">30 jours</option>
              <option value="90j">90 jours</option>
            </select>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div className="dashboard-panel border-t-4 border-t-slate-600 p-3">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Véhicules</div>
          <div className="mt-1 font-mono text-2xl font-bold tabular-nums text-slate-800">{loading ? "—" : stats?.totalVehicules}</div>
        </div>
        <div className="dashboard-panel border-t-4 border-t-emerald-600 p-3">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Actifs</div>
          <div className="mt-1 font-mono text-2xl font-bold tabular-nums text-emerald-800">{loading ? "—" : stats?.vehiculesActifs}</div>
        </div>
        <div className="dashboard-panel border-t-4 border-t-red-600 p-3">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Alertes fatigue</div>
          <div className="mt-1 font-mono text-2xl font-bold tabular-nums text-red-800">{loading ? "—" : stats?.alertesActives}</div>
        </div>
        <div className="dashboard-panel border-t-4 border-t-amber-500 p-3">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Alertes module</div>
          <div className="mt-1 font-mono text-2xl font-bold tabular-nums text-amber-900">{loading ? "—" : stats?.alertesModuleActives}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="dashboard-panel overflow-hidden">
          <div className="dashboard-panel-header border-l-4 border-sky-600 px-3 py-2">
            <h2 className="text-[11px] font-bold uppercase tracking-[0.15em]">Évolution temporelle</h2>
          </div>
          <div className="border-t border-slate-400/60 bg-white p-4">
            {loading ? (
              <div className="flex h-80 items-center justify-center text-xs uppercase tracking-wide text-slate-500">Chargement…</div>
            ) : (
              <div className="h-80">
                <Line data={lineData} options={options} />
              </div>
            )}
          </div>
        </div>

        <div className="dashboard-panel overflow-hidden">
          <div className="dashboard-panel-header border-l-4 border-violet-700 px-3 py-2">
            <h2 className="text-[11px] font-bold uppercase tracking-[0.15em]">Analyse détaillée</h2>
          </div>
          <div className="border-t border-slate-400/60 bg-white p-4">
            {loading ? (
              <div className="flex h-80 items-center justify-center text-xs uppercase tracking-wide text-slate-500">Chargement…</div>
            ) : (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="h-64 min-h-[200px]">
                  <Bar data={barData} options={barOptions} />
                </div>
                <div className="h-64 min-h-[200px]">
                  <Pie data={pieData} options={pieOptions} />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        <div className="dashboard-panel overflow-hidden">
          <div className="dashboard-panel-header border-l-4 border-slate-500 px-3 py-2">
            <h3 className="text-[11px] font-bold uppercase tracking-[0.12em]">Top véhicules</h3>
          </div>
          <div className="border-t border-slate-400/60 bg-slate-50 p-4">
            {loading ? (
              <div className="text-xs text-slate-500">…</div>
            ) : (
              <ul className="space-y-2 font-mono text-sm">
                {Object.entries(stats?.repartitionVehicules || {})
                  .sort(([, a], [, b]) => b - a)
                  .slice(0, 5)
                  .map(([vehicule, count]) => (
                    <li key={vehicule} className="flex justify-between border-b border-slate-200 pb-1 text-slate-800">
                      <span className="truncate">{vehicule}</span>
                      <span className="shrink-0 font-bold tabular-nums">{count}</span>
                    </li>
                  ))}
              </ul>
            )}
          </div>
        </div>

        <div className="dashboard-panel overflow-hidden">
          <div className="dashboard-panel-header border-l-4 border-red-800 px-3 py-2">
            <h3 className="text-[11px] font-bold uppercase tracking-[0.12em]">Synthèse alertes</h3>
          </div>
          <div className="space-y-3 border-t border-slate-400/60 bg-slate-50 p-4 text-sm text-slate-800">
            {loading ? (
              <div className="text-xs text-slate-500">…</div>
            ) : (
              <>
                <div className="flex justify-between font-mono">
                  <span className="text-slate-600">Fatigue</span>
                  <span className="font-bold text-red-700 tabular-nums">{stats?.alertesActives}</span>
                </div>
                <div className="flex justify-between font-mono">
                  <span className="text-slate-600">Module</span>
                  <span className="font-bold text-amber-800 tabular-nums">{stats?.alertesModuleActives}</span>
                </div>
                <div className="flex justify-between border-t border-slate-300 pt-2 font-mono font-bold">
                  <span>Total</span>
                  <span className="tabular-nums text-slate-900">{(stats?.alertesActives || 0) + (stats?.alertesModuleActives || 0)}</span>
                </div>
              </>
            )}
          </div>
        </div>

        <div className="dashboard-panel overflow-hidden md:col-span-2 lg:col-span-1">
          <div className="dashboard-panel-header border-l-4 border-emerald-700 px-3 py-2">
            <h3 className="text-[11px] font-bold uppercase tracking-[0.12em]">Performance</h3>
          </div>
          <div className="space-y-3 border-t border-slate-400/60 bg-slate-50 p-4 text-sm">
            {loading ? (
              <div className="text-xs text-slate-500">…</div>
            ) : (
              <>
                <div className="flex justify-between font-mono">
                  <span className="text-slate-600">Score moyen</span>
                  <span className="font-bold tabular-nums">{stats?.moyenneScoreGlobal}</span>
                </div>
                <div className="flex justify-between font-mono">
                  <span className="text-slate-600">Événements (paquets)</span>
                  <span className="font-bold tabular-nums">{stats?.totalPaquets}</span>
                </div>
                <div className="flex justify-between font-mono">
                  <span className="text-slate-600">Activité flotte</span>
                  <span className="font-bold tabular-nums">
                    {stats?.totalVehicules ? Math.round((stats.vehiculesActifs / stats.totalVehicules) * 100) : 0}%
                  </span>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
