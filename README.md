# SFAM – Driver Fatigue Detection System

**S**ystème de **F**atigue **A**lerte **M**odulaire (SFAM) – Conception, implémentation et validation expérimentale d’un système intelligent embarqué de détection de fatigue du conducteur basé sur l’Edge AI.

## À propos

SFAM est un système embarqué de détection de fatigue du conducteur, conçu pour fonctionner en **temps réel** sur un Raspberry Pi, avec une **double stratégie d’alerte** :

- **Locale** : buzzer, relais (sonnette + clignotants)
- **Distanche** : notification via cloud (Firebase) et tableau de bord superviseur

Le projet combine :
- Vision par ordinateur (MediaPipe)
- Réseaux de neurones convolutifs légers (TensorFlow/Keras)
- Architecture Edge–Cloud tolérante aux coupures réseau
- Composants matériels à faible coût (< 150 €)

---

## Architecture générale
[Module Edge (Raspberry Pi 5)] → [Module caché (GSM/GPS/relais)] → [Cloud Firebase]
│ │ │
├── Caméra CSI ├── SIM800L ├── Authentification
├── MediaPipe ├── GPS NEO-6M ├── Firestore
├── CNN (yeux / bouche) ├── Relais (2 canaux) ├── Dashboard React
├── MLX90614, LDR, RFID └── Batterie 3S + BMS └── SSE temps réel
└── OLED (optionnel)

text

**Caractéristiques clés** :
- Détection locale même hors connexion
- Persistance MySQL + file d’attente en cas d’indisponibilité cloud
- Resynchronisation automatique des alertes lorsque le réseau revient
- Double niveau d’alerte : locale (sonore/action) et cloud (notification)

---

## Modules matériels

### Module Edge (face conducteur)

| Composant | Référence | Rôle |
|-----------|-----------|------|
| **LM2596** | Buck 12V → 5V | Alimentation stabilisée |
| **Raspberry Pi 5** | SC1110, 2 Go RAM | Cerveau principal |
| **Caméra CSI** | Module officiel | Acquisition visage |
| **4 LED IR** | 850 nm, 5 mm | Éclairage nocturne |
| **MLX90614** | I2C | Température corporelle |
| **LDR LM393** | Numérique (DO) | Détection jour/nuit |
| **RFID RC522** | SPI | Identification conducteur |
| **OLED** (optionnel) | SSD1306, I2C | Affichage local |
| **Transistor** | 2N2222 / BC547 | Commande IR LED |

### Module caché (énergie & actionneurs)

| Composant | Référence | Rôle |
|-----------|-----------|------|
| **LM2596** | Buck 12V → 5V | Alimentation stabilisée |
| **Batterie 18650** | 3 × 3,7 V (3S) | Secours 12 V |
| **BMS 3S 10A** | Protection | Gestion charge/décharge |
| **SIM800L** | GSM | Envoi SMS d’alerte |
| **GPS NEO-6M** | UART (UART3) | Géolocalisation |
| **Relais 5V** | SRD-05VDC-SL-C | Sonnette + clignotants |
| **Diode OR** | 1N4007 / 1N5402 | Basculement automatique |

### Interconnexion

- **RJ45** (8 fils) : signaux faibles (UART, GPIO, GND)
- **Câble dédié** : +12 V (section ≥ 0,5 mm²)
- Masse commune via RJ45 (fils 7 et 8)

---

## Logiciel et intelligence artificielle

### Pipeline de détection

1. **Acquisition** : caméra CSI → résolution 320×240, ≥ 15 FPS
2. **Détection faciale** : MediaPipe (landmarks 68 points)
3. **Extraction ROI** : yeux (64×64), bouche (64×64)
4. **Classification** :
   - `eyes_model.h5` : yeux ouverts / fermés (99,75 % accuracy)
   - `mouth_model.h5` : bouche ouverte / fermée (~99,6 % accuracy)
5. **Indicateurs géométriques** : EAR, MAR, pitch, yaw
6. **Score de fatigue** (0–100) par pondération :
   - Yeux fermés : +20
   - Fermeture > 2 s : +15
   - Bâillement : +15
   - Inclinaison tête >25° : +25
   - Clignements trop rares : +10
7. **Niveaux d’alerte** : NORMAL, LÉGÈRE, MODÉRÉE, SÉVÈRE, CRITIQUE
8. **Alerte locale** : buzzer, relais (score >85)
9. **Transmission cloud** : via API (POST `/api/fatigue-events`)

### Stack technique

| Brique | Technologie |
|--------|-------------|
| **Framework IA** | TensorFlow / Keras |
| **Perception** | MediaPipe, OpenCV |
| **Backend** | Node.js / Express |
| **Base locale** | MySQL (persistance offline) |
| **Cloud** | Firebase Auth + Firestore |
| **Dashboard** | React, Chart.js, SSE |
| **Edge** | Python (RPi.GPIO, smbus2, serial, pyrebase4) |

---

## Supervision cloud

### Authentification et rôles

- **Firebase Auth** : JWT
- **Rôles** : superviseur, administrateur, véhicule (lecture seule)

### Flux temps réel

- API REST (GET, POST, acquitter, résoudre)
- **Server-Sent Events (SSE)** : notifications push sans polling
- Persistance locale MySQL + file d’attente `firestore_sync_queue`
- Resynchronisation automatique en cas de coupure réseau

### Dashboard

- Visualisation des alertes en temps réel
- Historique par conducteur / véhicule
- Statistiques (Chart.js)
- Carte de localisation GPS (leaflet)

---

## Résultats expérimentaux (synthèse)

| Métrique | Valeur |
|----------|--------|
| **Accuracy yeux (test)** | 99,75 % |
| **Accuracy bouche (test)** | ≈ 99,6 % |
| **FPS moyen sur RPi 5** | 15–25 |
| **Latence alerte locale** | < 2 s |
| **Autonomie batterie 3S** | 3h30 – 5h (selon charge) |
| **Consommation moyenne** | 3,2 – 5,8 W |
| **Température RPi** (charge IA) | 60–68 °C |
| **Fiabilité synchronisation** | Sans perte (file d’attente + rejeu) |

| **Organisation du dépôt** | Arborescence type |
| **Auteur / Licence** | Professionnel |
