import { useState, useEffect } from 'react';
import { fetchSettings, updateSettings, createApiKey, copyToClipboard } from '../services/api';
import { useTranslation } from '../hooks/useTranslation';


interface Settings {
  notifications: {
    alertesCritiques: boolean;
    alertesSeveres: boolean;
    rapportsQuotidiens: boolean;
  };
  langue: string;
  fuseauHoraire: string;
  rafraichissement: number;
  apiKeys: Array<{ name: string; key: string; type: string }>;
}

export default function SettingsPage() {
  const { t, changeLanguage } = useTranslation();
  const [settings, setSettings] = useState({
    notifications: {
      alertesCritiques: true,
      alertesSeveres: true,
      rapportsQuotidiens: false,
    },
    langue: 'fr',
    fuseauHoraire: 'Africa/Tunis',
    rafraichissement: 30,
    apiKeys: [] as Array<{ name: string; key: string; type: string }>,
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

   // Charger depuis localStorage au montage
useEffect(() => {
  const loadSettings = () => {
    try {
      const saved = localStorage.getItem('sfam-settings');
      if (saved) {
        const parsed = JSON.parse(saved);
        
        // 🔑 Valider la structure AVANT de setter
        const validSettings: Settings = {
          notifications: {
            alertesCritiques: parsed.notifications?.alertesCritiques ?? true,
            alertesSeveres: parsed.notifications?.alertesSeveres ?? true,
            rapportsQuotidiens: parsed.notifications?.rapportsQuotidiens ?? false,
          },
          langue: parsed.langue || 'fr',
          fuseauHoraire: parsed.fuseauHoraire || 'Africa/Tunis',
          rafraichissement: parsed.rafraichissement || 30,
          apiKeys: Array.isArray(parsed.apiKeys) ? parsed.apiKeys : [],
        };
        
        setSettings(validSettings);
        changeLanguage(validSettings.langue);
      }
    } catch (err) {
      console.error('Erreur chargement settings:', err);
      // Ne rien faire → garder les valeurs par défaut
    }
  };

  loadSettings(); // ⚠️ Appel SANS dépendance dans le tableau
}, []); // ✅ Tableau vide = exécuté UNE SEULE FOIS au montage


  // Toggle notification
  const toggleNotification = (key: keyof Settings['notifications']) => {
    setSettings(prev => ({
      ...prev,
      notifications: { ...prev.notifications, [key]: !prev.notifications[key] }
    }));
  };
  // Modifier un champ
  const handleInputChange = (field: keyof Omit<Settings, 'notifications' | 'apiKeys'>, value: string | number) => {
    setSettings(prev => ({ ...prev, [field]: value }));
  };

  // Copier clé API
  const handleCopyKey = (key: string) => {
    if (key.includes('•')) return;
    copyToClipboard(key);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // Enregistrer
  const handleSave = async () => {
    try {
      setSaving(true);
      // Save to localStorage first
      localStorage.setItem('sfam-settings', JSON.stringify(settings));
      changeLanguage(settings.langue); // Apply language change
      // Then try to sync with API
      //await updateSettings(settings);
      alert('✅ Paramètres enregistrés avec succès');
    } catch (err) {
      alert('❌ Erreur lors de l\'enregistrement');
    } finally {
      setSaving(false);
    }
  };

  // Créer nouvelle clé API
  const handleCreateApiKey = async () => {
  try {
    await createApiKey(); // Crée la clé
    const response = await fetchSettings(); // Recharge TOUTES les données
    if (response.success) setSettings(response.data);
    alert('✅ Nouvelle clé API créée et affichée');
  } catch (err) {
    alert('❌ Erreur');
  }
};

  if (loading) {
    return <div className="p-6 text-center py-8">Chargement...</div>;
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-[#1e3a8a] mb-2">⚙️ Paramètres</h1>
          <p className="text-gray-600">Configuration du système de surveillance SFAM</p>
        </div>
      </div>

      {/* Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Notifications */}
        <div className="bg-white rounded-xl shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4 flex items-center">
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
            Notifications
          </h2>
          
          <div className="space-y-4 mt-4">
            {Object.entries(settings.notifications).map(([key, value]) => (
              <div key={key} className="flex items-center justify-between">
                <div>
                  <div className="font-medium">
                    {key === 'alertesCritiques' ? 'Alertes critiques' :
                     key === 'alertesSeveres' ? 'Alertes sévères' :
                     'Rapports quotidiens'}
                  </div>
                  <div className="text-sm text-gray-500">
                    {key === 'alertesCritiques' ? 'Notifications immédiates pour somnolence critique' :
                     key === 'alertesSeveres' ? 'Notifications pour fatigue sévère' :
                     'Résumé quotidien des événements de fatigue'}
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={value}
                    onChange={() => toggleNotification(key as keyof Settings['notifications'])}
                    className="sr-only peer" 
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:ring-4 peer-focus:ring-[#1e3a8a] rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#1e3a8a]"></div>
                </label>
              </div>
            ))}
          </div>
        </div>

        {/* Clés API */}
        <div className="bg-white rounded-xl shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4 flex items-center">
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
            </svg>
            Clés API
          </h2>
          
          <div className="mt-4">
            {settings.apiKeys.map((apiKey, index) => (
              <div key={index} className="bg-gray-50 rounded-lg p-4 mb-4">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="font-medium">{apiKey.name}</div>
                    <div className="text-sm text-gray-500 mt-1 break-all">{apiKey.key}</div>
                  </div>
                  <button 
                    onClick={() => handleCopyKey(apiKey.key)}
                    disabled={apiKey.key.includes('•')}
                    className={`px-3 py-1 rounded text-sm ${
                      apiKey.key.includes('•') 
                        ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
                        : 'bg-[#1e3a8a] text-white hover:bg-[#1a327a]'
                    }`}
                  >
                    {copiedKey === apiKey.key ? 'Copié !' : 'Copier'}
                  </button>
                </div>
              </div>
            ))}
            
            <div className="mt-6">
              <button 
                onClick={handleCreateApiKey}
                className="w-full px-4 py-2 bg-[#1e3a8a] text-white rounded-lg hover:bg-[#1a327a] transition flex items-center justify-center"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Créer une nouvelle clé API
              </button>
            </div>
          </div>
        </div>

        {/* Général */}
        <div className="bg-white rounded-xl shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4 flex items-center">
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            </svg>
            Général
          </h2>
          
          <div className="space-y-4 mt-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Langue</label>
              <select 
                value={settings.langue}
                onChange={(e) => handleInputChange('langue', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1e3a8a]"
              >
                <option value="fr">Français</option>
                <option value="en">Anglais</option>
                <option value="ar">Arabe</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Fuseau horaire</label>
              <select 
                value={settings.fuseauHoraire}
                onChange={(e) => handleInputChange('fuseauHoraire', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1e3a8a]"
              >
                <option value="Africa/Tunis">Afrique/Tunis (UTC+1)</option>
                <option value="Europe/Paris">Europe/Paris (UTC+1)</option>
                <option value="UTC">UTC (UTC+0)</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Rafraîchissement</label>
              <select 
                value={settings.rafraichissement}
                onChange={(e) => handleInputChange('rafraichissement', Number(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1e3a8a]"
              >
                <option value={10}>10 secondes</option>
                <option value={30}>30 secondes</option>
                <option value={60}>1 minute</option>
                <option value={300}>5 minutes</option>
              </select>
            </div>
          </div>
        </div>

        {/* Sécurité */}
        <div className="bg-white rounded-xl shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4 flex items-center">
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            Sécurité
          </h2>
          
          <div className="space-y-4 mt-4">
            <input type="password" placeholder="Mot de passe actuel" className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
            <input type="password" placeholder="Nouveau mot de passe" className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
            <input type="password" placeholder="Confirmer" className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
            <button className="w-full px-4 py-2 bg-[#1e3a8a] text-white rounded-lg hover:bg-[#1a327a]">
              Mettre à jour le mot de passe
            </button>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="mt-8 flex justify-end space-x-4">
        <button 
          onClick={() => window.location.reload()}
          className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
        >
          Annuler
        </button>
        <button 
          onClick={handleSave}
          disabled={saving}
          className="px-4 py-2 bg-[#1e3a8a] text-white rounded-lg hover:bg-[#1a327a] flex items-center"
        >
          {saving ? 'Enregistrement...' : 'Enregistrer les modifications'}
        </button>
      </div>
    </div>
  );
}