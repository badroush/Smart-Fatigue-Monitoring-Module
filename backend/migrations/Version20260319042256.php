<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Auto-generated Migration: Please modify to your needs!
 */
final class Version20260319042256 extends AbstractMigration
{
    public function getDescription(): string
    {
        return '';
    }

    public function up(Schema $schema): void
    {
        // this up() migration is auto-generated, please modify it to your needs
        $this->addSql('ALTER TABLE administrateur ADD CONSTRAINT FK_32EB52E8BF396750 FOREIGN KEY (id) REFERENCES user (id) ON DELETE CASCADE');
        $this->addSql('ALTER TABLE alerte ADD CONSTRAINT FK_3AE753AF16F4AC6 FOREIGN KEY (conducteur_id) REFERENCES conducteur (id) ON DELETE CASCADE');
        $this->addSql('ALTER TABLE alerte ADD CONSTRAINT FK_3AE753A4A4A3511 FOREIGN KEY (vehicule_id) REFERENCES vehicule (id) ON DELETE CASCADE');
        $this->addSql('ALTER TABLE alerte ADD CONSTRAINT FK_3AE753A50EC6314 FOREIGN KEY (acquittee_par_id) REFERENCES user (id) ON DELETE SET NULL');
        $this->addSql('ALTER TABLE alerte ADD CONSTRAINT FK_3AE753A92A12474 FOREIGN KEY (resolue_par_id) REFERENCES user (id) ON DELETE SET NULL');
        $this->addSql('ALTER TABLE alerte ADD CONSTRAINT FK_3AE753A5A44D092 FOREIGN KEY (fatigue_event_id) REFERENCES fatigue_event (id) ON DELETE SET NULL');
        $this->addSql('ALTER TABLE conducteur ADD CONSTRAINT FK_23677143D264101F FOREIGN KEY (vehicule_assigne_id) REFERENCES vehicule (id) ON DELETE SET NULL');
        $this->addSql('ALTER TABLE fatigue_event ADD CONSTRAINT FK_74F43AEEF16F4AC6 FOREIGN KEY (conducteur_id) REFERENCES conducteur (id) ON DELETE CASCADE');
        $this->addSql('ALTER TABLE fatigue_event ADD CONSTRAINT FK_74F43AEE4A4A3511 FOREIGN KEY (vehicule_id) REFERENCES vehicule (id) ON DELETE CASCADE');
        $this->addSql('ALTER TABLE fatigue_event ADD CONSTRAINT FK_74F43AEE68E99FEE FOREIGN KEY (localisation_debut_id) REFERENCES localisation_gps (id) ON DELETE SET NULL');
        $this->addSql('ALTER TABLE fatigue_event ADD CONSTRAINT FK_74F43AEE9E7F9DD3 FOREIGN KEY (localisation_fin_id) REFERENCES localisation_gps (id) ON DELETE SET NULL');
        $this->addSql('ALTER TABLE fatigue_event ADD CONSTRAINT FK_74F43AEE5E3DAC49 FOREIGN KEY (resolu_par_id) REFERENCES user (id) ON DELETE SET NULL');
        $this->addSql('ALTER TABLE localisation_gps CHANGE `precision` gps_precision DOUBLE PRECISION DEFAULT NULL');
        $this->addSql('ALTER TABLE paquet_donnees ADD CONSTRAINT FK_2A966C3E9C1FB521 FOREIGN KEY (donnees_capteurs_id) REFERENCES donnees_capteurs (id) ON DELETE CASCADE');
        $this->addSql('ALTER TABLE paquet_donnees ADD CONSTRAINT FK_2A966C3EC5FFBC02 FOREIGN KEY (analyse_fatigue_id) REFERENCES analyse_fatigue (id) ON DELETE CASCADE');
        $this->addSql('ALTER TABLE paquet_donnees ADD CONSTRAINT FK_2A966C3E9AA034C7 FOREIGN KEY (localisation_gps_id) REFERENCES localisation_gps (id) ON DELETE CASCADE');
        $this->addSql('ALTER TABLE paquet_donnees ADD CONSTRAINT FK_2A966C3EF16F4AC6 FOREIGN KEY (conducteur_id) REFERENCES conducteur (id) ON DELETE SET NULL');
        $this->addSql('ALTER TABLE paquet_donnees ADD CONSTRAINT FK_2A966C3E4A4A3511 FOREIGN KEY (vehicule_id) REFERENCES vehicule (id) ON DELETE SET NULL');
        $this->addSql('ALTER TABLE paquet_donnees ADD CONSTRAINT FK_2A966C3E5A44D092 FOREIGN KEY (fatigue_event_id) REFERENCES fatigue_event (id) ON DELETE SET NULL');
        $this->addSql('ALTER TABLE responsable_supervision ADD CONSTRAINT FK_30367133BF396750 FOREIGN KEY (id) REFERENCES user (id) ON DELETE CASCADE');
        $this->addSql('ALTER TABLE vehicule ADD CONSTRAINT FK_292FFF1D7ABA1969 FOREIGN KEY (localisation_actuelle_id) REFERENCES localisation_gps (id) ON DELETE SET NULL');
    }

