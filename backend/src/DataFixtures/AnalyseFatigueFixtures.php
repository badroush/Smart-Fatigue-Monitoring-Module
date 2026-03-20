<?php

namespace App\DataFixtures;

use App\Entity\AnalyseFatigue;
use App\Enum\NiveauVigilance;
use Doctrine\Bundle\FixturesBundle\Fixture;
use Doctrine\Persistence\ObjectManager;

class AnalyseFatigueFixtures extends Fixture
{
    public function load(ObjectManager $manager): void
    {
        $now = new \DateTimeImmutable();

        // Analyses normales
        for ($i = 0; $i < 15; $i++) {
            $analyse = new AnalyseFatigue();
            $analyse->setEar(0.28 + rand(-100, 100) / 1000); // 0.27 - 0.29
            $analyse->setMar(0.3 + rand(-50, 50) / 1000); // 0.295 - 0.305
            $analyse->setPitch(rand(-100, 100) / 10); // -10° à 10°
            $analyse->setYaw(rand(-100, 100) / 10); // -10° à 10°
            $analyse->setNombreClignements(0);
            $analyse->setDureeYeuxFermes(0);
            $analyse->setNombreBaillements(0);
            $analyse->setHorodatage($now->modify("-{$i} hours"));
            $analyse->addMetadata('source', 'SFAM-Module');
            $analyse->addMetadata('version', '1.0');

            $manager->persist($analyse);
        }

        // Analyses avec fatigue légère
        for ($i = 0; $i < 5; $i++) {
            $analyse = new AnalyseFatigue();
            $analyse->setEar(0.26 + rand(-100, 100) / 1000); // 0.25 - 0.27
            $analyse->setMar(0.4 + rand(-50, 100) / 1000); // 0.395 - 0.45
            $analyse->setPitch(rand(-150, 150) / 10); // -15° à 15°
            $analyse->setYaw(rand(-150, 150) / 10); // -15° à 15°
            $analyse->setNombreClignements(1);
            $analyse->setDureeYeuxFermes(0);
            $analyse->setNombreBaillements(1);
            $analyse->setHorodatage($now->modify("-" . (20 + $i) . " hours"));
            $analyse->setNiveauVigilance(NiveauVigilance::FATIGUE_LEGERE);

            $manager->persist($analyse);
        }

        // Analyses avec fatigue modérée
        for ($i = 0; $i < 5; $i++) {
            $analyse = new AnalyseFatigue();
            $analyse->setEar(0.23 + rand(-50, 50) / 1000); // 0.225 - 0.235
            $analyse->setMar(0.5 + rand(0, 100) / 1000); // 0.5 - 0.55
            $analyse->setPitch(rand(-200, 200) / 10); // -20° à 20°
            $analyse->setYaw(rand(-200, 200) / 10); // -20° à 20°
            $analyse->setNombreClignements(3);
            $analyse->setDureeYeuxFermes(2);
            $analyse->setNombreBaillements(2);
            $analyse->setHorodatage($now->modify("-" . (30 + $i) . " hours"));
            $analyse->setNiveauVigilance(NiveauVigilance::FATIGUE_MODEREE);

            $manager->persist($analyse);
        }

        // Analyses avec fatigue sévère
        for ($i = 0; $i < 3; $i++) {
            $analyse = new AnalyseFatigue();
            $analyse->setEar(0.20 + rand(-30, 30) / 1000); // 0.197 - 0.203
            $analyse->setMar(0.65 + rand(0, 100) / 1000); // 0.65 - 0.70
            $analyse->setPitch(rand(-250, 250) / 10); // -25° à 25°
            $analyse->setYaw(rand(-250, 250) / 10); // -25° à 25°
            $analyse->setNombreClignements(5);
            $analyse->setDureeYeuxFermes(4);
            $analyse->setNombreBaillements(3);
            $analyse->setHorodatage($now->modify("-" . (40 + $i) . " hours"));
            $analyse->setNiveauVigilance(NiveauVigilance::FATIGUE_SEVERE);

            $manager->persist($analyse);
        }

        // Analyses avec somnolence critique
        for ($i = 0; $i < 2; $i++) {
            $analyse = new AnalyseFatigue();
            $analyse->setEar(0.18 + rand(-20, 20) / 1000); // 0.178 - 0.182
            $analyse->setMar(0.75 + rand(0, 100) / 1000); // 0.75 - 0.80
            $analyse->setPitch(35 + rand(0, 100) / 10); // 35° - 45°
            $analyse->setYaw(rand(-300, 300) / 10); // -30° à 30°
            $analyse->setNombreClignements(8);
            $analyse->setDureeYeuxFermes(6);
            $analyse->setNombreBaillements(5);
            $analyse->setHorodatage($now->modify("-" . (50 + $i) . " hours"));
            $analyse->setNiveauVigilance(NiveauVigilance::SOMNOLENCE_CRITIQUE);

            $manager->persist($analyse);
        }

        $manager->flush();
    }
}