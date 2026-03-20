<?php

namespace App\DataFixtures;

use App\Entity\Alerte;
use App\Entity\Conducteur;
use App\Entity\Vehicule;
use App\Enum\NiveauVigilance;
use Doctrine\Bundle\FixturesBundle\Fixture;
use Doctrine\Persistence\ObjectManager;

class AlerteFixtures extends Fixture
{
    public function load(ObjectManager $manager): void
    {
        $now = new \DateTimeImmutable();

        // 🔑 Créer un conducteur temporaire
        $conducteurTemp = new Conducteur();
        $conducteurTemp->setNom('Conducteur Test Alerte');
        $conducteurTemp->setNumeroPermis('TN-ALERT-001');
        $conducteurTemp->setTelephone('+216 99 999 999');
        $conducteurTemp->setDateNaissance(new \DateTime('1990-01-01'));
        $conducteurTemp->setAdresse('Médenine');
        $conducteurTemp->setIsActive(true);
        $manager->persist($conducteurTemp);

        // 🔑 Créer un véhicule temporaire
        $vehiculeTemp = new Vehicule();
        $vehiculeTemp->setImmatriculation('TN-ALERT-001');
        $vehiculeTemp->setType(Vehicule::TYPE_CAMION);
        $vehiculeTemp->setStatut(Vehicule::STATUT_EN_SERVICE);
        $vehiculeTemp->setIsActive(true);
        $vehiculeTemp->setIsMonitored(true);
        $vehiculeTemp->setSfamApiKey('sfam_alert_test_' . bin2hex(random_bytes(8)));
        $manager->persist($vehiculeTemp);

        // Créer des alertes avec le conducteur temporaire
        for ($i = 0; $i < 5; $i++) {
            $alerte = new Alerte();
            $alerte->setConducteur($conducteurTemp);
            $alerte->setVehicule($vehiculeTemp);
            $alerte->setNiveau(NiveauVigilance::FATIGUE_LEGERE);
            $alerte->setMessage('Alerte test ' . ($i + 1));
            $alerte->setType(Alerte::TYPE_LOCALE);
            $alerte->setStatut(Alerte::STATUT_RESOLUE);
            $alerte->setHorodatage($now->modify("-" . $i . " hours"));
            $alerte->setEnvoyee(true);
            $alerte->setLue(true);
            
            $manager->persist($alerte);
        }

        // Créer une alerte critique
        $alerteCritique = new Alerte();
        $alerteCritique->setConducteur($conducteurTemp);
        $alerteCritique->setVehicule($vehiculeTemp);
        $alerteCritique->setNiveau(NiveauVigilance::SOMNOLENCE_CRITIQUE);
        $alerteCritique->setMessage('ALERTE CRITIQUE : Somnolence détectée');
        $alerteCritique->setType(Alerte::TYPE_SONNETTE);
        $alerteCritique->setStatut(Alerte::STATUT_ACTIVE);
        $alerteCritique->setHorodatage($now->modify('-30 minutes'));
        $alerteCritique->setEnvoyee(true);
        $alerteCritique->setLue(false);
        
        $manager->persist($alerteCritique);

        $manager->flush();
    }
}