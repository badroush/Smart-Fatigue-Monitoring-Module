<?php

namespace App\Entity;

use App\Repository\VehiculeRepository;
use Doctrine\Common\Collections\ArrayCollection;
use Doctrine\Common\Collections\Collection;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Component\Uid\Uuid;
use Symfony\Component\Validator\Constraints as Assert;

/**
 * Vehicule - Représente un camion/transporteur surveillé par le système SFAM
 */
#[ORM\Entity(repositoryClass: VehiculeRepository::class)]
#[ORM\Table(name: 'vehicule')]
class Vehicule
{
    public const STATUT_EN_SERVICE = 'en_service';
    public const STATUT_HORS_SERVICE = 'hors_service';
    public const STATUT_MAINTENANCE = 'maintenance';
    public const STATUT_ACCIDENT = 'accident';

    public const TYPE_CAMION = 'camion';
    public const TYPE_TRACTEUR = 'tracteur';
    public const TYPE_REMORQUE = 'remorque';
    public const TYPE_UTILITAIRE = 'utilitaire';

    #[ORM\Id]
    #[ORM\Column(type: 'uuid', unique: true)]
    #[ORM\GeneratedValue(strategy: 'CUSTOM')]
    #[ORM\CustomIdGenerator(class: 'doctrine.uuid_generator')]
    private Uuid $id;

    #[ORM\Column(type: 'string', length: 20, unique: true)]
    #[Assert\NotBlank(message: 'L\'immatriculation est obligatoire')]
    #[Assert\Length(min: 3, max: 20, minMessage: 'Immatriculation invalide')]
    private string $immatriculation;

    #[ORM\Column(type: 'string', length: 50)]
    #[Assert\NotBlank(message: 'Le type de véhicule est obligatoire')]
    #[Assert\Choice(callback: ['self', 'getAvailableTypes'])]
    private string $type;

    #[ORM\Column(type: 'string', length: 100, nullable: true)]
    private ?string $marque = null;

    #[ORM\Column(type: 'string', length: 100, nullable: true)]
    private ?string $modele = null;

    #[ORM\Column(type: 'integer', nullable: true)]
    private ?int $anneeFabrication = null;

    #[ORM\Column(type: 'string', length: 50)]
    #[Assert\NotBlank(message: 'Le statut du véhicule est obligatoire')]
    #[Assert\Choice(callback: ['self', 'getAvailableStatus'])]
    private string $statut = self::STATUT_EN_SERVICE;

    #[ORM\Column(type: 'integer', nullable: true)]
    private ?int $kilometrage = null;

    #[ORM\Column(type: 'string', length: 100, nullable: true)]
    private ?string $couleur = null;

    #[ORM\Column(type: 'string', length: 50, nullable: true)]
    private ?string $numeroChassis = null;

    #[ORM\Column(type: 'string', length: 50, nullable: true)]
    private ?string $numeroMoteur = null;

    #[ORM\Column(type: 'boolean')]
    private bool $isActive = true;

    #[ORM\Column(type: 'boolean')]
    private bool $isMonitored = true;

    #[ORM\Column(type: 'string', length: 100, unique: true)]
    #[Assert\NotBlank(message: 'La clé API SFAM est obligatoire')]
    private string $sfamApiKey;

    #[ORM\Column(type: 'datetime_immutable', nullable: true)]
    private ?\DateTimeImmutable $derniereCommunication = null;

    #[ORM\Column(type: 'datetime_immutable')]
    private \DateTimeImmutable $createdAt;

    #[ORM\Column(type: 'datetime_immutable', nullable: true)]
    private ?\DateTimeImmutable $lastMaintenanceAt = null;

    #[ORM\Column(type: 'datetime_immutable', nullable: true)]
    private ?\DateTimeImmutable $nextMaintenanceAt = null;

