<?php

namespace App\Service;

use App\Entity\Alerte;
use App\Entity\FatigueEvent;
use App\Entity\PaquetDonnees;
use App\Enum\NiveauVigilance;
use App\Repository\FatigueEventRepository;
use Doctrine\ORM\EntityManagerInterface;

class FatigueEventService
{
    public function __construct(
        private FatigueEventRepository $repository,
        private EntityManagerInterface $entityManager
    ) {}

    /**
     * Crée un nouvel événement de fatigue à partir d'un paquet de données
     */
    public function creerDepuisPaquet(PaquetDonnees $paquet): FatigueEvent
    {
        $event = new FatigueEvent();
        $event->setConducteur($paquet->getConducteur());
        $event->setVehicule($paquet->getVehicule());
        $event->setNiveauMax($paquet->getNiveauVigilance());
        $event->setDureeSecondes(0); // Commence à 0, sera mis à jour
        $event->setLocalisationDebut($paquet->getLocalisationGPS());
        $event->setDebut($paquet->getHorodatage());
        
        // Ajouter le paquet à l'événement
        $event->addPaquetDonnee($paquet);
        
        // Déterminer les interventions nécessaires
        if ($paquet->getNiveauVigilance()->requiresIntervention()) {
            $event->addIntervention(FatigueEvent::INTERVENTION_ALERTE_LOCALE);
            $event->addIntervention(FatigueEvent::INTERVENTION_ALERTE_VOCALE);
        }
        
        if ($paquet->getNiveauVigilance()->isCritical()) {
            $event->addIntervention(FatigueEvent::INTERVENTION_SONNETTE);
            $event->addIntervention(FatigueEvent::INTERVENTION_CLIGNOTANTS);
            $event->addIntervention(FatigueEvent::INTERVENTION_SMS_SUPERVISEUR);
            $event->addIntervention(FatigueEvent::INTERVENTION_ARRET_OBLIGATOIRE);
        }
        
        $this->entityManager->persist($event);
        $this->entityManager->flush();
        
        return $event;
    }

    /**
     * Met à jour un événement existant avec un nouveau paquet
     */
    public function mettreAJourAvecPaquet(FatigueEvent $event, PaquetDonnees $paquet): FatigueEvent
    {
        // Mettre à jour le niveau maximal si nécessaire
        if ($paquet->getNiveauVigilance()->isHigherThan($event->getNiveauMax())) {
            $event->setNiveauMax($paquet->getNiveauVigilance());
        }
        
        // Mettre à jour la durée
        $duree = $paquet->getHorodatage()->getTimestamp() - $event->getDebut()->getTimestamp();
        $event->setDureeSecondes(max($event->getDureeSecondes(), $duree));
        
        // Mettre à jour la localisation de fin
        $event->setLocalisationFin($paquet->getLocalisationGPS());
        
        // Mettre à jour la fin si l'événement est terminé
        if (!$paquet->getNiveauVigilance()->requiresIntervention() && $event->getFin() === null) {
            $event->setFin($paquet->getHorodatage());
        }
        
        // Ajouter le paquet à l'événement
        $event->addPaquetDonnee($paquet);
        
        $this->entityManager->persist($event);
        $this->entityManager->flush();
        
        return $event;
    }

    /**
     * Résout un événement avec un utilisateur et des notes
     */
    public function resoudre(FatigueEvent $event, object $user, ?string $notes = null): FatigueEvent
    {
        $event->setResolu(true);
        $event->setResoluAt(new \DateTimeImmutable());
        $event->setResoluPar($user);
        
        if ($notes !== null) {
            $event->setNotes($notes);
        }
        
        // Si l'événement n'a pas de fin, la définir maintenant
        if ($event->getFin() === null) {
            $event->setFin(new \DateTimeImmutable());
        }
        
        $this->entityManager->persist($event);
        $this->entityManager->flush();
        
        return $event;
    }

    /**
     * Génère un rapport d'événements sur une période
     */
    public function genererRapport(\DateTimeInterface $start, \DateTimeInterface $end): array
    {
        $stats = $this->repository->getStats($start, $end);
        $countByNiveau = $this->repository->countByNiveauVigilance($start, $end);

        return [
            'periode' => [
                'debut' => $start->format('Y-m-d H:i:s'),
                'fin' => $end->format('Y-m-d H:i:s'),
                'duree_heures' => round(($end->getTimestamp() - $start->getTimestamp()) / 3600, 2),
            ],
            'statistiques' => $stats,
            'repartition_niveaux' => $countByNiveau,
            'recommendations' => $this->genererRecommendations($stats, $countByNiveau),
        ];
    }

