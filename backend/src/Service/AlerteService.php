<?php

namespace App\Service;

use App\Entity\Alerte;
use App\Entity\FatigueEvent;
use App\Entity\PaquetDonnees;
use App\Enum\NiveauVigilance;
use App\Repository\AlerteRepository;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\Messenger\MessageBusInterface;

class AlerteService
{
    public function __construct(
        private AlerteRepository $repository,
        private EntityManagerInterface $entityManager,
        private MessageBusInterface $bus
    ) {}

    /**
     * Crée une alerte à partir d'un paquet de données
     */
    public function creerDepuisPaquet(PaquetDonnees $paquet): ?Alerte
    {
        // Ne créer une alerte que si le niveau nécessite une intervention
        if (!$paquet->getNiveauVigilance()->requiresIntervention()) {
            return null;
        }

        $alerte = new Alerte();
        $alerte->setConducteur($paquet->getConducteur());
        $alerte->setVehicule($paquet->getVehicule());
        $alerte->setNiveau($paquet->getNiveauVigilance());
        $alerte->setType($this->determinerTypeAlerte($paquet->getNiveauVigilance()));
        $alerte->setMessage($this->genererMessageAlerte($paquet));
        $alerte->setHorodatage($paquet->getHorodatage());
        $alerte->setEnvoyee(true);
        $alerte->setLue(false);

        $this->entityManager->persist($alerte);
        $this->entityManager->flush();

        // Envoyer la notification via Messenger
        // $this->bus->dispatch(new SendAlertNotificationMessage($alerte->getId()));

        return $alerte;
    }

    /**
     * Crée une alerte à partir d'un événement de fatigue
     */
    public function creerDepuisEvent(FatigueEvent $event): ?Alerte
    {
        // Ne créer une alerte que si le niveau est critique
        if (!$event->getNiveauMax()->isCritical()) {
            return null;
        }

        $alerte = new Alerte();
        $alerte->setConducteur($event->getConducteur());
        $alerte->setVehicule($event->getVehicule());
        $alerte->setNiveau($event->getNiveauMax());
        $alerte->setType($this->determinerTypeAlerte($event->getNiveauMax()));
        $alerte->setMessage($this->genererMessageAlerteEvent($event));
        $alerte->setHorodatage($event->getDebut());
        $alerte->setFatigueEvent($event);
        $alerte->setEnvoyee(true);
        $alerte->setLue(false);

        $this->entityManager->persist($alerte);
        $this->entityManager->flush();

        return $alerte;
    }

    /**
     * Détermine le type d'alerte en fonction du niveau de vigilance
     */
    private function determinerTypeAlerte(NiveauVigilance $niveau): string
    {
        return match ($niveau) {
            NiveauVigilance::SOMNOLENCE_CRITIQUE => Alerte::TYPE_SONNETTE,
            NiveauVigilance::FATIGUE_SEVERE => Alerte::TYPE_SMS,
            NiveauVigilance::FATIGUE_MODEREE => Alerte::TYPE_VOCALE,
            NiveauVigilance::FATIGUE_LEGERE => Alerte::TYPE_LOCALE,
            default => Alerte::TYPE_LOCALE,
        };
    }

    /**
     * Génère un message d'alerte à partir d'un paquet de données
     */
    private function genererMessageAlerte(PaquetDonnees $paquet): string
    {
        $niveau = $paquet->getNiveauVigilance();
        
        return match ($niveau) {
            NiveauVigilance::SOMNOLENCE_CRITIQUE => sprintf(
                'ALERTE CRITIQUE : Somnolence détectée pour %s (%s) - Score: %d/100',
                $paquet->getConducteur()->getNom(),
                $paquet->getVehicule()->getImmatriculation(),
                $paquet->getScoreGlobal()
            ),
            NiveauVigilance::FATIGUE_SEVERE => sprintf(
                'ALERTE SÉVÈRE : Fatigue sévère détectée pour %s (%s) - Score: %d/100',
                $paquet->getConducteur()->getNom(),
                $paquet->getVehicule()->getImmatriculation(),
                $paquet->getScoreGlobal()
            ),
            NiveauVigilance::FATIGUE_MODEREE => sprintf(
                'ALERTE : Fatigue modérée détectée pour %s (%s) - Score: %d/100',
                $paquet->getConducteur()->getNom(),
                $paquet->getVehicule()->getImmatriculation(),
                $paquet->getScoreGlobal()
            ),
            NiveauVigilance::FATIGUE_LEGERE => sprintf(
                'Attention : Fatigue légère détectée pour %s (%s) - Score: %d/100',
                $paquet->getConducteur()->getNom(),
                $paquet->getVehicule()->getImmatriculation(),
                $paquet->getScoreGlobal()
            ),
            default => 'Alerte de fatigue détectée',
        };
    }

