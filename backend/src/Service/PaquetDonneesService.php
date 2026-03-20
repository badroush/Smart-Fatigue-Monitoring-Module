<?php

namespace App\Service;

use App\Entity\Alerte;
use App\Entity\Conducteur;
use App\Entity\PaquetDonnees;
use App\Entity\Vehicule;
use App\Enum\NiveauVigilance;
use Doctrine\ORM\EntityManagerInterface;

class PaquetDonneesService
{
    public function __construct(
        private EntityManagerInterface $entityManager
    ) {}

    /**
     * Traite un paquet de données reçu de l'API et génère des alertes si nécessaire
     */
    public function traiterPaquet(PaquetDonnees $paquet): PaquetDonnees
    {
        // 1. Mettre à jour le timestamp de réception
        $paquet->setReceivedAt(new \DateTimeImmutable());
        
        // 2. Mettre à jour la communication du véhicule
        $vehicule = $paquet->getVehicule();
        if ($vehicule instanceof Vehicule) {
            $vehicule->updateDerniereCommunication();
            $this->entityManager->persist($vehicule);
        }
        
        // 3. Récupérer un conducteur (obligatoire pour les alertes)
        $conducteur = $paquet->getConducteur();
        if (!$conducteur) {
            $conducteur = $this->getConducteurFallback();
            $paquet->setConducteur($conducteur);
        }
        
        // 4. Créer une alerte si niveau critique ou sévère
        $niveau = $paquet->getNiveauVigilance();
        if ($this->niveauNecessiteAlerte($niveau)) {
            $this->creerAlerteDepuisPaquet($paquet, $vehicule, $conducteur);
            $paquet->setAlerteGeneree(true);
        }
        
        // 5. Sauvegarder toutes les entités
        $this->entityManager->persist($paquet);
        $this->entityManager->flush();
        
        return $paquet;
    }

    /**
     * Vérifie si le niveau de vigilance nécessite la création d'une alerte
     */
    private function niveauNecessiteAlerte(NiveauVigilance $niveau): bool
    {
        return in_array($niveau, [
            NiveauVigilance::FATIGUE_SEVERE,
            NiveauVigilance::SOMNOLENCE_CRITIQUE,
        ], true);
    }

    /**
     * Crée une alerte à partir d'un paquet de données
     */
    private function creerAlerteDepuisPaquet(
        PaquetDonnees $paquet, 
        ?Vehicule $vehicule, 
        ?Conducteur $conducteur
    ): void {
        $niveau = $paquet->getNiveauVigilance();
        
        $alerte = new Alerte();
        $alerte->setIdAlerte('ALERT-' . strtoupper(bin2hex(random_bytes(6))));
        $alerte->setNiveau($niveau);
        $alerte->setMessage($this->genererMessageAlerte($paquet, $conducteur, $vehicule));
        $alerte->setType($this->determinerTypeAlerte($niveau));
        $alerte->setStatut(Alerte::STATUT_ACTIVE);
        $alerte->setHorodatage(new \DateTimeImmutable());
        
        // Relations obligatoires (garanties par le fallback)
        $alerte->setVehicule($vehicule);
        $alerte->setConducteur($conducteur);
        
        // Métadonnées
        $alerte->addMetadata('paquetId', $paquet->getId()->toString());
        $alerte->addMetadata('scoreGlobal', $paquet->getScoreGlobal());
        $alerte->addMetadata('source', 'SFAM-Module');
        $alerte->addMetadata('niveauVigilance', $niveau->value);
        
        $this->entityManager->persist($alerte);
    }

    /**
     * Détermine le type d'alerte en fonction du niveau de vigilance
     */
    private function determinerTypeAlerte(NiveauVigilance $niveau): string
    {
        return match ($niveau) {
            NiveauVigilance::SOMNOLENCE_CRITIQUE => Alerte::TYPE_SONNETTE,
            NiveauVigilance::FATIGUE_SEVERE => Alerte::TYPE_SMS,
            NiveauVigilance::FATIGUE_MODEREE => Alerte::TYPE_VOCALE,
            default => Alerte::TYPE_LOCALE,
        };
    }

    /**
     * Génère un message d'alerte personnalisé
     */
    private function genererMessageAlerte(
        PaquetDonnees $paquet, 
        ?Conducteur $conducteur, 
        ?Vehicule $vehicule
    ): string {
        $niveau = $paquet->getNiveauVigilance();
        $score = $paquet->getScoreGlobal();
        
        $nomConducteur = $conducteur ? $conducteur->getNom() : 'Conducteur inconnu';
        $immatriculation = $vehicule ? $vehicule->getImmatriculation() : 'Véhicule inconnu';
        
        return match ($niveau) {
            NiveauVigilance::SOMNOLENCE_CRITIQUE => sprintf(
                'ALERTE CRITIQUE : Somnolence détectée pour %s (%s) - Score: %d/100 - Intervention immédiate requise !',
                $nomConducteur,
                $immatriculation,
                $score
            ),
            NiveauVigilance::FATIGUE_SEVERE => sprintf(
                'ALERTE SÉVÈRE : Fatigue sévère détectée pour %s (%s) - Score: %d/100',
                $nomConducteur,
                $immatriculation,
                $score
            ),
            NiveauVigilance::FATIGUE_MODEREE => sprintf(
                'ALERTE : Fatigue modérée détectée pour %s (%s) - Score: %d/100',
                $nomConducteur,
                $immatriculation,
                $score
            ),
            NiveauVigilance::FATIGUE_LEGERE => sprintf(
                'Attention : Fatigue légère détectée pour %s (%s) - Score: %d/100',
                $nomConducteur,
                $immatriculation,
                $score
            ),
            default => sprintf(
                'Alerte de fatigue détectée pour %s (%s) - Niveau: %s',
                $nomConducteur,
                $immatriculation,
                $niveau->value
            ),
        };
    }

    /**
     * Fallback : récupère le premier conducteur actif de la base ou en crée un temporaire
     */
    private function getConducteurFallback(): Conducteur
    {
        // Essayer de récupérer un conducteur existant actif
        $conducteur = $this->entityManager->getRepository(Conducteur::class)
            ->findOneBy(['isActive' => true], ['id' => 'ASC']);
        
        // Créer un conducteur temporaire si aucun n'existe
        if (!$conducteur) {
            $conducteur = new Conducteur();
            $conducteur->setNom('Conducteur SFAM');
            $conducteur->setPrenom('Test');
            $conducteur->setNumeroPermis('TN-SFAM-' . strtoupper(bin2hex(random_bytes(4))));
            $conducteur->setTelephone('+216 00 000 000');
            $conducteur->setDateNaissance(new \DateTime('1990-01-01'));
            $conducteur->setAdresse('Tunis, Tunisie');
            $conducteur->setVille('Tunis');
            $conducteur->setCodePostal('1000');
            $conducteur->setPays('Tunisie');
            $conducteur->setIsActive(true);
            $conducteur->setDateCreation(new \DateTimeImmutable());
            
            $this->entityManager->persist($conducteur);
        }
        
        return $conducteur;
    }
}