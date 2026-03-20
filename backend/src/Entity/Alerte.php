<?php

namespace App\Entity;

use App\Enum\NiveauVigilance;
use App\Repository\AlerteRepository;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Component\Uid\Uuid;
use Symfony\Component\Validator\Constraints as Assert;

/**
 * Alerte - Représente une alerte générée par le système SFAM
 */
#[ORM\Entity(repositoryClass: AlerteRepository::class)]
#[ORM\Table(name: 'alerte')]
class Alerte
{
    // Constantes pour les types d'alertes
    public const TYPE_LOCALE = 'locale';
    public const TYPE_VOCALE = 'vocale';
    public const TYPE_SMS = 'sms';
    public const TYPE_EMAIL = 'email';
    public const TYPE_SONNETTE = 'sonnette';
    public const TYPE_CLIGNOTANTS = 'clignotants';
    public const TYPE_PUSH = 'push';

    // Constantes pour les statuts
    public const STATUT_ACTIVE = 'active';
    public const STATUT_ACQUITTEE = 'acquittee';
    public const STATUT_RESOLUE = 'resolue';
    public const STATUT_ANNULEE = 'annulee';

    #[ORM\Id]
    #[ORM\Column(type: 'uuid', unique: true)]
    #[ORM\GeneratedValue(strategy: 'CUSTOM')]
    #[ORM\CustomIdGenerator(class: 'doctrine.uuid_generator')]
    private Uuid $id;

    #[ORM\Column(type: 'string', length: 50, unique: true)]
    #[Assert\NotBlank(message: 'L\'identifiant de l\'alerte est obligatoire')]
    private string $idAlerte;

    #[ORM\ManyToOne(targetEntity: Conducteur::class, inversedBy: 'alertesRecues')]
    #[ORM\JoinColumn(nullable: false, onDelete: 'CASCADE')]
    #[Assert\NotNull(message: 'Le conducteur est obligatoire')]
    private Conducteur $conducteur;

    #[ORM\ManyToOne(targetEntity: Vehicule::class, inversedBy: 'alertes')]
    #[ORM\JoinColumn(nullable: false, onDelete: 'CASCADE')]
    #[Assert\NotNull(message: 'Le véhicule est obligatoire')]
    private Vehicule $vehicule;

    #[ORM\Column(type: 'string', enumType: NiveauVigilance::class)]
    #[Assert\NotBlank(message: 'Le niveau de vigilance est obligatoire')]
    private NiveauVigilance $niveau;

    #[ORM\Column(type: 'string', length: 255)]
    #[Assert\NotBlank(message: 'Le message de l\'alerte est obligatoire')]
    #[Assert\Length(max: 255, maxMessage: 'Le message est trop long')]
    private string $message;

    #[ORM\Column(type: 'string', length: 50)]
    #[Assert\NotBlank(message: 'Le type d\'alerte est obligatoire')]
    #[Assert\Choice(callback: ['self', 'getAvailableTypes'])]
    private string $type;

    #[ORM\Column(type: 'string', length: 50)]
    #[Assert\NotBlank(message: 'Le statut de l\'alerte est obligatoire')]
    #[Assert\Choice(callback: ['self', 'getAvailableStatus'])]
    private string $statut = self::STATUT_ACTIVE;

    #[ORM\Column(type: 'datetime_immutable')]
    private \DateTimeImmutable $horodatage;

    #[ORM\Column(type: 'datetime_immutable', nullable: true)]
    private ?\DateTimeImmutable $acquitteeAt = null;

    #[ORM\Column(type: 'datetime_immutable', nullable: true)]
    private ?\DateTimeImmutable $resolueAt = null;

    #[ORM\ManyToOne(targetEntity: User::class)]
    #[ORM\JoinColumn(nullable: true, onDelete: 'SET NULL')]
    private ?User $acquitteePar = null;

    #[ORM\ManyToOne(targetEntity: User::class)]
    #[ORM\JoinColumn(nullable: true, onDelete: 'SET NULL')]
    private ?User $resoluePar = null;

    #[ORM\ManyToOne(targetEntity: FatigueEvent::class, inversedBy: 'alertes')]
    #[ORM\JoinColumn(nullable: true, onDelete: 'SET NULL')]
    private ?FatigueEvent $fatigueEvent = null;

    #[ORM\Column(type: 'json', nullable: true)]
    private ?array $metadata = null;

    #[ORM\Column(type: 'boolean', options: ['default' => false])]
    private bool $envoyee = false;

    #[ORM\Column(type: 'boolean', options: ['default' => false])]
    private bool $lue = false;

