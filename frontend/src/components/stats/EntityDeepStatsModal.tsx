import { useEffect, useMemo, useState } from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";
import { Bar, Line } from "react-chartjs-2";
import { apiGet } from "../../services/api";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
);

type DeepStats = Record<string, unknown>;

function KeyVal({ label, value }: { label: string; value: unknown }) {
  let display: string;
  if (value === null || value === undefined) display = "—";
  else if (typeof value === "object")
    display = JSON.stringify(value, null, 2);
  else display = String(value);
  return (
    <div className="border-b border-slate-200 py-1.5 text-xs sm:grid sm:grid-cols-3 sm:gap-2">
      <div className="font-mono text-[10px] font-bold uppercase tracking-wide text-slate-500">
        {label}
      </div>
      <div className="sm:col-span-2 break-all font-mono text-slate-800 whitespace-pre-wrap">
        {display}
      </div>
    </div>
  );
}

function flattenRecord(
  obj: Record<string, unknown>,
  prefix = "",
): [string, unknown][] {
  const out: [string, unknown][] = [];
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (
      v !== null &&
      typeof v === "object" &&
      !Array.isArray(v) &&
      !(v instanceof Date)
    ) {
      out.push(...flattenRecord(v as Record<string, unknown>, key));
    } else {
      out.push([key, v]);
    }
  }
  return out;
}

function str(val: unknown): string {
  if (val == null) return "—";
  if (typeof val === "object") return JSON.stringify(val);
  return String(val);
}

/** Carte identité véhicule — infos opérationnelles */
function VehicleIdentityCard({
  record,
  entityId,
}: {
  record: Record<string, unknown>;
  entityId: string | null;
}) {
  const immat = str(record.immatriculation);
  const type = str(record.type);
  const statut = str(record.statut);
  const monitored =
    record.isMonitored === false ? "Non surveillé" : "Sous surveillance";
  const lastComm = str(record.derniereCommunication ?? record.lastUpdate);
  const niveau = str(record.lastNiveauVigilance ?? record.niveauVigilance);
  const pos = record.lastPosition ?? record.position;
  const posStr = Array.isArray(pos)
    ? `${Number(pos[0]).toFixed(4)}, ${Number(pos[1]).toFixed(4)}`
    : str(pos);

  return (
    <div className="overflow-hidden rounded-xl border border-sky-800/40 bg-gradient-to-br from-slate-900 via-slate-900 to-sky-950 text-slate-100 shadow-lg">
      <div className="flex flex-col gap-4 border-l-4 border-sky-500 p-4 sm:flex-row sm:items-stretch sm:justify-between">
        <div className="flex min-w-0 flex-1 gap-4">
          <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-lg border border-sky-600/50 bg-slate-800 text-3xl">
            🚛
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-sky-400/90">
              Véhicule enregistré
            </p>
            <h3 className="truncate font-mono text-2xl font-bold tracking-tight text-white">
              {immat !== "—" ? immat : "Sans immatriculation"}
            </h3>
            <p className="mt-1 text-sm text-slate-400">
              {type} · {statut}
            </p>
            <p className="mt-2 font-mono text-[10px] text-slate-500">
              UUID · {entityId}
            </p>
          </div>
        </div>
        <div className="grid shrink-0 gap-2 sm:w-72">
          <div className="rounded border border-slate-700 bg-slate-800/80 px-3 py-2">
            <div className="text-[9px] font-bold uppercase text-slate-500">
              Surveillance
            </div>
            <div className="text-sm font-semibold text-emerald-300">{monitored}</div>
          </div>
          <div className="rounded border border-slate-700 bg-slate-800/80 px-3 py-2">
            <div className="text-[9px] font-bold uppercase text-slate-500">
              Dernière communication
            </div>
            <div className="font-mono text-xs text-amber-200">{lastComm}</div>
          </div>
        </div>
      </div>
      <div className="grid gap-2 border-t border-slate-700/80 bg-slate-950/50 px-4 py-3 sm:grid-cols-2">
        <div>
          <span className="text-[9px] font-bold uppercase text-slate-500">
            Vigilance (dernier paquet connu)
          </span>
          <div className="font-mono text-sm text-sky-200">{niveau}</div>
        </div>
        <div>
          <span className="text-[9px] font-bold uppercase text-slate-500">
            Dernière position GPS connue
          </span>
          <div className="font-mono text-xs text-emerald-200/90">{posStr}</div>
        </div>
      </div>
    </div>
  );
}

