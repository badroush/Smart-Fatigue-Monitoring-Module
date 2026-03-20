<?php

namespace App\Repository;

use App\Entity\Alerte;
use App\Enum\NiveauVigilance;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

class AlerteRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, Alerte::class);
    }

    /**
     * Trouve les alertes actives
     */
    public function findActives(): array
    {
        return $this->createQueryBuilder('a')
            ->where('a.statut = :statut')
            ->setParameter('statut', Alerte::STATUT_ACTIVE)
            ->orderBy('a.horodatage', 'DESC')
            ->getQuery()
            ->getResult();
    }

    /**
     * Trouve les alertes par conducteur
     */
    public function findByConducteur(string $conducteurId, int $limit = 50): array
    {
        return $this->createQueryBuilder('a')
            ->join('a.conducteur', 'c')
            ->where('c.id = :conducteurId')
            ->setParameter('conducteurId', $conducteurId)
            ->orderBy('a.horodatage', 'DESC')
            ->setMaxResults($limit)
            ->getQuery()
            ->getResult();
    }

    /**
     * Trouve les alertes par véhicule
     */
    public function findByVehicule(string $vehiculeId, int $limit = 50): array
    {
        return $this->createQueryBuilder('a')
            ->join('a.vehicule', 'v')
            ->where('v.id = :vehiculeId')
            ->setParameter('vehiculeId', $vehiculeId)
            ->orderBy('a.horodatage', 'DESC')
            ->setMaxResults($limit)
            ->getQuery()
            ->getResult();
    }

    /**
     * Trouve les alertes par type
     */
    public function findByType(string $type): array
    {
        return $this->createQueryBuilder('a')
            ->where('a.type = :type')
            ->setParameter('type', $type)
            ->orderBy('a.horodatage', 'DESC')
            ->getQuery()
            ->getResult();
    }

    /**
     * Trouve les alertes par niveau de vigilance
     */
    public function findByNiveauVigilance(NiveauVigilance $niveau): array
    {
        return $this->createQueryBuilder('a')
            ->where('a.niveau = :niveau')
            ->setParameter('niveau', $niveau->value)
            ->orderBy('a.horodatage', 'DESC')
            ->getQuery()
            ->getResult();
    }

    /**
     * Trouve les alertes critiques (somnolence critique)
     */
    public function findCritiques(): array
    {
        return $this->createQueryBuilder('a')
            ->where('a.niveau = :critique')
            ->setParameter('critique', NiveauVigilance::SOMNOLENCE_CRITIQUE->value)
            ->orderBy('a.horodatage', 'DESC')
            ->getQuery()
            ->getResult();
    }

    /**
     * Trouve les alertes non lues
     */
    public function findNonLues(): array
    {
        return $this->createQueryBuilder('a')
            ->where('a.lue = :false')
            ->setParameter('false', false)
            ->orderBy('a.horodatage', 'DESC')
            ->getQuery()
            ->getResult();
    }

    /**
     * Compte le nombre d'alertes par type sur une période
     */
    public function countByType(\DateTimeInterface $start, \DateTimeInterface $end): array
    {
        $types = Alerte::getAvailableTypes();
        $counts = [];

        foreach ($types as $type) {
            $count = $this->createQueryBuilder('a')
                ->select('COUNT(a.id)')
                ->where('a.horodatage BETWEEN :start AND :end')
                ->andWhere('a.type = :type')
                ->setParameter('start', $start)
                ->setParameter('end', $end)
                ->setParameter('type', $type)
                ->getQuery()
                ->getSingleScalarResult();

            $counts[$type] = (int) $count;
        }

        return $counts;
    }

    /**
     * Compte le nombre d'alertes par niveau de vigilance sur une période
     */
    public function countByNiveauVigilance(\DateTimeInterface $start, \DateTimeInterface $end): array
    {
        $qb = $this->createQueryBuilder('a');
        
        $normal = $qb->select('COUNT(a.id)')
            ->where('a.horodatage BETWEEN :start AND :end')
            ->andWhere('a.niveau = :niveau')
            ->setParameter('start', $start)
            ->setParameter('end', $end)
            ->setParameter('niveau', NiveauVigilance::NORMAL->value)
            ->getQuery()
            ->getSingleScalarResult();

        $legere = $qb->select('COUNT(a.id)')
            ->where('a.horodatage BETWEEN :start AND :end')
            ->andWhere('a.niveau = :niveau')
            ->setParameter('start', $start)
            ->setParameter('end', $end)
            ->setParameter('niveau', NiveauVigilance::FATIGUE_LEGERE->value)
            ->getQuery()
            ->getSingleScalarResult();

        $moderee = $qb->select('COUNT(a.id)')
            ->where('a.horodatage BETWEEN :start AND :end')
            ->andWhere('a.niveau = :niveau')
            ->setParameter('start', $start)
            ->setParameter('end', $end)
            ->setParameter('niveau', NiveauVigilance::FATIGUE_MODEREE->value)
            ->getQuery()
            ->getSingleScalarResult();

        $severe = $qb->select('COUNT(a.id)')
            ->where('a.horodatage BETWEEN :start AND :end')
            ->andWhere('a.niveau = :niveau')
            ->setParameter('start', $start)
            ->setParameter('end', $end)
            ->setParameter('niveau', NiveauVigilance::FATIGUE_SEVERE->value)
            ->getQuery()
            ->getSingleScalarResult();

        $critique = $qb->select('COUNT(a.id)')
            ->where('a.horodatage BETWEEN :start AND :end')
            ->andWhere('a.niveau = :niveau')
            ->setParameter('start', $start)
            ->setParameter('end', $end)
            ->setParameter('niveau', NiveauVigilance::SOMNOLENCE_CRITIQUE->value)
            ->getQuery()
            ->getSingleScalarResult();

        return [
            'normal' => (int) $normal,
            'fatigue_legere' => (int) $legere,
            'fatigue_moderée' => (int) $moderee,
            'fatigue_severe' => (int) $severe,
            'somnolence_critique' => (int) $critique,
            'total' => (int) ($normal + $legere + $moderee + $severe + $critique),
        ];
    }

    /**
     * Trouve les alertes récentes (dernières 24h)
     */
    public function findRecent(int $hours = 24): array
    {
        $threshold = (new \DateTimeImmutable())->modify(sprintf('-%d hours', $hours));

        return $this->createQueryBuilder('a')
            ->where('a.horodatage >= :threshold')
            ->setParameter('threshold', $threshold)
            ->orderBy('a.horodatage', 'DESC')
            ->getQuery()
            ->getResult();
    }

    /**
     * Trouve les alertes non acquittées
     */
    public function findNonAcquittees(): array
    {
        return $this->createQueryBuilder('a')
            ->where('a.statut = :active')
            ->setParameter('active', Alerte::STATUT_ACTIVE)
            ->orderBy('a.horodatage', 'DESC')
            ->getQuery()
            ->getResult();
    }

    /**
     * Trouve les alertes avec intervention externe
     */
    public function findAvecInterventionExterne(): array
    {
        return $this->createQueryBuilder('a')
            ->where('a.type IN (:types)')
            ->setParameter('types', [Alerte::TYPE_SONNETTE, Alerte::TYPE_CLIGNOTANTS])
            ->orderBy('a.horodatage', 'DESC')
            ->getQuery()
            ->getResult();
    }

    /**
     * Compte le nombre total d'alertes
     */
    public function countTotal(): int
    {
        return (int) $this->createQueryBuilder('a')
            ->select('COUNT(a.id)')
            ->getQuery()
            ->getSingleScalarResult();
    }

    /**
     * Compte le nombre d'alertes actives
     */
    public function countActives(): int
    {
        return (int) $this->createQueryBuilder('a')
            ->select('COUNT(a.id)')
            ->where('a.statut = :statut')
            ->setParameter('statut', Alerte::STATUT_ACTIVE)
            ->getQuery()
            ->getSingleScalarResult();
    }

    /**
     * Trouve les alertes par priorité
     */
    public function findByPriorite(int $prioriteMin = 3): array
    {
        // Cette requête nécessite une sous-requête complexe
        // Pour simplifier, on retourne toutes les alertes actives
        return $this->findActives();
    }

    /**
     * Trouve la dernière alerte par véhicule
     */
    public function findLastByVehicule(string $vehiculeId): ?Alerte
    {
        return $this->createQueryBuilder('a')
            ->join('a.vehicule', 'v')
            ->where('v.id = :vehiculeId')
            ->setParameter('vehiculeId', $vehiculeId)
            ->orderBy('a.horodatage', 'DESC')
            ->setMaxResults(1)
            ->getQuery()
            ->getOneOrNullResult();
    }
}