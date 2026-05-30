import { useState, useEffect, useCallback, useRef } from "react";
import { apiGet } from "../services/api";
import { Alerte } from "../types/api";
import { subscribeSupervisorAlertsStream } from "../services/alertsStream";

export interface AlertesResponse {
  total: number;
  alertes: Alerte[];
}

export function useAlertes(vehiculeId: string) {
  const [alertes, setAlertes] = useState<Alerte[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const fetchAlertes = useCallback(
    async (silent = false) => {
      try {
        if (!silent && mounted.current) setLoading(true);
        const response = await apiGet<AlertesResponse>(`/alerts/${vehiculeId}`);

        if (!mounted.current) return;

        if (response.success && response.data?.alertes) {
          setAlertes(response.data.alertes);
        } else {
          setAlertes([]);
        }

        setError(null);
      } catch (err: unknown) {
        if (!mounted.current) return;
        const msg =
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
            : "Erreur lors du chargement des alertes";
        setError(msg);
        setAlertes([]);
      } finally {
        if (mounted.current) setLoading(false);
      }
    },
    [vehiculeId],
  );

  useEffect(() => {
    fetchAlertes(false);

    const isGlobalSupervisor = vehiculeId === "global";

    const unsubStream = isGlobalSupervisor
      ? subscribeSupervisorAlertsStream(() => fetchAlertes(true))
      : () => {};

    const fallbackPoll = window.setInterval(
      () => fetchAlertes(true),
      10000,
    );

    return () => {
      unsubStream();
      clearInterval(fallbackPoll);
    };
  }, [vehiculeId, fetchAlertes]);

  return { alertes, loading, error, refetch: () => fetchAlertes(true) };
}
