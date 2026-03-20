<?php

namespace App\Repository;

use App\Entity\ResponsableSupervision;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

class ResponsableSupervisionRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, ResponsableSupervision::class);
    }

    public function findActiveForNotifications()
    {
        return $this->createQueryBuilder('r')
            ->where('r.isActive = :active')
            ->andWhere('r.isVerified = :verified')
            ->andWhere('r.receivesCriticalAlerts = :alerts')
            ->setParameter('active', true)
            ->setParameter('verified', true)
            ->setParameter('alerts', true)
            ->getQuery()
            ->getResult();
    }
}