    /**
     * Relation OneToMany avec Conducteur
     * Un véhicule peut avoir plusieurs conducteurs dans son historique
     */
    #[ORM\OneToMany(targetEntity: Conducteur::class, mappedBy: 'vehiculeAssigne', cascade: ['persist'])]
    private Collection $conducteurs;

    /**
     * Relation OneToMany avec FatigueEvent
     * Un véhicule peut avoir plusieurs événements de fatigue
     */
    #[ORM\OneToMany(targetEntity: FatigueEvent::class, mappedBy: 'vehicule', cascade: ['persist'])]
    #[ORM\OrderBy(['debut' => 'DESC'])]
    private Collection $evenementsFatigue;

    /**
     * Relation OneToMany avec Alerte
     * Un véhicule peut recevoir plusieurs alertes
     */
    #[ORM\OneToMany(targetEntity: Alerte::class, mappedBy: 'vehicule', cascade: ['persist'])]
    #[ORM\OrderBy(['horodatage' => 'DESC'])]
    private Collection $alertes;

    /**
     * Relation OneToOne avec LocalisationGPS
     * Position GPS actuelle du véhicule
     */
    #[ORM\OneToOne(targetEntity: LocalisationGPS::class, cascade: ['persist', 'remove'])]
    #[ORM\JoinColumn(nullable: true, onDelete: 'SET NULL')]
    private ?LocalisationGPS $localisationActuelle = null;

    /**
     * Relation OneToMany avec PaquetDonnees
     * Tous les paquets de données reçus du SFAM
     */
    #[ORM\OneToMany(targetEntity: PaquetDonnees::class, mappedBy: 'vehicule', cascade: ['persist'])]
    #[ORM\OrderBy(['horodatage' => 'DESC'])]
    private Collection $historiqueDonnees;

    public function __construct()
    {
        $this->id = Uuid::v4();
        $this->createdAt = new \DateTimeImmutable();
        $this->conducteurs = new ArrayCollection();
        $this->evenementsFatigue = new ArrayCollection();
        $this->alertes = new ArrayCollection();
        $this->historiqueDonnees = new ArrayCollection();
        $this->sfamApiKey = 'sfam_' . bin2hex(random_bytes(16));
    }

    public function getId(): Uuid
    {
        return $this->id;
    }

    public function getImmatriculation(): string
    {
        return $this->immatriculation;
    }

    public function setImmatriculation(string $immatriculation): self
    {
        $this->immatriculation = strtoupper($immatriculation);
        return $this;
    }

    public function getType(): string
    {
        return $this->type;
    }

    public function setType(string $type): self
    {
        $this->type = $type;
        return $this;
    }

    public static function getAvailableTypes(): array
    {
        return [
            self::TYPE_CAMION,
            self::TYPE_TRACTEUR,
            self::TYPE_REMORQUE,
            self::TYPE_UTILITAIRE,
        ];
    }

    public function getMarque(): ?string
    {
        return $this->marque;
    }

    public function setMarque(?string $marque): self
    {
        $this->marque = $marque;
        return $this;
    }

    public function getModele(): ?string
    {
        return $this->modele;
    }

    public function setModele(?string $modele): self
    {
        $this->modele = $modele;
        return $this;
    }

    public function getAnneeFabrication(): ?int
    {
        return $this->anneeFabrication;
    }

    public function setAnneeFabrication(?int $anneeFabrication): self
    {
        $this->anneeFabrication = $anneeFabrication;
        return $this;
    }

    public function getStatut(): string
    {
        return $this->statut;
    }

    public function setStatut(string $statut): self
    {
        $this->statut = $statut;
        return $this;
    }

    public static function getAvailableStatus(): array
    {
        return [
            self::STATUT_EN_SERVICE,
            self::STATUT_HORS_SERVICE,
            self::STATUT_MAINTENANCE,
            self::STATUT_ACCIDENT,
        ];
    }

    public function getKilometrage(): ?int
    {
        return $this->kilometrage;
    }

