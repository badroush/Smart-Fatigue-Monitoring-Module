<?php

namespace App\Entity;

use App\Repository\DonneesCapteursRepository;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Component\Uid\Uuid;
use Symfony\Component\Validator\Constraints as Assert;

/**
 * DonneesCapteurs - Représente les données collectées par les capteurs IoT embarqués
 */
#[ORM\Entity(repositoryClass: DonneesCapteursRepository::class)]
#[ORM\Table(name: 'donnees_capteurs')]
class DonneesCapteurs
{
    // Constantes de seuils pour les alertes
    public const SEUIL_TEMP_MAX = 35.0;      // Température max acceptable (°C)
    public const SEUIL_TEMP_MIN = 15.0;      // Température min acceptable (°C)
    public const SEUIL_HUMIDITE_MAX = 80.0;  // Humidité max acceptable (%)
    public const SEUIL_HUMIDITE_MIN = 30.0;  // Humidité min acceptable (%)
    public const SEUIL_LUMINOSITE_MIN = 50;  // Luminosité min acceptable (lux)
    public const SEUIL_TEMP_CORPO_MAX = 38.0; // Température corporelle max (°C)
    public const SEUIL_TEMP_CORPO_MIN = 35.0; // Température corporelle min (°C)

    #[ORM\Id]
    #[ORM\Column(type: 'uuid', unique: true)]
    #[ORM\GeneratedValue(strategy: 'CUSTOM')]
    #[ORM\CustomIdGenerator(class: 'doctrine.uuid_generator')]
    private Uuid $id;

    #[ORM\Column(type: 'float')]
    #[Assert\NotBlank(message: 'La température ambiante est obligatoire')]
    #[Assert\Range(min: -20, max: 60, minMessage: 'Température ambiante invalide', maxMessage: 'Température ambiante invalide')]
    private float $temperatureAmbiante;

    #[ORM\Column(type: 'float')]
    #[Assert\NotBlank(message: 'L\'humidité est obligatoire')]
    #[Assert\Range(min: 0, max: 100, minMessage: 'Humidité invalide', maxMessage: 'Humidité invalide')]
    private float $humidite;

    #[ORM\Column(type: 'integer')]
    #[Assert\NotBlank(message: 'La luminosité est obligatoire')]
    #[Assert\Range(min: 0, max: 65535, minMessage: 'Luminosité invalide', maxMessage: 'Luminosité invalide')]
    private int $luminosite;

    #[ORM\Column(type: 'float')]
    #[Assert\NotBlank(message: 'La température corporelle est obligatoire')]
    #[Assert\Range(min: 30, max: 45, minMessage: 'Température corporelle invalide', maxMessage: 'Température corporelle invalide')]
    private float $temperatureCorporelle;

    #[ORM\Column(type: 'integer')]
    #[Assert\NotBlank(message: 'La durée de conduite est obligatoire')]
    #[Assert\Range(min: 0, max: 86400, minMessage: 'Durée de conduite invalide', maxMessage: 'Durée de conduite invalide')]
    private int $dureeConduite; // en secondes

    #[ORM\Column(type: 'datetime_immutable')]
    private \DateTimeImmutable $horodatage;

    #[ORM\Column(type: 'boolean', options: ['default' => false])]
    private bool $alerteTemperature = false;

    #[ORM\Column(type: 'boolean', options: ['default' => false])]
    private bool $alerteHumidite = false;

    #[ORM\Column(type: 'boolean', options: ['default' => false])]
    private bool $alerteLuminosite = false;

    #[ORM\Column(type: 'boolean', options: ['default' => false])]
    private bool $alerteTemperatureCorporelle = false;

    #[ORM\Column(type: 'json', nullable: true)]
    private ?array $metadata = null;

    public function __construct()
{
    $this->id = Uuid::v4();
    $this->horodatage = new \DateTimeImmutable();
    $this->metadata = [];
    
    // Initialisation de toutes les propriétés typées
    $this->temperatureAmbiante = 22.0;
    $this->humidite = 50.0;
    $this->luminosite = 300;
    $this->temperatureCorporelle = 36.5;
    $this->dureeConduite = 0;
    $this->alerteTemperature = false;
    $this->alerteHumidite = false;
    $this->alerteLuminosite = false;
    $this->alerteTemperatureCorporelle = false;
    
    $this->evaluerAlertes();
}

    public function getId(): Uuid
    {
        return $this->id;
    }

    public function getTemperatureAmbiante(): float
    {
        return $this->temperatureAmbiante;
    }

