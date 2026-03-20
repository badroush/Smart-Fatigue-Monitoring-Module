<?php

namespace App\Controller\Api;

use App\Entity\PaquetDonnees;
use App\Entity\Vehicule;
use App\Service\PaquetDonneesService;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Annotation\Route;
use Symfony\Component\Serializer\Exception\ExceptionInterface;
use Symfony\Component\Validator\Validator\ValidatorInterface;

/**
 * Contrôleur API pour recevoir les données du module SFAM embarqué
 */
#[Route('/api', name: 'api_')]
class SfamDataController extends AbstractController
{
    public function __construct(
        private PaquetDonneesService $paquetService,
        private ValidatorInterface $validator,
        private EntityManagerInterface $entityManager
    ) {}

    /**
     * Endpoint principal : Recevoir un paquet de données SFAM
     * 
     * @param Request $request
     * @return JsonResponse
     */
    #[Route('/fatigue-events', name: 'fatigue_events_post', methods: ['POST'])]
    public function receiveData(Request $request): JsonResponse
    {
        try {
            // 1. Récupérer le contenu JSON de la requête
            $data = json_decode($request->getContent(), true);
            
            if (json_last_error() !== JSON_ERROR_NONE) {
                return $this->json([
                    'success' => false,
                    'error' => 'Invalid JSON format',
                    'message' => 'Le format JSON est invalide',
                ], Response::HTTP_BAD_REQUEST);
            }

            // 2. Valider la présence des données obligatoires
            if (!isset($data['idVehicule']) || !isset($data['idConducteur'])) {
                return $this->json([
                    'success' => false,
                    'error' => 'Missing required fields',
                    'message' => 'Les champs idVehicule et idConducteur sont obligatoires',
                ], Response::HTTP_BAD_REQUEST);
            }

            // 3. Vérifier la clé API (X-API-KEY dans les headers)
            $apiKey = $request->headers->get('X-API-KEY');
            
            if (!$apiKey) {
                return $this->json([
                    'success' => false,
                    'error' => 'Missing API Key',
                    'message' => 'La clé API est requise dans l\'en-tête X-API-KEY',
                ], Response::HTTP_UNAUTHORIZED);
            }

            // 4. Vérifier que le véhicule existe et que la clé API est valide
            $vehicule = $this->entityManager
                ->getRepository(Vehicule::class)
                ->findOneBy(['sfamApiKey' => $apiKey]);

            if (!$vehicule) {
                return $this->json([
                    'success' => false,
                    'error' => 'Invalid API Key',
                    'message' => 'Clé API invalide ou véhicule non trouvé',
                ], Response::HTTP_UNAUTHORIZED);
            }

            // 5. Vérifier que le véhicule est actif et surveillé
            if (!$vehicule->isActive() || !$vehicule->isMonitored()) {
                return $this->json([
                    'success' => false,
                    'error' => 'Vehicle not active',
                    'message' => 'Le véhicule n\'est pas actif ou n\'est pas surveillé',
                ], Response::HTTP_FORBIDDEN);
            }

            // 6. Créer le paquet de données
            $paquet = PaquetDonnees::fromApiData($data);
            
            // 7. Lier le véhicule et le conducteur (si existants)
            $paquet->setVehicule($vehicule);
            
            $conducteur = $this->entityManager
                ->getRepository(\App\Entity\Conducteur::class)
                ->findOneBy(['numeroPermis' => $data['idConducteur']]);
            
            if ($conducteur) {
                $paquet->setConducteur($conducteur);
            }
            // Fallback si non trouvé
            if (!$conducteur) {
                $conducteur = $this->entityManager
                    ->getRepository(\App\Entity\Conducteur::class)
                    ->findOneBy([], ['id' => 'ASC']);
            }

            // 8. Valider l'entité
            $errors = $this->validator->validate($paquet);
            
            if (count($errors) > 0) {
                $errorMessages = [];
                foreach ($errors as $error) {
                    $errorMessages[] = $error->getPropertyPath() . ': ' . $error->getMessage();
                }
                
                return $this->json([
                    'success' => false,
                    'error' => 'Validation failed',
                    'message' => 'Données invalides',
                    'errors' => $errorMessages,
                ], Response::HTTP_BAD_REQUEST);
            }

            // 9. Traiter le paquet via le service métier
$this->paquetService->traiterPaquet($paquet);  // ✅ SEULE LIGNE NÉCESSAIRE

// 10. Retourner la réponse JSON
return $this->json([
    'success' => true,
    'message' => 'Paquet de données enregistré avec succès',
    'data' => [
        'id' => $paquet->getId()->toString(),
        'idEvenement' => $paquet->getId()->toString(),
        'niveauVigilance' => $paquet->getNiveauVigilance()->value,
        'scoreGlobal' => $paquet->getScoreGlobal(),
        'alerteGeneree' => $paquet->isAlerteGeneree(),  // ✅ Doit être true pour SOMNOLENCE_CRITIQUE
        'receivedAt' => $paquet->getReceivedAt()?->format('Y-m-d H:i:s'),
    ],
], Response::HTTP_CREATED);

        } catch (\Exception $e) {
    // 🔑 Afficher l'erreur complète en mode dev pour le débogage
    if ($_ENV['APP_ENV'] === 'dev') {
        return $this->json([
            'success' => false,
            'error' => 'Internal server error',
            'message' => $e->getMessage(),
            'file' => $e->getFile(),
            'line' => $e->getLine(),
        ], Response::HTTP_INTERNAL_SERVER_ERROR);
    }
    
    return $this->json([
        'success' => false,
        'error' => 'Internal server error',
        'message' => 'Une erreur interne est survenue',
    ], Response::HTTP_INTERNAL_SERVER_ERROR);
}
    }