    public function setKilometrage(?int $kilometrage): self
    {
        $this->kilometrage = $kilometrage;
        return $this;
    }

    public function incrementKilometrage(int $distance): self
    {
        if ($this->kilometrage === null) {
            $this->kilometrage = 0;
        }
        $this->kilometrage += $distance;
        return $this;
    }

    public function getCouleur(): ?string
    {
        return $this->couleur;
    }

    public function setCouleur(?string $couleur): self
    {
        $this->couleur = $couleur;
        return $this;
    }

    public function getNumeroChassis(): ?string
    {
        return $this->numeroChassis;
    }

    public function setNumeroChassis(?string $numeroChassis): self
    {
        $this->numeroChassis = $numeroChassis;
        return $this;
    }

    public function getNumeroMoteur(): ?string
    {
        return $this->numeroMoteur;
    }

    public function setNumeroMoteur(?string $numeroMoteur): self
    {
        $this->numeroMoteur = $numeroMoteur;
        return $this;
    }

    public function isActive(): bool
    {
        return $this->isActive;
    }

    public function setIsActive(bool $isActive): self
    {
        $this->isActive = $isActive;
        return $this;
    }

    public function isMonitored(): bool
    {
        return $this->isMonitored;
    }

    public function setIsMonitored(bool $isMonitored): self
    {
        $this->isMonitored = $isMonitored;
        return $this;
    }

    public function getSfamApiKey(): string
    {
        return $this->sfamApiKey;
    }

    public function setSfamApiKey(string $sfamApiKey): self
    {
        $this->sfamApiKey = $sfamApiKey;
        return $this;
    }

    public function regenerateSfamApiKey(): self
    {
        $this->sfamApiKey = 'sfam_' . bin2hex(random_bytes(16));
        return $this;
    }

    public function getDerniereCommunication(): ?\DateTimeImmutable
    {
        return $this->derniereCommunication;
    }

    public function setDerniereCommunication(?\DateTimeImmutable $derniereCommunication): self
    {
        $this->derniereCommunication = $derniereCommunication;
        return $this;
    }

    public function updateDerniereCommunication(): self
    {
        $this->derniereCommunication = new \DateTimeImmutable();
        return $this;
    }

    public function getCreatedAt(): \DateTimeImmutable
    {
        return $this->createdAt;
    }

    public function getLastMaintenanceAt(): ?\DateTimeImmutable
    {
        return $this->lastMaintenanceAt;
    }

    public function setLastMaintenanceAt(?\DateTimeImmutable $lastMaintenanceAt): self
    {
        $this->lastMaintenanceAt = $lastMaintenanceAt;
        return $this;
    }

    public function getNextMaintenanceAt(): ?\DateTimeImmutable
    {
        return $this->nextMaintenanceAt;
    }

    public function setNextMaintenanceAt(?\DateTimeImmutable $nextMaintenanceAt): self
    {
        $this->nextMaintenanceAt = $nextMaintenanceAt;
        return $this;
    }

    /**
     * Vérifie si le véhicule nécessite une maintenance
     */
    public function besoinMaintenance(): bool
    {
        if ($this->nextMaintenanceAt === null) {
            return false;
        }
        return $this->nextMaintenanceAt <= new \DateTimeImmutable();
    }

    /**
     * Vérifie si le véhicule est en service
     */
    public function estEnService(): bool
    {
        return $this->statut === self::STATUT_EN_SERVICE && $this->isActive;
    }

    /**
     * Vérifie si le véhicule est surveillé
     */
    public function estSurveille(): bool
    {
        return $this->isMonitored && $this->estEnService();
    }

    /**
     * Retourne les conducteurs assignés à ce véhicule
     * @return Collection<int, Conducteur>
     */
    public function getConducteurs(): Collection
    {
        return $this->conducteurs;
    }

