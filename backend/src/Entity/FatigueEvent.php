<?php

namespace App\Entity;

use App\Enum\NiveauVigilance;
use App\Repository\FatigueEventRepository;
use Doctrine\Common\Collections\ArrayCollection;
use Doctrine\Common\Collections\Collection;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Component\Uid\Uuid;
use Symfony\Component\Validator\Constraints as Assert;

/**
 * FatigueEvent - Représente un événement de fatigue détecté et enregistré
 */
#[ORM\Entity(repositoryClass: FatigueEventRepository::class)]
#[ORM\Table(name: 'fatigue_event')]
class FatigueEvent
{
    // Constantes pour les types d'interventions
    public const INTERVENTION_ALERTE_LOCALE = 'alerte_locale';
    public const INTERVENTION_ALERTE_VOCALE = 'alerte_vocale';
    public const INTERVENTION_SONNETTE = 'sonnette';
    public const INTERVENTION_CLIGNOTANTS = 'clignotants';
    public const INTERVENTION_SMS_SUPERVISEUR = 'sms_superviseur';
    public const INTERVENTION_ARRET_OBLIGATOIRE = 'arret_obligatoire';

    #[ORM\Id]
    #[ORM\Column(type: 'uuid', unique: true)]
    #[ORM\GeneratedValue(strategy: 'CUSTOM')]
    #[ORM\CustomIdGenerator(class: 'doctrine.uuid_generator')]
    private Uuid $id;

    #[ORM\Column(type: 'string', length: 50, unique: true)]
    #[Assert\NotBlank(message: 'L\'identifiant de l\'événement est obligatoire')]
    private string $idEvenement;

    #[ORM\ManyToOne(targetEntity: Conducteur::class, inversedBy: 'historiqueFatigue')]
    #[ORM\JoinColumn(nullable: false, onDelete: 'CASCADE')]
    #[Assert\NotNull(message: 'Le conducteur est obligatoire')]
    private Conducteur $conducteur;

    #[ORM\ManyToOne(targetEntity: Vehicule::class, inversedBy: 'evenementsFatigue')]
    #[ORM\JoinColumn(nullable: false, onDelete: 'CASCADE')]
    #[Assert\NotNull(message: 'Le véhicule est obligatoire')]
    private Vehicule $vehicule;

    #[ORM\Column(type: 'string', enumType: NiveauVigilance::class)]
    #[Assert\NotBlank(message: 'Le niveau maximal est obligatoire')]
    private NiveauVigilance $niveauMax;

    #[ORM\Column(type: 'integer')]
    #[Assert\NotBlank(message: 'La durée en secondes est obligatoire')]
    #[Assert\Range(min: 1, max: 86400, minMessage: 'Durée invalide', maxMessage: 'Durée invalide')]
    private int $dureeSecondes;

    #[ORM\Column(type: 'json')]
    #[Assert\NotBlank(message: 'Les interventions déclenchées sont obligatoires')]
    private array $interventionsDeclenchees = [];

    #[ORM\ManyToOne(targetEntity: LocalisationGPS::class)]
    #[ORM\JoinColumn(nullable: true, onDelete: 'SET NULL')]
    private ?LocalisationGPS $localisationDebut = null;

    #[ORM\ManyToOne(targetEntity: LocalisationGPS::class)]
    #[ORM\JoinColumn(nullable: true, onDelete: 'SET NULL')]
    private ?LocalisationGPS $localisationFin = null;

    #[ORM\Column(type: 'datetime_immutable')]
    private \DateTimeImmutable $debut;

    #[ORM\Column(type: 'datetime_immutable', nullable: true)]
    private ?\DateTimeImmutable $fin = null;

    #[ORM\Column(type: 'boolean', options: ['default' => false])]
    private bool $resolu = false;

    #[ORM\Column(type: 'datetime_immutable', nullable: true)]
    private ?\DateTimeImmutable $resoluAt = null;

    #[ORM\ManyToOne(targetEntity: User::class)]
    #[ORM\JoinColumn(nullable: true, onDelete: 'SET NULL')]
    private ?User $resoluPar = null;

    #[ORM\Column(type: 'string', length: 500, nullable: true)]
    private ?string $notes = null;

