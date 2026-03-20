<?php

namespace App\Repository;

use App\Entity\FatigueEvent;
use App\Enum\NiveauVigilance;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

class FatigueEventRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, FatigueEvent::class);
    }

    /**
     * Trouve les événements actifs (pas encore terminés)
     */
    public function findActifs(): array
    {
        return $this->createQueryBuilder('f')
            ->where('f.fin IS NULL')
            ->orderBy('f.debut', 'DESC')
            ->getQuery()
            ->getResult();
    }

    /**
     * Trouve les événements par conducteur
     */
    public function findByConducteur(string $conducteurId, int $limit = 50): array
    {
        return $this->createQueryBuilder('f')
            ->join('f.conducteur', 'c')
            ->where('c.id = :conducteurId')
            ->setParameter('conducteurId', $conducteurId)
            ->orderBy('f.debut', 'DESC')
            ->setMaxResults($limit)
            ->getQuery()
            ->getResult();
    }

    /**
     * Trouve les événements par véhicule
     */
    public function findByVehicule(string $vehiculeId, int $limit = 50): array
    {
        return $this->createQueryBuilder('f')
            ->join('f.vehicule', 'v')
            ->where('v.id = :vehiculeId')
            ->setParameter('vehiculeId', $vehiculeId)
            ->orderBy('f.debut', 'DESC')
            ->setMaxResults($limit)
            ->getQuery()
            ->getResult();
    }

    /**
     * Trouve les événements par niveau de vigilance
     */
    public function findByNiveauVigilance(NiveauVigilance $niveau): array
    {
        return $this->createQueryBuilder('f')
            ->where('f.niveauMax = :niveau')
            ->setParameter('niveau', $niveau->value)
            ->orderBy('f.debut', 'DESC')
            ->getQuery()
            ->getResult();
    }

    /**
     * Trouve les événements critiques (somnolence critique)
     */
    public function findCritiques(): array
    {
        return $this->createQueryBuilder('f')
            ->where('f.niveauMax = :critique')
            ->setParameter('critique', NiveauVigilance::SOMNOLENCE_CRITIQUE->value)
            ->orderBy('f.debut', 'DESC')
            ->getQuery()
            ->getResult();
    }

    /**
     * Trouve les événements non résolus
     */
    public function findNonResolus(): array
    {
        return $this->createQueryBuilder('f')
            ->where('f.resolu = :false')
            ->setParameter('false', false)
            ->orderBy('f.debut', 'DESC')
            ->getQuery()
            ->getResult();
    }

    /**
     * Compte le nombre d'événements par niveau de vigilance sur une période
     */
    public function countByNiveauVigilance(\DateTimeInterface $start, \DateTimeInterface $end): array
    {
        $qb = $this->createQueryBuilder('f');
        
        $normal = $qb->select('COUNT(f.id)')
            ->where('f.debut BETWEEN :start AND :end')
            ->andWhere('f.niveauMax = :niveau')
            ->setParameter('start', $start)
            ->setParameter('end', $end)
            ->setParameter('niveau', NiveauVigilance::NORMAL->value)
            ->getQuery()
            ->getSingleScalarResult();

        $legere = $qb->select('COUNT(f.id)')
            ->where('f.debut BETWEEN :start AND :end')
            ->andWhere('f.niveauMax = :niveau')
            ->setParameter('start', $start)
            ->setParameter('end', $end)
            ->setParameter('niveau', NiveauVigilance::FATIGUE_LEGERE->value)
            ->getQuery()
            ->getSingleScalarResult();

        $moderee = $qb->select('COUNT(f.id)')
            ->where('f.debut BETWEEN :start AND :end')
            ->andWhere('f.niveauMax = :niveau')
            ->setParameter('start', $start)
            ->setParameter('end', $end)
            ->setParameter('niveau', NiveauVigilance::FATIGUE_MODEREE->value)
            ->getQuery()
            ->getSingleScalarResult();

        $severe = $qb->select('COUNT(f.id)')
            ->where('f.debut BETWEEN :start AND :end')
            ->andWhere('f.niveauMax = :niveau')
            ->setParameter('start', $start)
            ->setParameter('end', $end)
            ->setParameter('niveau', NiveauVigilance::FATIGUE_SEVERE->value)
            ->getQuery()
            ->getSingleScalarResult();

        $critique = $qb->select('COUNT(f.id)')
            ->where('f.debut BETWEEN :start AND :end')
            ->andWhere('f.niveauMax = :niveau')
            ->setParameter('start', $start)
            ->setParameter('end', $end)
            ->setParameter('niveau', NiveauVigilance::SOMNOLENCE_CRITIQUE->value)
            ->getQuery()
            ->getSingleScalarResult();

        return [
            'normal' => (int) $normal,
            'fatigue_legere' => (int) $legere,
            'fatigue_moderée' => (int) $moderee,
            'fatigue_severe' => (int) $severe,
            'somnolence_critique' => (int) $critique,
            'total' => (int) ($normal + $legere + $moderee + $severe + $critique),
        ];
    }

    /**
     * Trouve les événements récents (dernières 24h)
     */
    public function findRecent(int $hours = 24): array
    {
        $threshold = (new \DateTimeImmutable())->modify(sprintf('-%d hours', $hours));

        return $this->createQueryBuilder('f')
            ->where('f.debut >= :threshold')
            ->setParameter('threshold', $threshold)
            ->orderBy('f.debut', 'DESC')
            ->getQuery()
            ->getResult();
    }

    /**
     * Calcule les statistiques sur une période
     */
    public function getStats(\DateTimeInterface $start, \DateTimeInterface $end): array
    {
        $allEvents = $this->createQueryBuilder('f')
            ->where('f.debut BETWEEN :start AND :end')
            ->setParameter('start', $start)
            ->setParameter('end', $end)
            ->getQuery()
            ->getResult();

        if (empty($allEvents)) {
            return [
                'total_evenements' => 0,
                'total_duree_secondes' => 0,
                'moyenne_duree_secondes' => 0,
                'evenements_critiques' => 0,
                'evenements_resolus' => 0,
                'evenements_non_resolus' => 0,
            ];
        }

        $totalDuree = 0;
        $critiques = 0;
        $resolus = 0;

        foreach ($allEvents as $event) {
            $totalDuree += $event->getDureeSecondes();
            
            if ($event->getNiveauMax() === NiveauVigilance::SOMNOLENCE_CRITIQUE) {
                $critiques++;
            }
            
            if ($event->isResolu()) {
                $resolus++;
            }
        }

        $count = count($allEvents);

        return [
            'total_evenements' => $count,
            'total_duree_secondes' => $totalDuree,
            'total_duree_formatted' => $this->formatDuree($totalDuree),
            'moyenne_duree_secondes' => round($totalDuree / $count, 0),
            'moyenne_duree_formatted' => $this->formatDuree(round($totalDuree / $count, 0)),
            'evenements_critiques' => $critiques,
            'evenements_resolus' => $resolus,
            'evenements_non_resolus' => $count - $resolus,
            'pourcentage_critiques' => round(($critiques / $count) * 100, 2),
            'pourcentage_resolus' => round(($resolus / $count) * 100, 2),
        ];
    }

    /**
     * Formate une durée en secondes en chaîne lisible
     */
    private function formatDuree(int $secondes): string
    {
        $hours = floor($secondes / 3600);
        $minutes = floor(($secondes % 3600) / 60);
        $seconds = $secondes % 60;

        if ($hours > 0) {
            return sprintf('%dh %02dm %02ds', $hours, $minutes, $seconds);
        } elseif ($minutes > 0) {
            return sprintf('%dm %02ds', $minutes, $seconds);
        } else {
            return sprintf('%ds', $seconds);
        }
    }

    /**
     * Trouve les événements avec intervention externe
     */
    public function findAvecInterventionExterne(): array
    {
        return $this->createQueryBuilder('f')
            ->where('JSON_CONTAINS(f.interventionsDeclenchees, :sonnette) = 1 OR JSON_CONTAINS(f.interventionsDeclenchees, :clignotants) = 1')
            ->setParameter('sonnette', '"sonnette"')
            ->setParameter('clignotants', '"clignotants"')
            ->orderBy('f.debut', 'DESC')
            ->getQuery()
            ->getResult();
    }

    /**
     * Trouve le dernier événement par conducteur
     */
    public function findLastByConducteur(string $conducteurId): ?FatigueEvent
    {
        return $this->createQueryBuilder('f')
            ->join('f.conducteur', 'c')
            ->where('c.id = :conducteurId')
            ->setParameter('conducteurId', $conducteurId)
            ->orderBy('f.debut', 'DESC')
            ->setMaxResults(1)
            ->getQuery()
            ->getOneOrNullResult();
    }

    /**
     * Trouve le dernier événement par véhicule
     */
    public function findLastByVehicule(string $vehiculeId): ?FatigueEvent
    {
        return $this->createQueryBuilder('f')
            ->join('f.vehicule', 'v')
            ->where('v.id = :vehiculeId')
            ->setParameter('vehiculeId', $vehiculeId)
            ->orderBy('f.debut', 'DESC')
            ->setMaxResults(1)
            ->getQuery()
            ->getOneOrNullResult();
    }

    /**
     * Compte le nombre total d'événements
     */
    public function countTotal(): int
    {
        return (int) $this->createQueryBuilder('f')
            ->select('COUNT(f.id)')
            ->getQuery()
            ->getSingleScalarResult();
    }

    /**
     * Compte le nombre d'événements actifs
     */
    public function countActifs(): int
    {
        return (int) $this->createQueryBuilder('f')
            ->select('COUNT(f.id)')
            ->where('f.fin IS NULL')
            ->getQuery()
            ->getSingleScalarResult();
    }
}