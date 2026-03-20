<?php

namespace App\Enum;

use Symfony\Component\Serializer\Annotation\SerializedName;
use Symfony\Component\Serializer\Annotation\Groups;

enum NiveauVigilance: string
{
    case NORMAL = 'NORMAL';
    case FATIGUE_LEGERE = 'FATIGUE_LEGERE';
    case FATIGUE_MODEREE = 'FATIGUE_MODEREE';
    case FATIGUE_SEVERE = 'FATIGUE_SEVERE';
    case SOMNOLENCE_CRITIQUE = 'SOMNOLENCE_CRITIQUE';

    /**
     * Retourne le libellé lisible pour l'utilisateur
     */
    public function getLabel(): string
    {
        return match ($this) {
            self::NORMAL => 'Normal',
            self::FATIGUE_LEGERE => 'Fatigue légère',
            self::FATIGUE_MODEREE => 'Fatigue modérée',
            self::FATIGUE_SEVERE => 'Fatigue sévère',
            self::SOMNOLENCE_CRITIQUE => 'Somnolence critique',
        };
    }

    /**
     * Retourne la couleur associée (pour l'UI - Bootstrap)
     */
    public function getColor(): string
    {
        return match ($this) {
            self::NORMAL => 'success',
            self::FATIGUE_LEGERE => 'info',
            self::FATIGUE_MODEREE => 'warning',
            self::FATIGUE_SEVERE => 'orange',
            self::SOMNOLENCE_CRITIQUE => 'danger',
        };
    }

    /**
     * Retourne l'icône associée (pour l'UI)
     */
    public function getIcon(): string
    {
        return match ($this) {
            self::NORMAL => '✅',
            self::FATIGUE_LEGERE => '⚠️',
            self::FATIGUE_MODEREE => '🚨',
            self::FATIGUE_SEVERE => '🔥',
            self::SOMNOLENCE_CRITIQUE => '🔴',
        };
    }

    /**
     * Indique si le niveau nécessite une intervention
     */
    public function requiresIntervention(): bool
    {
        return in_array($this, [
            self::FATIGUE_MODEREE,
            self::FATIGUE_SEVERE,
            self::SOMNOLENCE_CRITIQUE,
        ]);
    }

    /**
     * Indique si le niveau est critique (alerte externe)
     */
    public function isCritical(): bool
    {
        return $this === self::SOMNOLENCE_CRITIQUE;
    }

    /**
     * Retourne le seuil numérique (pour comparaison)
     */
    public function getThreshold(): int
    {
        return match ($this) {
            self::NORMAL => 0,
            self::FATIGUE_LEGERE => 1,
            self::FATIGUE_MODEREE => 2,
            self::FATIGUE_SEVERE => 3,
            self::SOMNOLENCE_CRITIQUE => 4,
        };
    }

    /**
     * Compare deux niveaux de vigilance
     */
    public function isHigherThan(self $other): bool
    {
        return $this->getThreshold() > $other->getThreshold();
    }

    public function isLowerThan(self $other): bool
    {
        return $this->getThreshold() < $other->getThreshold();
    }

    /**
     * Convertit en format JSON pour l'API
     */
    #[SerializedName('level')]
    #[Groups(['api', 'fatigue_event:read'])]
    public function toJson(): array
    {
        return [
            'value' => $this->value,
            'label' => $this->getLabel(),
            'color' => $this->getColor(),
            'icon' => $this->getIcon(),
            'critical' => $this->isCritical(),
            'threshold' => $this->getThreshold(),
        ];
    }

    /**
     * Création depuis une chaîne (case-insensitive)
     */
    public static function fromString(string $value): ?self
    {
        foreach (self::cases() as $case) {
            if (strcasecmp($case->value, $value) === 0) {
                return $case;
            }
        }
        return null;
    }

    /**
     * Vérifie si la valeur est valide
     */
    public static function isValid(string $value): bool
    {
        return self::fromString($value) !== null;
    }
}