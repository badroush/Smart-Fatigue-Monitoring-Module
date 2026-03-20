<?php

namespace App\Entity;

use App\Enum\NiveauVigilance;
use App\Repository\AnalyseFatigueRepository;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Component\Uid\Uuid;
use Symfony\Component\Validator\Constraints as Assert;

/**
 * AnalyseFatigue - Représente les résultats de l'analyse de fatigue détectés par le module SFAM
 */
#[ORM\Entity(repositoryClass: AnalyseFatigueRepository::class)]
#[ORM\Table(name: 'analyse_fatigue')]
class AnalyseFatigue
{
    // Constantes de seuils pour la détection de fatigue
    public const SEUIL_EAR_FERMETURE = 0.22;        // Seuil EAR pour yeux fermés
    public const SEUIL_MAR_BAILLEMENT = 0.6;        // Seuil MAR pour bâillement
    public const SEUIL_PITCH_INCLINAISON = 25;      // Seuil pitch pour inclinaison tête (degrés)
    public const SEUIL_YAW_ROTATION = 30;           // Seuil yaw pour rotation tête (degrés)
    public const SEUIL_CLIGNEMENTS_CONSECUTIFS = 2; // Clignements consécutifs pour alerte

    #[ORM\Id]
    #[ORM\Column(type: 'uuid', unique: true)]
    #[ORM\GeneratedValue(strategy: 'CUSTOM')]
    #[ORM\CustomIdGenerator(class: 'doctrine.uuid_generator')]
    private Uuid $id;

    #[ORM\Column(type: 'boolean')]
    #[Assert\NotBlank(message: 'La détection des yeux fermés est obligatoire')]
    private bool $yeuxFermes;

    #[ORM\Column(type: 'float')]
    #[Assert\NotBlank(message: 'Le ratio EAR est obligatoire')]
    #[Assert\Range(min: 0, max: 1, minMessage: 'EAR invalide', maxMessage: 'EAR invalide')]
    private float $ear; // Eye Aspect Ratio

    #[ORM\Column(type: 'boolean')]
    #[Assert\NotBlank(message: 'La détection des bâillements est obligatoire')]
    private bool $baillements;

    #[ORM\Column(type: 'float')]
    #[Assert\NotBlank(message: 'Le ratio MAR est obligatoire')]
    #[Assert\Range(min: 0, max: 2, minMessage: 'MAR invalide', maxMessage: 'MAR invalide')]
    private float $mar; // Mouth Aspect Ratio

    #[ORM\Column(type: 'boolean')]
    #[Assert\NotBlank(message: 'La détection de l\'inclinaison de tête est obligatoire')]
    private bool $inclinaisonTete;

    #[ORM\Column(type: 'float')]
    #[Assert\NotBlank(message: 'Le pitch est obligatoire')]
    #[Assert\Range(min: -180, max: 180, minMessage: 'Pitch invalide', maxMessage: 'Pitch invalide')]
    private float $pitch; // Inclinaison avant/arrière en degrés

    #[ORM\Column(type: 'float')]
    #[Assert\NotBlank(message: 'Le yaw est obligatoire')]
    #[Assert\Range(min: -180, max: 180, minMessage: 'Yaw invalide', maxMessage: 'Yaw invalide')]
    private float $yaw; // Rotation gauche/droite en degrés

    #[ORM\Column(type: 'integer')]
    #[Assert\NotBlank(message: 'Le nombre de clignements est obligatoire')]
    #[Assert\Range(min: 0, max: 100, minMessage: 'Nombre de clignements invalide')]
    private int $nombreClignements;

    #[ORM\Column(type: 'integer')]
    #[Assert\NotBlank(message: 'La durée des yeux fermés est obligatoire')]
    #[Assert\Range(min: 0, max: 60, minMessage: 'Durée invalide')]
    private int $dureeYeuxFermes; // en secondes

    #[ORM\Column(type: 'integer')]
    #[Assert\NotBlank(message: 'Le nombre de bâillements est obligatoire')]
    #[Assert\Range(min: 0, max: 50, minMessage: 'Nombre de bâillements invalide')]
    private int $nombreBaillements;

    #[ORM\Column(type: 'string', enumType: NiveauVigilance::class)]
    #[Assert\NotBlank(message: 'Le niveau de vigilance est obligatoire')]
    private NiveauVigilance $niveauVigilance;

    #[ORM\Column(type: 'datetime_immutable')]
    private \DateTimeImmutable $horodatage;

