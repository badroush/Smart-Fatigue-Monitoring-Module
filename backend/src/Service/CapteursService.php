<?php

namespace App\Service;

use App\Entity\DonneesCapteurs;
use App\Repository\DonneesCapteursRepository;
use Doctrine\ORM\EntityManagerInterface;

class CapteursService
{
    public function __construct(
        private DonneesCapteursRepository $repository,
        private EntityManagerInterface $entityManager
    ) {}

    /**
     * Crée une nouvelle entrée de données capteurs à partir d'un tableau
     */
    public function createFromData(array $data): DonneesCapteurs
    {
        $donnees = new DonneesCapteurs();
        $donnees->setTemperatureAmbiante($data['temperatureAmbiante'] ?? 22.0);
        $donnees->setHumidite($data['humidite'] ?? 50.0);
        $donnees->setLuminosite($data['luminosite'] ?? 300);
        $donnees->setTemperatureCorporelle($data['temperatureCorporelle'] ?? 36.5);
        $donnees->setDureeConduite($data['dureeConduite'] ?? 0);
        
        if (isset($data['horodatage'])) {
            $donnees->setHorodatage(new \DateTimeImmutable($data['horodatage']));
        }

        if (isset($data['metadata'])) {
            $donnees->setMetadata($data['metadata']);
        }

        $this->entityManager->persist($donnees);
        $this->entityManager->flush();

        return $donnees;
    }

    /**
     * Calcule les moyennes sur une période
     */
    public function calculateAverages(\DateTimeInterface $start, \DateTimeInterface $end): array
    {
        $allData = $this->repository->createQueryBuilder('d')
            ->where('d.horodatage BETWEEN :start AND :end')
            ->setParameter('start', $start)
            ->setParameter('end', $end)
            ->getQuery()
            ->getResult();

        if (empty($allData)) {
            return [
                'temperatureAmbiante' => 0,
                'humidite' => 0,
                'luminosite' => 0,
                'temperatureCorporelle' => 0,
                'count' => 0,
            ];
        }

        $sumTemp = 0;
        $sumHum = 0;
        $sumLux = 0;
        $sumTempCorp = 0;

        foreach ($allData as $data) {
            $sumTemp += $data->getTemperatureAmbiante();
            $sumHum += $data->getHumidite();
            $sumLux += $data->getLuminosite();
            $sumTempCorp += $data->getTemperatureCorporelle();
        }

        $count = count($allData);

        return [
            'temperatureAmbiante' => round($sumTemp / $count, 2),
            'humidite' => round($sumHum / $count, 2),
            'luminosite' => round($sumLux / $count, 2),
            'temperatureCorporelle' => round($sumTempCorp / $count, 2),
            'count' => $count,
        ];
    }

    /**
     * Génère un rapport de confort sur une période
     */
    public function generateConfortReport(\DateTimeInterface $start, \DateTimeInterface $end): array
    {
        $allData = $this->repository->createQueryBuilder('d')
            ->where('d.horodatage BETWEEN :start AND :end')
            ->setParameter('start', $start)
            ->setParameter('end', $end)
            ->getQuery()
            ->getResult();

        if (empty($allData)) {
            return [
                'total' => 0,
                'confortable' => 0,
                'acceptable' => 0,
                'inconfortable' => 0,
                'tres_inconfortable' => 0,
                'alertes' => 0,
            ];
        }

        $stats = [
            'total' => count($allData),
            'confortable' => 0,
            'acceptable' => 0,
            'inconfortable' => 0,
            'tres_inconfortable' => 0,
            'alertes' => 0,
        ];

        foreach ($allData as $data) {
            $humidex = $data->getIndiceHumidex();
            
            if ($humidex < 25) {
                $stats['confortable']++;
            } elseif ($humidex < 30) {
                $stats['acceptable']++;
            } elseif ($humidex < 40) {
                $stats['inconfortable']++;
            } else {
                $stats['tres_inconfortable']++;
            }

            if ($data->hasAnyAlert()) {
                $stats['alertes']++;
            }
        }

        return $stats;
    }
}