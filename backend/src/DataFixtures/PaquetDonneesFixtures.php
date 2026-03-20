<?php

namespace App\DataFixtures;

use App\Entity\AnalyseFatigue;
use App\Entity\Conducteur;
use App\Entity\DonneesCapteurs;
use App\Entity\LocalisationGPS;
use App\Entity\PaquetDonnees;
use App\Entity\Vehicule;
use App\Enum\NiveauVigilance;
use Doctrine\Bundle\FixturesBundle\Fixture;
use Doctrine\Persistence\ObjectManager;

class PaquetDonneesFixtures extends Fixture
{
    public function load(ObjectManager $manager): void
    {
        $now = new \DateTimeImmutable();

        // 🔑 Créer un conducteur temporaire
        $conducteurTemp = new Conducteur();
        $conducteurTemp->setNom('Conducteur Test Paquet');
        $conducteurTemp->setNumeroPermis('TN-PACKET-001');
        $conducteurTemp->setIsActive(true);
        $manager->persist($conducteurTemp);

        // 🔑 Créer un véhicule temporaire
        $vehiculeTemp = new Vehicule();
        $vehiculeTemp->setImmatriculation('TN-PACKET-001');
        $vehiculeTemp->setType(Vehicule::TYPE_CAMION);
        $vehiculeTemp->setStatut(Vehicule::STATUT_EN_SERVICE);
        $vehiculeTemp->setIsActive(true);
        $vehiculeTemp->setIsMonitored(true);
        $vehiculeTemp->setSfamApiKey('sfam_packet_test_' . bin2hex(random_bytes(8)));
        $manager->persist($vehiculeTemp);

        // Créer des paquets normaux
        for ($i = 0; $i < 5; $i++) {
            $paquet = new PaquetDonnees();
            $paquet->setIdConducteur($conducteurTemp->getId()->toString());
            $paquet->setIdVehicule($vehiculeTemp->getId()->toString());
            $paquet->setIdSfam('SFAM-TEST-' . $i);
            
            // Données capteurs
            $donneesCapteurs = new DonneesCapteurs();
            $donneesCapteurs->setTemperatureAmbiante(22.5);
            $donneesCapteurs->setHumidite(55.0);
            $donneesCapteurs->setLuminosite(400);
            $donneesCapteurs->setTemperatureCorporelle(36.5);
            $donneesCapteurs->setDureeConduite(3600 * $i);
            $donneesCapteurs->setHorodatage($now->modify("-{$i} hours"));
            $paquet->setDonneesCapteurs($donneesCapteurs);
            
            // Analyse fatigue
            $analyseFatigue = new AnalyseFatigue();
            $analyseFatigue->setEar(0.28);
            $analyseFatigue->setMar(0.3);
            $analyseFatigue->setPitch(0.0);
            $analyseFatigue->setYaw(0.0);
            $analyseFatigue->setNombreClignements(0);
            $analyseFatigue->setDureeYeuxFermes(0);
            $analyseFatigue->setNombreBaillements(0);
            $analyseFatigue->setHorodatage($now->modify("-{$i} hours"));
            $paquet->setAnalyseFatigue($analyseFatigue);
            
            // Localisation GPS
            $localisationGPS = new LocalisationGPS();
            $localisationGPS->setLatitude(36.8065 + ($i * 0.001));
            $localisationGPS->setLongitude(10.1815 + ($i * 0.001));
            $localisationGPS->setAltitude(10.0);
            $localisationGPS->setGpsPrecision(5.0);
            $localisationGPS->setHorodatage($now->modify("-{$i} hours"));
            $localisationGPS->setPays('Tunisie');
            $localisationGPS->setVille('Tunis');
            $paquet->setLocalisationGPS($localisationGPS);
            
            // Niveau de vigilance
            $paquet->setNiveauVigilance(NiveauVigilance::NORMAL);
            $paquet->setHorodatage($now->modify("-{$i} hours"));
            $paquet->setTraite(true);
            
            // 🔑 Lier le conducteur et le véhicule
            $paquet->setConducteur($conducteurTemp);
            $paquet->setVehicule($vehiculeTemp);
            
            $manager->persist($paquet);
        }

        $manager->flush();
    }
}