    #[ORM\Column(type: 'boolean', options: ['default' => false])]
    private bool $alerteYeuxFermes = false;

    #[ORM\Column(type: 'boolean', options: ['default' => false])]
    private bool $alerteBaillements = false;

    #[ORM\Column(type: 'boolean', options: ['default' => false])]
    private bool $alerteInclinaisonTete = false;

    #[ORM\Column(type: 'json', nullable: true)]
    private ?array $metadata = null;

    #[ORM\Column(type: 'integer', options: ['default' => 0])]
    private int $scoreFatigue = 0; // Score de 0 à 100

    public function __construct()
{
    $this->id = Uuid::v4();
    $this->horodatage = new \DateTimeImmutable();
    $this->metadata = [];
    
    // Initialisation de toutes les propriétés typées
    $this->yeuxFermes = false;
    $this->ear = 0.3;
    $this->baillements = false;
    $this->mar = 0.3;
    $this->inclinaisonTete = false;
    $this->pitch = 0.0;
    $this->yaw = 0.0;
    $this->nombreClignements = 0;
    $this->dureeYeuxFermes = 0;
    $this->nombreBaillements = 0;
    $this->niveauVigilance = NiveauVigilance::NORMAL;
    $this->alerteYeuxFermes = false;
    $this->alerteBaillements = false;
    $this->alerteInclinaisonTete = false;
    $this->scoreFatigue = 0;
    
    $this->evaluerAlertes();
    $this->calculerNiveauVigilance();
    $this->calculerScoreFatigue();
}

    public function getId(): Uuid
    {
        return $this->id;
    }

    public function isYeuxFermes(): bool
    {
        return $this->yeuxFermes;
    }

    public function setYeuxFermes(bool $yeuxFermes): self
    {
        $this->yeuxFermes = $yeuxFermes;
        $this->evaluerAlertes();
        $this->calculerNiveauVigilance();
        $this->calculerScoreFatigue();
        return $this;
    }

    public function getEar(): float
    {
        return $this->ear;
    }

    public function setEar(float $ear): self
    {
        $this->ear = $ear;
        $this->yeuxFermes = $ear < self::SEUIL_EAR_FERMETURE;
        $this->evaluerAlertes();
        $this->calculerNiveauVigilance();
        $this->calculerScoreFatigue();
        return $this;
    }

    public function isBaillements(): bool
    {
        return $this->baillements;
    }

    public function setBaillements(bool $baillements): self
    {
        $this->baillements = $baillements;
        $this->evaluerAlertes();
        $this->calculerNiveauVigilance();
        $this->calculerScoreFatigue();
        return $this;
    }

    public function getMar(): float
    {
        return $this->mar;
    }

    public function setMar(float $mar): self
    {
        $this->mar = $mar;
        $this->baillements = $mar > self::SEUIL_MAR_BAILLEMENT;
        $this->evaluerAlertes();
        $this->calculerNiveauVigilance();
        $this->calculerScoreFatigue();
        return $this;
    }

    public function isInclinaisonTete(): bool
    {
        return $this->inclinaisonTete;
    }

    public function setInclinaisonTete(bool $inclinaisonTete): self
    {
        $this->inclinaisonTete = $inclinaisonTete;
        $this->evaluerAlertes();
        $this->calculerNiveauVigilance();
        $this->calculerScoreFatigue();
        return $this;
    }

    public function getPitch(): float
    {
        return $this->pitch;
    }

    public function setPitch(float $pitch): self
    {
        $this->pitch = $pitch;
        $this->inclinaisonTete = abs($pitch) > self::SEUIL_PITCH_INCLINAISON || abs($this->yaw) > self::SEUIL_YAW_ROTATION;
        $this->evaluerAlertes();
        $this->calculerNiveauVigilance();
        $this->calculerScoreFatigue();
        return $this;
    }

    public function getYaw(): float
    {
        return $this->yaw;
    }

    public function setYaw(float $yaw): self
    {
        $this->yaw = $yaw;
        $this->inclinaisonTete = abs($this->pitch) > self::SEUIL_PITCH_INCLINAISON || abs($yaw) > self::SEUIL_YAW_ROTATION;
        $this->evaluerAlertes();
        $this->calculerNiveauVigilance();
        $this->calculerScoreFatigue();
        return $this;
    }

    public function getNombreClignements(): int
    {
        return $this->nombreClignements;
    }

    public function setNombreClignements(int $nombreClignements): self
    {
        $this->nombreClignements = $nombreClignements;
        $this->evaluerAlertes();
        $this->calculerNiveauVigilance();
        $this->calculerScoreFatigue();
        return $this;
    }

