<?php

namespace App\Service;

use App\Entity\AnalyseFatigue;
use App\Enum\NiveauVigilance;
use App\Repository\AnalyseFatigueRepository;
use Doctrine\ORM\EntityManagerInterface;

class AnalyseFatigueService
{
    public function __construct(
        private AnalyseFatigueRepository $repository,
        private EntityManagerInterface $entityManager
    ) {}

    /**
     * Crée une nouvelle analyse de fatigue à partir d'un tableau de données
     */
    public function createFromData(array $data): AnalyseFatigue
    {
        $analyse = new AnalyseFatigue();
        $analyse->setEar($data['ear'] ?? 0.3);
        $analyse->setMar($data['mar'] ?? 0.3);
        $analyse->setPitch($data['pitch'] ?? 0.0);
        $analyse->setYaw($data['yaw'] ?? 0.0);
        $analyse->setNombreClignements($data['nombreClignements'] ?? 0);
        $analyse->setDureeYeuxFermes($data['dureeYeuxFermes'] ?? 0);
        $analyse->setNombreBaillements($data['nombreBaillements'] ?? 0);
        
        if (isset($data['horodatage'])) {
            $analyse->setHorodatage(new \DateTimeImmutable($data['horodatage']));
        }

        if (isset($data['metadata'])) {
            $analyse->setMetadata($data['metadata']);
        }

        // Le niveau de vigilance et le score sont calculés automatiquement
        // dans le constructeur et les setters

        $this->entityManager->persist($analyse);
        $this->entityManager->flush();

        return $analyse;
    }

    /**
     * Génère un rapport de fatigue sur une période
     */
    public function generateFatigueReport(\DateTimeInterface $start, \DateTimeInterface $end): array
    {
        $stats = $this->repository->getFatigueStats($start, $end);
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

        // Recommandation basée sur le pourcentage d'analyses critiques
        if ($stats['pourcentage_critiques'] > 10) {
            $recommendations[] = [
                'priorite' => 'URGENTE',
                'message' => sprintf('Taux élevé d\'événements critiques (%.2f%%). Arrêt immédiat recommandé.', $stats['pourcentage_critiques']),
                'action' => 'Arrêter le conducteur et effectuer un contrôle médical',
            ];
        } elseif ($stats['pourcentage_critiques'] > 5) {
            $recommendations[] = [
                'priorite' => 'HAUTE',
                'message' => sprintf('Taux modéré d\'événements critiques (%.2f%%). Surveillance renforcée nécessaire.', $stats['pourcentage_critiques']),
                'action' => 'Augmenter la fréquence des pauses et surveiller de près',
            ];
        }

        // Recommandation basée sur le score moyen
        if ($stats['moyenne_score'] > 40) {
            $recommendations[] = [
                'priorite' => 'MOYENNE',
                'message' => sprintf('Score de fatigue moyen élevé (%.1f/100). Risque accru de somnolence.', $stats['moyenne_score']),
                'action' => 'Planifier des pauses plus fréquentes et réduire la durée de conduite',
            ];
        }

        // Recommandation basée sur le nombre total d'analyses avec fatigue
        if ($countByNiveau['total_fatigue'] > $countByNiveau['total'] * 0.3) {
            $recommendations[] = [
                'priorite' => 'MOYENNE',
                'message' => sprintf('Plus de 30%% des analyses montrent des signes de fatigue (%d/%d).', $countByNiveau['total_fatigue'], $countByNiveau['total']),
                'action' => 'Revoir les horaires de travail et les conditions de conduite',
            ];
        }

        // Recommandation par défaut si aucune alerte
        if (empty($recommendations)) {
            $recommendations[] = [
                'priorite' => 'BASSE',
                'message' => 'Niveau de fatigue globalement acceptable.',
                'action' => 'Maintenir la surveillance régulière',
            ];
        }

        return $recommendations;
    }

    /**
     * Vérifie si une intervention est nécessaire basée sur les dernières analyses
     */
    public function necessiteIntervention(string $dureeMinutes = '30'): bool
    {
        $threshold = (new \DateTimeImmutable())->modify("-{$dureeMinutes} minutes");
        
        $recentAnalyses = $this->repository->createQueryBuilder('a')
            ->where('a.horodatage >= :threshold')
            ->setParameter('threshold', $threshold)
            ->orderBy('a.horodatage', 'DESC')
            ->setMaxResults(10)
            ->getQuery()
            ->getResult();

        if (empty($recentAnalyses)) {
            return false;
        }

        // Vérifier s'il y a des analyses critiques récentes
        foreach ($recentAnalyses as $analyse) {
            if ($analyse->estCritique()) {
                return true;
            }
        }

        // Vérifier si le score moyen est trop élevé
        $sumScore = 0;
        foreach ($recentAnalyses as $analyse) {
            $sumScore += $analyse->getScoreFatigue();
        }

        $avgScore = $sumScore / count($recentAnalyses);
        return $avgScore > 50;
    }

    /**
     * Trouve les analyses critiques récentes nécessitant une attention immédiate
     */
    public function findCriticalRecent(int $minutes = 60): array
    {
        $threshold = (new \DateTimeImmutable())->modify("-{$minutes} minutes");
        
        return $this->repository->createQueryBuilder('a')
            ->where('a.horodatage >= :threshold')
            ->andWhere('a.niveauVigilance = :critique')
            ->setParameter('threshold', $threshold)
            ->setParameter('critique', NiveauVigilance::SOMNOLENCE_CRITIQUE->value)
            ->orderBy('a.horodatage', 'DESC')
            ->getQuery()
            ->getResult();
    }
}