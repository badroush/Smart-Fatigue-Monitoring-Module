<?php

namespace App\Entity;

use App\Repository\UserRepository;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Component\Security\Core\User\PasswordAuthenticatedUserInterface;
use Symfony\Component\Security\Core\User\UserInterface;
use Symfony\Component\Validator\Constraints as Assert;
use Symfony\Bridge\Doctrine\Validator\Constraints\UniqueEntity;

/**
 * Entité abstraite User - Classe de base pour tous les utilisateurs
 */
#[ORM\Entity(repositoryClass: UserRepository::class)]
#[ORM\InheritanceType('JOINED')]
#[ORM\DiscriminatorColumn(name: 'type', type: 'string')]
#[ORM\DiscriminatorMap([
    'supervisor' => ResponsableSupervision::class,
    'admin' => Administrateur::class,
])]
#[ORM\Table(name: 'user')]
#[UniqueEntity(fields: ['email'], message: 'Un utilisateur avec cet email existe déjà')]
abstract class User implements UserInterface, PasswordAuthenticatedUserInterface
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column(type: 'integer')]
    private ?int $id = null;

    #[ORM\Column(type: 'string', length: 180, unique: true)]
    #[Assert\NotBlank(message: 'L\'email est obligatoire')]
    #[Assert\Email(message: 'Email invalide')]
    private string $email;

    #[ORM\Column(type: 'json')]
    private array $roles = [];

    /**
     * Le mot de passe (hashé)
     */
    #[ORM\Column(type: 'string')]
    private string $password;

    #[ORM\Column(type: 'string', length: 100)]
    #[Assert\NotBlank(message: 'Le nom complet est obligatoire')]
    private string $fullName;

    #[ORM\Column(type: 'boolean')]
    private bool $isVerified = false;

    #[ORM\Column(type: 'boolean')]
    private bool $isActive = true;

    #[ORM\Column(type: 'datetime_immutable')]
    private \DateTimeImmutable $createdAt;

    #[ORM\Column(type: 'datetime_immutable', nullable: true)]
    private ?\DateTimeImmutable $lastLoginAt = null;

    public function __construct()
    {
        $this->createdAt = new \DateTimeImmutable();
    }

    public function getId(): ?int
    {
        return $this->id;
    }

    public function getEmail(): string
    {
        return $this->email;
    }

    public function setEmail(string $email): self
    {
        $this->email = $email;
        return $this;
    }

    /**
     * Méthode utilisée par Symfony Security pour identifier l'utilisateur
     */
    public function getUserIdentifier(): string
    {
        return $this->email;
    }

    /**
     * Alias pour rétrocompatibilité
     */
    public function getUsername(): string
    {
        return $this->getUserIdentifier();
    }

    /**
     * Retourne les rôles de l'utilisateur
     * @return string[]
     */
    public function getRoles(): array
    {
        $roles = $this->roles;
        // Garantit que chaque utilisateur a au moins le rôle ROLE_USER
        $roles[] = 'ROLE_USER';
        return array_unique($roles);
    }

    public function setRoles(array $roles): self
    {
        $this->roles = $roles;
        return $this;
    }

    /**
     * Retourne le mot de passe (hashé)
     */
    public function getPassword(): string
    {
        return $this->password;
    }

    public function setPassword(string $password): self
    {
        $this->password = $password;
        return $this;
    }

    /**
     * Utilisé par Symfony Security pour effacer les données sensibles après authentification
     */
    public function eraseCredentials(): void
    {
        // Pas nécessaire ici
    }

    public function getFullName(): string
    {
        return $this->fullName;
    }

    public function setFullName(string $fullName): self
    {
        $this->fullName = $fullName;
        return $this;
    }

    public function isVerified(): bool
    {
        return $this->isVerified;
    }

    public function setVerified(bool $isVerified): self
    {
        $this->isVerified = $isVerified;
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

    public function getCreatedAt(): \DateTimeImmutable
    {
        return $this->createdAt;
    }

    public function getLastLoginAt(): ?\DateTimeImmutable
    {
        return $this->lastLoginAt;
    }

    public function setLastLoginAt(?\DateTimeImmutable $lastLoginAt): self
    {
        $this->lastLoginAt = $lastLoginAt;
        return $this;
    }

    /**
     * Retourne le type d'utilisateur (pour l'UI)
     */
    abstract public function getUserType(): string;

    /**
     * Vérifie si l'utilisateur est un responsable de supervision
     */
    public function isSupervisor(): bool
    {
        return $this instanceof ResponsableSupervision;
    }

    /**
     * Vérifie si l'utilisateur est un administrateur
     */
    public function isAdmin(): bool
    {
        return $this instanceof Administrateur;
    }

    /**
     * Retourne le libellé du rôle principal
     */
    public function getRoleLabel(): string
    {
        if ($this->isSupervisor()) {
            return 'Responsable de Supervision';
        }
        if ($this->isAdmin()) {
            return 'Administrateur';
        }
        return 'Utilisateur';
    }

    /**
     * Vérifie si l'utilisateur a un rôle spécifique
     */
    public function hasRole(string $role): bool
    {
        return in_array($role, $this->getRoles());
    }

    /**
     * Ajoute un rôle à l'utilisateur
     */
    public function addRole(string $role): self
    {
        if (!in_array($role, $this->roles)) {
            $this->roles[] = $role;
        }
        return $this;
    }

    /**
     * Supprime un rôle de l'utilisateur
     */
    public function removeRole(string $role): self
    {
        $this->roles = array_filter($this->roles, fn($r) => $r !== $role);
        return $this;
    }

    /**
     * Retourne true si l'utilisateur peut accéder au backend
     */
    public function canAccessBackend(): bool
    {
        return $this->isActive() && $this->isVerified();
    }

    /**
     * Retourne un tableau pour la sérialisation JSON
     */
    public function toArray(): array
    {
        return [
            'id' => $this->id,
            'email' => $this->email,
            'fullName' => $this->fullName,
            'roles' => $this->getRoles(),
            'type' => $this->getUserType(),
            'isActive' => $this->isActive(),
            'isVerified' => $this->isVerified(),
            'createdAt' => $this->createdAt->format('Y-m-d H:i:s'),
            'lastLoginAt' => $this->lastLoginAt?->format('Y-m-d H:i:s'),
        ];
    }

    public function __toString(): string
    {
        return $this->fullName . ' (' . $this->email . ')';
    }
}