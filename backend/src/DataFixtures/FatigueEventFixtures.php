<?php

namespace App\DataFixtures;

use App\Entity\FatigueEvent;
use App\Entity\Conducteur;
use App\Entity\Vehicule;
use App\Entity\LocalisationGPS;
use App\Enum\NiveauVigilance;
use Doctrine\Bundle\FixturesBundle\Fixture;
use Doctrine\Persistence\ObjectManager;

class FatigueEventFixtures extends Fixture
{
    public function load(ObjectManager $manager): void
    {
        $now = new \DateTimeImmutable();

        // 🔑 Créer un conducteur temporaire
        $conducteurTemp = new Conducteur();
        $conducteurTemp->setNom('Conducteur Test Event');
        $conducteurTemp->setNumeroPermis('TN-EVENT-001');
        $conducteurTemp->setIsActive(true);
        $manager->persist($conducteurTemp);

        // 🔑 Créer un véhicule temporaire
        $vehiculeTemp = new Vehicule();
        $vehiculeTemp->setImmatriculation('TN-EVENT-001');
        $vehiculeTemp->setType(Vehicule::TYPE_CAMION);
        $vehiculeTemp->setStatut(Vehicule::STATUT_EN_SERVICE);
        $vehiculeTemp->setIsActive(true);
        $vehiculeTemp->setIsMonitored(true);
        $vehiculeTemp->setSfamApiKey('sfam_event_test_' . bin2hex(random_bytes(8)));
        $manager->persist($vehiculeTemp);

        // Créer un événement de fatigue modérée
        $event = new FatigueEvent();
        $event->setConducteur($conducteurTemp);
        $event->setVehicule($vehiculeTemp);
        $event->setNiveauMax(NiveauVigilance::FATIGUE_MODEREE);
        $event->setDureeSecondes(300);
        
        // Localisation début
        $locDebut = new LocalisationGPS();
        $locDebut->setLatitude(36.8065);
        $locDebut->setLongitude(10.1815);
        $locDebut->setHorodatage($now->modify('-1 hour'));
        $locDebut->setPays('Tunisie');
        $locDebut->setVille('Tunis');
        $manager->persist($locDebut);
        $event->setLocalisationDebut($locDebut);
        
        // Localisation fin
        $locFin = new LocalisationGPS();
        $locFin->setLatitude(36.8100);
        $locFin->setLongitude(10.1850);
        $locFin->setHorodatage($now->modify('-50 minutes'));
        $locFin->setPays('Tunisie');
        $locFin->setVille('Tunis');
        $manager->persist($locFin);
        $event->setLocalisationFin($locFin);
        
        $event->setDebut($now->modify('-1 hour'));
        $event->setFin($now->modify('-50 minutes'));
        $event->addIntervention(FatigueEvent::INTERVENTION_ALERTE_LOCALE);
        $event->addIntervention(FatigueEvent::INTERVENTION_ALERTE_VOCALE);
        $event->setResolu(true);
        $event->setNotes('Événement test');
        
        $manager->persist($event);

        $manager->flush();
    }
}