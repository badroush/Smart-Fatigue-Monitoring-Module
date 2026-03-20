import { useEffect, useState } from "react";
import { useAlertes } from "./hooks/useAlertes";
import { apiGet } from "./services/api";
import { StatistiquesVehicule } from "./types/api";
import VehicleMap from "./components/layout/dashboard/VehicleMap";
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/layout/Layout';
import AuthGuard from './components/layout/AuthGuard';
import LoginPage from './pages/Login';
import AlertsPage from "./pages/Alerts";
import StatisticsPage from "./pages/Statistics";
import VehiclesPage from "./pages/Vehicles";
import SettingsPage from "./pages/Settings";

// 🔑 ID du véhicule de test (remplace par ton propre ID)
const VEHICULE_TEST_ID = "d92dbc25-238f-11";

interface StatistiquesResponse {
  totalPaquets: number;
  derniereCommunication: string | null;
  statut: string;
  isMonitored: boolean;
  moyenneScore?: number;
  maxScore?: number;
  minScore?: number;
  repartitionNiveaux?: Record<string, number>;
}

function Dashboard() {
  const {
    alertes,
    loading: loadingAlertes,
    error: errorAlertes,
  } = useAlertes(VEHICULE_TEST_ID);
  const [statistiques, setStatistiques] = useState<StatistiquesVehicule | null>(
    null,
  );
  const [loadingStats, setLoadingStats] = useState(true);

  // Charger les statistiques
  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoadingStats(true);
        const response = await apiGet<StatistiquesResponse>(
          `/statistics/${VEHICULE_TEST_ID}`,
        );

        if (response.success && response.data) {
          setStatistiques(response.data);
        }
      } catch (err) {
        console.error("Erreur stats:", err);
      } finally {
        setLoadingStats(false);
      }
    };

    fetchStats();

    // Rafraîchir toutes les 60 secondes
    const interval = setInterval(fetchStats, 60000);
    return () => clearInterval(interval);
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

  return (
    <div>
      <h1 className="text-3xl font-bold text-[#1e3a8a] mb-6">
        Tableau de bord SFAM
      </h1>

      {/* Cartes de statistiques */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-[#1e3a8a]">
          <div className="text-sm text-gray-500 mb-1">Véhicules surveillés</div>
          <div className="text-4xl font-bold text-[#1e3a8a]">24</div>
        </div>

        <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-[#ef4444]">
          <div className="text-sm text-gray-500 mb-1">Alertes actives</div>
          <div
            className={`text-4xl font-bold text-[#ef4444] ${loadingAlertes ? "" : "critical-blink"}`}
          >
            {loadingAlertes
              ? "..."
              : alertes.filter((a) => a.statut === "active").length}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-[#f59e0b]">
          <div className="text-sm text-gray-500 mb-1">Score moyen</div>
          <div className="text-4xl font-bold text-[#f59e0b]">
            {loadingStats
              ? "..."
              : statistiques?.moyenneScore?.toFixed(1) || "0"}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-[#10b981]">
          <div className="text-sm text-gray-500 mb-1">Dernière com.</div>
          <div className="text-2xl font-bold text-[#10b981]">
            {loadingStats
              ? "..."
              : statistiques?.derniereCommunication
                ? new Date(
                    statistiques.derniereCommunication,
                  ).toLocaleTimeString("fr-FR")
                : "Jamais"}
          </div>
        </div>
      </div>

      {/* Alertes actives */}
      <div className="bg-white rounded-xl shadow-md p-6 mb-8">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-gray-800">
            🚨 Alertes actives
          </h2>
          <span
            className={`px-3 py-1 rounded-full text-sm font-medium ${
              loadingAlertes
                ? "bg-gray-200"
                : alertes.filter((a) => a.statut === "active").length > 0
                  ? "bg-[#ef4444] text-white"
                  : "bg-green-100 text-green-800"
            }`}
          >
            {loadingAlertes
              ? "Chargement..."
              : alertes.filter((a) => a.statut === "active").length === 0
                ? "Aucune alerte"
                : `${alertes.filter((a) => a.statut === "active").length} alerte(s)`}
          </span>
        </div>

        {errorAlertes && (
          <div className="p-4 bg-red-50 text-red-700 rounded-lg mb-4">
            ❌ {errorAlertes}
          </div>
        )}

        {loadingAlertes ? (
          <div className="text-center py-8 text-gray-500">
            Chargement des alertes...
          </div>
        ) : alertes.filter((a) => a.statut === "active").length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            ✅ Aucune alerte active pour le moment
          </div>
        ) : (
          <div className="space-y-4">
            {alertes
              .filter((a) => a.statut === "active")
              .map((alerte) => (
                <div
                  key={alerte.id}
                  className={`p-4 rounded-lg shadow ${getColorByNiveau(alerte.niveau.value)} ${
                    alerte.niveau.value === "SOMNOLENCE_CRITIQUE"
                      ? "critical-blink"
                      : ""
                  }`}
                >
                  <div className="flex items-start">
                    <div className="mr-4 text-3xl">{alerte.niveau.icon}</div>
                    <div className="flex-1">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="font-bold text-lg">
                            {alerte.niveau.label}
                          </div>
                          <div className="text-gray-600 mt-1">
                            {alerte.message}
                          </div>
                          <div className="text-sm text-gray-500 mt-2">
                            Véhicule: {alerte.vehicule.immatriculation} •
                            {new Date(alerte.horodatage).toLocaleTimeString(
                              "fr-FR",
                            )}
                          </div>
                        </div>
                        <div className="bg-[#ef4444] text-white px-3 py-1 rounded-full font-medium">
                          {alerte.type.toUpperCase()}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
          </div>
        )}
      </div>

      {/* Carte placeholder */}
      {/* Carte GPS interactive */}
      <div className="bg-white rounded-xl shadow-md p-6">
        <h2 className="text-xl font-semibold mb-4 flex items-center">
          <span className="mr-2">📍</span>
          Position des véhicules en temps réel
        </h2>
        <VehicleMap />
      </div>
    </div>
  );
}

function App() {
  return (
    <Router>
      <Routes>
        {/* Route publique : Login */}
        <Route path="/login" element={<LoginPage />} />
        
        {/* Routes protégées */}
        <Route
          path="/"
          element={
            <AuthGuard>
              <Layout>
                <Dashboard />
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
                <StatisticsPage />
              </Layout>
            </AuthGuard>
          }
        />
        
        <Route
          path="/vehicles"
          element={
            <AuthGuard>
              <Layout>
                <VehiclesPage />
              </Layout>
            </AuthGuard>
          }
        />
        
        <Route
          path="/settings"
          element={
            <AuthGuard>
              <Layout>
                <SettingsPage />
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