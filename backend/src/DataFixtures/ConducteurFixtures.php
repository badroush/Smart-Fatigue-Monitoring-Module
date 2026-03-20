<?php

namespace App\DataFixtures;

use App\Entity\Conducteur;
use Doctrine\Bundle\FixturesBundle\Fixture;
use Doctrine\Persistence\ObjectManager;
use Symfony\Component\Uid\Uuid;

class ConducteurFixtures extends Fixture
{
    public function load(ObjectManager $manager): void
    {
        $conducteurs = [
            [
                'nom' => 'Ahmed Ben Ali',
                'numeroPermis' => 'TN12345678',
                'telephone' => '+216 20 123 456',
                'dateNaissance' => new \DateTime('1985-03-15'),
                'adresse' => 'Rue de la Paix, Tunis',
                'isActive' => true,
            ],
            [
                'nom' => 'Mohamed Trabelsi',
                'numeroPermis' => 'TN87654321',
                'telephone' => '+216 21 987 654',
                'dateNaissance' => new \DateTime('1978-07-22'),
                'adresse' => 'Avenue Habib Bourguiba, Sfax',
                'isActive' => true,
            ],
            [
                'nom' => 'Karim Gharbi',
                'numeroPermis' => 'TN56781234',
                'telephone' => '+216 22 456 789',
                'dateNaissance' => new \DateTime('1990-11-05'),
                'adresse' => 'Rue de Carthage, Sousse',
                'isActive' => true,
            ],
            [
                'nom' => 'Sami Mansour',
                'numeroPermis' => 'TN43218765',
                'telephone' => '+216 23 321 654',
                'dateNaissance' => new \DateTime('1982-09-18'),
                'adresse' => 'Boulevard de la République, Gabès',
                'isActive' => false,
            ],
        ];

        foreach ($conducteurs as $index => $data) {
            $conducteur = new Conducteur();
            $conducteur->setNom($data['nom']);
            $conducteur->setNumeroPermis($data['numeroPermis']);
            $conducteur->setTelephone($data['telephone']);
            $conducteur->setDateNaissance($data['dateNaissance']);
            $conducteur->setAdresse($data['adresse']);
            $conducteur->setIsActive($data['isActive']);

            // ⚠️ Relation avec véhicule désactivée temporairement (bug Doctrine DataFixtures 1.6.x)
            // $conducteur->setVehiculeAssigne($this->getReference('vehicule-' . ($index % 4 + 1)));

            $manager->persist($conducteur);
            
            // Sauvegarder la référence pour les autres fixtures
            $this->addReference('conducteur-' . ($index + 1), $conducteur);
        }

        $manager->flush();
    }

    // ⚠️ Désactivé temporairement à cause du bug getReference() dans doctrine/data-fixtures 1.6.x
    // public function getDependencies(): array
    // {
    //     return [
    //         VehiculeFixtures::class,
    //     ];
    // }
}