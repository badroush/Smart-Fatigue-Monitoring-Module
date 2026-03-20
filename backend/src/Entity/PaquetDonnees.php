<?php

namespace App\Entity;

use App\Enum\NiveauVigilance;
use App\Repository\PaquetDonneesRepository;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Component\Uid\Uuid;
use Symfony\Component\Validator\Constraints as Assert;

/**
 * PaquetDonnees - Représente un paquet de données envoyé par le module SFAM embarqué
 */
#[ORM\Entity(repositoryClass: PaquetDonneesRepository::class)]
#[ORM\Table(name: 'paquet_donnees')]
class PaquetDonnees
{
    #[ORM\Id]
    #[ORM\Column(type: 'uuid', unique: true)]
    #[ORM\GeneratedValue(strategy: 'CUSTOM')]
    #[ORM\CustomIdGenerator(class: 'doctrine.uuid_generator')]
    private Uuid $id;

    #[ORM\Column(type: 'string', length: 36)]
    #[Assert\NotBlank(message: 'L\'identifiant du conducteur est obligatoire')]
    private string $idConducteur;

    #[ORM\Column(type: 'string', length: 36)]
    #[Assert\NotBlank(message: 'L\'identifiant du véhicule est obligatoire')]
    private string $idVehicule;

    #[ORM\Column(type: 'string', length: 100)]
    #[Assert\NotBlank(message: 'L\'identifiant SFAM est obligatoire')]
    private string $idSfam;

    #[ORM\Column(type: 'string', enumType: NiveauVigilance::class)]
    #[Assert\NotBlank(message: 'Le niveau de vigilance est obligatoire')]
    private NiveauVigilance $niveauVigilance;

    #[ORM\OneToOne(targetEntity: DonneesCapteurs::class, cascade: ['persist'])]
    #[ORM\JoinColumn(nullable: false, onDelete: 'CASCADE')]
    #[Assert\NotNull(message: 'Les données capteurs sont obligatoires')]
    private DonneesCapteurs $donneesCapteurs;

    #[ORM\OneToOne(targetEntity: AnalyseFatigue::class, cascade: ['persist'])]
    #[ORM\JoinColumn(nullable: false, onDelete: 'CASCADE')]
    #[Assert\NotNull(message: 'L\'analyse de fatigue est obligatoire')]
    private AnalyseFatigue $analyseFatigue;

    #[ORM\OneToOne(targetEntity: LocalisationGPS::class, cascade: ['persist'])]
    #[ORM\JoinColumn(nullable: false, onDelete: 'CASCADE')]
    #[Assert\NotNull(message: 'La localisation GPS est obligatoire')]
    private LocalisationGPS $localisationGPS;

    #[ORM\Column(type: 'datetime_immutable')]
    private \DateTimeImmutable $horodatage;

    #[ORM\Column(type: 'datetime_immutable', nullable: true)]
    private ?\DateTimeImmutable $receivedAt = null;

    #[ORM\Column(type: 'json', nullable: true)]
    private ?array $metadata = null;

    #[ORM\Column(type: 'boolean', options: ['default' => false])]
    private bool $traite = false;

    #[ORM\Column(type: 'boolean', options: ['default' => false])]
    private bool $alerteGeneree = false;

    #[ORM\ManyToOne(targetEntity: Conducteur::class)]
    #[ORM\JoinColumn(nullable: true, onDelete: 'SET NULL')]
    private ?Conducteur $conducteur = null;

    #[ORM\ManyToOne(targetEntity: Vehicule::class, inversedBy: 'historiqueDonnees')]
#[ORM\JoinColumn(nullable: true, onDelete: 'SET NULL')]
private ?Vehicule $vehicule = null;

    #[ORM\ManyToOne(targetEntity: FatigueEvent::class, inversedBy: 'paquetsDonnees')]
    #[ORM\JoinColumn(nullable: true, onDelete: 'SET NULL')]
    private ?FatigueEvent $fatigueEvent = null;

