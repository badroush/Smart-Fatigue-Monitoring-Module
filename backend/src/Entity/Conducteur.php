<?php

namespace App\Entity;

use App\Repository\ConducteurRepository;
use Doctrine\Common\Collections\ArrayCollection;
use Doctrine\Common\Collections\Collection;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Component\Uid\Uuid;
use Symfony\Component\Validator\Constraints as Assert;

/**
 * Conducteur - Représente un chauffeur surveillé par le système SFAM
 */
#[ORM\Entity(repositoryClass: ConducteurRepository::class)]
#[ORM\Table(name: 'conducteur')]
class Conducteur
{
    #[ORM\Id]
    #[ORM\Column(type: 'uuid', unique: true)]
    #[ORM\GeneratedValue(strategy: 'CUSTOM')]
    #[ORM\CustomIdGenerator(class: 'doctrine.uuid_generator')]
    private Uuid $id;

    #[ORM\Column(type: 'string', length: 100)]
    #[Assert\NotBlank(message: 'Le nom du conducteur est obligatoire')]
    #[Assert\Length(min: 2, max: 100, minMessage: 'Le nom doit contenir au moins 2 caractères')]
    private string $nom;

    #[ORM\Column(type: 'string', length: 50, unique: true)]
    #[Assert\NotBlank(message: 'Le numéro de permis est obligatoire')]
    #[Assert\Length(min: 5, max: 50, minMessage: 'Numéro de permis invalide')]
    private string $numeroPermis;

    #[ORM\Column(type: 'string', length: 20, nullable: true)]
    private ?string $telephone = null;

    #[ORM\Column(type: 'date', nullable: true)]
    private ?\DateTimeInterface $dateNaissance = null;

    #[ORM\Column(type: 'string', length: 100, nullable: true)]
    private ?string $adresse = null;

    #[ORM\Column(type: 'boolean')]
    private bool $isActive = true;

    #[ORM\Column(type: 'integer', options: ['default' => 0])]
    private int $totalAlertes = 0;

    #[ORM\Column(type: 'integer', options: ['default' => 0])]
    private int $totalEvenementsFatigue = 0;

    #[ORM\Column(type: 'datetime_immutable')]
    private \DateTimeImmutable $createdAt;

    #[ORM\Column(type: 'datetime_immutable', nullable: true)]
    private ?\DateTimeImmutable $lastFatigueEventAt = null;

    /**
     * Relation ManyToOne avec Vehicule
     * Un conducteur peut être assigné à un seul véhicule à la fois
     */
    #[ORM\ManyToOne(targetEntity: Vehicule::class, inversedBy: 'conducteurs')]
    #[ORM\JoinColumn(nullable: true, onDelete: 'SET NULL')]
    private ?Vehicule $vehiculeAssigne = null;

    /**
     * Relation OneToMany avec FatigueEvent
     * Un conducteur peut avoir plusieurs événements de fatigue
     */
    #[ORM\OneToMany(targetEntity: FatigueEvent::class, mappedBy: 'conducteur', cascade: ['persist'], orphanRemoval: true)]
    #[ORM\OrderBy(['debut' => 'DESC'])]
    private Collection $historiqueFatigue;

    /**
     * Relation OneToMany avec Alerte
     * Un conducteur peut recevoir plusieurs alertes
     */
    #[ORM\OneToMany(targetEntity: Alerte::class, mappedBy: 'conducteur', cascade: ['persist'], orphanRemoval: true)]
    #[ORM\OrderBy(['horodatage' => 'DESC'])]
    private Collection $alertesRecues;

    public function __construct()
    {
        $this->id = Uuid::v4();
        $this->createdAt = new \DateTimeImmutable();
        $this->historiqueFatigue = new ArrayCollection();
        $this->alertesRecues = new ArrayCollection();
        $this->totalAlertes = 0;
        $this->totalEvenementsFatigue = 0;
        $this->lastFatigueEventAt = null;
        $this->createdAt = new \DateTimeImmutable();
        $this->updatedAt = new \DateTimeImmutable();
        
    }

    public function getId(): Uuid
    {
        return $this->id;
    }

    public function getNom(): string
    {
        return $this->nom;
    }

