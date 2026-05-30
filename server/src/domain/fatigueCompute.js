/** 
 * Seuils alignés sur AnalyseFatigue / DonneesCapteurs / SFAM (module)
 * Compatible avec la structure JSON :
 * {
 *   idConducteur, idVehicule, idSfam,
 *   niveauBatterie, temperatureInterne, portExterneConnecte,
 *   donneesCapteurs: { temperatureAmbiante, humidite, luminosite, temperatureCorporelle, dureeConduite },
 *   analyseFatigue: { ear, mar, pitch, yaw, nombreClignements, dureeYeuxFermes, nombreBaillements },
 *   localisationGPS: { latitude, longitude, altitude, precision }
 * }
 */

// ==================== SEUILS ====================

// Seuils fatigue (analyse faciale)
const SEUIL_EAR = 0.22;           // Eye Aspect Ratio (en dessous = yeux fermés)
const SEUIL_MAR = 0.6;            // Mouth Aspect Ratio (au dessus = bâillement)
const SEUIL_PITCH = 25;           // Inclinaison tête avant/arrière (degrés)
const SEUIL_YAW = 30;             // Rotation tête gauche/droite (degrés)

// Seuils confort (donneesCapteurs)
const SEUIL_TEMP_MAX = 35.0;      // Température ambiante max (°C)
const SEUIL_TEMP_MIN = 15.0;      // Température ambiante min (°C)
const SEUIL_HUMIDITE_MAX = 80.0;  // Humidité max (%)
const SEUIL_HUMIDITE_MIN = 30.0;  // Humidité min (%)
const SEUIL_LUMINOSITE_MIN = 50;  // Luminosité min (lux)
const SEUIL_TEMP_CORPO_MAX = 38.0; // Température corporelle max (°C)
const SEUIL_TEMP_CORPO_MIN = 35.0; // Température corporelle min (°C)

// Seuils module SFAM
const SEUIL_BATTERIE_CRITIQUE = 20;   // Batterie < 20% = critique
const SEUIL_TEMP_INTERNE_MAX = 60.0;  // Température interne module max (°C)

// ==================== FONCTIONS ====================

/**
 * Construit les données capteurs à partir de l'API
 * @param {Object} dc - donneesCapteurs
 */
export function buildCapteursFromApi(dc) {
  const temperatureAmbiante = Number(dc.temperatureAmbiante);
  const humidite = Number(dc.humidite);
  const luminosite = parseInt(dc.luminosite, 10);
  const temperatureCorporelle = Number(dc.temperatureCorporelle);
  const dureeConduite = parseInt(dc.dureeConduite, 10);

  const alerteTemperature =
    temperatureAmbiante > SEUIL_TEMP_MAX || temperatureAmbiante < SEUIL_TEMP_MIN;
  const alerteHumidite =
    humidite > SEUIL_HUMIDITE_MAX || humidite < SEUIL_HUMIDITE_MIN;
  const alerteLuminosite = luminosite < SEUIL_LUMINOSITE_MIN;
  const alerteTemperatureCorporelle =
    temperatureCorporelle > SEUIL_TEMP_CORPO_MAX ||
    temperatureCorporelle < SEUIL_TEMP_CORPO_MIN;

  let scoreConfort = 100;
  if (alerteTemperature) scoreConfort -= 25;
  if (alerteHumidite) scoreConfort -= 25;
  if (alerteLuminosite) scoreConfort -= 25;
  if (alerteTemperatureCorporelle) scoreConfort -= 25;
  scoreConfort = Math.max(0, scoreConfort);

  return {
    temperatureAmbiante,
    humidite,
    luminosite,
    temperatureCorporelle,
    dureeConduite,
    alerteTemperature,
    alerteHumidite,
    alerteLuminosite,
    alerteTemperatureCorporelle,
    scoreConfort,
  };
}

/**
 * Construit les données d'analyse de fatigue à partir de l'API
 * @param {Object} af - analyseFatigue
 */