    /**
     * Génère des recommandations basées sur les statistiques
     */
    private function genererRecommendations(array $stats, array $countByNiveau): array
    {
        $recommendations = [];

        // Recommandation basée sur le pourcentage d'événements critiques
        if ($stats['pourcentage_critiques'] > 10) {
            $recommendations[] = [
                'priorite' => 'URGENTE',
                'message' => sprintf('Taux très élevé d\'événements critiques (%.2f%%). Arrêt immédiat de tous les conducteurs concernés recommandé.', $stats['pourcentage_critiques']),
                'action' => 'Arrêter immédiatement les conducteurs et effectuer un contrôle médical complet',
            ];
        } elseif ($stats['pourcentage_critiques'] > 5) {
            $recommendations[] = [
                'priorite' => 'HAUTE',
                'message' => sprintf('Taux élevé d\'événements critiques (%.2f%%). Surveillance renforcée nécessaire.', $stats['pourcentage_critiques']),
                'action' => 'Mettre en place un suivi médical renforcé et réduire les horaires de travail',
            ];
        }

        // Recommandation basée sur la durée moyenne des événements
        if ($stats['moyenne_duree_secondes'] > 300) { // Plus de 5 minutes en moyenne
            $recommendations[] = [
                'priorite' => 'HAUTE',
                'message' => sprintf('Durée moyenne des événements élevée (%s). Risque accru d\'accident.', $stats['moyenne_duree_formatted']),
                'action' => 'Réduire immédiatement la durée des trajets et augmenter la fréquence des pauses',
            ];
        } elseif ($stats['moyenne_duree_secondes'] > 120) { // Plus de 2 minutes en moyenne
            $recommendations[] = [
                'priorite' => 'MOYENNE',
                'message' => sprintf('Durée moyenne des événements modérée (%s).', $stats['moyenne_duree_formatted']),
                'action' => 'Revoir les horaires de travail et prévoir des pauses plus fréquentes',
            ];
        }

        // Recommandation basée sur le taux de résolution
        if ($stats['pourcentage_resolus'] < 80) {
            $recommendations[] = [
                'priorite' => 'MOYENNE',
                'message' => sprintf('Taux de résolution des événements bas (%.2f%%). %d événements non résolus.', $stats['pourcentage_resolus'], $stats['evenements_non_resolus']),
                'action' => 'Allouer plus de ressources à la gestion des événements et améliorer les procédures de suivi',
            ];
        }

        // Recommandation par défaut
        if (empty($recommendations)) {
            $recommendations[] = [
                'priorite' => 'BASSE',
                'message' => 'Niveau de fatigue globalement acceptable.',
                'action' => 'Maintenir la surveillance régulière et les bonnes pratiques',
            ];
        }

        return $recommendations;
    }

    /**
     * Trouve les événements actifs nécessitant une attention immédiate
     */
    public function findEvenementsActifsCritiques(): array
    {
        $actifs = $this->repository->findActifs();
        
        $critiques = [];
        foreach ($actifs as $event) {
            if ($event->estCritique() || $event->necessiteInterventionExterne()) {
                $critiques[] = $event;
            }
        }
        
        return $critiques;
    }

    /**
     * Calcule le score de risque global sur une période
     */
    public function calculerScoreRisque(\DateTimeInterface $start, \DateTimeInterface $end): int
    {
        $stats = $this->repository->getStats($start, $end);
        $countByNiveau = $this->repository->countByNiveauVigilance($start, $end);

        $score = 0;

        // Contribution des événements par niveau
        $score += $countByNiveau['fatigue_legere'] * 1;
        $score += $countByNiveau['fatigue_moderée'] * 3;
        $score += $countByNiveau['fatigue_severe'] * 5;
        $score += $countByNiveau['somnolence_critique'] * 10;

        // Contribution de la durée totale (1 point par heure)
        $score += floor($stats['total_duree_secondes'] / 3600);

        // Contribution du pourcentage d'événements non résolus
        if ($stats['total_evenements'] > 0) {
            $pourcentageNonResolus = ($stats['evenements_non_resolus'] / $stats['total_evenements']) * 100;
            $score += floor($pourcentageNonResolus / 10); // 1 point par tranche de 10%
        }

        return min(100, $score);
    }
}