    public function __construct()
    {
        $this->id = Uuid::v4();
        $this->horodatage = new \DateTimeImmutable();
        $this->receivedAt = new \DateTimeImmutable();
        $this->metadata = [];
        $this->traite = false;
        $this->alerteGeneree = false;
    }

    public function getId(): Uuid
    {
        return $this->id;
    }

    public function getIdConducteur(): string
    {
        return $this->idConducteur;
    }

    public function setIdConducteur(string $idConducteur): self
    {
        $this->idConducteur = $idConducteur;
        return $this;
    }

    public function getIdVehicule(): string
    {
        return $this->idVehicule;
    }

    public function setIdVehicule(string $idVehicule): self
    {
        $this->idVehicule = $idVehicule;
        return $this;
    }

    public function getIdSfam(): string
    {
        return $this->idSfam;
    }

    public function setIdSfam(string $idSfam): self
    {
        $this->idSfam = $idSfam;
        return $this;
    }

    public function getNiveauVigilance(): NiveauVigilance
    {
        return $this->niveauVigilance;
    }

    public function setNiveauVigilance(NiveauVigilance $niveauVigilance): self
    {
        $this->niveauVigilance = $niveauVigilance;
        return $this;
    }

    public function getDonneesCapteurs(): DonneesCapteurs
    {
        return $this->donneesCapteurs;
    }

    public function setDonneesCapteurs(DonneesCapteurs $donneesCapteurs): self
    {
        $this->donneesCapteurs = $donneesCapteurs;
        return $this;
    }

    public function getAnalyseFatigue(): AnalyseFatigue
    {
        return $this->analyseFatigue;
    }

    public function setAnalyseFatigue(AnalyseFatigue $analyseFatigue): self
    {
        $this->analyseFatigue = $analyseFatigue;
        return $this;
    }

    public function getLocalisationGPS(): LocalisationGPS
    {
        return $this->localisationGPS;
    }

    public function setLocalisationGPS(LocalisationGPS $localisationGPS): self
    {
        $this->localisationGPS = $localisationGPS;
        return $this;
    }

    public function getHorodatage(): \DateTimeImmutable
    {
        return $this->horodatage;
    }

    public function setHorodatage(\DateTimeImmutable $horodatage): self
    {
        $this->horodatage = $horodatage;
        return $this;
    }

    public function getReceivedAt(): ?\DateTimeImmutable
    {
        return $this->receivedAt;
    }

    public function setReceivedAt(?\DateTimeImmutable $receivedAt): self
    {
        $this->receivedAt = $receivedAt;
        return $this;
    }

    public function getMetadata(): ?array
    {
        return $this->metadata;
    }

    public function setMetadata(?array $metadata): self
    {
        $this->metadata = $metadata;
        return $this;
    }

    public function addMetadata(string $key, mixed $value): self
    {
        if ($this->metadata === null) {
            $this->metadata = [];
        }
        $this->metadata[$key] = $value;
        return $this;
    }

    public function isTraite(): bool
    {
        return $this->traite;
    }

    public function setTraite(bool $traite): self
    {
        $this->traite = $traite;
        return $this;
    }

    public function isAlerteGeneree(): bool
    {
        return $this->alerteGeneree;
    }

    public function setAlerteGeneree(bool $alerteGeneree): self
    {
        $this->alerteGeneree = $alerteGeneree;
        return $this;
    }

    public function getConducteur(): ?Conducteur
    {
        return $this->conducteur;
    }

    public function setConducteur(?Conducteur $conducteur): self
    {
        $this->conducteur = $conducteur;
        return $this;
    }

    public function getVehicule(): ?Vehicule
    {
        return $this->vehicule;
    }

    public function setVehicule(?Vehicule $vehicule): self
    {
        $this->vehicule = $vehicule;
        return $this;
    }

    public function getFatigueEvent(): ?FatigueEvent
    {
        return $this->fatigueEvent;
    }

    public function setFatigueEvent(?FatigueEvent $fatigueEvent): self
    {
        $this->fatigueEvent = $fatigueEvent;
        return $this;
    }

