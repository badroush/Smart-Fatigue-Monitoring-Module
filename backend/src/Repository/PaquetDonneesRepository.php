<?php

namespace App\Repository;

use App\Entity\PaquetDonnees;
use App\Enum\NiveauVigilance;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

class PaquetDonneesRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, PaquetDonnees::class);
    }

    /**
     * Trouve les paquets récents (dernières 24h)
     */
    public function findRecent(int $hours = 24): array
    {
        $threshold = (new \DateTimeImmutable())->modify(sprintf('-%d hours', $hours));

        return $this->createQueryBuilder('p')
            ->where('p.horodatage >= :threshold')
            ->setParameter('threshold', $threshold)
            ->orderBy('p.horodatage', 'DESC')
            ->getQuery()
            ->getResult();
    }

    /**
     * Trouve les paquets par véhicule
     */
    public function findByVehicule(string $vehiculeId, int $limit = 100): array
    {
        return $this->createQueryBuilder('p')
            ->where('p.idVehicule = :vehiculeId')
            ->setParameter('vehiculeId', $vehiculeId)
            ->orderBy('p.horodatage', 'DESC')
            ->setMaxResults($limit)
            ->getQuery()
            ->getResult();
    }

    /**
     * Trouve les paquets par conducteur
     */
    public function findByConducteur(string $conducteurId, int $limit = 100): array
    {
        return $this->createQueryBuilder('p')
            ->where('p.idConducteur = :conducteurId')
            ->setParameter('conducteurId', $conducteurId)
            ->orderBy('p.horodatage', 'DESC')
            ->setMaxResults($limit)
            ->getQuery()
            ->getResult();
    }

    /**
     * Trouve les paquets avec alertes
     */
    public function findWithAlertes(): array
    {
        return $this->createQueryBuilder('p')
            ->where('p.alerteGeneree = :true')
            ->setParameter('true', true)
            ->orderBy('p.horodatage', 'DESC')
            ->getQuery()
            ->getResult();
    }

    /**
     * Trouve les paquets non traités
     */
    public function findNonTraites(): array
    {
        return $this->createQueryBuilder('p')
            ->where('p.traite = :false')
            ->setParameter('false', false)
            ->orderBy('p.horodatage', 'ASC')
            ->getQuery()
            ->getResult();
    }

    /**
     * Trouve les paquets par niveau de vigilance
     */
    public function findByNiveauVigilance(NiveauVigilance $niveau): array
    {
        return $this->createQueryBuilder('p')
            ->where('p.niveauVigilance = :niveau')
            ->setParameter('niveau', $niveau->value)
            ->orderBy('p.horodatage', 'DESC')
            ->getQuery()
            ->getResult();
    }

    /**
     * Trouve les paquets critiques (somnolence critique)
     */
    public function findCritiques(): array
    {
        return $this->createQueryBuilder('p')
            ->where('p.niveauVigilance = :critique')
            ->setParameter('critique', NiveauVigilance::SOMNOLENCE_CRITIQUE->value)
            ->orderBy('p.horodatage', 'DESC')
            ->getQuery()
            ->getResult();
    }

    /**
     * Compte le nombre de paquets par niveau de vigilance sur une période
     */
    public function countByNiveauVigilance(\DateTimeInterface $start, \DateTimeInterface $end): array
    {
        $qb = $this->createQueryBuilder('p');
        
        $normal = $qb->select('COUNT(p.id)')
            ->where('p.horodatage BETWEEN :start AND :end')
            ->andWhere('p.niveauVigilance = :niveau')
            ->setParameter('start', $start)
            ->setParameter('end', $end)
            ->setParameter('niveau', NiveauVigilance::NORMAL->value)
            ->getQuery()
            ->getSingleScalarResult();

        $legere = $qb->select('COUNT(p.id)')
            ->where('p.horodatage BETWEEN :start AND :end')
            ->andWhere('p.niveauVigilance = :niveau')
            ->setParameter('start', $start)
            ->setParameter('end', $end)
            ->setParameter('niveau', NiveauVigilance::FATIGUE_LEGERE->value)
            ->getQuery()
            ->getSingleScalarResult();

        $moderee = $qb->select('COUNT(p.id)')
            ->where('p.horodatage BETWEEN :start AND :end')
            ->andWhere('p.niveauVigilance = :niveau')
            ->setParameter('start', $start)
            ->setParameter('end', $end)
            ->setParameter('niveau', NiveauVigilance::FATIGUE_MODEREE->value)
            ->getQuery()
            ->getSingleScalarResult();

        $severe = $qb->select('COUNT(p.id)')
            ->where('p.horodatage BETWEEN :start AND :end')
            ->andWhere('p.niveauVigilance = :niveau')
            ->setParameter('start', $start)
            ->setParameter('end', $end)
            ->setParameter('niveau', NiveauVigilance::FATIGUE_SEVERE->value)
            ->getQuery()
            ->getSingleScalarResult();

        $critique = $qb->select('COUNT(p.id)')
            ->where('p.horodatage BETWEEN :start AND :end')
            ->andWhere('p.niveauVigilance = :niveau')
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
     * Trouve le dernier paquet par véhicule
     */
    public function findLastByVehicule(string $vehiculeId): ?PaquetDonnees
    {
        return $this->createQueryBuilder('p')
            ->where('p.idVehicule = :vehiculeId')
            ->setParameter('vehiculeId', $vehiculeId)
            ->orderBy('p.horodatage', 'DESC')
            ->setMaxResults(1)
            ->getQuery()
            ->getOneOrNullResult();
    }

    /**
     * Trouve le dernier paquet par conducteur
     */
    public function findLastByConducteur(string $conducteurId): ?PaquetDonnees
    {
        return $this->createQueryBuilder('p')
            ->where('p.idConducteur = :conducteurId')
            ->setParameter('conducteurId', $conducteurId)
            ->orderBy('p.horodatage', 'DESC')
            ->setMaxResults(1)
            ->getQuery()
            ->getOneOrNullResult();
    }

    /**
     * Calcule les statistiques sur une période
     */
    public function getStats(\DateTimeInterface $start, \DateTimeInterface $end): array
    {
        $allData = $this->createQueryBuilder('p')
            ->where('p.horodatage BETWEEN :start AND :end')
            ->setParameter('start', $start)
            ->setParameter('end', $end)
            ->getQuery()
            ->getResult();

        if (empty($allData)) {
            return [
                'total_paquets' => 0,
                'moyenne_score' => 0,
                'max_score' => 0,
                'paquets_critiques' => 0,
                'paquets_alertes' => 0,
                'paquets_traites' => 0,
            ];
        }

        $sumScore = 0;
        $maxScore = 0;
        $critiques = 0;
        $alertes = 0;
        $traites = 0;

        foreach ($allData as $paquet) {
            $score = $paquet->getScoreGlobal();
            $sumScore += $score;
            $maxScore = max($maxScore, $score);
            
            if ($paquet->getNiveauVigilance() === NiveauVigilance::SOMNOLENCE_CRITIQUE) {
                $critiques++;
            }
            
            if ($paquet->isAlerteGeneree()) {
                $alertes++;
            }
            
            if ($paquet->isTraite()) {
                $traites++;
            }
        }

        $count = count($allData);

        return [
            'total_paquets' => $count,
            'moyenne_score' => round($sumScore / $count, 1),
            'max_score' => $maxScore,
            'paquets_critiques' => $critiques,
            'paquets_alertes' => $alertes,
            'paquets_traites' => $traites,
            'pourcentage_critiques' => round(($critiques / $count) * 100, 2),
            'pourcentage_alertes' => round(($alertes / $count) * 100, 2),
            'pourcentage_traites' => round(($traites / $count) * 100, 2),
        ];
    }

    /**
     * Trouve les paquets par score global
     */
    public function findByScoreRange(int $minScore, int $maxScore): array
    {
        // Cette requête nécessite une sous-requête ou une jointure complexe
        // Pour simplifier, on retourne un tableau vide pour l'instant
        return [];
    }

    /**
     * Trouve les paquets non traités depuis plus de X minutes
     */
    public function findAnciensNonTraites(int $minutes = 10): array
    {
        $threshold = (new \DateTimeImmutable())->modify(sprintf('-%d minutes', $minutes));

        return $this->createQueryBuilder('p')
            ->where('p.traite = :false')
            ->andWhere('p.horodatage < :threshold')
            ->setParameter('false', false)
            ->setParameter('threshold', $threshold)
            ->orderBy('p.horodatage', 'ASC')
            ->getQuery()
            ->getResult();
    }
}