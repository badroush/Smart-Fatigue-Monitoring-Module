<?php

namespace App\Repository;

use App\Entity\Vehicule;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

class VehiculeRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, Vehicule::class);
    }

    /**
     * Trouve tous les véhicules actifs et en service
     */
    public function findActiveEnService(): array
    {
        return $this->createQueryBuilder('v')
            ->where('v.isActive = :active')
            ->andWhere('v.statut = :statut')
            ->setParameter('active', true)
            ->setParameter('statut', Vehicule::STATUT_EN_SERVICE)
            ->orderBy('v.immatriculation', 'ASC')
            ->getQuery()
            ->getResult();
    }

    /**
     * Trouve les véhicules surveillés
     */
    public function findMonitoredVehicles(): array
    {
        return $this->createQueryBuilder('v')
            ->where('v.isMonitored = :monitored')
            ->setParameter('monitored', true)
            ->orderBy('v.immatriculation', 'ASC')
            ->getQuery()
            ->getResult();
    }

    /**
     * Trouve un véhicule par sa clé API SFAM
     */
    public function findBySfamApiKey(string $apiKey): ?Vehicule
    {
        return $this->createQueryBuilder('v')
            ->where('v.sfamApiKey = :apiKey')
            ->setParameter('apiKey', $apiKey)
            ->getQuery()
            ->getOneOrNullResult();
    }

    /**
     * Trouve les véhicules nécessitant une maintenance
     */
    public function findVehiclesNeedingMaintenance(): array
    {
        return $this->createQueryBuilder('v')
            ->where('v.nextMaintenanceAt <= :now')
            ->setParameter('now', new \DateTimeImmutable())
            ->orderBy('v.nextMaintenanceAt', 'ASC')
            ->getQuery()
            ->getResult();
    }

    /**
     * Trouve les véhicules qui ne communiquent plus
     */
    public function findDisconnectedVehicles(): array
    {
        $tenMinutesAgo = (new \DateTimeImmutable())->modify('-10 minutes');

        return $this->createQueryBuilder('v')
            ->where('v.derniereCommunication < :threshold OR v.derniereCommunication IS NULL')
            ->setParameter('threshold', $tenMinutesAgo)
            ->andWhere('v.isMonitored = :monitored')
            ->setParameter('monitored', true)
            ->getQuery()
            ->getResult();
    }

    /**
     * Statistiques globales des véhicules
     */
    public function getGlobalStatistics(): array
    {
        $qb = $this->createQueryBuilder('v');

        $total = $qb->select('COUNT(v.id)')
            ->getQuery()
            ->getSingleScalarResult();

        $enService = $qb->select('COUNT(v.id)')
            ->where('v.statut = :statut')
            ->setParameter('statut', Vehicule::STATUT_EN_SERVICE)
            ->getQuery()
            ->getSingleScalarResult();

        $monitored = $qb->select('COUNT(v.id)')
            ->where('v.isMonitored = :monitored')
            ->setParameter('monitored', true)
            ->getQuery()
            ->getSingleScalarResult();

        $maintenance = $qb->select('COUNT(v.id)')
            ->where('v.nextMaintenanceAt <= :now')
            ->setParameter('now', new \DateTimeImmutable())
            ->getQuery()
            ->getSingleScalarResult();

        return [
            'total_vehicules' => $total,
            'vehicules_en_service' => $enService,
            'vehicules_surveilles' => $monitored,
            'vehicules_maintenance' => $maintenance,
        ];
    }

    /**
     * Top 10 des véhicules avec le plus d'événements de fatigue
     */
    public function findTopFatiguedVehicles(int $limit = 10): array
    {
        return $this->createQueryBuilder('v')
            ->select('v, COUNT(e.id) as HIDDEN eventCount')
            ->leftJoin('v.evenementsFatigue', 'e')
            ->groupBy('v.id')
            ->orderBy('eventCount', 'DESC')
            ->setMaxResults($limit)
            ->getQuery()
            ->getResult();
    }

    /**
     * Trouve les véhicules par type
     */
    public function findByType(string $type): array
    {
        return $this->createQueryBuilder('v')
            ->where('v.type = :type')
            ->setParameter('type', $type)
            ->getQuery()
            ->getResult();
    }
}