    /**
     * Ajoute un conducteur à l'historique du véhicule
     */
    public function addConducteur(Conducteur $conducteur): self
    {
        if (!$this->conducteurs->contains($conducteur)) {
            $this->conducteurs->add($conducteur);
        }
        return $this;
    }

    /**
     * Supprime un conducteur de l'historique
     */
    public function removeConducteur(Conducteur $conducteur): self
    {
        $this->conducteurs->removeElement($conducteur);
        return $this;
    }

    /**
     * Retourne le conducteur actuellement assigné (s'il y en a un)
     */
    public function getConducteurActuel(): ?Conducteur
    {
        foreach ($this->conducteurs as $conducteur) {
            if ($conducteur->getVehiculeAssigne() === $this && $conducteur->isActive()) {
                return $conducteur;
            }
        }
        return null;
    }

    /**
     * Retourne les événements de fatigue du véhicule
     * @return Collection<int, FatigueEvent>
     */
    public function getEvenementsFatigue(): Collection
    {
        return $this->evenementsFatigue;
    }

    /**
     * Ajoute un événement de fatigue
     */
    public function addEvenementFatigue(FatigueEvent $evenement): self
    {
        if (!$this->evenementsFatigue->contains($evenement)) {
            $this->evenementsFatigue->add($evenement);
            if ($evenement->getVehicule() !== $this) {
                $evenement->setVehicule($this);
            }
        }
        return $this;
    }

    /**
     * Supprime un événement de fatigue
     */
    public function removeEvenementFatigue(FatigueEvent $evenement): self
    {
        $this->evenementsFatigue->removeElement($evenement);
        return $this;
    }

    /**
     * Retourne les alertes du véhicule
     * @return Collection<int, Alerte>
     */
    public function getAlertes(): Collection
    {
        return $this->alertes;
    }

    /**
     * Ajoute une alerte
     */
    public function addAlerte(Alerte $alerte): self
    {
        if (!$this->alertes->contains($alerte)) {
            $this->alertes->add($alerte);
            if ($alerte->getVehicule() !== $this) {
                $alerte->setVehicule($this);
            }
        }
        return $this;
    }

    /**
     * Supprime une alerte
     */
    public function removeAlerte(Alerte $alerte): self
    {
        $this->alertes->removeElement($alerte);
        return $this;
    }

    /**
     * Retourne la localisation GPS actuelle
     */
    public function getLocalisationActuelle(): ?LocalisationGPS
    {
        return $this->localisationActuelle;
    }

    /**
     * Met à jour la localisation GPS
     */
    public function setLocalisationActuelle(?LocalisationGPS $localisationActuelle): self
    {
        $this->localisationActuelle = $localisationActuelle;
        return $this;
    }

    /**
     * Retourne l'historique des données SFAM
     * @return Collection<int, PaquetDonnees>
     */
    public function getHistoriqueDonnees(): Collection
    {
        return $this->historiqueDonnees;
    }

    /**
     * Ajoute un paquet de données à l'historique
     */
    public function addPaquetDonnee(PaquetDonnees $paquetDonnee): self
    {
        if (!$this->historiqueDonnees->contains($paquetDonnee)) {
            $this->historiqueDonnees->add($paquetDonnee);
            if ($paquetDonnee->getVehicule() !== $this) {
                $paquetDonnee->setVehicule($this);
            }
        }
        return $this;
    }

    /**
     * Supprime un paquet de données
     */
    public function removePaquetDonnee(PaquetDonnees $paquetDonnee): self
    {
        $this->historiqueDonnees->removeElement($paquetDonnee);
        return $this;
    }

    /**
     * Retourne le dernier paquet de données reçu
     */
    public function getLastPaquetDonnee(): ?PaquetDonnees
    {
        if ($this->historiqueDonnees->isEmpty()) {
            return null;
        }
        return $this->historiqueDonnees->first();
    }

