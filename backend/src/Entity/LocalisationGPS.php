<?php

namespace App\Entity;

use App\Repository\LocalisationGPSRepository;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Component\Uid\Uuid;
use Symfony\Component\Validator\Constraints as Assert;

/**
 * LocalisationGPS - Représente une position géographique à un instant donné
 */
#[ORM\Entity(repositoryClass: LocalisationGPSRepository::class)]
#[ORM\Table(name: 'localisation_gps')]
class LocalisationGPS
{
    #[ORM\Id]
    #[ORM\Column(type: 'uuid', unique: true)]
    #[ORM\GeneratedValue(strategy: 'CUSTOM')]
    #[ORM\CustomIdGenerator(class: 'doctrine.uuid_generator')]
    private Uuid $id;

    #[ORM\Column(type: 'float')]
    #[Assert\NotBlank(message: 'La latitude est obligatoire')]
    #[Assert\Range(min: -90, max: 90, minMessage: 'Latitude invalide', maxMessage: 'Latitude invalide')]
    private float $latitude;

    #[ORM\Column(type: 'float')]
    #[Assert\NotBlank(message: 'La longitude est obligatoire')]
    #[Assert\Range(min: -180, max: 180, minMessage: 'Longitude invalide', maxMessage: 'Longitude invalide')]
    private float $longitude;

    #[ORM\Column(type: 'float', nullable: true)]
    private ?float $altitude = null;

    #[ORM\Column(name: 'gps_precision', type: 'float', nullable: true)]
private ?float $gpsPrecision = null;

    #[ORM\Column(type: 'datetime_immutable')]
    private \DateTimeImmutable $horodatage;

    #[ORM\Column(type: 'string', length: 50, nullable: true)]
    private ?string $adresse = null;

    #[ORM\Column(type: 'string', length: 10, nullable: true)]
    private ?string $pays = null;

    #[ORM\Column(type: 'string', length: 50, nullable: true)]
    private ?string $ville = null;

    #[ORM\Column(type: 'string', length: 100, nullable: true)]
    private ?string $codePostal = null;

    public function __construct()
    {
        $this->id = Uuid::v4();
        $this->horodatage = new \DateTimeImmutable();
    }

    public function getId(): Uuid
    {
        return $this->id;
    }

    public function getLatitude(): float
    {
        return $this->latitude;
    }

    public function setLatitude(float $latitude): self
    {
        $this->latitude = $latitude;
        return $this;
    }

    public function getLongitude(): float
    {
        return $this->longitude;
    }

    public function setLongitude(float $longitude): self
    {
        $this->longitude = $longitude;
        return $this;
    }

    public function getAltitude(): ?float
    {
        return $this->altitude;
    }

    public function setAltitude(?float $altitude): self
    {
        $this->altitude = $altitude;
        return $this;
    }

    public function getGpsPrecision(): ?float
    {
        return $this->gpsPrecision;
    }

    public function setGpsPrecision(?float $gpsPrecision): self
    {
        $this->gpsPrecision = $gpsPrecision;
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

    public function getAdresse(): ?string
    {
        return $this->adresse;
    }

    public function setAdresse(?string $adresse): self
    {
        $this->adresse = $adresse;
        return $this;
    }

    public function getPays(): ?string
    {
        return $this->pays;
    }

    public function setPays(?string $pays): self
    {
        $this->pays = $pays;
        return $this;
    }

    public function getVille(): ?string
    {
        return $this->ville;
    }

    public function setVille(?string $ville): self
    {
        $this->ville = $ville;
        return $this;
    }

    public function getCodePostal(): ?string
    {
        return $this->codePostal;
    }

    public function setCodePostal(?string $codePostal): self
    {
        $this->codePostal = $codePostal;
        return $this;
    }

    /**
     * Retourne les coordonnées sous forme de tableau
     */
    public function getCoordinates(): array
    {
        return [
            'latitude' => $this->latitude,
            'longitude' => $this->longitude,
            'altitude' => $this->altitude,
            'precision' => $this->gpsPrecision,
        ];
    }

    /**
     * Calcule la distance entre deux points GPS (formule de Haversine)
     * Retourne la distance en kilomètres
     */
    public function distanceTo(self $other): float
    {
        $earthRadius = 6371; // Rayon de la Terre en km

        $lat1 = deg2rad($this->latitude);
        $lon1 = deg2rad($this->longitude);
        $lat2 = deg2rad($other->getLatitude());
        $lon2 = deg2rad($other->getLongitude());

        $dLat = $lat2 - $lat1;
        $dLon = $lon2 - $lon1;

        $a = sin($dLat / 2) * sin($dLat / 2) +
             cos($lat1) * cos($lat2) *
             sin($dLon / 2) * sin($dLon / 2);

        $c = 2 * atan2(sqrt($a), sqrt(1 - $a));

        return $earthRadius * $c;
    }

    /**
     * Vérifie si deux localisations sont proches (dans un rayon donné)
     * @param float $radius Rayon en kilomètres
     */
    public function isNear(self $other, float $radius = 0.1): bool
    {
        return $this->distanceTo($other) <= $radius;
    }

    /**
     * Retourne l'URL Google Maps pour cette localisation
     */
    public function getGoogleMapsUrl(): string
    {
        return sprintf(
            'https://www.google.com/maps?q=%s,%s',
            $this->latitude,
            $this->longitude
        );
    }

    /**
     * Retourne le lien Google Maps pour les directions
     */
    public function getGoogleMapsDirectionsUrl(self $destination): string
    {
        return sprintf(
            'https://www.google.com/maps/dir/%s,%s/%s,%s',
            $this->latitude,
            $this->longitude,
            $destination->getLatitude(),
            $destination->getLongitude()
        );
    }

    /**
     * Retourne une chaîne formatée pour l'affichage
     */
    public function getFormattedAddress(): string
    {
        if ($this->adresse) {
            return $this->adresse;
        }

        $parts = [];
        if ($this->ville) {
            $parts[] = $this->ville;
        }
        if ($this->pays) {
            $parts[] = $this->pays;
        }

        if (empty($parts)) {
            return sprintf('Lat: %.6f, Lng: %.6f', $this->latitude, $this->longitude);
        }

        return implode(', ', $parts);
    }

    /**
     * Vérifie si la localisation est en Tunisie (approximatif)
     */
    public function isTunisia(): bool
    {
        return $this->latitude >= 30 && $this->latitude <= 38 &&
               $this->longitude >= 7 && $this->longitude <= 12;
    }

    /**
     * Retourne le code pays ISO (approximatif basé sur longitude/latitude)
     */
    public function getCountryCode(): string
    {
        if ($this->isTunisia()) {
            return 'TN';
        }
        return 'XX'; // Inconnu
    }

    /**
     * Retourne un tableau pour la sérialisation JSON
     */
    public function toArray(): array
    {
        return [
            'id' => $this->id->toString(),
            'latitude' => $this->latitude,
            'longitude' => $this->longitude,
            'altitude' => $this->altitude,
            'precision' => $this->gpsPrecision,
            'horodatage' => $this->horodatage->format('Y-m-d H:i:s'),
            'adresse' => $this->adresse,
            'pays' => $this->pays,
            'ville' => $this->ville,
            'codePostal' => $this->codePostal,
            'googleMapsUrl' => $this->getGoogleMapsUrl(),
            'formattedAddress' => $this->getFormattedAddress(),
        ];
    }

    public function __toString(): string
    {
        return sprintf('GPS: %.6f, %.6f (%s)', $this->latitude, $this->longitude, $this->horodatage->format('d/m/Y H:i'));
    }
}