    public function __construct()
    {
        $this->id = Uuid::v4();
        $this->idAlerte = 'ALERT-' . strtoupper(bin2hex(random_bytes(8)));
        $this->horodatage = new \DateTimeImmutable();
        $this->metadata = [];
        $this->envoyee = false;
        $this->lue = false;
    }

    public function getId(): Uuid
    {
        return $this->id;
    }

    public function getIdAlerte(): string
    {
        return $this->idAlerte;
    }

    public function setIdAlerte(string $idAlerte): self
    {
        $this->idAlerte = $idAlerte;
        return $this;
    }

    public function getConducteur(): Conducteur
    {
        return $this->conducteur;
    }

    public function setConducteur(Conducteur $conducteur): self
    {
        $this->conducteur = $conducteur;
        return $this;
    }

    public function getVehicule(): Vehicule
    {
        return $this->vehicule;
    }

    public function setVehicule(Vehicule $vehicule): self
    {
        $this->vehicule = $vehicule;
        return $this;
    }

    public function getNiveau(): NiveauVigilance
    {
        return $this->niveau;
    }

    public function setNiveau(NiveauVigilance $niveau): self
    {
        $this->niveau = $niveau;
        return $this;
    }

    public function getMessage(): string
    {
        return $this->message;
    }

    public function setMessage(string $message): self
    {
        $this->message = $message;
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
            self::TYPE_LOCALE,
            self::TYPE_VOCALE,
            self::TYPE_SMS,
            self::TYPE_EMAIL,
            self::TYPE_SONNETTE,
            self::TYPE_CLIGNOTANTS,
            self::TYPE_PUSH,
        ];
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
            self::STATUT_ACTIVE,
            self::STATUT_ACQUITTEE,
            self::STATUT_RESOLUE,
            self::STATUT_ANNULEE,
        ];
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

    public function getAcquitteeAt(): ?\DateTimeImmutable
    {
        return $this->acquitteeAt;
    }

    public function setAcquitteeAt(?\DateTimeImmutable $acquitteeAt): self
    {
        $this->acquitteeAt = $acquitteeAt;
        return $this;
    }

    public function getResolueAt(): ?\DateTimeImmutable
    {
        return $this->resolueAt;
    }

    public function setResolueAt(?\DateTimeImmutable $resolueAt): self
    {
        $this->resolueAt = $resolueAt;
        return $this;
    }

    public function getAcquitteePar(): ?User
    {
        return $this->acquitteePar;
    }

    public function setAcquitteePar(?User $acquitteePar): self
    {
        $this->acquitteePar = $acquitteePar;
        return $this;
    }

    public function getResoluePar(): ?User
    {
        return $this->resoluePar;
    }

    public function setResoluePar(?User $resoluePar): self
    {
        $this->resoluePar = $resoluePar;
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

    public function isEnvoyee(): bool
    {
        return $this->envoyee;
    }

    public function setEnvoyee(bool $envoyee): self
    {
        $this->envoyee = $envoyee;
        return $this;
    }

    public function isLue(): bool
    {
        return $this->lue;
    }

    public function setLue(bool $lue): self
    {
        $this->lue = $lue;
        return $this;
    }

    /**
     * Vérifie si l'alerte est active
     */
    public function estActive(): bool
    {
        return $this->statut === self::STATUT_ACTIVE;
    }

    /**
     * Vérifie si l'alerte est acquittée
     */
    public function estAcquittee(): bool
    {
        return $this->statut === self::STATUT_ACQUITTEE;
    }

    /**
     * Vérifie si l'alerte est résolue
     */
    public function estResolue(): bool
    {
        return $this->statut === self::STATUT_RESOLUE;
    }

    /**
     * Vérifie si l'alerte est annulée
     */
    public function estAnnulee(): bool
    {
        return $this->statut === self::STATUT_ANNULEE;
    }

    /**
     * Vérifie si l'alerte est critique
     */
    public function estCritique(): bool
    {
        return $this->niveau->isCritical();
    }

    /**
     * Vérifie si l'alerte nécessite une intervention externe
     */
    public function necessiteInterventionExterne(): bool
    {
        return in_array($this->type, [
            self::TYPE_SONNETTE,
            self::TYPE_CLIGNOTANTS,
        ]);
    }

    /**
     * Acquitter l'alerte
     */
    public function acquitter(?User $user = null): self
    {
        $this->statut = self::STATUT_ACQUITTEE;
        $this->acquitteeAt = new \DateTimeImmutable();
        $this->acquitteePar = $user;
        return $this;
    }

    /**
     * Résoudre l'alerte
     */
    public function resoudre(?User $user = null): self
    {
        $this->statut = self::STATUT_RESOLUE;
        $this->resolueAt = new \DateTimeImmutable();
        $this->resoluePar = $user;
        return $this;
    }

    /**
     * Annuler l'alerte
     */
    public function annuler(): self
    {
        $this->statut = self::STATUT_ANNULEE;
        return $this;
    }

    /**
     * Marquer l'alerte comme envoyée
     */
    public function marquerCommeEnvoyee(): self
    {
        $this->envoyee = true;
        return $this;
    }

    /**
     * Marquer l'alerte comme lue
     */
    public function marquerCommeLue(): self
    {
        $this->lue = true;
        return $this;
    }

    /**
     * Retourne une description textuelle de l'alerte
     */
    public function getDescription(): string
    {
        return sprintf(
            '[%s] %s - %s (%s)',
            strtoupper($this->type),
            $this->niveau->getLabel(),
            $this->message,
            $this->statut
        );
    }

    /**
     * Retourne la priorité de l'alerte (1-5)
     */
    public function getPriorite(): int
    {
        // Priorité basée sur le niveau de vigilance
        $prioriteNiveau = $this->niveau->getThreshold();
        
        // Priorité basée sur le type d'alerte
        $prioriteType = match ($this->type) {
            self::TYPE_SONNETTE, self::TYPE_CLIGNOTANTS => 5,
            self::TYPE_SMS, self::TYPE_EMAIL => 3,
            self::TYPE_VOCALE => 2,
            self::TYPE_LOCALE, self::TYPE_PUSH => 1,
            default => 1,
        };
        
        // Priorité basée sur le statut
        $prioriteStatut = match ($this->statut) {
            self::STATUT_ACTIVE => 2,
            self::STATUT_ACQUITTEE => 1,
            self::STATUT_RESOLUE, self::STATUT_ANNULEE => 0,
            default => 1,
        };
        
        $prioriteTotale = $prioriteNiveau + $prioriteType + $prioriteStatut;
        return min(5, $prioriteTotale);
    }

    /**
     * Vérifie si l'alerte est récente (moins de 5 minutes)
     */
    public function estRecente(): bool
    {
        $fiveMinutesAgo = (new \DateTimeImmutable())->modify('-5 minutes');
        return $this->horodatage > $fiveMinutesAgo;
    }

    /**
     * Calcule le temps écoulé depuis l'alerte
     */
    public function getTempsEcoule(): string
    {
        $now = new \DateTimeImmutable();
        $diff = $now->getTimestamp() - $this->horodatage->getTimestamp();
        
        if ($diff < 60) {
            return sprintf('%d secondes', $diff);
        } elseif ($diff < 3600) {
            return sprintf('%d minutes', floor($diff / 60));
        } elseif ($diff < 86400) {
            return sprintf('%d heures', floor($diff / 3600));
        } else {
            return sprintf('%d jours', floor($diff / 86400));
        }
    }

    /**
     * Retourne un tableau pour la sérialisation JSON
     */
    public function toArray(): array
    {
        return [
            'id' => $this->id->toString(),
            'idAlerte' => $this->idAlerte,
            'conducteur' => [
                'id' => $this->conducteur->getId()->toString(),
                'nom' => $this->conducteur->getNom(),
                'numeroPermis' => $this->conducteur->getNumeroPermis(),
            ],
            'vehicule' => [
                'id' => $this->vehicule->getId()->toString(),
                'immatriculation' => $this->vehicule->getImmatriculation(),
                'type' => $this->vehicule->getType(),
            ],
            'niveau' => $this->niveau->toJson(),
            'message' => $this->message,
            'type' => $this->type,
            'statut' => $this->statut,
            'horodatage' => $this->horodatage->format('Y-m-d H:i:s'),
            'acquitteeAt' => $this->acquitteeAt?->format('Y-m-d H:i:s'),
            'resolueAt' => $this->resolueAt?->format('Y-m-d H:i:s'),
            'acquitteePar' => $this->acquitteePar?->getEmail(),
            'resoluePar' => $this->resoluePar?->getEmail(),
            'envoyee' => $this->envoyee,
            'lue' => $this->lue,
            'estCritique' => $this->estCritique(),
            'necessiteInterventionExterne' => $this->necessiteInterventionExterne(),
            'priorite' => $this->getPriorite(),
            'estRecente' => $this->estRecente(),
            'tempsEcoule' => $this->getTempsEcoule(),
            'description' => $this->getDescription(),
        ];
    }

    public function __toString(): string
    {
        return sprintf(
            'Alerte %s: %s - %s',
            $this->idAlerte,
            $this->niveau->getLabel(),
            $this->message
        );
    }
}