    /**
     * Vérifie si le véhicule communique régulièrement
     */
    public function communiqueRegulierement(): bool
    {
        if ($this->derniereCommunication === null) {
            return false;
        }
        $tenMinutesAgo = (new \DateTimeImmutable())->modify('-10 minutes');
        return $this->derniereCommunication > $tenMinutesAgo;
    }

    /**
     * Compte le nombre d'événements de fatigue dans une période
     */
    public function countFatigueEventsInPeriod(\DateTimeInterface $start, \DateTimeInterface $end): int
    {
        $count = 0;
        foreach ($this->evenementsFatigue as $event) {
            if ($event->getDebut() >= $start && $event->getDebut() <= $end) {
                $count++;
            }
        }
        return $count;
    }

    /**
     * Retourne le niveau de vigilance maximal atteint récemment
     */
    public function getNiveauVigilanceMaxRecent(): ?string
    {
        $oneHourAgo = (new \DateTimeImmutable())->modify('-1 hour');
        $maxLevel = 'NORMAL';
        $levelOrder = [
            'NORMAL' => 0,
            'FATIGUE_LEGERE' => 1,
            'FATIGUE_MODEREE' => 2,
            'FATIGUE_SEVERE' => 3,
            'SOMNOLENCE_CRITIQUE' => 4,
        ];

        foreach ($this->evenementsFatigue as $event) {
            if ($event->getDebut() >= $oneHourAgo) {
                $eventLevel = $event->getNiveauMax()->value;
                if ($levelOrder[$eventLevel] > $levelOrder[$maxLevel]) {
                    $maxLevel = $eventLevel;
                }
            }
        }

        return $maxLevel !== 'NORMAL' ? $maxLevel : null;
    }

    /**
     * Retourne les statistiques du véhicule
     */
    public function getStatistiques(): array
    {
        return [
            'total_evenements_fatigue' => $this->evenementsFatigue->count(),
            'total_alertes' => $this->alertes->count(),
            'nombre_paquets_donnees' => $this->historiqueDonnees->count(),
            'communique_regulierement' => $this->communiqueRegulierement(),
            'besoin_maintenance' => $this->besoinMaintenance(),
            'est_en_service' => $this->estEnService(),
            'est_surveille' => $this->estSurveille(),
            'niveau_vigilance_max_recent' => $this->getNiveauVigilanceMaxRecent(),
            'derniere_communication' => $this->derniereCommunication?->format('Y-m-d H:i:s'),
            'conducteur_actuel' => $this->getConducteurActuel()?->getNom(),
        ];
    }

    /**
     * Retourne un tableau pour la sérialisation JSON
     */
    public function toArray(): array
    {
        return [
            'id' => $this->id->toString(),
            'immatriculation' => $this->immatriculation,
            'type' => $this->type,
            'marque' => $this->marque,
            'modele' => $this->modele,
            'anneeFabrication' => $this->anneeFabrication,
            'statut' => $this->statut,
            'kilometrage' => $this->kilometrage,
            'couleur' => $this->couleur,
            'numeroChassis' => $this->numeroChassis,
            'numeroMoteur' => $this->numeroMoteur,
            'isActive' => $this->isActive,
            'isMonitored' => $this->isMonitored,
            'sfamApiKey' => $this->sfamApiKey,
            'derniereCommunication' => $this->derniereCommunication?->format('Y-m-d H:i:s'),
            'createdAt' => $this->createdAt->format('Y-m-d H:i:s'),
            'lastMaintenanceAt' => $this->lastMaintenanceAt?->format('Y-m-d H:i:s'),
            'nextMaintenanceAt' => $this->nextMaintenanceAt?->format('Y-m-d H:i:s'),
            'localisationActuelle' => $this->localisationActuelle?->toArray(),
            'conducteurActuel' => $this->getConducteurActuel()?->toArray(),
            'statistiques' => $this->getStatistiques(),
        ];
    }

    public function __toString(): string
    {
        return $this->immatriculation . ' (' . $this->marque . ' ' . $this->modele . ')';
    }
}