<?php

namespace App\DataFixtures;

use App\Entity\LocalisationGPS;
use Doctrine\Bundle\FixturesBundle\Fixture;
use Doctrine\Persistence\ObjectManager;

class LocalisationGPSFixtures extends Fixture
{
    public function load(ObjectManager $manager): void
    {
        $now = new \DateTimeImmutable();

        // Créer quelques localisations GPS de test
        $locations = [
            [
                'latitude' => 36.8065,
                'longitude' => 10.1815,
                'altitude' => 10.0,
                'precision' => 5.0,
                'adresse' => 'Avenue Habib Bourguiba, Tunis',
                'pays' => 'Tunisie',
                'ville' => 'Tunis',
                'codePostal' => '1000',
            ],
            [
                'latitude' => 34.7406,
                'longitude' => 10.7603,
                'altitude' => 20.0,
                'precision' => 8.0,
                'adresse' => 'Route de Gabès, Sfax',
                'pays' => 'Tunisie',
                'ville' => 'Sfax',
                'codePostal' => '3000',
            ],
            [
                'latitude' => 35.8245,
                'longitude' => 10.6346,
                'altitude' => 15.0,
                'precision' => 6.0,
                'adresse' => 'Avenue Mohamed V, Sousse',
                'pays' => 'Tunisie',
                'ville' => 'Sousse',
                'codePostal' => '4000',
            ],
            [
                'latitude' => 33.8869,
                'longitude' => 10.0982,
                'altitude' => 5.0,
                'precision' => 10.0,
                'adresse' => 'Route de Médenine, Gabès',
                'pays' => 'Tunisie',
                'ville' => 'Gabès',
                'codePostal' => '6000',
            ],
            [
                'latitude' => 33.3564,
                'longitude' => 10.5000,
                'altitude' => 8.0,
                'precision' => 7.0,
                'adresse' => 'Route Djebel Jerba, Médenine',
                'pays' => 'Tunisie',
                'ville' => 'Médenine',
                'codePostal' => '4100',
            ],
        ];

        foreach ($locations as $index => $data) {
            $location = new LocalisationGPS();
            $location->setLatitude($data['latitude']);
            $location->setLongitude($data['longitude']);
            $location->setAltitude($data['altitude']);
            $location->setGpsPrecision($data['precision']);
            $location->setAdresse($data['adresse']);
            $location->setPays($data['pays']);
            $location->setVille($data['ville']);
            $location->setCodePostal($data['codePostal']);
            $location->setHorodatage($now->modify(sprintf('-%d days', $index)));

            $manager->persist($location);
            $this->addReference('location-' . ($index + 1), $location);
        }

        $manager->flush();
    }
}