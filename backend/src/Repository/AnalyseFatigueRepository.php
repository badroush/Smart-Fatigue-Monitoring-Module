<?php

namespace App\Repository;

use App\Entity\AnalyseFatigue;
use App\Enum\NiveauVigilance;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

class AnalyseFatigueRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, AnalyseFatigue::class);
    }

    /**
     * Trouve les analyses de fatigue récentes (dernières 24h)
     */
    public function findRecent(int $hours = 24): array
    {
        $threshold = (new \DateTimeImmutable())->modify(sprintf('-%d hours', $hours));

        return $this->createQueryBuilder('a')
            ->where('a.horodatage >= :threshold')
            ->setParameter('threshold', $threshold)
            ->orderBy('a.horodatage', 'DESC')
            ->getQuery()
            ->getResult();
    }

    /**
     * Trouve les analyses avec fatigue détectée
     */
    public function findWithFatigue(): array
    {
        return $this->createQueryBuilder('a')
            ->where('a.niveauVigilance != :normal')
            ->setParameter('normal', NiveauVigilance::NORMAL->value)
            ->orderBy('a.horodatage', 'DESC')
            ->getQuery()
            ->getResult();
    }

    /**
     * Trouve les analyses par niveau de vigilance
     */
    public function findByNiveauVigilance(NiveauVigilance $niveau): array
    {
        return $this->createQueryBuilder('a')
            ->where('a.niveauVigilance = :niveau')
            ->setParameter('niveau', $niveau->value)
            ->orderBy('a.horodatage', 'DESC')
            ->getQuery()
            ->getResult();
    }

    /**
     * Trouve les analyses critiques (somnolence critique)
     */
    public function findCritical(): array
    {
        return $this->createQueryBuilder('a')
            ->where('a.niveauVigilance = :critique')
            ->setParameter('critique', NiveauVigilance::SOMNOLENCE_CRITIQUE->value)
            ->orderBy('a.horodatage', 'DESC')
            ->getQuery()
            ->getResult();
    }

    /**
     * Compte le nombre d'analyses par niveau de vigilance sur une période
     */
    public function countByNiveauVigilance(\DateTimeInterface $start, \DateTimeInterface $end): array
    {
        $qb = $this->createQueryBuilder('a');
        
        $normal = $qb->select('COUNT(a.id)')
            ->where('a.horodatage BETWEEN :start AND :end')
            ->andWhere('a.niveauVigilance = :niveau')
            ->setParameter('start', $start)
            ->setParameter('end', $end)
            ->setParameter('niveau', NiveauVigilance::NORMAL->value)
            ->getQuery()
            ->getSingleScalarResult();

        $legere = $qb->select('COUNT(a.id)')
            ->where('a.horodatage BETWEEN :start AND :end')
            ->andWhere('a.niveauVigilance = :niveau')
            ->setParameter('start', $start)
            ->setParameter('end', $end)
            ->setParameter('niveau', NiveauVigilance::FATIGUE_LEGERE->value)
            ->getQuery()
            ->getSingleScalarResult();

        $moderee = $qb->select('COUNT(a.id)')
            ->where('a.horodatage BETWEEN :start AND :end')
            ->andWhere('a.niveauVigilance = :niveau')
            ->setParameter('start', $start)
            ->setParameter('end', $end)
            ->setParameter('niveau', NiveauVigilance::FATIGUE_MODEREE->value)
            ->getQuery()
            ->getSingleScalarResult();

        $severe = $qb->select('COUNT(a.id)')
            ->where('a.horodatage BETWEEN :start AND :end')
            ->andWhere('a.niveauVigilance = :niveau')
            ->setParameter('start', $start)
            ->setParameter('end', $end)
            ->setParameter('niveau', NiveauVigilance::FATIGUE_SEVERE->value)
            ->getQuery()
            ->getSingleScalarResult();

        $critique = $qb->select('COUNT(a.id)')
            ->where('a.horodatage BETWEEN :start AND :end')
            ->andWhere('a.niveauVigilance = :niveau')
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
            'total_fatigue' => (int) ($legere + $moderee + $severe + $critique),
        ];
    }

    /**
     * Trouve la dernière analyse de fatigue
     */
    public function findLatest(): ?AnalyseFatigue
    {
        return $this->createQueryBuilder('a')
            ->orderBy('a.horodatage', 'DESC')
            ->setMaxResults(1)
            ->getQuery()
            ->getOneOrNullResult();
    }

    /**
     * Calcule les statistiques de fatigue sur une période
     */
    public function getFatigueStats(\DateTimeInterface $start, \DateTimeInterface $end): array
    {
        $allData = $this->createQueryBuilder('a')
            ->where('a.horodatage BETWEEN :start AND :end')
            ->setParameter('start', $start)
            ->setParameter('end', $end)
            ->getQuery()
            ->getResult();

        if (empty($allData)) {
            return [
                'total_analyses' => 0,
                'moyenne_ear' => 0,
                'moyenne_mar' => 0,
                'moyenne_score' => 0,
                'max_score' => 0,
                'analyses_critiques' => 0,
            ];
        }

        $sumEar = 0;
        $sumMar = 0;
        $sumScore = 0;
        $maxScore = 0;
        $critiques = 0;

        foreach ($allData as $analyse) {
            $sumEar += $analyse->getEar();
            $sumMar += $analyse->getMar();
            $sumScore += $analyse->getScoreFatigue();
            $maxScore = max($maxScore, $analyse->getScoreFatigue());
            
            if ($analyse->getNiveauVigilance() === NiveauVigilance::SOMNOLENCE_CRITIQUE) {
                $critiques++;
            }
        }

        $count = count($allData);

        return [
            'total_analyses' => $count,
            'moyenne_ear' => round($sumEar / $count, 3),
            'moyenne_mar' => round($sumMar / $count, 3),
            'moyenne_score' => round($sumScore / $count, 1),
            'max_score' => $maxScore,
            'analyses_critiques' => $critiques,
            'pourcentage_critiques' => round(($critiques / $count) * 100, 2),
        ];
    }

    /**
     * Trouve les analyses avec alertes actives
     */
    public function findWithAlerts(): array
    {
        return $this->createQueryBuilder('a')
            ->where('a.alerteYeuxFermes = :true OR a.alerteBaillements = :true OR a.alerteInclinaisonTete = :true')
            ->setParameter('true', true)
            ->orderBy('a.horodatage', 'DESC')
            ->getQuery()
            ->getResult();
    }

    /**
     * Trouve les analyses par score de fatigue
     */
    public function findByScoreRange(int $minScore, int $maxScore): array
    {
        return $this->createQueryBuilder('a')
            ->where('a.scoreFatigue BETWEEN :min AND :max')
            ->setParameter('min', $minScore)
            ->setParameter('max', $maxScore)
            ->orderBy('a.horodatage', 'DESC')
            ->getQuery()
            ->getResult();
    }
}