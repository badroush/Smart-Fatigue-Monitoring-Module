<?php

namespace App\Repository;

use App\Entity\DonneesCapteurs;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

class DonneesCapteursRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, DonneesCapteurs::class);
    }

    /**
     * Trouve les données capteurs récentes (dernières 24h)
     */
    public function findRecent(int $hours = 24): array
    {
        $threshold = (new \DateTimeImmutable())->modify(sprintf('-%d hours', $hours));

        return $this->createQueryBuilder('d')
            ->where('d.horodatage >= :threshold')
            ->setParameter('threshold', $threshold)
            ->orderBy('d.horodatage', 'DESC')
            ->getQuery()
            ->getResult();
    }

    /**
     * Trouve les données avec alertes
     */
    public function findWithAlerts(): array
    {
        return $this->createQueryBuilder('d')
            ->where('d.alerteTemperature = :true OR d.alerteHumidite = :true OR d.alerteLuminosite = :true OR d.alerteTemperatureCorporelle = :true')
            ->setParameter('true', true)
            ->orderBy('d.horodatage', 'DESC')
            ->getQuery()
            ->getResult();
    }

    /**
     * Trouve les données par plage de température
     */
    public function findByTemperatureRange(float $min, float $max): array
    {
        return $this->createQueryBuilder('d')
            ->where('d.temperatureAmbiante BETWEEN :min AND :max')
            ->setParameter('min', $min)
            ->setParameter('max', $max)
            ->orderBy('d.horodatage', 'DESC')
            ->getQuery()
            ->getResult();
    }

    /**
     * Calcule les statistiques de température sur une période
     */
    public function getTemperatureStats(\DateTimeInterface $start, \DateTimeInterface $end): array
    {
        $qb = $this->createQueryBuilder('d');
        
        $avg = $qb->select('AVG(d.temperatureAmbiante)')
            ->where('d.horodatage BETWEEN :start AND :end')
            ->setParameter('start', $start)
            ->setParameter('end', $end)
            ->getQuery()
            ->getSingleScalarResult();

        $min = $qb->select('MIN(d.temperatureAmbiante)')
            ->where('d.horodatage BETWEEN :start AND :end')
            ->setParameter('start', $start)
            ->setParameter('end', $end)
            ->getQuery()
            ->getSingleScalarResult();

        $max = $qb->select('MAX(d.temperatureAmbiante)')
            ->where('d.horodatage BETWEEN :start AND :end')
            ->setParameter('start', $start)
            ->setParameter('end', $end)
            ->getQuery()
            ->getSingleScalarResult();

        return [
            'moyenne' => round($avg, 2),
            'minimum' => round($min, 2),
            'maximum' => round($max, 2),
        ];
    }

    /**
     * Calcule les statistiques d'humidité sur une période
     */
    public function getHumiditeStats(\DateTimeInterface $start, \DateTimeInterface $end): array
    {
        $qb = $this->createQueryBuilder('d');
        
        $avg = $qb->select('AVG(d.humidite)')
            ->where('d.horodatage BETWEEN :start AND :end')
            ->setParameter('start', $start)
            ->setParameter('end', $end)
            ->getQuery()
            ->getSingleScalarResult();

        return [
            'moyenne' => round($avg, 2),
        ];
    }

    /**
     * Compte le nombre d'alertes par type sur une période
     */
    public function countAlertsByType(\DateTimeInterface $start, \DateTimeInterface $end): array
    {
        $qb = $this->createQueryBuilder('d');
        
        $temperature = $qb->select('COUNT(d.id)')
            ->where('d.horodatage BETWEEN :start AND :end')
            ->andWhere('d.alerteTemperature = :true')
            ->setParameter('start', $start)
            ->setParameter('end', $end)
            ->setParameter('true', true)
            ->getQuery()
            ->getSingleScalarResult();

        $humidite = $qb->select('COUNT(d.id)')
            ->where('d.horodatage BETWEEN :start AND :end')
            ->andWhere('d.alerteHumidite = :true')
            ->setParameter('start', $start)
            ->setParameter('end', $end)
            ->setParameter('true', true)
            ->getQuery()
            ->getSingleScalarResult();

        $luminosite = $qb->select('COUNT(d.id)')
            ->where('d.horodatage BETWEEN :start AND :end')
            ->andWhere('d.alerteLuminosite = :true')
            ->setParameter('start', $start)
            ->setParameter('end', $end)
            ->setParameter('true', true)
            ->getQuery()
            ->getSingleScalarResult();

        $temperatureCorporelle = $qb->select('COUNT(d.id)')
            ->where('d.horodatage BETWEEN :start AND :end')
            ->andWhere('d.alerteTemperatureCorporelle = :true')
            ->setParameter('start', $start)
            ->setParameter('end', $end)
            ->setParameter('true', true)
            ->getQuery()
            ->getSingleScalarResult();

        return [
            'temperature' => (int) $temperature,
            'humidite' => (int) $humidite,
            'luminosite' => (int) $luminosite,
            'temperature_corporelle' => (int) $temperatureCorporelle,
            'total' => (int) ($temperature + $humidite + $luminosite + $temperatureCorporelle),
        ];
    }

    /**
     * Trouve les données par durée de conduite
     */
    public function findByDureeConduiteRange(int $minSeconds, int $maxSeconds): array
    {
        return $this->createQueryBuilder('d')
            ->where('d.dureeConduite BETWEEN :min AND :max')
            ->setParameter('min', $minSeconds)
            ->setParameter('max', $maxSeconds)
            ->orderBy('d.horodatage', 'DESC')
            ->getQuery()
            ->getResult();
    }

    /**
     * Trouve la dernière donnée capteur
     */
    public function findLatest(): ?DonneesCapteurs
    {
        return $this->createQueryBuilder('d')
            ->orderBy('d.horodatage', 'DESC')
            ->setMaxResults(1)
            ->getQuery()
            ->getOneOrNullResult();
    }
}