<?php

namespace App\Repository;

use App\Entity\Administrateur;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

class AdministrateurRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, Administrateur::class);
    }

    public function findActiveAdminsWithThresholdAccess()
    {
        return $this->createQueryBuilder('a')
            ->where('a.isActive = :active')
            ->andWhere('a.canConfigureThresholds = :thresholds')
            ->setParameter('active', true)
            ->setParameter('thresholds', true)
            ->getQuery()
            ->getResult();
    }
}