/** Carte identité conducteur — état civil & affectation */
function DriverIdentityCard({
  record,
  entityId,
}: {
  record: Record<string, unknown>;
  entityId: string | null;
}) {
  const nom = str(record.nom);
  const permis = str(record.numeroPermis);
  const tel = str(record.telephone);
  const naissance = str(record.dateNaissance);
  const adresse = str(record.adresse);
  const actif = record.isActive !== false;
  const vehImmat = str(record.vehiculeImmatriculation);
  const vehId = str(record.vehiculeAssigneId);
  const rfid = record.rfidUid != null ? String(record.rfidUid) : "";
  const created = str(record.createdAt);

  return (
    <div className="overflow-hidden rounded-xl border border-teal-800/40 bg-gradient-to-br from-slate-900 via-slate-900 to-teal-950 text-slate-100 shadow-lg">
      <div className="flex flex-col gap-4 border-l-4 border-teal-500 p-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 flex-1 gap-4">
          <div className="flex h-24 w-20 shrink-0 flex-col items-center justify-center rounded-lg border border-teal-600/50 bg-slate-800">
            <span className="text-2xl">👤</span>
            <span className="mt-1 text-[8px] uppercase tracking-wider text-slate-500">
              Photo
            </span>
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-teal-400/90">
              Conducteur
            </p>
            <h3 className="truncate text-2xl font-bold tracking-tight text-white">
              {nom}
            </h3>
            <p className="mt-1 font-mono text-sm text-slate-300">
              Permis n° {permis}
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              <span
                className={`inline-flex border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                  actif
                    ? "border-emerald-600/80 bg-emerald-950/40 text-emerald-300"
                    : "border-slate-600 bg-slate-800 text-slate-400"
                }`}
              >
                {actif ? "Actif" : "Inactif"}
              </span>
            </div>
            <p className="mt-2 font-mono text-[10px] text-slate-500">
              UUID · {entityId}
            </p>
          </div>
        </div>
        <div className="grid w-full gap-2 sm:max-w-xs">
          <div className="rounded border border-slate-700 bg-slate-800/80 px-3 py-2">
            <div className="text-[9px] font-bold uppercase text-slate-500">
              Véhicule affecté (admin)
            </div>
            <div className="text-sm font-semibold text-teal-200">
              {vehImmat !== "—" ? vehImmat : vehId !== "—" ? vehId : "—"}
            </div>
          </div>
          <div className="rounded border border-slate-700 bg-slate-800/80 px-3 py-2">
            <div className="text-[9px] font-bold uppercase text-slate-500">
              Carte RFID (UID)
            </div>
            <div className="break-all font-mono text-xs text-amber-200/90">
              {rfid ? rfid : "Non renseignée"}
            </div>
          </div>
        </div>
      </div>
      <div className="grid gap-2 border-t border-slate-700/80 bg-slate-950/50 px-4 py-3 sm:grid-cols-3">
        <div>
          <span className="text-[9px] font-bold uppercase text-slate-500">
            Téléphone
          </span>
          <div className="font-mono text-xs">{tel}</div>
        </div>
        <div>
          <span className="text-[9px] font-bold uppercase text-slate-500">
            Naissance
          </span>
          <div className="font-mono text-xs">{naissance}</div>
        </div>
        <div className="sm:col-span-1">
          <span className="text-[9px] font-bold uppercase text-slate-500">
            Création fiche
          </span>
          <div className="font-mono text-xs">{created}</div>
        </div>
        {adresse !== "—" && (
          <div className="sm:col-span-3">
            <span className="text-[9px] font-bold uppercase text-slate-500">
              Adresse
            </span>
            <div className="text-xs text-slate-300">{adresse}</div>
          </div>
        )}
      </div>
    </div>
  );
}