export function buildAnalyseFromApi(af) {
  const ear = Number(af.ear);
  const mar = Number(af.mar);
  const pitch = Number(af.pitch);
  const yaw = Number(af.yaw);
  const nombreClignements = parseInt(af.nombreClignements, 10) || 0;
  const dureeYeuxFermes = parseFloat(af.dureeYeuxFermes) || 0;
  const nombreBaillements = parseInt(af.nombreBaillements, 10) || 0;

  const yeuxFermes = ear < SEUIL_EAR;
  const baillements = mar > SEUIL_MAR;
  const inclinaisonTete =
    Math.abs(pitch) > SEUIL_PITCH || Math.abs(yaw) > SEUIL_YAW;

  const alerteYeuxFermes = yeuxFermes && dureeYeuxFermes > 0;
  const alerteBaillements = baillements && nombreBaillements > 0;
  const alerteInclinaisonTete = inclinaisonTete;

  const conditionsFatigueLegere =
    nombreClignements > 0 || nombreBaillements > 0;
  const conditionsFatigueModeree =
    yeuxFermes || baillements || nombreClignements >= 2;
  const conditionsFatigueSevere =
    (yeuxFermes && dureeYeuxFermes >= 3) || nombreBaillements >= 2;
  const conditionsSomnolenceCritique =
    inclinaisonTete || (yeuxFermes && dureeYeuxFermes >= 5);

  let niveauVigilance = 'NORMAL';
  if (conditionsSomnolenceCritique) niveauVigilance = 'SOMNOLENCE_CRITIQUE';
  else if (conditionsFatigueSevere) niveauVigilance = 'FATIGUE_SEVERE';
  else if (conditionsFatigueModeree) niveauVigilance = 'FATIGUE_MODEREE';
  else if (conditionsFatigueLegere) niveauVigilance = 'FATIGUE_LEGERE';

  let score = 0;
  if (yeuxFermes) {
    score += 20;
    if (dureeYeuxFermes >= 3) score += 15;
    if (dureeYeuxFermes >= 5) score += 15;
  }
  if (baillements) {
    score += 15;
    score += Math.min(nombreBaillements * 5, 15);
  }
  if (nombreClignements >= 2) score += 10;
  if (nombreClignements >= 5) score += 10;
  if (inclinaisonTete) score += 25;
  if (ear < 0.2) score += 10;
  if (mar > 0.7) score += 10;
  const scoreFatigue = Math.min(100, score);

  return {
    yeuxFermes,
    ear,
    baillements,
    mar,
    inclinaisonTete,
    pitch,
    yaw,
    nombreClignements,
    dureeYeuxFermes,
    nombreBaillements,
    alerteYeuxFermes,
    alerteBaillements,
    alerteInclinaisonTete,
    niveauVigilance,
    scoreFatigue,
  };
}

/**
 * NOUVEAU : Construit les données du module SFAM
 * @param {Object} module - { niveauBatterie, temperatureInterne, portExterneConnecte }
 */
export function buildModuleFromApi(module) {
  const niveauBatterie = parseInt(module.niveauBatterie, 10) || 0;
  const temperatureInterne = Number(module.temperatureInterne) || 0;
  const portExterneConnecte = module.portExterneConnecte === true;

  const alerteBatterieCritique = niveauBatterie < SEUIL_BATTERIE_CRITIQUE;
  const alerteTemperatureInterne = temperatureInterne > SEUIL_TEMP_INTERNE_MAX;

  let scoreModule = 100;
  if (alerteBatterieCritique) scoreModule -= 40;
  if (alerteTemperatureInterne) scoreModule -= 30;
  if (!portExterneConnecte) scoreModule -= 30;
  scoreModule = Math.max(0, scoreModule);

  return {
    niveauBatterie,
    temperatureInterne,
    portExterneConnecte,
    alerteBatterieCritique,
    alerteTemperatureInterne,
    scoreModule,
  };
}

/**
 * Calcule le score global (fatigue + confort + module)
 * @param {number} scoreFatigue - 0-100
 * @param {number} scoreConfort - 0-100
 * @param {number} scoreModule - 0-100
 */
