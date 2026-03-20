<?php
// src/DataFixtures/UserFixtures.php
namespace App\DataFixtures;

use App\Entity\Administrateur;
use App\Entity\ResponsableSupervision;
use Doctrine\Bundle\FixturesBundle\Fixture;
use Doctrine\Persistence\ObjectManager;
use Symfony\Component\PasswordHasher\Hasher\UserPasswordHasherInterface;

class UserFixtures extends Fixture
{
    public function __construct(private UserPasswordHasherInterface $passwordHasher) {}

    public function load(ObjectManager $manager): void
    {
        // Admin
        $admin = new Administrateur();
        $admin->setEmail('admin@sfam.tn');
        $admin->setFullName('Admin SFAM');
        $admin->setPassword($this->passwordHasher->hashPassword($admin, 'admin123'));
        $admin->setVerified(true);
        $admin->setIsActive(true);
        $admin->addRole('ROLE_ADMIN');
        $manager->persist($admin);

        // Supervisor
        $supervisor = new ResponsableSupervision();
        $supervisor->setEmail('supervisor@sfam.tn');
        $supervisor->setFullName('Supervisor Flotte');
        $supervisor->setPassword($this->passwordHasher->hashPassword($supervisor, 'supervisor123'));
        $supervisor->setVerified(true);
        $supervisor->setIsActive(true);
        $supervisor->addRole('ROLE_SUPERVISOR');
        $manager->persist($supervisor);

        $manager->flush();
    }
}