<?php
// src/Repository/UserRepository.php
namespace App\Repository;

use App\Entity\User;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

class UserRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, User::class);
    }

    public function findActiveSupervisors()
    {
        return $this->createQueryBuilder('u')
            ->where('u.isActive = :active')
            ->andWhere('u INSTANCE OF App\Entity\ResponsableSupervision')
            ->setParameter('active', true)
            ->getQuery()
            ->getResult();
    }

    public function findActiveAdmins()
    {
        return $this->createQueryBuilder('u')
            ->where('u.isActive = :active')
            ->andWhere('u INSTANCE OF App\Entity\Administrateur')
            ->setParameter('active', true)
            ->getQuery()
            ->getResult();
    }
}