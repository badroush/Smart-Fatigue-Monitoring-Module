<?php

namespace App\DataFixtures;

use App\Entity\DonneesCapteurs;
use Doctrine\Bundle\FixturesBundle\Fixture;
use Doctrine\Persistence\ObjectManager;

class DonneesCapteursFixtures extends Fixture
{
    public function load(ObjectManager $manager): void
    {
        $now = new \DateTimeImmutable();

        // Données normales
        for ($i = 0; $i < 10; $i++) {
            $data = new DonneesCapteurs();
            $data->setTemperatureAmbiante(22.5 + rand(-200, 200) / 100); // 20.5 - 24.5°C
            $data->setHumidite(55 + rand(-1000, 1000) / 100); // 45 - 65%
            $data->setLuminosite(300 + rand(-100, 200)); // 200 - 500 lux
            $data->setTemperatureCorporelle(36.5 + rand(-50, 50) / 100); // 36.0 - 37.0°C
            $data->setDureeConduite(3600 * $i); // 0h, 1h, 2h, ...
            $data->setHorodatage($now->modify("-{$i} hours"));
            $data->addMetadata('source', 'SFAM-Module');
            $data->addMetadata('version', '1.0');

            $manager->persist($data);
        }

        // Données avec alertes
        $alertData1 = new DonneesCapteurs();
        $alertData1->setTemperatureAmbiante(38.5); // Trop chaud
        $alertData1->setHumidite(60);
        $alertData1->setLuminosite(400);
        $alertData1->setTemperatureCorporelle(36.8);
        $alertData1->setDureeConduite(7200);
        $alertData1->setHorodatage($now->modify('-12 hours'));
        $manager->persist($alertData1);

        $alertData2 = new DonneesCapteurs();
        $alertData2->setTemperatureAmbiante(22.0);
        $alertData2->setHumidite(85); // Trop humide
        $alertData2->setLuminosite(30); // Trop sombre
        $alertData2->setTemperatureCorporelle(36.5);
        $alertData2->setDureeConduite(5400);
        $alertData2->setHorodatage($now->modify('-15 hours'));
        $manager->persist($alertData2);

        $alertData3 = new DonneesCapteurs();
        $alertData3->setTemperatureAmbiante(22.0);
        $alertData3->setHumidite(55);
        $alertData3->setLuminosite(400);
        $alertData3->setTemperatureCorporelle(38.5); // Fièvre
        $alertData3->setDureeConduite(9000);
        $alertData3->setHorodatage($now->modify('-18 hours'));
        $manager->persist($alertData3);

        $manager->flush();
    }
}