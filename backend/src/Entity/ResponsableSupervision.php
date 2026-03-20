<?php

namespace App\Entity;

use App\Repository\ResponsableSupervisionRepository;
use Doctrine\ORM\Mapping as ORM;

/**
 * Responsable de supervision - Surveille la flotte en temps réel
 */
#[ORM\Entity(repositoryClass: ResponsableSupervisionRepository::class)]
#[ORM\Table(name: 'responsable_supervision')]
class ResponsableSupervision extends User
{
    #[ORM\Column(type: 'string', length: 50, nullable: true)]
    private ?string $phoneNumber = null;

    #[ORM\Column(type: 'string', length: 100, nullable: true)]
    private ?string $department = null;

    #[ORM\Column(type: 'boolean')]
    private bool $receivesCriticalAlerts = true;

    #[ORM\Column(type: 'boolean')]
    private bool $receivesSmsNotifications = true;

    #[ORM\Column(type: 'string', length: 255, nullable: true)]
    private ?string $notificationEmail = null;

    public function __construct()
    {
        parent::__construct();
        $this->addRole('ROLE_SUPERVISOR');
    }

    public function getUserType(): string
    {
        return 'supervisor';
    }

    public function getPhoneNumber(): ?string
    {
        return $this->phoneNumber;
    }

    public function setPhoneNumber(?string $phoneNumber): self
    {
        $this->phoneNumber = $phoneNumber;
        return $this;
    }

    public function getDepartment(): ?string
    {
        return $this->department;
    }

    public function setDepartment(?string $department): self
    {
        $this->department = $department;
        return $this;
    }

    public function isReceivesCriticalAlerts(): bool
    {
        return $this->receivesCriticalAlerts;
    }

    public function setReceivesCriticalAlerts(bool $receivesCriticalAlerts): self
    {
        $this->receivesCriticalAlerts = $receivesCriticalAlerts;
        return $this;
    }

    public function isReceivesSmsNotifications(): bool
    {
        return $this->receivesSmsNotifications;
    }

    public function setReceivesSmsNotifications(bool $receivesSmsNotifications): self
    {
        $this->receivesSmsNotifications = $receivesSmsNotifications;
        return $this;
    }

    public function getNotificationEmail(): ?string
    {
        return $this->notificationEmail ?? $this->getEmail();
    }

    public function setNotificationEmail(?string $notificationEmail): self
    {
        $this->notificationEmail = $notificationEmail;
        return $this;
    }

    /**
     * Retourne les préférences de notification sous forme de tableau
     */
    public function getNotificationPreferences(): array
    {
        return [
            'critical_alerts' => $this->receivesCriticalAlerts,
            'sms' => $this->receivesSmsNotifications,
            'email' => $this->getNotificationEmail(),
            'phone' => $this->phoneNumber,
        ];
    }

    /**
     * Vérifie si le responsable doit être notifié pour un événement critique
     */
    public function shouldNotifyForCriticalEvent(): bool
    {
        return $this->isActive() && $this->isVerified() && $this->receivesCriticalAlerts;
    }
}