    #[ORM\Column(type: 'json', nullable: true)]
    private ?array $metadata = null;

    /**
     * Relation OneToMany avec PaquetDonnees
     * Un événement peut être composé de plusieurs paquets de données
     */
    #[ORM\OneToMany(targetEntity: PaquetDonnees::class, mappedBy: 'fatigueEvent', cascade: ['persist'], orphanRemoval: true)]
    #[ORM\OrderBy(['horodatage' => 'ASC'])]
    private Collection $paquetsDonnees;

    /**
     * Relation OneToMany avec Alerte
     * Un événement peut générer plusieurs alertes
     */
    #[ORM\OneToMany(targetEntity: Alerte::class, mappedBy: 'fatigueEvent', cascade: ['persist'], orphanRemoval: true)]
    #[ORM\OrderBy(['horodatage' => 'ASC'])]
    private Collection $alertes;

    public function __construct()
    {
        $this->id = Uuid::v4();
        $this->idEvenement = 'FE-' . strtoupper(bin2hex(random_bytes(8)));
        $this->debut = new \DateTimeImmutable();
        $this->interventionsDeclenchees = [];
        $this->metadata = [];
        $this->paquetsDonnees = new ArrayCollection();
        $this->alertes = new ArrayCollection();
        $this->resolu = false;
    }

    public function getId(): Uuid
    {
        return $this->id;
    }

    public function getIdEvenement(): string
    {
        return $this->idEvenement;
    }

