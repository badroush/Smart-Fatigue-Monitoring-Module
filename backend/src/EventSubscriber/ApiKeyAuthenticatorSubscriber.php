<?php

namespace App\EventSubscriber;

use App\Entity\Vehicule;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\EventDispatcher\EventSubscriberInterface;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpKernel\Event\RequestEvent;
use Symfony\Component\HttpKernel\KernelEvents;

class ApiKeyAuthenticatorSubscriber implements EventSubscriberInterface
{
    private const API_ROUTES = [
        '/api/fatigue-events',
        '/api/statistics/',
        '/api/alerts/',
    ];

    public function __construct(
        private EntityManagerInterface $entityManager
    ) {}

    public function onKernelRequest(RequestEvent $event): void
    {
        $request = $event->getRequest();
        $path = $request->getPathInfo();

        // Vérifier si la route nécessite une authentification API
        $requiresAuth = false;
        foreach (self::API_ROUTES as $route) {
            if (strpos($path, $route) === 0) {
                $requiresAuth = true;
                break;
            }
        }

        if (!$requiresAuth) {
            return;
        }

        // Récupérer la clé API
        $apiKey = $request->headers->get('X-API-KEY');

        if (!$apiKey) {
            $event->setResponse(new JsonResponse([
                'success' => false,
                'error' => 'Missing API Key',
                'message' => 'La clé API est requise dans l\'en-tête X-API-KEY',
            ], Response::HTTP_UNAUTHORIZED));
            return;
        }

        // Vérifier la clé API dans la base de données
        $vehicule = $this->entityManager
            ->getRepository(Vehicule::class)
            ->findOneBy(['sfamApiKey' => $apiKey]);

        if (!$vehicule) {
            $event->setResponse(new JsonResponse([
                'success' => false,
                'error' => 'Invalid API Key',
                'message' => 'Clé API invalide ou véhicule non trouvé',
            ], Response::HTTP_UNAUTHORIZED));
            return;
        }

        // Vérifier que le véhicule est actif
        if (!$vehicule->isActive() || !$vehicule->isMonitored()) {
            $event->setResponse(new JsonResponse([
                'success' => false,
                'error' => 'Vehicle not active',
                'message' => 'Le véhicule n\'est pas actif ou n\'est pas surveillé',
            ], Response::HTTP_FORBIDDEN));
            return;
        }

        // Stocker le véhicule dans l'attribut de la requête pour utilisation ultérieure
        $request->attributes->set('authenticatedVehicule', $vehicule);
    }

    public static function getSubscribedEvents(): array
    {
        return [
            KernelEvents::REQUEST => 'onKernelRequest',
        ];
    }
}