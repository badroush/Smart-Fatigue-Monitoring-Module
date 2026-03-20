<?php

namespace App\DataFixtures;

use App\Entity\Vehicule;
use Doctrine\Bundle\FixturesBundle\Fixture;
use Doctrine\Persistence\ObjectManager;
use Symfony\Component\Uid\Uuid;

class VehiculeFixtures extends Fixture
{
    public function load(ObjectManager $manager): void
    {
        $vehicules = [
            [
                'immatriculation' => 'TN123456',
                'type' => Vehicule::TYPE_CAMION,
                'marque' => 'Volvo',
                'modele' => 'FH16',
                'anneeFabrication' => 2022,
                'statut' => Vehicule::STATUT_EN_SERVICE,
                'kilometrage' => 45000,
                'couleur' => 'Blanc',
                'numeroChassis' => '1HGCM82633A123456',
                'numeroMoteur' => 'ENG123456',
                'isActive' => true,
                'isMonitored' => true,
            ],
            [
                'immatriculation' => 'TN654321',
                'type' => Vehicule::TYPE_TRACTEUR,
                'marque' => 'Mercedes-Benz',
                'modele' => 'Actros',
                'anneeFabrication' => 2021,
                'statut' => Vehicule::STATUT_EN_SERVICE,
                'kilometrage' => 68000,
                'couleur' => 'Rouge',
                'numeroChassis' => '1HGCM82633A654321',
                'numeroMoteur' => 'ENG654321',
                'isActive' => true,
                'isMonitored' => true,
            ],
            [
                'immatriculation' => 'TN789012',
                'type' => Vehicule::TYPE_CAMION,
                'marque' => 'Scania',
                'modele' => 'R500',
                'anneeFabrication' => 2020,
                'statut' => Vehicule::STATUT_MAINTENANCE,
                'kilometrage' => 120000,
                'couleur' => 'Bleu',
                'numeroChassis' => '1HGCM82633A789012',
                'numeroMoteur' => 'ENG789012',
                'isActive' => true,
                'isMonitored' => false,
            ],
            [
                'immatriculation' => 'TN345678',
                'type' => Vehicule::TYPE_UTILITAIRE,
                'marque' => 'Iveco',
                'modele' => 'Daily',
                'anneeFabrication' => 2023,
                'statut' => Vehicule::STATUT_EN_SERVICE,
                'kilometrage' => 22000,
                'couleur' => 'Gris',
                'numeroChassis' => '1HGCM82633A345678',
                'numeroMoteur' => 'ENG345678',
                'isActive' => true,
                'isMonitored' => true,
            ],
        ];

        foreach ($vehicules as $index => $data) {
            $vehicule = new Vehicule();
            $vehicule->setImmatriculation($data['immatriculation']);
            $vehicule->setType($data['type']);
            $vehicule->setMarque($data['marque']);
            $vehicule->setModele($data['modele']);
            $vehicule->setAnneeFabrication($data['anneeFabrication']);
            $vehicule->setStatut($data['statut']);
            $vehicule->setKilometrage($data['kilometrage']);
            $vehicule->setCouleur($data['couleur']);
            $vehicule->setNumeroChassis($data['numeroChassis']);
            $vehicule->setNumeroMoteur($data['numeroMoteur']);
            $vehicule->setIsActive($data['isActive']);
            $vehicule->setIsMonitored($data['isMonitored']);
            $vehicule->setLastMaintenanceAt(new \DateTimeImmutable('-3 months'));
            $vehicule->setNextMaintenanceAt(new \DateTimeImmutable('+3 months'));

            $manager->persist($vehicule);
            $this->addReference('vehicule-' . ($index + 1), $vehicule);
        }

        $manager->flush();
    }
}