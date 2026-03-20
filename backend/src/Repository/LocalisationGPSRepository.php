<?php

namespace App\Repository;

use App\Entity\LocalisationGPS;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

class LocalisationGPSRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, LocalisationGPS::class);
    }

    /**
     * Trouve les localisations dans une zone donnée
     * @param float $minLat
     * @param float $maxLat
     * @param float $minLng
     * @param float $maxLng
     * @return LocalisationGPS[]
     */
    public function findInBoundingBox(float $minLat, float $maxLat, float $minLng, float $maxLng): array
    {
        return $this->createQueryBuilder('l')
            ->where('l.latitude BETWEEN :minLat AND :maxLat')
            ->andWhere('l.longitude BETWEEN :minLng AND :maxLng')
            ->setParameter('minLat', $minLat)
            ->setParameter('maxLat', $maxLat)
            ->setParameter('minLng', $minLng)
            ->setParameter('maxLng', $maxLng)
            ->orderBy('l.horodatage', 'DESC')
            ->getQuery()
            ->getResult();
    }

    /**
     * Trouve les localisations récentes (dernières 24h)
     */
    public function findRecent(int $hours = 24): array
    {
        $threshold = (new \DateTimeImmutable())->modify(sprintf('-%d hours', $hours));

        return $this->createQueryBuilder('l')
            ->where('l.horodatage >= :threshold')
            ->setParameter('threshold', $threshold)
            ->orderBy('l.horodatage', 'DESC')
            ->getQuery()
            ->getResult();
    }

    /**
     * Trouve la dernière localisation d'un véhicule
     * (via relation avec PaquetDonnees ou Vehicule)
     */
    public function findLastForVehicle(string $vehicleId): ?LocalisationGPS
    {
        // Cette méthode sera implémentée après la création de PaquetDonnees
        return null;
    }

    /**
     * Calcule le centre géographique d'un ensemble de localisations
     */
    public function calculateCenter(array $localisations): ?array
    {
        if (empty($localisations)) {
            return null;
        }

        $sumLat = 0;
        $sumLng = 0;
        $count = count($localisations);

        foreach ($localisations as $loc) {
            $sumLat += $loc->getLatitude();
            $sumLng += $loc->getLongitude();
        }

        return [
            'latitude' => $sumLat / $count,
            'longitude' => $sumLng / $count,
        ];
    }

    /**
     * Trouve les localisations par pays
     */
    public function findByCountry(string $countryCode): array
    {
        return $this->createQueryBuilder('l')
            ->where('l.pays = :country')
            ->setParameter('country', $countryCode)
            ->orderBy('l.horodatage', 'DESC')
            ->getQuery()
            ->getResult();
    }

    /**
     * Compte le nombre de localisations par jour
     */
    public function countByDay(\DateTimeInterface $start, \DateTimeInterface $end): array
    {
        // Cette requête nécessite DQL personnalisé ou requête native
        // Pour simplifier, on retourne un tableau vide pour l'instant
        return [];
    }
}