    /**
     * Endpoint GET : Récupérer les statistiques du véhicule
     * 
     * @param string $idVehicule
     * @param Request $request
     * @return JsonResponse
     */
#[Route('/statistics/{idVehicule}', name: 'statistics_get', methods: ['GET'])]
public function getStatistics(string $idVehicule, Request $request): JsonResponse
{
    try {
        $apiKey = $request->headers->get('X-API-KEY');
        if (!$apiKey) {
            return $this->json([
                'success' => false,
                'error' => 'Missing API Key',
                'message' => 'La clé API est requise dans l\'en-tête X-API-KEY',
            ], Response::HTTP_UNAUTHORIZED);
        }

        $vehicule = $this->entityManager
            ->getRepository(Vehicule::class)
            ->findOneBy(['sfamApiKey' => $apiKey]);

        if (!$vehicule) {
            return $this->json([
                'success' => false,
                'error' => 'Vehicle not found',
                'message' => 'Clé API invalide ou véhicule non trouvé',
            ], Response::HTTP_NOT_FOUND);
        }

        // Normalisation UUID
        $vehiculeIdFromDb = $vehicule->getId()->toRfc4122();
        try {
            $uuidFromUrl = \Symfony\Component\Uid\Uuid::fromString($idVehicule);
            $vehiculeIdFromUrl = $uuidFromUrl->toRfc4122();
        } catch (\InvalidArgumentException $e) {
            $vehiculeIdFromUrl = $idVehicule;
        }

        if ($vehiculeIdFromDb !== $vehiculeIdFromUrl) {
            return $this->json([
                'success' => false,
                'error' => 'Vehicle not found',
                'debug' => [
                    'idFromUrl' => $idVehicule,
                    'idFromDb' => $vehicule->getId()->toString(),
                    'idFromUrlNormalized' => $vehiculeIdFromUrl,
                    'idFromDbNormalized' => $vehiculeIdFromDb,
                ],
            ], Response::HTTP_NOT_FOUND);
        }

        // 🔑 FIX SÉCURISÉ : Itération explicite sur la collection
        $paquetsCollection = $vehicule->getHistoriqueDonnees()->slice(0, 100);
        $paquets = [];
        foreach ($paquetsCollection as $paquet) {
            if ($paquet instanceof \App\Entity\PaquetDonnees) {
                $paquets[] = $paquet;
            }
        }

        $stats = [
            'totalPaquets' => count($paquets),
            'derniereCommunication' => $vehicule->getDerniereCommunication()?->format('Y-m-d H:i:s'),
            'statut' => $vehicule->getStatut(),
            'isMonitored' => $vehicule->isMonitored(),
        ];

        if (count($paquets) > 0) {
            $scores = array_map(fn($p) => $p->getScoreGlobal(), $paquets);
            $stats['moyenneScore'] = array_sum($scores) / count($scores);
            $stats['maxScore'] = max($scores);
            $stats['minScore'] = min($scores);
            
            $niveaux = array_count_values(array_map(fn($p) => $p->getNiveauVigilance()->value, $paquets));
            $stats['repartitionNiveaux'] = $niveaux;
        }

        return $this->json([
            'success' => true,
            'data' => $stats,
        ]);

    } catch (\Exception $e) {
        return $this->json([
            'success' => false,
            'error' => 'Internal server error',
            'message' => $e->getMessage(),
        ], Response::HTTP_INTERNAL_SERVER_ERROR);
    }
}

/**
 * Normalise un UUID en format standard (8-4-4-4-12)
 * Gère les UUID hexadécimaux et les formats variés
 */
private function normalizeUuid(string $uuid): string
{
    // Supprimer les tirets et espaces
    $clean = str_replace(['-', ' '], '', $uuid);
    
    // Si c'est de l'hexadécimal, le convertir
    if (ctype_xdigit($clean) && strlen($clean) === 32) {
        // Convertir hex en binaire, puis formater en UUID standard
        $binary = hex2bin($clean);
        return sprintf(
            '%s-%s-%s-%s-%s',
            substr($binary, 0, 4),
            substr($binary, 4, 2),
            substr($binary, 6, 2),
            substr($binary, 8, 2),
            substr($binary, 10)
        );
    }
    
    // Sinon, formater en UUID standard (8-4-4-4-12)
    if (strlen($clean) === 32) {
        return sprintf(
            '%s-%s-%s-%s-%s',
            substr($clean, 0, 8),
            substr($clean, 8, 4),
            substr($clean, 12, 4),
            substr($clean, 16, 4),
            substr($clean, 20)
        );
    }
    
    // Retourner tel quel si format inconnu
    return $uuid;
}