    /**
     * Vérifie si le paquet contient des alertes
     */
    public function hasAlertes(): bool
    {
        return $this->donneesCapteurs->hasAnyAlert() || 
               $this->analyseFatigue->hasAnyAlert();
    }

    /**
     * Vérifie si le paquet nécessite une intervention
     */
    public function necessiteIntervention(): bool
    {
        return $this->niveauVigilance->requiresIntervention() ||
               $this->analyseFatigue->necessiteIntervention();
    }

    /**
     * Vérifie si le paquet est critique
     */
    public function estCritique(): bool
    {
        return $this->niveauVigilance->isCritical() ||
               $this->analyseFatigue->estCritique();
    }

    /**
     * Calcule le score global du paquet (0-100)
     */
    public function getScoreGlobal(): int
    {
        // Score basé sur l'analyse de fatigue (70%) + données capteurs (30%)
        $scoreFatigue = $this->analyseFatigue->getScoreFatigue();
        $scoreCapteurs = $this->donneesCapteurs->getScoreConfort();
        
        // Score capteurs inversé (100 = parfait, 0 = critique)
        $scoreCapteursInverse = 100 - $scoreCapteurs;
        
        $scoreGlobal = round(($scoreFatigue * 0.7) + ($scoreCapteursInverse * 0.3));
        return min(100, $scoreGlobal);
    }

    /**
     * Retourne le temps de transmission (horodatage -> receivedAt)
     */
    public function getTransmissionDelay(): float
    {
        if ($this->receivedAt === null) {
            return 0.0;
        }
        
        $delay = $this->receivedAt->getTimestamp() - $this->horodatage->getTimestamp();
        return max(0, $delay);
    }

    /**
     * Vérifie si le paquet est récent (moins de 5 minutes)
     */
    public function estRecent(): bool
    {
        $fiveMinutesAgo = (new \DateTimeImmutable())->modify('-5 minutes');
        return $this->horodatage > $fiveMinutesAgo;
    }

    /**
     * Retourne les alertes actives sous forme de tableau
     */
    public function getAlertesActives(): array
    {
        $alertes = [];

        // Alertes capteurs
        foreach ($this->donneesCapteurs->getAlertesActives() as $alerte) {
            $alertes[] = [
                'source' => 'capteurs',
                'type' => $alerte['type'],
                'message' => $alerte['message'],
                'valeur' => $alerte['valeur'] ?? null,
                'seuil_min' => $alerte['seuil_min'] ?? null,
                'seuil_max' => $alerte['seuil_max'] ?? null,
            ];
        }

        // Alertes fatigue
        foreach ($this->analyseFatigue->getAlertesActives() as $alerte) {
            $alertes[] = [
                'source' => 'fatigue',
                'type' => $alerte['type'],
                'message' => $alerte['message'],
                'valeur' => $alerte['valeur'] ?? null,
                'seuil' => $alerte['seuil'] ?? null,
            ];
        }

        return $alertes;
    }

    /**
     * Retourne un tableau pour la sérialisation JSON
     */
    public function toArray(): array
    {
        return [
            'id' => $this->id->toString(),
            'idConducteur' => $this->idConducteur,
            'idVehicule' => $this->idVehicule,
            'idSfam' => $this->idSfam,
            'niveauVigilance' => $this->niveauVigilance->toJson(),
            'donneesCapteurs' => $this->donneesCapteurs->toArray(),
            'analyseFatigue' => $this->analyseFatigue->toArray(),
            'localisationGPS' => $this->localisationGPS->toArray(),
            'horodatage' => $this->horodatage->format('Y-m-d H:i:s'),
            'receivedAt' => $this->receivedAt?->format('Y-m-d H:i:s'),
            'metadata' => $this->metadata,
            'traite' => $this->traite,
            'alerteGeneree' => $this->alerteGeneree,
            'hasAlertes' => $this->hasAlertes(),
            'necessiteIntervention' => $this->necessiteIntervention(),
            'estCritique' => $this->estCritique(),
            'scoreGlobal' => $this->getScoreGlobal(),
            'transmissionDelay' => $this->getTransmissionDelay(),
            'estRecent' => $this->estRecent(),
            'alertesActives' => $this->getAlertesActives(),
        ];
    }