    public function getDureeYeuxFermes(): int
    {
        return $this->dureeYeuxFermes;
    }

    public function setDureeYeuxFermes(int $dureeYeuxFermes): self
    {
        $this->dureeYeuxFermes = $dureeYeuxFermes;
        $this->evaluerAlertes();
        $this->calculerNiveauVigilance();
        $this->calculerScoreFatigue();
        return $this;
    }

    public function getNombreBaillements(): int
    {
        return $this->nombreBaillements;
    }

    public function setNombreBaillements(int $nombreBaillements): self
    {
        $this->nombreBaillements = $nombreBaillements;
        $this->evaluerAlertes();
        $this->calculerNiveauVigilance();
        $this->calculerScoreFatigue();
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

    public function getHorodatage(): \DateTimeImmutable
    {
        return $this->horodatage;
    }

    public function setHorodatage(\DateTimeImmutable $horodatage): self
    {
        $this->horodatage = $horodatage;
        return $this;
    }

    public function isAlerteYeuxFermes(): bool
    {
        return $this->alerteYeuxFermes;
    }

    public function isAlerteBaillements(): bool
    {
        return $this->alerteBaillements;
    }

    public function isAlerteInclinaisonTete(): bool
    {
        return $this->alerteInclinaisonTete;
    }

    public function hasAnyAlert(): bool
    {
        return $this->alerteYeuxFermes || $this->alerteBaillements || $this->alerteInclinaisonTete;
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

    public function getScoreFatigue(): int
    {
        return $this->scoreFatigue;
    }

    /**
     * Évalue toutes les alertes
     */
    public function evaluerAlertes(): self
    {
        $this->alerteYeuxFermes = $this->yeuxFermes && $this->dureeYeuxFermes > 0;
        $this->alerteBaillements = $this->baillements && $this->nombreBaillements > 0;
        $this->alerteInclinaisonTete = $this->inclinaisonTete;
        return $this;
    }

    /**
     * Calcule le niveau de vigilance automatiquement
     */
    public function calculerNiveauVigilance(): self
    {
        // Commencer par NORMAL
        $niveau = NiveauVigilance::NORMAL;

        // Vérifier les conditions pour chaque niveau
        $conditionsFatigueLegere = $this->nombreClignements > 0 || $this->nombreBaillements > 0;
        $conditionsFatigueModeree = $this->yeuxFermes || $this->baillements || $this->nombreClignements >= 2;
        $conditionsFatigueSevere = ($this->yeuxFermes && $this->dureeYeuxFermes >= 3) || $this->nombreBaillements >= 2;
        $conditionsSomnolenceCritique = $this->inclinaisonTete || ($this->yeuxFermes && $this->dureeYeuxFermes >= 5);

        if ($conditionsSomnolenceCritique) {
            $niveau = NiveauVigilance::SOMNOLENCE_CRITIQUE;
        } elseif ($conditionsFatigueSevere) {
            $niveau = NiveauVigilance::FATIGUE_SEVERE;
        } elseif ($conditionsFatigueModeree) {
            $niveau = NiveauVigilance::FATIGUE_MODEREE;
        } elseif ($conditionsFatigueLegere) {
            $niveau = NiveauVigilance::FATIGUE_LEGERE;
        }

        $this->niveauVigilance = $niveau;
        return $this;
    }

    /**
     * Calcule le score de fatigue (0-100)
     */
    public function calculerScoreFatigue(): self
    {
        $score = 0;

        // Contribution des yeux fermés
        if ($this->yeuxFermes) {
            $score += 20;
            if ($this->dureeYeuxFermes >= 3) {
                $score += 15;
            }
            if ($this->dureeYeuxFermes >= 5) {
                $score += 15;
            }
        }

        // Contribution des bâillements
        if ($this->baillements) {
            $score += 15;
            $score += min($this->nombreBaillements * 5, 15);
        }

        // Contribution des clignements
        if ($this->nombreClignements >= 2) {
            $score += 10;
        }
        if ($this->nombreClignements >= 5) {
            $score += 10;
        }

        // Contribution de l'inclinaison de tête
        if ($this->inclinaisonTete) {
            $score += 25;
        }

        // Contribution de l'EAR
        if ($this->ear < 0.20) {
            $score += 10;
        }

        // Contribution du MAR
        if ($this->mar > 0.7) {
            $score += 10;
        }

        $this->scoreFatigue = min(100, $score);
        return $this;
    }

    /**
     * Vérifie si le conducteur est fatigué
     */
    public function estFatigue(): bool
    {
        return $this->niveauVigilance !== NiveauVigilance::NORMAL;
    }

    /**
     * Vérifie si le niveau de fatigue nécessite une intervention
     */
    public function necessiteIntervention(): bool
    {
        return $this->niveauVigilance->requiresIntervention();
    }

    /**
     * Vérifie si le niveau est critique (alerte externe)
     */
    public function estCritique(): bool
    {
        return $this->niveauVigilance->isCritical();
    }

    /**
     * Retourne les alertes actives sous forme de tableau
     */
    public function getAlertesActives(): array
    {
        $alertes = [];

        if ($this->alerteYeuxFermes) {
            $alertes[] = [
                'type' => 'yeux_fermes',
                'message' => sprintf('Yeux fermés détectés (EAR: %.3f, durée: %ds)', $this->ear, $this->dureeYeuxFermes),
                'valeur' => $this->ear,
                'seuil' => self::SEUIL_EAR_FERMETURE,
                'duree' => $this->dureeYeuxFermes,
            ];
        }

        if ($this->alerteBaillements) {
            $alertes[] = [
                'type' => 'baillements',
                'message' => sprintf('Bâillements détectés (MAR: %.3f, nombre: %d)', $this->mar, $this->nombreBaillements),
                'valeur' => $this->mar,
                'seuil' => self::SEUIL_MAR_BAILLEMENT,
                'nombre' => $this->nombreBaillements,
            ];
        }

        if ($this->alerteInclinaisonTete) {
            $alertes[] = [
                'type' => 'inclinaison_tete',
                'message' => sprintf('Inclinaison de tête détectée (Pitch: %.1f°, Yaw: %.1f°)', $this->pitch, $this->yaw),
                'pitch' => $this->pitch,
                'yaw' => $this->yaw,
                'seuil_pitch' => self::SEUIL_PITCH_INCLINAISON,
                'seuil_yaw' => self::SEUIL_YAW_ROTATION,
            ];
        }

        return $alertes;
    }

    /**
     * Retourne une description textuelle de l'analyse
     */
    public function getDescription(): string
    {
        $parts = [];

        if ($this->yeuxFermes) {
            $parts[] = sprintf('Yeux fermés (%.3f)', $this->ear);
        }

        if ($this->baillements) {
            $parts[] = sprintf('Bâillements (%.3f)', $this->mar);
        }

        if ($this->inclinaisonTete) {
            $parts[] = sprintf('Tête inclinée (%.1f°/%.1f°)', $this->pitch, $this->yaw);
        }

        if (empty($parts)) {
            return 'Aucun signe de fatigue détecté';
        }

        return implode(', ', $parts);
    }

    /**
     * Retourne un tableau pour la sérialisation JSON
     */
    public function toArray(): array
    {
        return [
            'id' => $this->id->toString(),
            'yeuxFermes' => $this->yeuxFermes,
            'ear' => $this->ear,
            'baillements' => $this->baillements,
            'mar' => $this->mar,
            'inclinaisonTete' => $this->inclinaisonTete,
            'pitch' => $this->pitch,
            'yaw' => $this->yaw,
            'nombreClignements' => $this->nombreClignements,
            'dureeYeuxFermes' => $this->dureeYeuxFermes,
            'nombreBaillements' => $this->nombreBaillements,
            'niveauVigilance' => $this->niveauVigilance->toJson(),
            'horodatage' => $this->horodatage->format('Y-m-d H:i:s'),
            'alertes' => [
                'yeuxFermes' => $this->alerteYeuxFermes,
                'baillements' => $this->alerteBaillements,
                'inclinaisonTete' => $this->alerteInclinaisonTete,
            ],
            'alertesActives' => $this->getAlertesActives(),
            'scoreFatigue' => $this->scoreFatigue,
            'estFatigue' => $this->estFatigue(),
            'necessiteIntervention' => $this->necessiteIntervention(),
            'estCritique' => $this->estCritique(),
            'description' => $this->getDescription(),
        ];
    }

    public function __toString(): string
    {
        return sprintf(
            'Analyse Fatigue: %s, EAR=%.3f, MAR=%.3f, Pitch=%.1f°, Yaw=%.1f°, Score=%d/100',
            $this->niveauVigilance->getLabel(),
            $this->ear,
            $this->mar,
            $this->pitch,
            $this->yaw,
            $this->scoreFatigue
        );
    }
}