    /**
     * Endpoint GET : Récupérer les alertes actives pour un véhicule
     * 
     * @param string $idVehicule
     * @param Request $request
     * @return JsonResponse
     */
#[Route('/alerts/{idVehicule}', name: 'alerts_get', methods: ['GET'])]
public function getAlerts(string $idVehicule, Request $request): JsonResponse
{
    try {
        // Vérifier la clé API
        $apiKey = $request->headers->get('X-API-KEY');
        
        if (!$apiKey) {
            return $this->json([
                'success' => false,
                'error' => 'Missing API Key',
                'message' => 'La clé API est requise dans l\'en-tête X-API-KEY',
            ], Response::HTTP_UNAUTHORIZED);
        }

        // Vérifier que le véhicule existe
        $vehicule = $this->entityManager
            ->getRepository(Vehicule::class)
            ->findOneBy(['sfamApiKey' => $apiKey]);

        if (!$vehicule) {
            return $this->json([
                'success' => false,
                'error' => 'Vehicle not found',
                'message' => 'Clé API invalide ou véhicule non trouvé',
            ], Response::HTTP_NOT_FOUND);
        }

        // Normalisation UUID
        $vehiculeIdFromDb = $vehicule->getId()->toRfc4122();
        try {
            $uuidFromUrl = \Symfony\Component\Uid\Uuid::fromString($idVehicule);
            $vehiculeIdFromUrl = $uuidFromUrl->toRfc4122();
        } catch (\InvalidArgumentException $e) {
            $vehiculeIdFromUrl = $idVehicule;
        }

        if ($vehiculeIdFromDb !== $vehiculeIdFromUrl) {
            return $this->json([
                'success' => false,
                'error' => 'Vehicle not found',
                'debug' => [
                    'idFromUrl' => $idVehicule,
                    'idFromDb' => $vehicule->getId()->toString(),
                    'idFromUrlNormalized' => $vehiculeIdFromUrl,
                    'idFromDbNormalized' => $vehiculeIdFromDb,
                ],
            ], Response::HTTP_NOT_FOUND);
        }

        // 🔑 FIX : Utiliser findBy() avec filtre sur le statut (chaîne de caractères)
        $alerteRepo = $this->entityManager->getRepository(\App\Entity\Alerte::class);
        
        $alertes = $alerteRepo->findBy(
            [
                'vehicule' => $vehicule,
                'statut' => 'active', // 🔑 Chaîne de caractères directe
            ],
            ['horodatage' => 'DESC'],
            20
        );

        $alertesData = [];
        foreach ($alertes as $alerte) {
            if ($alerte instanceof \App\Entity\Alerte) {
                $alertesData[] = $alerte->toArray();
            }
        }

        return $this->json([
            'success' => true,
            'data' => [
                'total' => count($alertesData),
                'alertes' => $alertesData,
            ],
        ]);

    } catch (\Exception $e) {
        return $this->json([
            'success' => false,
            'error' => 'Internal server error',
            'message' => $e->getMessage(),
        ], Response::HTTP_INTERNAL_SERVER_ERROR);
    }
}

/**
 * Endpoint GET : Lister TOUTES les alertes actives
 */
#[Route('/alerts', name: 'alerts_list_all', methods: ['GET'])]
public function listAllAlerts(Request $request): JsonResponse
{
    try {
        // Vérifier la clé API
        $apiKey = $request->headers->get('X-API-KEY');
        if (!$apiKey) {
            return $this->json([
                'success' => false,
                'error' => 'Missing API Key',
                'message' => 'La clé API est requise dans l\'en-tête X-API-KEY',
            ], Response::HTTP_UNAUTHORIZED);
        }

        // Vérifier que le véhicule existe (authentification)
        $vehicule = $this->entityManager
            ->getRepository(Vehicule::class)
            ->findOneBy(['sfamApiKey' => $apiKey]);

        if (!$vehicule) {
            return $this->json([
                'success' => false,
                'error' => 'Invalid API Key',
                'message' => 'Clé API invalide ou véhicule non trouvé',
            ], Response::HTTP_UNAUTHORIZED);
        }

        // 🔑 Récupérer TOUTES les alertes actives (pas filtrées par véhicule)
        $alerteRepo = $this->entityManager->getRepository(\App\Entity\Alerte::class);
        $alertes = $alerteRepo->findBy(
            ['statut' => 'active'],
            ['horodatage' => 'DESC'],
            100
        );

        $alertesData = [];
        foreach ($alertes as $alerte) {
            if ($alerte instanceof \App\Entity\Alerte) {
                $alertesData[] = $alerte->toArray();
            }
        }

        return $this->json([
            'success' => true,
            'data' => [
                'total' => count($alertesData),
                'alertes' => $alertesData,
            ],
        ]);

    } catch (\Exception $e) {
        return $this->json([
            'success' => false,
            'error' => 'Internal server error',
            'message' => $e->getMessage(),
        ], Response::HTTP_INTERNAL_SERVER_ERROR);
    }
}

#[Route('/vehicles', name: 'vehicles_list', methods: ['GET'])]
public function listVehicles(Request $request): JsonResponse
{
    try {
        // Vérifier la clé API
        $apiKey = $request->headers->get('X-API-KEY');
        if (!$apiKey) {
            return $this->json([
                'success' => false,
                'error' => 'Missing API Key',
            ], Response::HTTP_UNAUTHORIZED);
        }

        // Authentifier le véhicule
        $vehicule = $this->entityManager
            ->getRepository(Vehicule::class)
            ->findOneBy(['sfamApiKey' => $apiKey]);

        if (!$vehicule) {
            return $this->json([
                'success' => false,
                'error' => 'Invalid API Key',
            ], Response::HTTP_UNAUTHORIZED);
        }

        // 🔑 Récupérer TOUS les véhicules (pas seulement celui authentifié)
        $vehicules = $this->entityManager->getRepository(Vehicule::class)->findAll();

        $vehiculesData = [];
        foreach ($vehicules as $v) {
            if ($v instanceof Vehicule) {
                $vehiculesData[] = [
                    'id' => $v->getId()->toString(),
                    'immatriculation' => $v->getImmatriculation(),
                    'type' => $v->getType(),
                    'statut' => $v->getStatut(),
                    'isMonitored' => $v->isMonitored(),
                    'derniereCommunication' => $v->getDerniereCommunication()?->format('Y-m-d H:i:s'),
                ];
            }
        }

        return $this->json([
            'success' => true,
            'data' => [
                'total' => count($vehiculesData),
                'vehicules' => $vehiculesData,
            ],
        ]);

    } catch (\Exception $e) {
        return $this->json([
            'success' => false,
            'error' => 'Internal server error',
            'message' => $e->getMessage(),
        ], Response::HTTP_INTERNAL_SERVER_ERROR);
    }
}
}