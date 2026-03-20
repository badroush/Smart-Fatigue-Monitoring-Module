<?php

namespace App\Entity;

use App\Repository\AdministrateurRepository;
use Doctrine\ORM\Mapping as ORM;

/**
 * Administrateur - Gère la configuration du système
 */
#[ORM\Entity(repositoryClass: AdministrateurRepository::class)]
#[ORM\Table(name: 'administrateur')]
class Administrateur extends User
{
    #[ORM\Column(type: 'string', length: 100, nullable: true)]
    private ?string $position = null;

    #[ORM\Column(type: 'json')]
    private array $managedModules = [
        'drivers',
        'vehicles',
        'thresholds',
        'users',
        'reports',
    ];

    #[ORM\Column(type: 'boolean')]
    private bool $canConfigureThresholds = true;

    #[ORM\Column(type: 'boolean')]
    private bool $canManageUsers = true;

    #[ORM\Column(type: 'boolean')]
    private bool $canExportReports = true;

    #[ORM\Column(type: 'datetime_immutable', nullable: true)]
    private ?\DateTimeImmutable $lastConfigurationChange = null;

    public function __construct()
    {
        parent::__construct();
        $this->addRole('ROLE_ADMIN');
        $this->addRole('ROLE_SUPERVISOR'); // Admin a aussi les droits de superviseur
    }

    public function getUserType(): string
    {
        return 'admin';
    }

    public function getPosition(): ?string
    {
        return $this->position;
    }

    public function setPosition(?string $position): self
    {
        $this->position = $position;
        return $this;
    }

    public function getManagedModules(): array
    {
        return $this->managedModules;
    }

    public function setManagedModules(array $managedModules): self
    {
        $this->managedModules = $managedModules;
        return $this;
    }

    public function addManagedModule(string $module): self
    {
        if (!in_array($module, $this->managedModules)) {
            $this->managedModules[] = $module;
        }
        return $this;
    }

    public function removeManagedModule(string $module): self
    {
        $this->managedModules = array_filter($this->managedModules, fn($m) => $m !== $module);
        return $this;
    }

    public function canConfigureThresholds(): bool
    {
        return $this->canConfigureThresholds;
    }

    public function setCanConfigureThresholds(bool $canConfigureThresholds): self
    {
        $this->canConfigureThresholds = $canConfigureThresholds;
        return $this;
    }

    public function canManageUsers(): bool
    {
        return $this->canManageUsers;
    }

    public function setCanManageUsers(bool $canManageUsers): self
    {
        $this->canManageUsers = $canManageUsers;
        return $this;
    }

    public function canExportReports(): bool
    {
        return $this->canExportReports;
    }

    public function setCanExportReports(bool $canExportReports): self
    {
        $this->canExportReports = $canExportReports;
        return $this;
    }

    public function getLastConfigurationChange(): ?\DateTimeImmutable
    {
        return $this->lastConfigurationChange;
    }

    public function setLastConfigurationChange(?\DateTimeImmutable $lastConfigurationChange): self
    {
        $this->lastConfigurationChange = $lastConfigurationChange;
        return $this;
    }

    /**
     * Enregistre un changement de configuration
     */
    public function recordConfigurationChange(): self
    {
        $this->lastConfigurationChange = new \DateTimeImmutable();
        return $this;
    }

    /**
     * Vérifie si l'administrateur a accès à un module spécifique
     */
    public function hasAccessToModule(string $module): bool
    {
        return in_array($module, $this->managedModules);
    }

    /**
     * Retourne les permissions sous forme de tableau
     */
    public function getPermissions(): array
    {
        return [
            'configure_thresholds' => $this->canConfigureThresholds(),
            'manage_users' => $this->canManageUsers(),
            'export_reports' => $this->canExportReports(),
            'managed_modules' => $this->managedModules,
        ];
    }
}