export function getScoreGlobal(scoreFatigue, scoreConfort, scoreModule = 100) {
  const scoreCapteursInverse = 100 - scoreConfort;
  const scoreModuleInverse = 100 - scoreModule;
  // Pondération : 60% fatigue, 20% confort, 20% module
  return Math.min(
    100,
    Math.round(scoreFatigue * 0.6 + scoreCapteursInverse * 0.2 + scoreModuleInverse * 0.2)
  );
}

/**
 * Détermine le type d'alerte en fonction du niveau
 */
export function determineAlerteType(niveau) {
  if (niveau === 'SOMNOLENCE_CRITIQUE') return 'sonnette';
  if (niveau === 'FATIGUE_SEVERE') return 'sms';
  if (niveau === 'FATIGUE_MODEREE') return 'vocale';
  return 'locale';
}

/**
 * Génère un message d'alerte
 */
export function genererMessageAlerte(niveau, score, nomConducteur, immatriculation) {
  const nom = nomConducteur || 'Conducteur inconnu';
  const immat = immatriculation || 'Véhicule inconnu';
  switch (niveau) {
    case 'SOMNOLENCE_CRITIQUE':
      return `ALERTE CRITIQUE : Somnolence détectée pour ${nom} (${immat}) - Score: ${score}/100 - Intervention immédiate requise !`.slice(
        0,
        255
      );
    case 'FATIGUE_SEVERE':
      return `ALERTE SÉVÈRE : Fatigue sévère détectée pour ${nom} (${immat}) - Score: ${score}/100`.slice(
        0,
        255
      );
    default:
      return `Alerte de fatigue détectée pour ${nom} (${immat}) - Niveau: ${niveau}`.slice(
        0,
        255
      );
  }
}

/**
 * Vérifie si le niveau nécessite une alerte fatigue
 */
export function niveauNecessiteAlerteFatigue(niveau) {
  return niveau === 'FATIGUE_SEVERE' || niveau === 'SOMNOLENCE_CRITIQUE';
}

// ==================== FONCTION PRINCIPALE D'INTÉGRATION ====================

/**
 * Traite un JSON complet provenant du module SFAM
 * @param {Object} jsonComplet - Le JSON du module (avec tous les champs)
 * @returns {Object} Résultat complet de l'analyse
 */
export function traiterDonneesModule(jsonComplet) {
  const {
    idConducteur,
    idVehicule,
    idSfam,
    niveauBatterie,
    temperatureInterne,
    portExterneConnecte,
    donneesCapteurs,
    analyseFatigue,
    localisationGPS,
    horodatage
  } = jsonComplet;

  // 1. Analyser les capteurs
  const capteurs = buildCapteursFromApi(donneesCapteurs);
  
  // 2. Analyser la fatigue
  const fatigue = buildAnalyseFromApi(analyseFatigue);
  
  // 3. Analyser le module SFAM
  const module = buildModuleFromApi({ niveauBatterie, temperatureInterne, portExterneConnecte });
  
  // 4. Calculer le score global
  const scoreGlobal = getScoreGlobal(fatigue.scoreFatigue, capteurs.scoreConfort, module.scoreModule);
  
  // 5. Déterminer le niveau d'alerte final
  let niveauAlerte = fatigue.niveauVigilance;
  if (module.alerteBatterieCritique && fatigue.niveauVigilance !== 'SOMNOLENCE_CRITIQUE') {
    niveauAlerte = 'FATIGUE_MODEREE'; // Batterie faible = alerte technique
  }
  
  // 6. Générer le message
  const message = genererMessageAlerte(niveauAlerte, scoreGlobal, idConducteur, idVehicule);
  
  // 7. Retourner le résultat complet
  return {
    // Données d'entrée
    idConducteur,
    idVehicule,
    idSfam,
    horodatage,
    localisation: localisationGPS,
    
    // Analyses
    capteurs,
    fatigue,
    module,
    
    // Résultats finaux
    scoreGlobal,
    niveauAlerte,
    necessiteAlerte: niveauNecessiteAlerteFatigue(niveauAlerte),
    typeAlerte: determineAlerteType(niveauAlerte),
    messageAlerte: message,
    
    // Timestamp de traitement
    traiteLe: new Date().toISOString()
  };
}