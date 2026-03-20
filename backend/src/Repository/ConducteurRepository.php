<?php

namespace App\Repository;

use App\Entity\Conducteur;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

class ConducteurRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, Conducteur::class);
    }

    /**
     * Trouve tous les conducteurs actifs
     */
    public function findActiveConducteurs(): array
    {
        return $this->createQueryBuilder('c')
            ->where('c.isActive = :active')
            ->setParameter('active', true)
            ->orderBy('c.nom', 'ASC')
            ->getQuery()
            ->getResult();
    }

    /**
     * Trouve les conducteurs actuellement fatigués
     */
    public function findFatiguedConducteurs(): array
    {
        $thirtyMinutesAgo = (new \DateTimeImmutable())->modify('-30 minutes');

        return $this->createQueryBuilder('c')
            ->where('c.lastFatigueEventAt > :threshold')
            ->setParameter('threshold', $thirtyMinutesAgo)
            ->orderBy('c.lastFatigueEventAt', 'DESC')
            ->getQuery()
            ->getResult();
    }

    /**
     * Trouve les conducteurs par véhicule
     */
    public function findByVehicule(?string $vehiculeId): array
    {
        return $this->createQueryBuilder('c')
            ->join('c.vehiculeAssigne', 'v')
            ->where('v.id = :vehiculeId')
            ->setParameter('vehiculeId', $vehiculeId)
            ->getQuery()
            ->getResult();
    }

    /**
     * Statistiques globales des conducteurs
     */
    public function getGlobalStatistics(): array
    {
        $qb = $this->createQueryBuilder('c');

        $total = $qb->select('COUNT(c.id)')
            ->getQuery()
            ->getSingleScalarResult();

        $active = $qb->select('COUNT(c.id)')
            ->where('c.isActive = :active')
            ->setParameter('active', true)
            ->getQuery()
            ->getSingleScalarResult();

        $fatigued = $this->createQueryBuilder('c')
            ->select('COUNT(c.id)')
            ->where('c.lastFatigueEventAt > :threshold')
            ->setParameter('threshold', (new \DateTimeImmutable())->modify('-30 minutes'))
            ->getQuery()
            ->getSingleScalarResult();

        return [
            'total_conducteurs' => $total,
            'conducteurs_actifs' => $active,
            'conducteurs_fatigues' => $fatigued,
        ];
    }

    /**
     * Top 10 des conducteurs les plus fatigués (par nombre d'événements)
     */
    public function findTopFatiguedConducteurs(int $limit = 10): array
    {
        return $this->createQueryBuilder('c')
            ->orderBy('c.totalEvenementsFatigue', 'DESC')
            ->setMaxResults($limit)
            ->getQuery()
            ->getResult();
    }
}