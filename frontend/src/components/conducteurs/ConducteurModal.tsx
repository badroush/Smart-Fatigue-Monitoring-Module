import { useEffect, useState } from "react";
import type { Conducteur } from "../../types/api";

interface VehOpt {
  id: string;
  immatriculation: string;
}

interface ConducteurModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: Record<string, unknown>) => void;
  conducteur?: Conducteur | null;
  vehicles: VehOpt[];
  title: string;
}

export default function ConducteurModal({
  isOpen,
  onClose,
  onSubmit,
  conducteur,
  vehicles,
  title,
}: ConducteurModalProps) {
  const [form, setForm] = useState({
    nom: "",
    numeroPermis: "",
    telephone: "",
    dateNaissance: "",
    adresse: "",
    isActive: true,
    vehiculeAssigneId: "" as string,
    rfidUid: "",
  });

  useEffect(() => {
    if (!isOpen) return;
    if (conducteur) {
      setForm({
        nom: conducteur.nom,
        numeroPermis: conducteur.numeroPermis,
        telephone: conducteur.telephone ?? "",
        dateNaissance: conducteur.dateNaissance?.slice(0, 10) ?? "",
        adresse: conducteur.adresse ?? "",
        isActive: conducteur.isActive,
        vehiculeAssigneId: conducteur.vehiculeAssigneId ?? "",
        rfidUid: conducteur.rfidUid ?? "",
      });
    } else {
      setForm({
        nom: "",
        numeroPermis: "",
        telephone: "",
        dateNaissance: "",
        adresse: "",
        isActive: true,
        vehiculeAssigneId: "",
        rfidUid: "",
      });
    }
  }, [isOpen, conducteur]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload: Record<string, unknown> = {
      nom: form.nom.trim(),
      numeroPermis: form.numeroPermis.trim(),
      telephone: form.telephone.trim() || undefined,
      dateNaissance: form.dateNaissance || undefined,
      adresse: form.adresse.trim() || undefined,
      isActive: form.isActive,
      vehiculeAssigneId: form.vehiculeAssigneId || null,
      rfidUid: form.rfidUid.trim() || null,
    };
    onSubmit(payload);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-[2px]">
      <div className="dashboard-panel max-h-[90vh] w-full max-w-lg overflow-y-auto border-amber-600/30">
        <div className="dashboard-panel-header flex items-center justify-between border-l-4 border-amber-500 px-4 py-3">
          <h2 className="text-sm font-bold uppercase tracking-[0.12em] text-slate-100">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="border border-slate-500 px-2 py-1 text-xs font-bold uppercase tracking-wide text-slate-300 hover:bg-slate-800"
          >
            Fermer
          </button>
        </div>
        <form
          onSubmit={handleSubmit}
          className="space-y-3 border-t border-slate-400/60 bg-slate-50 p-4"
        >
          <div>
            <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-600">
              Nom complet *
            </label>
            <input
              required
              minLength={2}
              value={form.nom}
              onChange={(e) => setForm({ ...form, nom: e.target.value })}
              className="w-full border border-slate-500 bg-white px-3 py-2 text-sm text-slate-900 focus:border-slate-700 focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-600">
              N° permis *
            </label>
            <input
              required
              minLength={5}
              value={form.numeroPermis}
              onChange={(e) =>
                setForm({ ...form, numeroPermis: e.target.value })
              }
              className="w-full border border-slate-500 bg-white px-3 py-2 font-mono text-sm focus:border-slate-700 focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-600">
              Téléphone
            </label>
            <input
              type="tel"
              value={form.telephone}
              onChange={(e) =>
                setForm({ ...form, telephone: e.target.value })
              }
              className="w-full border border-slate-500 bg-white px-3 py-2 text-sm focus:border-slate-700 focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-600">
              Date de naissance
            </label>
            <input
              type="date"
              value={form.dateNaissance}
              onChange={(e) =>
                setForm({ ...form, dateNaissance: e.target.value })
              }
              className="w-full border border-slate-500 bg-white px-3 py-2 text-sm focus:border-slate-700 focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-600">
              Adresse
            </label>
            <input
              value={form.adresse}
              onChange={(e) => setForm({ ...form, adresse: e.target.value })}
              className="w-full border border-slate-500 bg-white px-3 py-2 text-sm focus:border-slate-700 focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-600">
              Véhicule assigné
            </label>
            <select
              value={form.vehiculeAssigneId}
              onChange={(e) =>
                setForm({ ...form, vehiculeAssigneId: e.target.value })
              }
              className="w-full border border-slate-500 bg-white px-3 py-2 text-sm focus:border-slate-700 focus:outline-none"
            >
              <option value="">— Aucun —</option>
              {vehicles.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.immatriculation}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-600">
              UID carte RFID (module camion)
            </label>
            <input
              value={form.rfidUid}
              onChange={(e) =>
                setForm({ ...form, rfidUid: e.target.value.toUpperCase() })
              }
              placeholder="Ex. E0040123456789AB"
              className="w-full border border-slate-500 bg-white px-3 py-2 font-mono text-sm uppercase focus:border-slate-700 focus:outline-none"
            />
            <p className="mt-1 text-[10px] text-slate-500">
              Le conducteur badgera cette carte devant le module du véhicule auquel il est affecté.
            </p>
          </div>
          <label className="flex cursor-pointer items-center gap-2 border border-slate-400 bg-white px-3 py-2">
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={(e) =>
                setForm({ ...form, isActive: e.target.checked })
              }
              className="h-4 w-4 rounded border-slate-500"
            />
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-700">
              Conducteur actif
            </span>
          </label>
          <div className="flex justify-end gap-2 border-t border-slate-300 pt-3">
            <button
              type="button"
              onClick={onClose}
              className="border border-slate-500 bg-slate-200 px-4 py-2 text-xs font-bold uppercase tracking-wide text-slate-800 hover:bg-slate-300"
            >
              Annuler
            </button>
            <button
              type="submit"
              className="border border-amber-600 bg-slate-900 px-4 py-2 text-xs font-bold uppercase tracking-wide text-amber-100 hover:border-amber-500"
            >
              Enregistrer
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
