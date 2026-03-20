<?php

namespace App\Service;

use App\Entity\LocalisationGPS;
use Symfony\Contracts\HttpClient\HttpClientInterface;

class GeocodingService
{
    private const NOMINATIM_URL = 'https://nominatim.openstreetmap.org';

    public function __construct(private HttpClientInterface $httpClient) {}

    /**
     * Convertit des coordonnées GPS en adresse (reverse geocoding)
     */
    public function reverseGeocode(float $latitude, float $longitude): ?array
    {
        try {
            $response = $this->httpClient->request('GET', self::NOMINATIM_URL . '/reverse', [
                'query' => [
                    'format' => 'json',
                    'lat' => $latitude,
                    'lon' => $longitude,
                    'accept-language' => 'fr',
                ],
                'headers' => [
                    'User-Agent' => 'SFAM-PFE/1.0',
                ],
            ]);

            $data = $response->toArray();

            return [
                'adresse' => $data['display_name'] ?? null,
                'pays' => $data['address']['country'] ?? null,
                'ville' => $data['address']['city'] ?? $data['address']['town'] ?? null,
                'codePostal' => $data['address']['postcode'] ?? null,
            ];
        } catch (\Exception $e) {
            return null;
        }
    }

    /**
     * Convertit une adresse en coordonnées GPS (forward geocoding)
     */
    public function forwardGeocode(string $address): ?array
    {
        try {
            $response = $this->httpClient->request('GET', self::NOMINATIM_URL . '/search', [
                'query' => [
                    'format' => 'json',
                    'q' => $address,
                    'accept-language' => 'fr',
                    'limit' => 1,
                ],
                'headers' => [
                    'User-Agent' => 'SFAM-PFE/1.0',
                ],
            ]);

            $data = $response->toArray();

            if (empty($data)) {
                return null;
            }

            return [
                'latitude' => (float) $data[0]['lat'],
                'longitude' => (float) $data[0]['lon'],
                'adresse' => $data[0]['display_name'] ?? null,
            ];
        } catch (\Exception $e) {
            return null;
        }
    }

    /**
     * Met à jour une localisation avec les données de géocodage
     */
    public function enrichLocation(LocalisationGPS $location): void
    {
        $result = $this->reverseGeocode($location->getLatitude(), $location->getLongitude());

        if ($result) {
            if (isset($result['adresse'])) {
                $location->setAdresse($result['adresse']);
            }
            if (isset($result['pays'])) {
                $location->setPays($result['pays']);
            }
            if (isset($result['ville'])) {
                $location->setVille($result['ville']);
            }
            if (isset($result['codePostal'])) {
                $location->setCodePostal($result['codePostal']);
            }
        }
    }
}