    public function setTemperatureAmbiante(float $temperatureAmbiante): self
    {
        $this->temperatureAmbiante = $temperatureAmbiante;
        $this->evaluerAlerteTemperature();
        return $this;
    }

    public function getHumidite(): float
    {
        return $this->humidite;
    }

    public function setHumidite(float $humidite): self
    {
        $this->humidite = $humidite;
        $this->evaluerAlerteHumidite();
        return $this;
    }

    public function getLuminosite(): int
    {
        return $this->luminosite;
    }

    public function setLuminosite(int $luminosite): self
    {
        $this->luminosite = $luminosite;
        $this->evaluerAlerteLuminosite();
        return $this;
    }

    public function getTemperatureCorporelle(): float
    {
        return $this->temperatureCorporelle;
    }

    public function setTemperatureCorporelle(float $temperatureCorporelle): self
    {
        $this->temperatureCorporelle = $temperatureCorporelle;
        $this->evaluerAlerteTemperatureCorporelle();
        return $this;
    }

    public function getDureeConduite(): int
    {
        return $this->dureeConduite;
    }

    public function setDureeConduite(int $dureeConduite): self
    {
        $this->dureeConduite = $dureeConduite;
        return $this;
    }

    public function getDureeConduiteFormatted(): string
    {
        $hours = floor($this->dureeConduite / 3600);
        $minutes = floor(($this->dureeConduite % 3600) / 60);
        $seconds = $this->dureeConduite % 60;

        return sprintf('%02dh %02dm %02ds', $hours, $minutes, $seconds);
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

    public function isAlerteTemperature(): bool
    {
        return $this->alerteTemperature;
    }

    public function isAlerteHumidite(): bool
    {
        return $this->alerteHumidite;
    }

    public function isAlerteLuminosite(): bool
    {
        return $this->alerteLuminosite;
    }

    public function isAlerteTemperatureCorporelle(): bool
    {
        return $this->alerteTemperatureCorporelle;
    }

    public function hasAnyAlert(): bool
    {
        return $this->alerteTemperature || $this->alerteHumidite || $this->alerteLuminosite || $this->alerteTemperatureCorporelle;
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
     * Évalue toutes les alertes
     */
    public function evaluerAlertes(): self
    {
        $this->evaluerAlerteTemperature();
        $this->evaluerAlerteHumidite();
        $this->evaluerAlerteLuminosite();
        $this->evaluerAlerteTemperatureCorporelle();
        return $this;
    }

    /**
     * Évalue l'alerte de température ambiante
     */
    private function evaluerAlerteTemperature(): void
    {
        $this->alerteTemperature = (
            $this->temperatureAmbiante > self::SEUIL_TEMP_MAX ||
            $this->temperatureAmbiante < self::SEUIL_TEMP_MIN
        );
    }

    /**
     * Évalue l'alerte d'humidité
     */
    private function evaluerAlerteHumidite(): void
    {
        $this->alerteHumidite = (
            $this->humidite > self::SEUIL_HUMIDITE_MAX ||
            $this->humidite < self::SEUIL_HUMIDITE_MIN
        );
    }

    /**
     * Évalue l'alerte de luminosité
     */
    private function evaluerAlerteLuminosite(): void
    {
        $this->alerteLuminosite = $this->luminosite < self::SEUIL_LUMINOSITE_MIN;
    }

    /**
     * Évalue l'alerte de température corporelle
     */
    private function evaluerAlerteTemperatureCorporelle(): void
    {
        $this->alerteTemperatureCorporelle = (
            $this->temperatureCorporelle > self::SEUIL_TEMP_CORPO_MAX ||
            $this->temperatureCorporelle < self::SEUIL_TEMP_CORPO_MIN
        );
    }

    /**
     * Retourne le niveau de confort thermique (indice humidex simplifié)
     */
    public function getIndiceHumidex(): float
    {
        // Formule simplifiée de l'indice humidex
        $e = 6.112 * exp(17.67 * $this->temperatureAmbiante / ($this->temperatureAmbiante + 243.5));
        $h = 0.5555 * ($e * ($this->humidite / 100) - 10.0);
        return round($this->temperatureAmbiante + $h, 1);
    }

    /**
     * Retourne une description du confort thermique
     */
    public function getConfortThermique(): string
    {
        $humidex = $this->getIndiceHumidex();

        if ($humidex < 20) {
            return 'Très confortable';
        } elseif ($humidex < 25) {
            return 'Confortable';
        } elseif ($humidex < 30) {
            return 'Acceptable';
        } elseif ($humidex < 40) {
            return 'Inconfortable';
        } else {
            return 'Très inconfortable';
        }
    }

    /**
     * Vérifie si la température ambiante est dans la plage acceptable
     */
    public function isTemperatureAcceptable(): bool
    {
        return !$this->alerteTemperature;
    }

    /**
     * Vérifie si l'humidité est dans la plage acceptable
     */
    public function isHumiditeAcceptable(): bool
    {
        return !$this->alerteHumidite;
    }

    /**
     * Vérifie si la luminosité est suffisante
     */
    public function isLuminositeSuffisante(): bool
    {
        return !$this->alerteLuminosite;
    }

    /**
     * Vérifie si la température corporelle est normale
     */
    public function isTemperatureCorporelleNormale(): bool
    {
        return !$this->alerteTemperatureCorporelle;
    }

    /**
     * Calcule le score de confort global (0-100)
     */
    public function getScoreConfort(): int
    {
        $score = 100;

        if ($this->alerteTemperature) {
            $score -= 25;
        }
        if ($this->alerteHumidite) {
            $score -= 25;
        }
        if ($this->alerteLuminosite) {
            $score -= 25;
        }
        if ($this->alerteTemperatureCorporelle) {
            $score -= 25;
        }

        return max(0, $score);
    }

    /**
     * Retourne les alertes actives sous forme de tableau
     */
    public function getAlertesActives(): array
    {
        $alertes = [];

        if ($this->alerteTemperature) {
            $alertes[] = [
                'type' => 'temperature',
                'message' => sprintf('Température ambiante anormale : %.1f°C', $this->temperatureAmbiante),
                'valeur' => $this->temperatureAmbiante,
                'seuil_min' => self::SEUIL_TEMP_MIN,
                'seuil_max' => self::SEUIL_TEMP_MAX,
            ];
        }

        if ($this->alerteHumidite) {
            $alertes[] = [
                'type' => 'humidite',
                'message' => sprintf('Humidité anormale : %.1f%%', $this->humidite),
                'valeur' => $this->humidite,
                'seuil_min' => self::SEUIL_HUMIDITE_MIN,
                'seuil_max' => self::SEUIL_HUMIDITE_MAX,
            ];
        }

        if ($this->alerteLuminosite) {
            $alertes[] = [
                'type' => 'luminosite',
                'message' => sprintf('Luminosité insuffisante : %d lux', $this->luminosite),
                'valeur' => $this->luminosite,
                'seuil_min' => self::SEUIL_LUMINOSITE_MIN,
            ];
        }

        if ($this->alerteTemperatureCorporelle) {
            $alertes[] = [
                'type' => 'temperature_corporelle',
                'message' => sprintf('Température corporelle anormale : %.1f°C', $this->temperatureCorporelle),
                'valeur' => $this->temperatureCorporelle,
                'seuil_min' => self::SEUIL_TEMP_CORPO_MIN,
                'seuil_max' => self::SEUIL_TEMP_CORPO_MAX,
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
            'temperatureAmbiante' => $this->temperatureAmbiante,
            'humidite' => $this->humidite,
            'luminosite' => $this->luminosite,
            'temperatureCorporelle' => $this->temperatureCorporelle,
            'dureeConduite' => $this->dureeConduite,
            'dureeConduiteFormatted' => $this->getDureeConduiteFormatted(),
            'horodatage' => $this->horodatage->format('Y-m-d H:i:s'),
            'alertes' => [
                'temperature' => $this->alerteTemperature,
                'humidite' => $this->alerteHumidite,
                'luminosite' => $this->alerteLuminosite,
                'temperatureCorporelle' => $this->alerteTemperatureCorporelle,
            ],
            'alertesActives' => $this->getAlertesActives(),
            'confortThermique' => $this->getConfortThermique(),
            'indiceHumidex' => $this->getIndiceHumidex(),
            'scoreConfort' => $this->getScoreConfort(),
            'hasAnyAlert' => $this->hasAnyAlert(),
        ];
    }

    public function __toString(): string
    {
        return sprintf(
            'Capteurs: Temp=%.1f°C, Hum=%.1f%%, Lux=%d, Corp=%.1f°C, Durée=%s',
            $this->temperatureAmbiante,
            $this->humidite,
            $this->luminosite,
            $this->temperatureCorporelle,
            $this->getDureeConduiteFormatted()
        );
    }
}