    /**
     * Génère un message d'alerte à partir d'un événement
     */
    private function genererMessageAlerteEvent(FatigueEvent $event): string
    {
        $niveau = $event->getNiveauMax();
        
        return match ($niveau) {
            NiveauVigilance::SOMNOLENCE_CRITIQUE => sprintf(
                'ÉVÉNEMENT CRITIQUE : Somnolence détectée pour %s (%s) - Durée: %s - Interventions: %s',
                $event->getConducteur()->getNom(),
                $event->getVehicule()->getImmatriculation(),
                $event->getDureeFormatted(),
                implode(', ', $event->getInterventionsDeclenchees())
            ),
            NiveauVigilance::FATIGUE_SEVERE => sprintf(
                'Événement sévère : Fatigue sévère détectée pour %s (%s) - Durée: %s',
                $event->getConducteur()->getNom(),
                $event->getVehicule()->getImmatriculation(),
                $event->getDureeFormatted()
            ),
            default => sprintf(
                'Événement de fatigue détecté pour %s (%s) - Niveau: %s',
                $event->getConducteur()->getNom(),
                $event->getVehicule()->getImmatriculation(),
                $event->getNiveauMax()->getLabel()
            ),
        };
    }

    /**
     * Acquitter une alerte
     */
    public function acquitter(Alerte $alerte, ?object $user = null): Alerte
    {
        $alerte->acquitter($user instanceof \App\Entity\User ? $user : null);
        $this->entityManager->persist($alerte);
        $this->entityManager->flush();
        
        return $alerte;
    }

    /**
     * Résoudre une alerte
     */
    public function resoudre(Alerte $alerte, ?object $user = null): Alerte
    {
        $alerte->resoudre($user instanceof \App\Entity\User ? $user : null);
        $this->entityManager->persist($alerte);
        $this->entityManager->flush();
        
        return $alerte;
    }

    /**
     * Annuler une alerte
     */
    public function annuler(Alerte $alerte): Alerte
    {
        $alerte->annuler();
        $this->entityManager->persist($alerte);
        $this->entityManager->flush();
        
        return $alerte;
    }

    /**
     * Marquer une alerte comme lue
     */
    public function marquerCommeLue(Alerte $alerte): Alerte
    {
        $alerte->marquerCommeLue();
        $this->entityManager->persist($alerte);
        $this->entityManager->flush();
        
        return $alerte;
    }

    /**
     * Trouve les alertes actives nécessitant une attention immédiate
     */
    public function findAlertesUrgentes(): array
    {
        $actives = $this->repository->findActives();
        
        $urgentes = [];
        foreach ($actives as $alerte) {
            if ($alerte->getPriorite() >= 4 && $alerte->estRecente()) {
                $urgentes[] = $alerte;
            }
        }
        
        return $urgentes;
    }

    /**
     * Génère un rapport d'alertes sur une période
     */
    public function genererRapport(\DateTimeInterface $start, \DateTimeInterface $end): array
    {
        $countByType = $this->repository->countByType($start, $end);
        $countByNiveau = $this->repository->countByNiveauVigilance($start, $end);
        
        $total = array_sum($countByType);
        $totalCritiques = $countByNiveau['somnolence_critique'] ?? 0;

        return [
            'periode' => [
                'debut' => $start->format('Y-m-d H:i:s'),
                'fin' => $end->format('Y-m-d H:i:s'),
                'duree_heures' => round(($end->getTimestamp() - $start->getTimestamp()) / 3600, 2),
            ],
            'statistiques' => [
                'total_alertes' => $total,
                'alertes_par_type' => $countByType,
                'alertes_par_niveau' => $countByNiveau,
                'alertes_critiques' => $totalCritiques,
                'pourcentage_critiques' => $total > 0 ? round(($totalCritiques / $total) * 100, 2) : 0,
            ],
            'recommendations' => $this->genererRecommendations($total, $totalCritiques),
        ];
    }

    /**
     * Génère des recommandations basées sur les statistiques
     */
    private function genererRecommendations(int $totalAlertes, int $totalCritiques): array
    {
        $recommendations = [];

        if ($totalCritiques > 5) {
            $recommendations[] = [
                'priorite' => 'URGENTE',
                'message' => sprintf('Nombre élevé d\'alertes critiques (%d). Arrêt immédiat recommandé.', $totalCritiques),
                'action' => 'Arrêter tous les conducteurs concernés et effectuer un contrôle médical',
            ];
        } elseif ($totalCritiques > 2) {
            $recommendations[] = [
                'priorite' => 'HAUTE',
                'message' => sprintf('Nombre modéré d\'alertes critiques (%d). Surveillance renforcée nécessaire.', $totalCritiques),
                'action' => 'Mettre en place un suivi médical renforcé',
            ];
        }

        if ($totalAlertes > 20) {
            $recommendations[] = [
                'priorite' => 'MOYENNE',
                'message' => sprintf('Nombre total d\'alertes élevé (%d). Révision des conditions de travail recommandée.', $totalAlertes),
                'action' => 'Revoir les horaires de travail et améliorer les conditions de conduite',
            ];
        }

        if (empty($recommendations)) {
            $recommendations[] = [
                'priorite' => 'BASSE',
                'message' => 'Niveau d\'alertes acceptable.',
                'action' => 'Maintenir la surveillance régulière',
            ];
        }

        return $recommendations;
    }
}