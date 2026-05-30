import { useEffect, useState, useRef } from "react";
import { useAlertes, AlertesResponse } from "./hooks/useAlertes";
import { apiGet } from "./services/api";
import { subscribeSupervisorAlertsStream } from "./services/alertsStream";
import { StatistiquesVehicule } from "./types/api";
import VehicleMap from "./components/layout/dashboard/VehicleMap";
import ModuleSurveillance from "./pages/ModuleSurveillance";

import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  useLocation,
} from "react-router-dom";
import Layout from "./components/layout/Layout";
import AuthGuard from "./components/layout/AuthGuard";
import AdminRoute from "./components/layout/AdminRoute";
import LoginPage from "./pages/Login";
import AlertsPage from "./pages/Alerts";
import StatisticsPage from "./pages/Statistics";
import VehiclesPage from "./pages/Vehicles";
import ConducteursPage from "./pages/Conducteurs";
import SettingsPage from "./pages/Settings";

// 🔑 Composant pour maintenir la position du scroll
function ScrollPreserver({ children }: { children: React.ReactNode }) {
  const scrollPosition = useRef(0);
  const isManualScroll = useRef(false);

  useEffect(() => {
    const handleScroll = () => {
      if (!isManualScroll.current) {
        scrollPosition.current = window.scrollY;
      }
    };

    const handleWheel = () => {
      isManualScroll.current = true;
      setTimeout(() => {
        isManualScroll.current = false;
      }, 100);
    };

    window.addEventListener("scroll", handleScroll);
    window.addEventListener("wheel", handleWheel);
    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("wheel", handleWheel);
    };
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      window.scrollTo(0, scrollPosition.current);
    }, 100);
    return () => clearTimeout(timer);
  }, [children]);

  return <>{children}</>;
}

// Crée un composant pour gérer le scroll entre pages
function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
}