    /**
     * Crée un paquet à partir d'un tableau de données (API)
     */
    public static function fromApiData(array $data): self
    {
        $paquet = new self();
        
        $paquet->setIdConducteur($data['idConducteur']);
        $paquet->setIdVehicule($data['idVehicule']);
        $paquet->setIdSfam($data['idSfam'] ?? 'unknown');
        
        // Données capteurs
        $donneesCapteurs = new DonneesCapteurs();
        $donneesCapteurs->setTemperatureAmbiante($data['donneesCapteurs']['temperatureAmbiante']);
        $donneesCapteurs->setHumidite($data['donneesCapteurs']['humidite']);
        $donneesCapteurs->setLuminosite($data['donneesCapteurs']['luminosite']);
        $donneesCapteurs->setTemperatureCorporelle($data['donneesCapteurs']['temperatureCorporelle']);
        $donneesCapteurs->setDureeConduite($data['donneesCapteurs']['dureeConduite']);
        
        if (isset($data['donneesCapteurs']['horodatage'])) {
            $donneesCapteurs->setHorodatage(new \DateTimeImmutable($data['donneesCapteurs']['horodatage']));
        }
        
        $paquet->setDonneesCapteurs($donneesCapteurs);
        
        // Analyse fatigue
        $analyseFatigue = new AnalyseFatigue();
        $analyseFatigue->setEar($data['analyseFatigue']['ear']);
        $analyseFatigue->setMar($data['analyseFatigue']['mar']);
        $analyseFatigue->setPitch($data['analyseFatigue']['pitch']);
        $analyseFatigue->setYaw($data['analyseFatigue']['yaw']);
        $analyseFatigue->setNombreClignements($data['analyseFatigue']['nombreClignements']);
        $analyseFatigue->setDureeYeuxFermes($data['analyseFatigue']['dureeYeuxFermes']);
        $analyseFatigue->setNombreBaillements($data['analyseFatigue']['nombreBaillements']);
        
        if (isset($data['analyseFatigue']['horodatage'])) {
            $analyseFatigue->setHorodatage(new \DateTimeImmutable($data['analyseFatigue']['horodatage']));
        }
        
        $paquet->setAnalyseFatigue($analyseFatigue);
        
        // Localisation GPS
        $localisationGPS = new LocalisationGPS();
        $localisationGPS->setLatitude($data['localisationGPS']['latitude']);
        $localisationGPS->setLongitude($data['localisationGPS']['longitude']);
        $localisationGPS->setAltitude($data['localisationGPS']['altitude'] ?? null);
        $localisationGPS->setGpsPrecision($data['localisationGPS']['precision'] ?? null);
        
        if (isset($data['localisationGPS']['horodatage'])) {
            $localisationGPS->setHorodatage(new \DateTimeImmutable($data['localisationGPS']['horodatage']));
        }
        
        $paquet->setLocalisationGPS($localisationGPS);
        
        // Niveau de vigilance (calculé automatiquement par AnalyseFatigue)
        $paquet->setNiveauVigilance($analyseFatigue->getNiveauVigilance());
        
        // Horodatage
        if (isset($data['horodatage'])) {
            $paquet->setHorodatage(new \DateTimeImmutable($data['horodatage']));
        }
        
        // Metadata
        if (isset($data['metadata'])) {
            $paquet->setMetadata($data['metadata']);
        }
        
        return $paquet;
    }

    public function __toString(): string
    {
        return sprintf(
            'Paquet %s: Conducteur=%s, Véhicule=%s, Niveau=%s, Score=%d/100',
            $this->id->toString(),
            $this->idConducteur,
            $this->idVehicule,
            $this->niveauVigilance->getLabel(),
            $this->getScoreGlobal()
        );
    }
}