    public function down(Schema $schema): void
    {
        // this down() migration is auto-generated, please modify it to your needs
        $this->addSql('ALTER TABLE administrateur DROP FOREIGN KEY FK_32EB52E8BF396750');
        $this->addSql('ALTER TABLE alerte DROP FOREIGN KEY FK_3AE753AF16F4AC6');
        $this->addSql('ALTER TABLE alerte DROP FOREIGN KEY FK_3AE753A4A4A3511');
        $this->addSql('ALTER TABLE alerte DROP FOREIGN KEY FK_3AE753A50EC6314');
        $this->addSql('ALTER TABLE alerte DROP FOREIGN KEY FK_3AE753A92A12474');
        $this->addSql('ALTER TABLE alerte DROP FOREIGN KEY FK_3AE753A5A44D092');
        $this->addSql('ALTER TABLE conducteur DROP FOREIGN KEY FK_23677143D264101F');
        $this->addSql('ALTER TABLE fatigue_event DROP FOREIGN KEY FK_74F43AEEF16F4AC6');
        $this->addSql('ALTER TABLE fatigue_event DROP FOREIGN KEY FK_74F43AEE4A4A3511');
        $this->addSql('ALTER TABLE fatigue_event DROP FOREIGN KEY FK_74F43AEE68E99FEE');
        $this->addSql('ALTER TABLE fatigue_event DROP FOREIGN KEY FK_74F43AEE9E7F9DD3');
        $this->addSql('ALTER TABLE fatigue_event DROP FOREIGN KEY FK_74F43AEE5E3DAC49');
        $this->addSql('ALTER TABLE localisation_gps CHANGE gps_precision `precision` DOUBLE PRECISION DEFAULT NULL');
        $this->addSql('ALTER TABLE paquet_donnees DROP FOREIGN KEY FK_2A966C3E9C1FB521');
        $this->addSql('ALTER TABLE paquet_donnees DROP FOREIGN KEY FK_2A966C3EC5FFBC02');
        $this->addSql('ALTER TABLE paquet_donnees DROP FOREIGN KEY FK_2A966C3E9AA034C7');
        $this->addSql('ALTER TABLE paquet_donnees DROP FOREIGN KEY FK_2A966C3EF16F4AC6');
        $this->addSql('ALTER TABLE paquet_donnees DROP FOREIGN KEY FK_2A966C3E4A4A3511');
        $this->addSql('ALTER TABLE paquet_donnees DROP FOREIGN KEY FK_2A966C3E5A44D092');
        $this->addSql('ALTER TABLE responsable_supervision DROP FOREIGN KEY FK_30367133BF396750');
        $this->addSql('ALTER TABLE vehicule DROP FOREIGN KEY FK_292FFF1D7ABA1969');
    }
}