function Dashboard() {
  // 🔑 Utiliser l'endpoint global /statistics (sans ID) pour éviter l'erreur 404
  const {
    alertes,
    loading: loadingAlertes,
    error: errorAlertes,
  } = useAlertes("global");
  const [statistiques, setStatistiques] = useState<StatistiquesVehicule | null>(
    null,
  );
  const [loadingStats, setLoadingStats] = useState(true);
  const [vehiculesCount, setVehiculesCount] = useState(9); // Valeur par défaut
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  // 🔑 Rafraîchissement doux avec debounce
  const refreshData = async () => {
    setIsRefreshing(true);
    setLastRefresh(new Date());

    try {
      // Rafraîchir les statistiques avec gestion d'erreur silencieuse
      try {
        const response = await apiGet<any>("/statistics");
        if (response.success && response.data) {
          setStatistiques(response.data);
        }
      } catch (statsErr) {
        console.warn("⚠️ Statistiques non disponibles:", statsErr);
        // Garder les anciennes valeurs ou utiliser des valeurs par défaut
      }

      // Le compteur de véhicules est géré par la carte (pas besoin de refresh ici)
    } catch (err) {
      console.error("Erreur rafraîchissement:", err);
    } finally {
      setTimeout(() => {
        setIsRefreshing(false);
      }, 300);
    }
  };

  const refreshDataRef = useRef(refreshData);
  refreshDataRef.current = refreshData;

  useEffect(() => {
    void refreshDataRef.current();
    const interval = setInterval(() => void refreshDataRef.current(), 10000);
    const unsub = subscribeSupervisorAlertsStream(() =>
      void refreshDataRef.current(),
    );
    return () => {
      clearInterval(interval);
      unsub();
    };
  }, []);

  // Couleurs par niveau de vigilance
  const getColorByNiveau = (niveau: string) => {
    switch (niveau) {
      case "SOMNOLENCE_CRITIQUE":
        return "border-l-4 border-[#dc2626]";
      case "FATIGUE_SEVERE":
        return "border-l-4 border-[#ef4444]";
      case "FATIGUE_MODEREE":
        return "border-l-4 border-[#f59e0b]";
      case "FATIGUE_LEGERE":
        return "border-l-4 border-[#fbbf24]";
      default:
        return "border-l-4 border-[#1e3a8a]";
    }
  };

  const activeCount = alertes.filter((a) => a.statut === "active").length;

  return (
    <ScrollPreserver>
      {isRefreshing && (
        <div className="fixed top-0 left-0 right-0 h-0.5 bg-amber-500 z-50 shadow-[0_0_12px_rgba(245,158,11,0.8)]" />
      )}

      <div className="min-h-full">
        {/* Bandeau supervision */}
        <div className="dashboard-panel mb-5 overflow-hidden">
          <div className="dashboard-panel-header px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-l-4 border-amber-500">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 mb-1">
                Supervision temps réel
              </p>
              <h1 className="text-xl sm:text-2xl font-bold text-slate-100 tracking-tight">
                SFAM — Tableau de bord
              </h1>
              <p className="text-slate-400 text-xs mt-1 font-mono tabular-nums">
                Dernier cycle :{" "}
                {lastRefresh
                  ? lastRefresh.toLocaleTimeString("fr-FR")
                  : "—"}
              </p>
            </div>
            <button
              onClick={refreshData}
              disabled={isRefreshing}
              type="button"
              className={`shrink-0 px-4 py-2.5 text-xs font-bold uppercase tracking-wider border flex items-center justify-center gap-2 transition-colors ${
                isRefreshing
                  ? "border-slate-600 bg-slate-800 text-slate-500 cursor-not-allowed"
                  : "border-amber-600/80 bg-slate-900 text-amber-100 hover:bg-slate-800 hover:border-amber-500"
              }`}
            >
              {isRefreshing ? (
                <>
                  <svg
                    className="animate-spin h-4 w-4"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  Sync…
                </>
              ) : (
                <>
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
                      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                    />
                  </svg>
                  Rafraîchir
                </>
              )}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-5">
          {/* Colonne indicateurs + événements */}
          <div className="lg:col-span-4 xl:col-span-3 flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="dashboard-panel p-3 border-t-4 border-t-slate-600">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  Véhicules
                </div>
                <div className="text-2xl font-mono font-bold text-slate-800 tabular-nums mt-1">
                  {vehiculesCount}
                </div>
              </div>
              <div
                className={`dashboard-panel p-3 border-t-4 ${
                  activeCount > 0
                    ? "border-t-red-600 critical-blink"
                    : "border-t-emerald-600"
                }`}
              >
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  Alertes actives
                </div>
                <div
                  className={`text-2xl font-mono font-bold tabular-nums mt-1 ${
                    activeCount > 0 ? "text-red-700" : "text-emerald-700"
                  }`}
                >
                  {loadingAlertes ? "—" : activeCount}
                </div>
              </div>
              <div className="dashboard-panel p-3 border-t-4 border-t-amber-500">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  Score moyen
                </div>
                <div className="text-2xl font-mono font-bold text-amber-800 tabular-nums mt-1">
                  {loadingStats
                    ? "—"
                    : statistiques?.moyenneScore?.toFixed(1) ?? "0"}
                </div>
              </div>
              <div className="dashboard-panel p-3 border-t-4 border-t-emerald-600">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  Disponibilité
                </div>
                <div className="text-2xl font-mono font-bold text-emerald-800 tabular-nums mt-1">
                  98%
                </div>
              </div>
            </div>

            <div className="dashboard-panel flex flex-col flex-1 min-h-[280px] overflow-hidden">
              <div className="dashboard-panel-header px-3 py-2 flex items-center justify-between">
                <h2 className="text-[11px] font-bold uppercase tracking-[0.15em]">
                  Événements récents
                </h2>
                <span className="text-[10px] text-slate-400 font-mono">FIFO</span>
              </div>
              <div className="p-3 space-y-2 flex-1 overflow-y-auto bg-slate-100/80 border-t border-slate-400/60">
                {loadingAlertes ? (
                  <div className="text-center py-8 text-slate-500 text-xs uppercase tracking-wide">
                    Chargement…
                  </div>
                ) : alertes.length === 0 ? (
                  <div className="text-center py-8 text-slate-500 text-xs border border-dashed border-slate-400">
                    Aucun événement
                  </div>
                ) : (
                  alertes.slice(0, 5).map((alerte, index) => (
                    <div
                      key={index}
                      className={`border-l-4 pl-2.5 py-2 pr-2 text-xs bg-slate-50 border border-slate-300 ${
                        alerte.niveau.value === "SOMNOLENCE_CRITIQUE"
                          ? "border-l-red-600"
                          : alerte.niveau.value.startsWith("FATIGUE")
                            ? "border-l-amber-600"
                            : "border-l-slate-600"
                      }`}
                    >
                      <div className="font-semibold text-slate-800 leading-tight">
                        {alerte.niveau.label}
                      </div>
                      <div className="text-slate-600 mt-1 font-mono text-[11px]">
                        {alerte.vehicule.immatriculation} ·{" "}
                        {new Date(alerte.horodatage).toLocaleTimeString(
                          "fr-FR",
                          { hour: "2-digit", minute: "2-digit" },
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Alertes + carte */}
          <div className="lg:col-span-8 xl:col-span-9 flex flex-col gap-4">
            <div className="dashboard-panel overflow-hidden flex flex-col">
              <div className="dashboard-panel-header px-3 py-2 flex flex-wrap items-center justify-between gap-2 border-l-4 border-red-700">
                <h2 className="text-[11px] font-bold uppercase tracking-[0.15em]">
                  File d&apos;alertes
                </h2>
                <span
                  className={`px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider border ${
                    loadingAlertes
                      ? "border-slate-500 bg-slate-800 text-slate-400"
                      : activeCount > 0
                        ? "border-red-500 bg-red-950/50 text-red-200"
                        : "border-emerald-600 bg-emerald-950/30 text-emerald-200"
                  }`}
                >
                  {loadingAlertes
                    ? "…"
                    : activeCount === 0
                      ? "OK — aucune alerte"
                      : `${activeCount} active(s)`}
                </span>
              </div>
              <div className="h-[280px] overflow-y-auto bg-white border-t border-slate-400/60">
                {loadingAlertes ? (
                  <div className="p-8 flex flex-col items-center justify-center text-slate-500 text-xs uppercase tracking-wide gap-2">
                    <div className="animate-spin rounded-full h-7 w-7 border-2 border-slate-300 border-t-slate-700" />
                    Chargement des alertes
                  </div>
                ) : activeCount === 0 ? (
                  <div className="p-8 text-center text-slate-500 text-sm border border-dashed border-slate-300 m-3">
                    Aucune alerte active — système nominal.
                  </div>
                ) : (
                  <div className="divide-y divide-slate-200">
                    {alertes
                      .filter((a) => a.statut === "active")
                      .map((alerte) => (
                        <div
                          key={alerte.id}
                          className={`p-3 sm:p-4 hover:bg-slate-50/90 transition-colors ${getColorByNiveau(alerte.niveau.value)} ${
                            !alerte.acquitteeAt ? "critical-blink" : ""
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            <div className="text-xl shrink-0 mt-0.5 opacity-90">
                              {alerte.niveau.icon}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="font-bold text-slate-900 text-sm sm:text-base">
                                {alerte.niveau.label}
                              </div>
                              <div className="text-slate-600 text-sm mt-0.5 line-clamp-2">
                                {alerte.message}
                              </div>
                              <div className="text-[11px] text-slate-500 mt-2 font-mono">
                                {alerte.vehicule.immatriculation} ·{" "}
                                {new Date(alerte.horodatage).toLocaleTimeString(
                                  "fr-FR",
                                )}
                              </div>
                            </div>
                            <span className="shrink-0 px-2 py-1 text-[10px] font-bold uppercase tracking-wide bg-red-700 text-white border border-red-900">
                              {alerte.type}
                            </span>
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            </div>

            <div className="dashboard-panel overflow-hidden flex flex-col flex-1 min-h-[420px]">
              <div className="dashboard-panel-header px-3 py-2 flex items-center justify-between border-l-4 border-sky-600">
                <h2 className="text-[11px] font-bold uppercase tracking-[0.15em]">
                  Géolocalisation flotte
                </h2>
                <span className="text-[10px] text-slate-400 font-mono hidden sm:inline">
                  OSM · live
                </span>
              </div>
              <div className="flex-1 min-h-[400px] border-t border-slate-400/60 bg-slate-900">
                <VehicleMap onVehiclesCountChange={setVehiculesCount} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </ScrollPreserver>
  );
}

// 🔑 Hook personnalisé modifié pour utiliser l'endpoint global
function useAlertesGlobal() {
  const [alertes, setAlertes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Remplace les appels avec clé API par des appels sans clé (session)
    // Remplacer apiGet par apiGetWithKey pour les endpoints véhicules/alertes
    const fetchAlertes = async () => {
      try {
        setLoading(true);
        // 🔑 Utiliser la clé API pour les alertes (pas d'auth session nécessaire)
        const response = await apiGet<AlertesResponse>("/alerts");

        if (response.success && response.data?.alertes) {
          setAlertes(response.data.alertes);
        }
      } catch (err) {
        console.error("Erreur chargement alertes:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchAlertes();

    // Rafraîchir toutes les 10 secondes
    const interval = setInterval(fetchAlertes, 10000);
    return () => clearInterval(interval);
  }, []);

  return { alertes, loading, error };
}

function App() {
  return (
    <Router>
      <ScrollToTop />
      <Routes>
        {/* Route publique : Login */}
        <Route path="/login" element={<LoginPage />} />

        {/* Routes protégées */}
        <Route
          path="/"
          element={
            <AuthGuard>
              <Layout>
                <AdminRoute>
                  <Dashboard />
                </AdminRoute>
              </Layout>
            </AuthGuard>
          }
        />

        <Route
          path="/alerts"
          element={
            <AuthGuard>
              <Layout>
                <AlertsPage />
              </Layout>
            </AuthGuard>
          }
        />

        <Route
          path="/statistics"
          element={
            <AuthGuard>
              <Layout>
                <AdminRoute>
                  <StatisticsPage />
                </AdminRoute>
              </Layout>
            </AuthGuard>
          }
        />

        <Route
          path="/vehicles"
          element={
            <AuthGuard>
              <Layout>
                <AdminRoute>
                  <VehiclesPage />
                </AdminRoute>
              </Layout>
            </AuthGuard>
          }
        />

        <Route
          path="/conducteurs"
          element={
            <AuthGuard>
              <Layout>
                <AdminRoute>
                  <ConducteursPage />
                </AdminRoute>
              </Layout>
            </AuthGuard>
          }
        />

        <Route
          path="/settings"
          element={
            <AuthGuard>
              <Layout>
                <AdminRoute>
                  <SettingsPage />
                </AdminRoute>
              </Layout>
            </AuthGuard>
          }
        />
        <Route
          path="/module-surveillance"
          element={
            <AuthGuard>
              <Layout>
                <ModuleSurveillance />
              </Layout>
            </AuthGuard>
          }
        />

        {/* Redirection par défaut */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