const VEHICLE_COUNT_LABELS: Record<string, string> = {
  packetsInSample: "Paquets analysés (échantillon)",
  packetsTotalEstimate: "Paquets — total estimé (base)",
  packetsTruncated: "Échantillon limité (tronqué)",
  alertsTotalEstimate: "Alertes fatigue — total estimé",
  alertsInSample: "Alertes — dans l’extrait chargé",
  moduleAlertsInSample: "Alertes module — extrait",
  gpsTotalEstimate: "Points GPS — total estimé",
  gpsInSample: "Points GPS — extrait analysé",
  sensorsTotalEstimate: "Mesures capteurs — total estimé",
  sensorsInSample: "Mesures capteurs — extrait",
  fatigueAnalysesTotalEstimate: "Analyses fatigue — total estimé",
  fatigueAnalysesInSample: "Analyses fatigue — extrait",
  distinctConducteursFromPackets: "Conducteurs distincts (sur paquets)",
};

const DRIVER_COUNT_LABELS: Record<string, string> = {
  packetsInSample: "Paquets analysés (échantillon)",
  packetsTotalEstimate: "Paquets — total estimé (conducteur)",
  packetsTruncated: "Échantillon limité (tronqué)",
  alertsTotalEstimate: "Alertes — total estimé",
  alertsInSample: "Alertes — dans l’extrait chargé",
  vehiculesDistinctsFromPackets: "Véhicules distincts (historique paquets)",
};