    public function setIdEvenement(string $idEvenement): self
    {
        $this->idEvenement = $idEvenement;
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

    public function getNiveauMax(): NiveauVigilance
    {
        return $this->niveauMax;
    }

    public function setNiveauMax(NiveauVigilance $niveauMax): self
    {
        $this->niveauMax = $niveauMax;
        return $this;
    }

    public function getDureeSecondes(): int
    {
        return $this->dureeSecondes;
    }

    public function setDureeSecondes(int $dureeSecondes): self
    {
        $this->dureeSecondes = $dureeSecondes;
        return $this;
    }

    public function getDureeFormatted(): string
    {
        $hours = floor($this->dureeSecondes / 3600);
        $minutes = floor(($this->dureeSecondes % 3600) / 60);
        $seconds = $this->dureeSecondes % 60;

        if ($hours > 0) {
            return sprintf('%dh %02dm %02ds', $hours, $minutes, $seconds);
        } elseif ($minutes > 0) {
            return sprintf('%dm %02ds', $minutes, $seconds);
        } else {
            return sprintf('%ds', $seconds);
        }
    }

    public function getInterventionsDeclenchees(): array
    {
        return $this->interventionsDeclenchees;
    }

    public function setInterventionsDeclenchees(array $interventionsDeclenchees): self
    {
        $this->interventionsDeclenchees = $interventionsDeclenchees;
        return $this;
    }

    public function addIntervention(string $intervention): self
    {
        if (!in_array($intervention, $this->interventionsDeclenchees)) {
            $this->interventionsDeclenchees[] = $intervention;
        }
        return $this;
    }

    public function removeIntervention(string $intervention): self
    {
        $this->interventionsDeclenchees = array_filter(
            $this->interventionsDeclenchees,
            fn($i) => $i !== $intervention
        );
        return $this;
    }

    public function hasIntervention(string $intervention): bool
    {
        return in_array($intervention, $this->interventionsDeclenchees);
    }

    public function getLocalisationDebut(): ?LocalisationGPS
    {
        return $this->localisationDebut;
    }

    public function setLocalisationDebut(?LocalisationGPS $localisationDebut): self
    {
        $this->localisationDebut = $localisationDebut;
        return $this;
    }

    public function getLocalisationFin(): ?LocalisationGPS
    {
        return $this->localisationFin;
    }

    public function setLocalisationFin(?LocalisationGPS $localisationFin): self
    {
        $this->localisationFin = $localisationFin;
        return $this;
    }

    public function getDebut(): \DateTimeImmutable
    {
        return $this->debut;
    }

    public function setDebut(\DateTimeImmutable $debut): self
    {
        $this->debut = $debut;
        return $this;
    }

    public function getFin(): ?\DateTimeImmutable
    {
        return $this->fin;
    }

    public function setFin(?\DateTimeImmutable $fin): self
    {
        $this->fin = $fin;
        
        // Calculer automatiquement la durée si fin est définie
        if ($fin !== null) {
            $this->dureeSecondes = $fin->getTimestamp() - $this->debut->getTimestamp();
        }
        
        return $this;
    }

    public function isResolu(): bool
    {
        return $this->resolu;
    }

    public function setResolu(bool $resolu): self
    {
        $this->resolu = $resolu;
        
        if ($resolu && $this->resoluAt === null) {
            $this->resoluAt = new \DateTimeImmutable();
        } elseif (!$resolu) {
            $this->resoluAt = null;
        }
        
        return $this;
    }

    public function getResoluAt(): ?\DateTimeImmutable
    {
        return $this->resoluAt;
    }

    public function setResoluAt(?\DateTimeImmutable $resoluAt): self
{
    $this->resoluAt = $resoluAt;
    return $this;
}

    public function getResoluPar(): ?User
    {
        return $this->resoluPar;
    }

    public function setResoluPar(?User $resoluPar): self
    {
        $this->resoluPar = $resoluPar;
        return $this;
    }

    public function getNotes(): ?string
    {
        return $this->notes;
    }

    public function setNotes(?string $notes): self
    {
        $this->notes = $notes;
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

    /**
     * Retourne les paquets de données associés à cet événement
     * @return Collection<int, PaquetDonnees>
     */
    public function getPaquetsDonnees(): Collection
    {
        return $this->paquetsDonnees;
    }

    /**
     * Ajoute un paquet de données à l'événement
     */
    public function addPaquetDonnee(PaquetDonnees $paquetDonnee): self
    {
        if (!$this->paquetsDonnees->contains($paquetDonnee)) {
            $this->paquetsDonnees->add($paquetDonnee);
            $paquetDonnee->setFatigueEvent($this);
        }
        return $this;
    }

    /**
     * Supprime un paquet de données de l'événement
     */
    public function removePaquetDonnee(PaquetDonnees $paquetDonnee): self
    {
        if ($this->paquetsDonnees->removeElement($paquetDonnee)) {
            if ($paquetDonnee->getFatigueEvent() === $this) {
                $paquetDonnee->setFatigueEvent(null);
            }
        }
        return $this;
    }

    /**
     * Retourne les alertes associées à cet événement
     * @return Collection<int, Alerte>
     */
    public function getAlertes(): Collection
    {
        return $this->alertes;
    }

    /**
     * Ajoute une alerte à l'événement
     */
    public function addAlerte(Alerte $alerte): self
    {
        if (!$this->alertes->contains($alerte)) {
            $this->alertes->add($alerte);
            $alerte->setFatigueEvent($this);
        }
        return $this;
    }

    /**
     * Supprime une alerte de l'événement
     */
    public function removeAlerte(Alerte $alerte): self
    {
        if ($this->alertes->removeElement($alerte)) {
            if ($alerte->getFatigueEvent() === $this) {
                $alerte->setFatigueEvent(null);
            }
        }
        return $this;
    }

    /**
     * Vérifie si l'événement est actif (pas encore terminé)
     */
    public function estActif(): bool
    {
        return $this->fin === null;
    }

    /**
     * Vérifie si l'événement est critique
     */
    public function estCritique(): bool
    {
        return $this->niveauMax->isCritical();
    }

    /**
     * Vérifie si l'événement nécessite une intervention externe
     */
    public function necessiteInterventionExterne(): bool
    {
        return $this->hasIntervention(self::INTERVENTION_SONNETTE) ||
               $this->hasIntervention(self::INTERVENTION_CLIGNOTANTS);
    }

    /**
     * Retourne la durée en minutes
     */
    public function getDureeMinutes(): float
    {
        return round($this->dureeSecondes / 60, 2);
    }

    /**
     * Retourne la durée en heures
     */
    public function getDureeHeures(): float
    {
        return round($this->dureeSecondes / 3600, 2);
    }

    /**
     * Calcule le score de gravité de l'événement (0-100)
     */
    public function getScoreGravite(): int
    {
        $score = 0;

        // Contribution du niveau de vigilance
        $score += $this->niveauMax->getThreshold() * 15; // 0-60

        // Contribution de la durée
        if ($this->dureeSecondes > 300) { // Plus de 5 minutes
            $score += 20;
        } elseif ($this->dureeSecondes > 60) { // Plus d'1 minute
            $score += 10;
        }

        // Contribution des interventions externes
        if ($this->necessiteInterventionExterne()) {
            $score += 20;
        }

        return min(100, $score);
    }

    /**
     * Retourne une description textuelle de l'événement
     */
    public function getDescription(): string
    {
        $description = sprintf(
            'Événement de fatigue %s - Niveau: %s - Durée: %s',
            $this->idEvenement,
            $this->niveauMax->getLabel(),
            $this->getDureeFormatted()
        );

        if (!empty($this->interventionsDeclenchees)) {
            $description .= sprintf(
                ' - Interventions: %s',
                implode(', ', $this->interventionsDeclenchees)
            );
        }

        return $description;
    }

    /**
     * Résout l'événement avec un utilisateur et des notes
     */
    public function resoudre(User $user, ?string $notes = null): self
    {
        $this->setResolu(true);
        $this->setResoluPar($user);
        $this->setResoluAt(new \DateTimeImmutable());
        
        if ($notes !== null) {
            $this->setNotes($notes);
        }

        // Si l'événement n'a pas de fin, la définir maintenant
        if ($this->fin === null) {
            $this->setFin(new \DateTimeImmutable());
        }

        return $this;
    }

    /**
     * Retourne les statistiques de l'événement
     */
    public function getStatistiques(): array
    {
        return [
            'id' => $this->idEvenement,
            'niveauMax' => $this->niveauMax->value,
            'niveauMaxLabel' => $this->niveauMax->getLabel(),
            'dureeSecondes' => $this->dureeSecondes,
            'dureeFormatted' => $this->getDureeFormatted(),
            'dureeMinutes' => $this->getDureeMinutes(),
            'nombrePaquets' => $this->paquetsDonnees->count(),
            'nombreAlertes' => $this->alertes->count(),
            'interventions' => $this->interventionsDeclenchees,
            'estCritique' => $this->estCritique(),
            'necessiteInterventionExterne' => $this->necessiteInterventionExterne(),
            'scoreGravite' => $this->getScoreGravite(),
            'estResolu' => $this->isResolu(),
            'estActif' => $this->estActif(),
        ];
    }

    /**
     * Retourne un tableau pour la sérialisation JSON
     */
    public function toArray(): array
    {
        return [
            'id' => $this->id->toString(),
            'idEvenement' => $this->idEvenement,
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
            'niveauMax' => $this->niveauMax->toJson(),
            'dureeSecondes' => $this->dureeSecondes,
            'dureeFormatted' => $this->getDureeFormatted(),
            'interventionsDeclenchees' => $this->interventionsDeclenchees,
            'localisationDebut' => $this->localisationDebut?->toArray(),
            'localisationFin' => $this->localisationFin?->toArray(),
            'debut' => $this->debut->format('Y-m-d H:i:s'),
            'fin' => $this->fin?->format('Y-m-d H:i:s'),
            'resolu' => $this->resolu,
            'resoluAt' => $this->resoluAt?->format('Y-m-d H:i:s'),
            'resoluPar' => $this->resoluPar?->getEmail(),
            'notes' => $this->notes,
            'nombrePaquets' => $this->paquetsDonnees->count(),
            'nombreAlertes' => $this->alertes->count(),
            'estCritique' => $this->estCritique(),
            'necessiteInterventionExterne' => $this->necessiteInterventionExterne(),
            'scoreGravite' => $this->getScoreGravite(),
            'estActif' => $this->estActif(),
            'description' => $this->getDescription(),
        ];
    }

    public function __toString(): string
    {
        return sprintf(
            'FatigueEvent %s: %s (%s) - %s',
            $this->idEvenement,
            $this->conducteur->getNom(),
            $this->vehicule->getImmatriculation(),
            $this->niveauMax->getLabel()
        );
    }
}