    public function setNom(string $nom): self
    {
        $this->nom = $nom;
        return $this;
    }

    public function getNumeroPermis(): string
    {
        return $this->numeroPermis;
    }

    public function setNumeroPermis(string $numeroPermis): self
    {
        $this->numeroPermis = $numeroPermis;
        return $this;
    }

    public function getTelephone(): ?string
    {
        return $this->telephone;
    }

    public function setTelephone(?string $telephone): self
    {
        $this->telephone = $telephone;
        return $this;
    }

    public function getDateNaissance(): ?\DateTimeInterface
    {
        return $this->dateNaissance;
    }

    public function setDateNaissance(?\DateTimeInterface $dateNaissance): self
    {
        $this->dateNaissance = $dateNaissance;
        return $this;
    }

    public function getAdresse(): ?string
    {
        return $this->adresse;
    }

    public function setAdresse(?string $adresse): self
    {
        $this->adresse = $adresse;
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

    public function getTotalAlertes(): int
    {
        return $this->totalAlertes;
    }

    public function incrementTotalAlertes(): self
    {
        $this->totalAlertes++;
        return $this;
    }

    public function getTotalEvenementsFatigue(): int
    {
        return $this->totalEvenementsFatigue;
    }

    public function incrementTotalEvenementsFatigue(): self
    {
        $this->totalEvenementsFatigue++;
        return $this;
    }

    public function getCreatedAt(): \DateTimeImmutable
    {
        return $this->createdAt;
    }

    public function getLastFatigueEventAt(): ?\DateTimeImmutable
    {
        return $this->lastFatigueEventAt;
    }

    public function setLastFatigueEventAt(?\DateTimeImmutable $lastFatigueEventAt): self
    {
        $this->lastFatigueEventAt = $lastFatigueEventAt;
        return $this;
    }

    /**
     * Retourne le véhicule actuellement assigné au conducteur
     */
    public function getVehiculeAssigne(): ?Vehicule
    {
        return $this->vehiculeAssigne;
    }

    /**
     * Assigne un véhicule au conducteur
     */
    public function setVehiculeAssigne(?Vehicule $vehiculeAssigne): self
    {
        // Désassigner l'ancien véhicule si différent
        if ($this->vehiculeAssigne !== null && $this->vehiculeAssigne !== $vehiculeAssigne) {
            $this->vehiculeAssigne->removeConducteur($this);
        }

        // Assigner le nouveau véhicule
        $this->vehiculeAssigne = $vehiculeAssigne;

        // Ajouter le conducteur au véhicule si non null
        if ($vehiculeAssigne !== null && !$vehiculeAssigne->getConducteurs()->contains($this)) {
            $vehiculeAssigne->addConducteur($this);
        }

        return $this;
    }

    /**
     * Retourne l'historique des événements de fatigue
     * @return Collection<int, FatigueEvent>
     */
    public function getHistoriqueFatigue(): Collection
    {
        return $this->historiqueFatigue;
    }

    /**
     * Ajoute un événement de fatigue à l'historique
     */
    public function addFatigueEvent(FatigueEvent $fatigueEvent): self
    {
        if (!$this->historiqueFatigue->contains($fatigueEvent)) {
            $this->historiqueFatigue->add($fatigueEvent);
            $fatigueEvent->setConducteur($this);
            $this->incrementTotalEvenementsFatigue();
            $this->setLastFatigueEventAt($fatigueEvent->getDebut());
        }
        return $this;
    }

    /**
     * Supprime un événement de fatigue de l'historique
     */
    public function removeFatigueEvent(FatigueEvent $fatigueEvent): self
    {
        if ($this->historiqueFatigue->removeElement($fatigueEvent)) {
            // set the owning side to null (unless already changed)
            if ($fatigueEvent->getConducteur() === $this) {
                $fatigueEvent->setConducteur(null);
            }
        }
        return $this;
    }

    /**
     * Retourne les alertes reçues par le conducteur
     * @return Collection<int, Alerte>
     */
    public function getAlertesRecues(): Collection
    {
        return $this->alertesRecues;
    }

    /**
     * Ajoute une alerte à la liste des alertes reçues
     */
    public function addAlerteRecue(Alerte $alerte): self
    {
        if (!$this->alertesRecues->contains($alerte)) {
            $this->alertesRecues->add($alerte);
            $alerte->setConducteur($this);
            $this->incrementTotalAlertes();
        }
        return $this;
    }

    /**
     * Supprime une alerte de la liste
     */
    public function removeAlerteRecue(Alerte $alerte): self
    {
        if ($this->alertesRecues->removeElement($alerte)) {
            if ($alerte->getConducteur() === $this) {
                $alerte->setConducteur(null);
            }
        }
        return $this;
    }

    /**
     * Vérifie si le conducteur est actuellement en état de fatigue
     * (dernier événement de fatigue dans les 30 dernières minutes)
     */
    public function estFatigue(): bool
    {
        if ($this->lastFatigueEventAt === null) {
            return false;
        }

        $thirtyMinutesAgo = (new \DateTimeImmutable())->modify('-30 minutes');
        return $this->lastFatigueEventAt > $thirtyMinutesAgo;
    }

    /**
     * Notifie le conducteur d'une alerte
     */
    public function notifierAlerte(Alerte $alerte): void
    {
        $this->addAlerteRecue($alerte);
    }

    /**
     * Retourne le nombre d'événements de fatigue dans une période donnée
     */
    public function countFatigueEventsInPeriod(\DateTimeInterface $start, \DateTimeInterface $end): int
    {
        $count = 0;
        foreach ($this->historiqueFatigue as $event) {
            if ($event->getDebut() >= $start && $event->getDebut() <= $end) {
                $count++;
            }
        }
        return $count;
    }

    /**
     * Retourne le niveau de vigilance maximal atteint par le conducteur
     */
    public function getNiveauVigilanceMax(): ?string
    {
        if ($this->historiqueFatigue->isEmpty()) {
            return null;
        }

        $maxLevel = 'NORMAL';
        $levelOrder = [
            'NORMAL' => 0,
            'FATIGUE_LEGERE' => 1,
            'FATIGUE_MODEREE' => 2,
            'FATIGUE_SEVERE' => 3,
            'SOMNOLENCE_CRITIQUE' => 4,
        ];

        foreach ($this->historiqueFatigue as $event) {
            $eventLevel = $event->getNiveauMax()->value;
            if ($levelOrder[$eventLevel] > $levelOrder[$maxLevel]) {
                $maxLevel = $eventLevel;
            }
        }

        return $maxLevel;
    }

    /**
     * Retourne les statistiques du conducteur
     */
    public function getStatistiques(): array
    {
        return [
            'total_alertes' => $this->totalAlertes,
            'total_evenements_fatigue' => $this->totalEvenementsFatigue,
            'est_actuellement_fatigue' => $this->estFatigue(),
            'niveau_vigilance_max' => $this->getNiveauVigilanceMax(),
            'dernier_evenement' => $this->lastFatigueEventAt?->format('Y-m-d H:i:s'),
            'nombre_alertes_30_jours' => $this->countFatigueEventsInPeriod(
                (new \DateTime())->modify('-30 days'),
                new \DateTime()
            ),
        ];
    }

    /**
     * Retourne un tableau pour la sérialisation JSON
     */
    public function toArray(): array
    {
        return [
            'id' => $this->id->toString(),
            'nom' => $this->nom,
            'numeroPermis' => $this->numeroPermis,
            'telephone' => $this->telephone,
            'dateNaissance' => $this->dateNaissance?->format('Y-m-d'),
            'adresse' => $this->adresse,
            'isActive' => $this->isActive,
            'totalAlertes' => $this->totalAlertes,
            'totalEvenementsFatigue' => $this->totalEvenementsFatigue,
            'createdAt' => $this->createdAt->format('Y-m-d H:i:s'),
            'lastFatigueEventAt' => $this->lastFatigueEventAt?->format('Y-m-d H:i:s'),
            'vehiculeAssigne' => $this->vehiculeAssigne?->toArray(),
            'estFatigue' => $this->estFatigue(),
            'statistiques' => $this->getStatistiques(),
        ];
    }

    public function __toString(): string
    {
        return $this->nom . ' (' . $this->numeroPermis . ')';
    }
}