export default function EntityDeepStatsModal({
  open,
  onClose,
  mode,
  entityId,
  subtitle,
}: {
  open: boolean;
  onClose: () => void;
  mode: "vehicle" | "driver";
  entityId: string | null;
  subtitle?: string;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<DeepStats | null>(null);

  useEffect(() => {
    if (!open || !entityId) {
      setData(null);
      setError(null);
      return;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const path =
          mode === "vehicle"
            ? `/vehicles/deep-stats/${entityId}`
            : `/conducteurs/deep-stats/${entityId}`;
        const res = await apiGet<DeepStats>(path);
        if (!cancelled) {
          if (res.success && res.data) setData(res.data);
          else setError(res.message || "Données indisponibles");
        }
      } catch {
        if (!cancelled) setError("Erreur réseau ou accès refusé");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, entityId, mode]);

  const niveauxChart = useMemo(() => {
    const r = (
      data?.packets as { repartitionNiveaux?: { [k: string]: number } } | undefined
    )?.repartitionNiveaux;
    if (!r) return null;
    const labels = Object.keys(r);
    const values = labels.map((k) => r[k] ?? 0);
    return {
      labels,
      datasets: [
        {
          label: mode === "vehicle" ? "Paquets camion" : "Paquets conducteur",
          data: values,
          backgroundColor: [
            "rgba(34,197,94,0.75)",
            "rgba(234,179,8,0.75)",
            "rgba(249,115,22,0.75)",
            "rgba(239,68,68,0.75)",
            "rgba(127,29,29,0.85)",
          ],
        },
      ],
    };
  }, [data, mode]);

  const alertsStatutChart = useMemo(() => {
    const r = (data?.alerts as { byStatut?: { [k: string]: number } } | undefined)
      ?.byStatut;
    if (!r || !Object.keys(r).length) return null;
    const labels = Object.keys(r);
    const values = labels.map((k) => r[k] ?? 0);
    return {
      labels,
      datasets: [
        {
          label: "Nombre d’alertes",
          data: values,
          backgroundColor: "rgba(59,130,246,0.7)",
        },
      ],
    };
  }, [data]);

  const alertsNiveauChartDriver = useMemo(() => {
    if (mode !== "driver") return null;
    const r = (data?.alerts as { byNiveau?: { [k: string]: number } } | undefined)?.byNiveau;
    if (!r || !Object.keys(r).length) return null;
    const labels = Object.keys(r);
    const values = labels.map((k) => r[k] ?? 0);
    return {
      labels,
      datasets: [
        {
          label: "Alertes par niveau déclaré",
          data: values,
          backgroundColor: "rgba(244,63,94,0.65)",
        },
      ],
    };
  }, [data, mode]);

  const lineVolChart = useMemo(() => {
    const pd = (
      data?.packets as { packetsPerDay?: { date: string; count: number }[] } | undefined
    )?.packetsPerDay;
    if (!pd?.length) return null;
    return {
      labels: pd.map((x) => x.date.slice(5)),
      datasets: [
        {
          label:
            mode === "vehicle"
              ? "Paquets reçus pour ce véhicule"
              : "Paquets où ce conducteur apparaît",
          data: pd.map((x) => x.count),
          borderColor: mode === "vehicle" ? "rgb(56,189,248)" : "rgb(45,212,191)",
          backgroundColor:
            mode === "vehicle"
              ? "rgba(56,189,248,0.12)"
              : "rgba(45,212,191,0.12)",
          fill: true,
          tension: 0.25,
        },
      ],
    };
  }, [data, mode]);

  if (!open) return null;

  const rawRecord =
    mode === "vehicle"
      ? (data?.vehicleRecord as Record<string, unknown> | undefined)
      : (data?.driverRecord as Record<string, unknown> | undefined);

  const counts = data?.counts as Record<string, unknown> | undefined;
  const packets = data?.packets as Record<string, unknown> | undefined;
  const scores = packets?.scores as Record<string, unknown> | undefined;
  const alerts = data?.alerts as {
    recent?: unknown[];
    byNiveau?: { [k: string]: number };
  } | undefined;
  const comparisons = data?.comparisons as Record<string, unknown> | undefined;
  const moduleAlerts = data?.moduleAlerts as { items?: unknown[] } | undefined;
  const gps = data?.gps as Record<string, unknown> | undefined;
  const sensors = data?.sensors as Record<string, unknown> | undefined;
  const fatigueAnalyses = data?.fatigueAnalyses as Record<string, unknown> | undefined;

  const countLabelMap = mode === "vehicle" ? VEHICLE_COUNT_LABELS : DRIVER_COUNT_LABELS;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div
        className="flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-lg border border-amber-600/40 bg-slate-50 shadow-2xl"
        role="dialog"
        aria-modal="true"
      >
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-slate-300 bg-slate-900 px-4 py-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-amber-500/90">
              {mode === "vehicle"
                ? "Analytique véhicule & module"
                : "Profil conducteur & historique"}
            </p>
            <h2 className="text-lg font-bold text-slate-100">
              {mode === "vehicle" ? "Camion / tracteur" : "Conducteur"} —{" "}
              {subtitle || entityId}
            </h2>
            <p className="mt-0.5 font-mono text-[10px] text-slate-500">
              Source {(data?.source as string) || "…"} ·{" "}
              {mode === "vehicle"
                ? "Stats centrées sur les flux rattachés à ce véhicule"
                : "Stats centrées sur les données où ce conducteur apparaît"}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 border border-slate-600 px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-slate-200 hover:bg-slate-800"
          >
            Fermer
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          {loading && (
            <div className="flex items-center gap-2 py-16 text-sm text-slate-600">
              <span className="h-6 w-6 animate-spin rounded-full border-2 border-amber-600 border-t-transparent" />
              Chargement…
            </div>
          )}
          {error && (
            <div className="rounded border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800">
              {error}
            </div>
          )}
          {!loading && data && rawRecord && (
            <div className="space-y-6">
              {/* Carte identité */}
              {mode === "vehicle" ? (
                <VehicleIdentityCard record={rawRecord} entityId={entityId} />
              ) : (
                <DriverIdentityCard record={rawRecord} entityId={entityId} />
              )}

              {/* Compteurs contextualisés */}
              {counts && (
                <section className="dashboard-panel p-3">
                  <h3 className="mb-2 border-b border-slate-300 pb-2 text-[11px] font-bold uppercase tracking-[0.12em] text-slate-700">
                    {mode === "vehicle"
                      ? "Volumes liés à ce véhicule (télématique, alertes, module)"
                      : "Volumes liés à ce conducteur (trajets & alertes)"}
                  </h3>
                  <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    {Object.entries(counts).map(([k, v]) => {
                      if (k === "vehiculeIdsSample") return null;
                      const title = countLabelMap[k] ?? k;
                      return (
                        <div
                          key={k}
                          className="border border-slate-300 bg-white px-3 py-2 font-mono text-[11px]"
                        >
                          <div className="text-[9px] font-bold uppercase leading-tight text-slate-500">
                            {title}
                          </div>
                          <div className="mt-1 tabular-nums text-slate-900">{String(v)}</div>
                        </div>
                      );
                    })}
                  </div>
                  {mode === "driver" &&
                    Array.isArray(counts.vehiculeIdsSample) &&
                    (counts.vehiculeIdsSample as string[]).length > 0 && (
                      <div className="mt-3">
                        <p className="mb-1 text-[10px] font-bold uppercase text-slate-500">
                          Exemples d’UUID véhicules vus sur les paquets
                        </p>
                        <div className="flex flex-wrap gap-1">
                          {(counts.vehiculeIdsSample as string[]).map((id) => (
                            <span
                              key={id}
                              className="font-mono text-[9px] text-slate-600 border border-slate-300 bg-slate-100 px-1.5 py-0.5"
                            >
                              {id.slice(0, 8)}…
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  {Boolean(counts.packetsTruncated) && (
                    <p className="mt-2 text-[10px] text-amber-800">
                      Échantillon plafonné pour les calculs (fort volume de données).
                    </p>
                  )}
                </section>
              )}

              {scores && (
                <section className="dashboard-panel p-3">
                  <h3 className="mb-2 border-b border-slate-300 pb-2 text-[11px] font-bold uppercase tracking-[0.12em] text-slate-700">
                    {mode === "vehicle"
                      ? "Scores fatigue agrégés — paquets de ce véhicule"
                      : "Scores fatigue agrégés — tous paquets de ce conducteur"}
                  </h3>
                  <div className="grid gap-2 sm:grid-cols-5">
                    {Object.entries(scores).map(([k, v]) => (
                      <div
                        key={k}
                        className="border border-slate-300 bg-white px-2 py-2 text-center"
                      >
                        <div className="text-[9px] font-bold uppercase text-slate-500">
                          {k}
                        </div>
                        <div className="font-mono text-lg font-bold text-slate-900">
                          {v === null || v === undefined ? "—" : String(v)}
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {comparisons && Object.keys(comparisons).length > 0 && (
                <section className="dashboard-panel border-l-4 border-amber-500 p-3">
                  <h3 className="mb-2 text-[11px] font-bold uppercase tracking-[0.12em] text-slate-700">
                    {mode === "vehicle"
                      ? "Ce véhicule vs moyenne de la flotte"
                      : "Ce conducteur vs moyenne globale des scores"}
                  </h3>
                  <div className="grid gap-2 sm:grid-cols-3">
                    {Object.entries(comparisons).map(([k, v]) => (
                      <div key={k} className="border border-slate-300 bg-white px-2 py-2">
                        <div className="text-[9px] font-bold uppercase text-slate-500">{k}</div>
                        <div className="font-mono text-slate-900">{String(v)}</div>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              <div className="grid gap-4 lg:grid-cols-2">
                {niveauxChart && (
                  <div className="dashboard-panel p-3">
                    <h3 className="mb-2 text-[11px] font-bold uppercase tracking-[0.12em] text-slate-700">
                      {mode === "vehicle"
                        ? "Répartition des niveaux de vigilance (flux ce camion)"
                        : "Répartition vigilance sur les trajets du conducteur"}
                    </h3>
                    <div className="h-56">
                      <Bar
                        options={{
                          responsive: true,
                          maintainAspectRatio: false,
                          plugins: { legend: { display: false } },
                        }}
                        data={niveauxChart}
                      />
                    </div>
                  </div>
                )}
                {mode === "vehicle" && alertsStatutChart && (
                  <div className="dashboard-panel p-3">
                    <h3 className="mb-2 text-[11px] font-bold uppercase tracking-[0.12em] text-slate-700">
                      Alertes fatigue — par statut (ce véhicule)
                    </h3>
                    <div className="h-56">
                      <Bar
                        options={{
                          responsive: true,
                          maintainAspectRatio: false,
                          plugins: { legend: { display: false } },
                        }}
                        data={alertsStatutChart}
                      />
                    </div>
                  </div>
                )}
                {mode === "driver" && alertsNiveauChartDriver && (
                  <div className="dashboard-panel p-3">
                    <h3 className="mb-2 text-[11px] font-bold uppercase tracking-[0.12em] text-slate-700">
                      Alertes déclarées — par niveau (conducteur)
                    </h3>
                    <div className="h-56">
                      <Bar
                        options={{
                          responsive: true,
                          maintainAspectRatio: false,
                          plugins: { legend: { display: false } },
                        }}
                        data={alertsNiveauChartDriver}
                      />
                    </div>
                  </div>
                )}
                {mode === "driver" && !alertsNiveauChartDriver && alertsStatutChart && (
                  <div className="dashboard-panel p-3">
                    <h3 className="mb-2 text-[11px] font-bold uppercase tracking-[0.12em] text-slate-700">
                      Alertes — par statut (conducteur)
                    </h3>
                    <div className="h-56">
                      <Bar
                        options={{
                          responsive: true,
                          maintainAspectRatio: false,
                          plugins: { legend: { display: false } },
                        }}
                        data={alertsStatutChart}
                      />
                    </div>
                  </div>
                )}
              </div>

              {mode === "driver" && alertsNiveauChartDriver && alertsStatutChart && (
                <div className="dashboard-panel p-3">
                  <h3 className="mb-2 text-[11px] font-bold uppercase tracking-[0.12em] text-slate-700">
                    Workflow alertes — répartition par statut
                  </h3>
                  <div className="h-52 max-w-xl">
                    <Bar
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: { legend: { display: false } },
                      }}
                      data={alertsStatutChart}
                    />
                  </div>
                </div>
              )}

              {lineVolChart && (
                <section className="dashboard-panel p-3">
                  <h3 className="mb-2 text-[11px] font-bold uppercase tracking-[0.12em] text-slate-700">
                    {mode === "vehicle"
                      ? "Activité télématique — paquets par jour (ce véhicule)"
                      : "Rythme d’activité — paquets par jour impliquant ce conducteur"}
                  </h3>
                  <div className="h-64">
                    <Line
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: { legend: { display: true } },
                      }}
                      data={lineVolChart}
                    />
                  </div>
                </section>
              )}

              {mode === "vehicle" && packets?.paquetsAvecAlerteGeneree != null && (
                <section className="rounded border border-amber-300/80 bg-amber-50/90 px-3 py-2 text-sm text-amber-950">
                  <span className="font-bold">Paquets ayant déclenché une alerte (échantillon) : </span>
                  <span className="font-mono">{String(packets.paquetsAvecAlerteGeneree)}</span>
                </section>
              )}

              {/* Blocs réservés au véhicule : environnement embarqué */}
              {mode === "vehicle" && moduleAlerts?.items && moduleAlerts.items.length > 0 && (
                <section className="dashboard-panel p-3">
                  <h3 className="mb-2 border-b border-slate-300 pb-2 text-[11px] font-bold uppercase tracking-[0.12em] text-slate-700">
                    Module embarqué — alertes matériel / batterie / ports
                  </h3>
                  <ul className="space-y-1 text-xs">
                    {(moduleAlerts.items as { [key: string]: unknown }[]).map((m, i) => (
                      <li
                        key={i}
                        className="border border-slate-200 bg-white px-2 py-1 font-mono"
                      >
                        {String(m.type)} — {String(m.statut)} — {String(m.message)}
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              {mode === "vehicle" && gps && Object.keys(gps).length > 0 && (
                <section className="dashboard-panel p-3">
                  <h3 className="mb-2 text-[11px] font-bold uppercase tracking-[0.12em] text-slate-700">
                    Synthèse géolocalisation (points liés au véhicule)
                  </h3>
                  <pre className="max-h-48 overflow-auto rounded bg-slate-900 p-2 text-[10px] text-emerald-200">
                    {JSON.stringify(gps, null, 2)}
                  </pre>
                </section>
              )}

              {mode === "vehicle" && sensors && Object.keys(sensors).length > 0 && (
                <section className="dashboard-panel p-3">
                  <h3 className="mb-2 text-[11px] font-bold uppercase tracking-[0.12em] text-slate-700">
                    Ambiance cabine & capteurs (agrégats sur échantillon)
                  </h3>
                  <pre className="max-h-48 overflow-auto rounded bg-slate-900 p-2 text-[10px] text-sky-200">
                    {JSON.stringify(sensors, null, 2)}
                  </pre>
                </section>
              )}

              {mode === "vehicle" && fatigueAnalyses && Object.keys(fatigueAnalyses).length > 0 && (
                <section className="dashboard-panel p-3">
                  <h3 className="mb-2 text-[11px] font-bold uppercase tracking-[0.12em] text-slate-700">
                    Analyse vidéo / posture (agrégats fatigue analyses)
                  </h3>
                  <pre className="max-h-48 overflow-auto rounded bg-slate-900 p-2 text-[10px] text-amber-200">
                    {JSON.stringify(fatigueAnalyses, null, 2)}
                  </pre>
                </section>
              )}

              {alerts?.recent && Array.isArray(alerts.recent) && alerts.recent.length > 0 && (
                <section className="dashboard-panel p-3">
                  <h3 className="mb-2 border-b border-slate-300 pb-2 text-[11px] font-bold uppercase tracking-[0.12em] text-slate-700">
                    {mode === "vehicle"
                      ? "Historique alertes fatigue — limitées à ce véhicule"
                      : "Historique alertes — où ce conducteur est identifié"}
                  </h3>
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-left text-[11px]">
                      <thead>
                        <tr className="border-b border-slate-300 bg-slate-100">
                          <th className="px-2 py-1">Statut</th>
                          <th className="px-2 py-1">Niveau</th>
                          {mode === "driver" && (
                            <th className="px-2 py-1">Véhicule</th>
                          )}
                          <th className="px-2 py-1">Message</th>
                          <th className="px-2 py-1">Horodatage</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(alerts.recent as { [key: string]: unknown }[]).map((row, i) => (
                          <tr key={i} className="border-b border-slate-200">
                            <td className="px-2 py-1 font-mono">{String(row.statut)}</td>
                            <td className="px-2 py-1">{String(row.niveau)}</td>
                            {mode === "driver" && (
                              <td className="px-2 py-1 font-mono text-[10px]">
                                {row.vehiculeId != null ? String(row.vehiculeId).slice(0, 8) + "…" : "—"}
                              </td>
                            )}
                            <td className="px-2 py-1 max-w-xs truncate">{String(row.message)}</td>
                            <td className="px-2 py-1 font-mono text-[10px]">
                              {String(row.horodatage)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>
              )}

              {rawRecord && (
                <section className="dashboard-panel p-3">
                  <h3 className="mb-2 text-[11px] font-bold uppercase tracking-[0.12em] text-slate-700">
                    {mode === "vehicle"
                      ? "Données brutes enregistrées — document véhicule"
                      : "Données brutes enregistrées — document conducteur"}
                  </h3>
                  <div className="max-h-72 overflow-y-auto rounded border border-slate-300 bg-white px-2">
                    {flattenRecord(rawRecord).map(([k, v]) => (
                      <KeyVal key={k} label={k} value={v} />
                    ))}
                  </div>
                </section>
              )}

              <section className="rounded border border-dashed border-slate-400 bg-slate-100 p-3 text-[10px] text-slate-600">
                {mode === "vehicle"
                  ? "Les séries portent sur les enregistrements dont le véhicule est ce camion (paquets, GPS, capteurs, module)."
                  : "Les séries portent sur tous les enregistrements où ce conducteur est référencé (multi-véhicules si changements d’affectation)."}
              </section>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
